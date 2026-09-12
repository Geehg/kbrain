import type { MatrixAddress } from './lk-kine-profile';
import type { ViaWebHidClient } from './via-webhid';

export type DeviceAssignment = { layer: number; address: MatrixAddress; keycode: number; label: string };
export type EncoderAssignment = { layer: number; clockwise: boolean; keycode: number };
type PresetClient = Pick<ViaWebHidClient, 'getKeycode' | 'setKeycode' | 'getEncoderKeycode' | 'setEncoderKeycode'>;

/** Read everything before writing; journal before each attempted write, including failed readback. */
export async function applyDevicePreset(client: PresetClient, keys: DeviceAssignment[], encoder: EncoderAssignment[], progress: (done: number, total: number, label: string) => void) {
  const operations = [
    ...keys.map(item => ({ label: `L${item.layer} M[${item.address}] ${item.label}`, read: () => client.getKeycode(item.layer, item.address), write: (value: number) => client.setKeycode(item.layer, item.address, value), value: item.keycode })),
    ...encoder.map(item => ({ label: `L${item.layer} E0 ${item.clockwise ? 'CW' : 'CCW'}`, read: () => client.getEncoderKeycode(item.layer, item.clockwise), write: (value: number) => client.setEncoderKeycode(item.layer, item.clockwise, value), value: item.keycode })),
  ];
  const previous: number[] = [], attempted: number[] = [];
  try {
    for (const operation of operations) previous.push(await operation.read());
    for (let index = 0; index < operations.length; index++) {
      if (previous[index] !== operations[index].value) {
        attempted.push(index);
        await operations[index].write(operations[index].value);
      }
      progress(index + 1, operations.length, operations[index].label);
    }
  } catch (error) {
    let failed = 0;
    for (const index of attempted.reverse()) {
      try { await operations[index].write(previous[index]); } catch { failed++; }
    }
    const cause = error instanceof Error ? error.message : '장치 기록 실패';
    throw new Error(`${cause} · ${!attempted.length ? '기기 설정을 변경하지 않았습니다' : failed ? `복원 ${failed}개 실패: USB를 재연결하고 기존 프리셋을 다시 적용하세요` : '변경한 키·휠을 원래 값으로 복원했습니다'}`);
  }
}
