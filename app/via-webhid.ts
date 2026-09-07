import { LK_KINE_PROFILE, type MatrixAddress } from './lk-kine-profile';

export type HidCollectionInfo = { usagePage?: number; usage?: number };
export type HidInputReportEvent = Event & { data: DataView; reportId: number };

export type LkKineHidDevice = {
  productName: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  collections?: HidCollectionInfo[];
  open: () => Promise<void>;
  close?: () => Promise<void>;
  sendReport: (reportId: number, data: BufferSource) => Promise<void>;
  addEventListener: (type: 'inputreport', listener: (event: HidInputReportEvent) => void) => void;
  removeEventListener: (type: 'inputreport', listener: (event: HidInputReportEvent) => void) => void;
};

export type LkKineHidApi = {
  requestDevice: (options: { filters: Array<{ vendorId: number; productId: number; usagePage?: number; usage?: number }> }) => Promise<LkKineHidDevice[]>;
  getDevices?: () => Promise<LkKineHidDevice[]>;
};

const COMMAND = {
  protocolVersion: 0x01,
  getKeyboardValue: 0x02,
  getKeycode: 0x04,
  setKeycode: 0x05,
  layerCount: 0x11,
} as const;

const MATRIX_STATE = 0x03;

export class ViaWebHidClient {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly device: LkKineHidDevice) {}

  private exchange(command: number, payload: number[] = [], timeoutMs = 850): Promise<Uint8Array> {
    const execute = () => new Promise<Uint8Array>((resolve, reject) => {
      const packet = new Uint8Array(LK_KINE_PROFILE.rawHid.reportSize);
      packet[0] = command;
      packet.set(payload, 1);
      let timeout = 0;
      const cleanup = () => {
        window.clearTimeout(timeout);
        this.device.removeEventListener('inputreport', onReport);
      };
      const onReport = (event: HidInputReportEvent) => {
        const response = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
        if (response[0] !== command && response[0] !== 0xff) return;
        cleanup();
        if (response[0] === 0xff) reject(new Error('이 펌웨어가 요청한 VIA 명령을 지원하지 않습니다.'));
        else resolve(new Uint8Array(response));
      };
      this.device.addEventListener('inputreport', onReport);
      timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('키패드가 VIA 명령에 응답하지 않았습니다.'));
      }, timeoutMs);
      this.device.sendReport(0, packet).catch((error) => {
        cleanup();
        reject(error);
      });
    });

    const result = this.queue.catch(() => undefined).then(execute);
    this.queue = result;
    return result;
  }

  async getProtocolVersion() {
    const response = await this.exchange(COMMAND.protocolVersion);
    return (response[1] << 8) | response[2];
  }

  async getLayerCount() {
    const response = await this.exchange(COMMAND.layerCount);
    return response[1] || 4;
  }

  async getMatrixState(): Promise<Set<MatrixAddress>> {
    const response = await this.exchange(COMMAND.getKeyboardValue, [MATRIX_STATE, 0]);
    const pressed = new Set<MatrixAddress>();
    const bytesPerRow = Math.ceil(LK_KINE_PROFILE.matrix.cols / 8);
    for (let row = 0; row < LK_KINE_PROFILE.matrix.rows; row += 1) {
      let value = 0;
      for (let byte = 0; byte < bytesPerRow; byte += 1) value = (value << 8) | response[3 + row * bytesPerRow + byte];
      for (let col = 0; col < LK_KINE_PROFILE.matrix.cols; col += 1) {
        if ((value & (1 << col)) !== 0) pressed.add(`${row},${col}` as MatrixAddress);
      }
    }
    return pressed;
  }

  async getKeycode(layer: number, address: MatrixAddress) {
    const [row, col] = address.split(',').map(Number);
    const response = await this.exchange(COMMAND.getKeycode, [layer, row, col]);
    return (response[4] << 8) | response[5];
  }

  async setKeycode(layer: number, address: MatrixAddress, keycode: number) {
    const [row, col] = address.split(',').map(Number);
    await this.exchange(COMMAND.setKeycode, [layer, row, col, keycode >> 8, keycode & 0xff]);
    const readback = await this.getKeycode(layer, address);
    if (readback !== keycode) throw new Error(`M[${address}] 키코드 검증에 실패했습니다.`);
  }
}

const BASIC_KEYCODES: Record<string, number> = {
  '⌘C': 0x0806,
  '⌘V': 0x0819,
  '⌘Z': 0x081d,
  '⇧⌘Z': 0x0a1d,
  '⌘S': 0x0816,
  '⇧⌘4': 0x0a21,
  '⌘Space': 0x082c,
  F11: 0x44,
};

export const qmkKeycodeForAction = (action: string, physicalIndex: number) => {
  const direct = BASIC_KEYCODES[action];
  if (direct !== undefined) return direct;
  const bank = Math.floor(physicalIndex / 12);
  const functionKey = 0x68 + (physicalIndex % 12); // F13–F24
  const modifier = bank === 0 ? 0 : bank === 1 ? 0x0200 : 0x0100;
  return modifier | functionKey;
};

export const qmkKeycodeToDomCode = (keycode: number) => {
  const base = keycode & 0xff;
  if (base >= 0x04 && base <= 0x1d) return `Key${String.fromCharCode(65 + base - 0x04)}`;
  if (base >= 0x1e && base <= 0x26) return `Digit${base - 0x1d}`;
  if (base === 0x27) return 'Digit0';
  if (base === 0x2c) return 'Space';
  if (base >= 0x3a && base <= 0x45) return `F${1 + base - 0x3a}`;
  if (base >= 0x68 && base <= 0x73) return `F${13 + base - 0x68}`;
  return undefined;
};

export const qmkKeycodeMatchesDomEvent = (keycode: number, event: Pick<KeyboardEvent, 'code'|'ctrlKey'|'shiftKey'|'altKey'|'metaKey'>) => {
  if (qmkKeycodeToDomCode(keycode) !== event.code) return false;
  const modifiers = keycode >> 8;
  return Boolean(modifiers & 0x01) === event.ctrlKey
    && Boolean(modifiers & 0x02) === event.shiftKey
    && Boolean(modifiers & 0x04) === event.altKey
    && Boolean(modifiers & 0x08) === event.metaKey;
};
