export type PlateId = 'A' | 'B' | 'C' | 'D';
export type Rotation = 0 | 90 | 180 | 270;
export type MatrixAddress = `${number},${number}`;

export type PhysicalKey = {
  id: string;
  matrix: MatrixAddress;
  col: number;
  row: number;
  width?: number;
  height?: number;
  section: 'function' | 'plate';
};

const key = (
  matrix: MatrixAddress,
  col: number,
  row: number,
  options: Pick<PhysicalKey, 'width' | 'height' | 'section'>,
): PhysicalKey => ({ id: matrix, matrix, col, row, ...options });

const functionStrip = (): PhysicalKey[] => [
  key('0,0', 1, 1, { section: 'function' }),
  key('1,0', 2, 1, { section: 'function' }),
  key('2,0', 3, 1, { section: 'function' }),
  key('3,0', 4, 1, { section: 'function' }),
];

// VIA JSON의 KLE 좌표를 실제 교체 플레이트별로 분리했다.
// row 2는 상단 4키 스트립과 하단 플레이트 사이의 물리적 간격이다.
export const LK_KINE_PLATES: Record<PlateId, PhysicalKey[]> = {
  A: [
    ...functionStrip(),
    key('0,1', 1, 3, { section: 'plate' }), key('1,1', 2, 3, { section: 'plate' }), key('2,1', 3, 3, { section: 'plate' }), key('3,1', 4, 3, { section: 'plate' }),
    key('0,2', 1, 4, { section: 'plate' }), key('1,3', 2, 4, { section: 'plate' }), key('2,3', 3, 4, { section: 'plate' }), key('3,3', 4, 4, { height: 2, section: 'plate' }),
    key('0,4', 1, 5, { section: 'plate' }), key('1,4', 2, 5, { section: 'plate' }), key('2,4', 3, 5, { section: 'plate' }),
    key('0,6', 1, 6, { section: 'plate' }), key('1,6', 2, 6, { section: 'plate' }), key('2,6', 3, 6, { section: 'plate' }), key('3,7', 4, 6, { height: 2, section: 'plate' }),
    key('1,8', 1, 7, { width: 2, section: 'plate' }), key('2,7', 3, 7, { section: 'plate' }),
  ],
  B: [
    ...functionStrip(),
    key('0,1', 1, 3, { section: 'plate' }), key('1,1', 2, 3, { section: 'plate' }), key('2,1', 3, 3, { section: 'plate' }), key('3,1', 4, 3, { section: 'plate' }),
    key('0,3', 1, 4, { height: 2, section: 'plate' }), key('1,3', 2, 4, { section: 'plate' }), key('2,3', 3, 4, { section: 'plate' }), key('3,2', 4, 4, { section: 'plate' }),
    key('1,4', 2, 5, { section: 'plate' }), key('2,4', 3, 5, { section: 'plate' }), key('3,4', 4, 5, { section: 'plate' }),
    key('0,6', 1, 6, { section: 'plate' }), key('1,6', 2, 6, { section: 'plate' }), key('2,6', 3, 6, { section: 'plate' }), key('3,6', 4, 6, { section: 'plate' }),
    key('1,8', 1, 7, { width: 2, section: 'plate' }), key('2,8', 3, 7, { width: 2, section: 'plate' }),
  ],
  C: [
    ...functionStrip(),
    key('1,2', 1, 3, { width: 2, section: 'plate' }), key('2,2', 3, 3, { width: 2, section: 'plate' }),
    key('0,2', 1, 4, { section: 'plate' }), key('1,3', 2, 4, { section: 'plate' }), key('2,3', 3, 4, { section: 'plate' }), key('3,2', 4, 4, { section: 'plate' }),
    key('0,4', 1, 5, { section: 'plate' }), key('1,4', 2, 5, { section: 'plate' }), key('2,4', 3, 5, { section: 'plate' }), key('3,5', 4, 5, { height: 2, section: 'plate' }),
    key('0,6', 1, 6, { section: 'plate' }), key('1,6', 2, 6, { section: 'plate' }), key('2,6', 3, 6, { section: 'plate' }),
    key('0,8', 1, 7, { section: 'plate' }), key('1,7', 2, 7, { section: 'plate' }), key('2,7', 3, 7, { section: 'plate' }), key('3,8', 4, 7, { section: 'plate' }),
  ],
  D: [
    ...functionStrip(),
    key('0,1', 1, 3, { section: 'plate' }), key('1,1', 2, 3, { section: 'plate' }), key('2,1', 3, 3, { section: 'plate' }), key('3,1', 4, 3, { section: 'plate' }),
    key('0,2', 1, 4, { section: 'plate' }), key('1,3', 2, 4, { section: 'plate' }), key('2,3', 3, 4, { section: 'plate' }), key('3,2', 4, 4, { section: 'plate' }),
    key('0,4', 1, 5, { section: 'plate' }), key('1,4', 2, 5, { section: 'plate' }), key('2,4', 3, 5, { section: 'plate' }), key('3,4', 4, 5, { section: 'plate' }),
    key('0,6', 1, 6, { section: 'plate' }), key('1,6', 2, 6, { section: 'plate' }), key('2,6', 3, 6, { section: 'plate' }), key('3,6', 4, 6, { section: 'plate' }),
    key('0,8', 1, 7, { section: 'plate' }), key('1,7', 2, 7, { section: 'plate' }), key('2,7', 3, 7, { section: 'plate' }), key('3,8', 4, 7, { section: 'plate' }),
  ],
};

export const LK_KINE_AUXILIARY = ['4,9', '4,10', '4,11'] as const;

// VIA customKeycodes are assigned in JSON order from QK_KB_0 (0x7E00).
// These values are implemented by the LK-KINE firmware; the site only writes
// them into the dynamic keymap.
export const LK_KINE_CUSTOM_KEYCODES = {
  MD_24G: 0x7e00,
  MD_BLE1: 0x7e01,
  MD_BLE2: 0x7e02,
  MD_BLE3: 0x7e03,
  MD_USB: 0x7e04,
  U_EE_CLR: 0x7e05,
  QK_BAT: 0x7e06,
  QMK_SLEEP: 0x7e07,
  LG_TOG: 0x7e08,
  LG_MOD: 0x7e09,
  LG_RMOD: 0x7e0a,
  LG_HUI: 0x7e0b,
  LG_HUD: 0x7e0c,
  LG_SAI: 0x7e0d,
  LG_SAD: 0x7e0e,
  LG_VAI: 0x7e0f,
  LG_VAD: 0x7e10,
  LG_SPI: 0x7e11,
  LG_SPD: 0x7e12,
} as const;

export const LK_KINE_HOME_FN = {
  address: '3,0' as MatrixAddress,
  layer: 0,
  keycode: 0x424a, // LT(2, KC_HOME)
} as const;

export const LK_KINE_WIRELESS_LAYER = 2;

export const LK_KINE_BLUETOOTH_AUX = [
  { address: '4,9' as MatrixAddress, label: 'BT1', action: 'MD_BLE1', keycode: LK_KINE_CUSTOM_KEYCODES.MD_BLE1 },
  { address: '4,10' as MatrixAddress, label: 'BT2', action: 'MD_BLE2', keycode: LK_KINE_CUSTOM_KEYCODES.MD_BLE2 },
  { address: '4,11' as MatrixAddress, label: 'BT3', action: 'MD_BLE3', keycode: LK_KINE_CUSTOM_KEYCODES.MD_BLE3 },
] as const;

// Factory Home/Fn combinations from the official manual. Keeping these on
// layer 2 means the original pairing path survives every AI PAD preset.
export const LK_KINE_FACTORY_WIRELESS_KEYS = [
  { address: '0,6' as MatrixAddress, label: 'BT1', keycode: LK_KINE_CUSTOM_KEYCODES.MD_BLE1 },
  { address: '1,6' as MatrixAddress, label: 'BT2', keycode: LK_KINE_CUSTOM_KEYCODES.MD_BLE2 },
  { address: '2,6' as MatrixAddress, label: 'BT3', keycode: LK_KINE_CUSTOM_KEYCODES.MD_BLE3 },
  { address: '0,4' as MatrixAddress, label: '2.4G', keycode: LK_KINE_CUSTOM_KEYCODES.MD_24G },
  { address: '1,4' as MatrixAddress, label: 'USB', keycode: LK_KINE_CUSTOM_KEYCODES.MD_USB },
  { address: '1,0' as MatrixAddress, label: 'SLEEP', keycode: LK_KINE_CUSTOM_KEYCODES.QMK_SLEEP },
  { address: '2,0' as MatrixAddress, label: 'BAT', keycode: LK_KINE_CUSTOM_KEYCODES.QK_BAT },
  { address: '0,0' as MatrixAddress, label: 'RESET', keycode: LK_KINE_CUSTOM_KEYCODES.U_EE_CLR },
] as const;

export const LK_KINE_PROFILE = {
  name: 'LK-KINE',
  vendorId: 0x36b0,
  productId: 0x3124,
  vendorIdHex: '0x36B0',
  productIdHex: '0x3124',
  rawHid: { usagePage: 0xff60, usage: 0x61, reportSize: 32 },
  matrix: { rows: 5, cols: 12 },
  auxiliaryKeys: LK_KINE_AUXILIARY,
  encoder: 'e0',
  customKeycodes: [
    ['MD_24G', '2.4G', '2.4GHz 작동 모드'],
    ['MD_BLE1', 'BLE1', 'Bluetooth 채널 1'],
    ['MD_BLE2', 'BLE2', 'Bluetooth 채널 2'],
    ['MD_BLE3', 'BLE3', 'Bluetooth 채널 3'],
    ['MD_USB', 'USB', 'USB 작동 모드'],
    ['U_EE_CLR', 'RESET', '사용자 설정 초기화'],
    ['QK_BAT', 'BAT', '배터리 상태 확인'],
    ['QMK_SLEEP', 'SLEEP', '키보드 절전'],
    ['LG_TOG', 'LG_TOG', '로고 조명 켜기/끄기'],
    ['LG_MOD', 'LG_MO', '조명 모드 순방향 전환'],
    ['LG_RMOD', 'LG_RM', '조명 모드 역방향 전환'],
    ['LG_HUI', 'LG_HUI', '색조 증가'],
    ['LG_HUD', 'LG_HUD', '색조 감소'],
    ['LG_SAI', 'LG_SAI', '채도 증가'],
    ['LG_SAD', 'LG_SAD', '채도 감소'],
    ['LG_VAI', 'LG_VAI', '밝기 증가'],
    ['LG_VAD', 'LG_VAD', '밝기 감소'],
    ['LG_SPI', 'LG_SPI', '효과 속도 증가'],
    ['LG_SPD', 'LG_SPD', '효과 속도 감소'],
  ] as const,
  lighting: {
    brightness: [0, 200] as const,
    speed: [0, 4] as const,
    effects: ['none', 'wave', 'fixed wave', 'spectrum', 'breathe', 'light', 'shutdown'] as const,
  },
} as const;

export const transformLkKineLayout = (plate: PlateId, mirrored: boolean, rotation: Rotation) => {
  const base = LK_KINE_PLATES[plate].map((cell) => {
    const width = cell.width ?? 1;
    const height = cell.height ?? 1;
    return { ...cell, width, height, col: mirrored && plate !== 'D' ? 6 - cell.col - width : cell.col };
  });
  const cells = base.map((cell) => {
    if (rotation === 90) return { ...cell, col: 9 - cell.row - cell.height, row: cell.col, width: cell.height, height: cell.width };
    if (rotation === 180) return { ...cell, col: 6 - cell.col - cell.width, row: 9 - cell.row - cell.height };
    if (rotation === 270) return { ...cell, col: cell.row, row: 6 - cell.col - cell.width, width: cell.height, height: cell.width };
    return cell;
  });
  const landscape = rotation === 90 || rotation === 270;
  return {
    cells,
    columns: landscape ? 7 : 4,
    rows: landscape ? 4 : 7,
    gridTemplateColumns: landscape
      ? rotation === 270 ? '1fr .28fr repeat(5, 1fr)' : 'repeat(5, 1fr) .28fr 1fr'
      : 'repeat(4, minmax(0, 1fr))',
    gridTemplateRows: landscape
      ? 'repeat(4, minmax(0, 1fr))'
      : rotation === 180 ? 'repeat(5, 1fr) .28fr 1fr' : '1fr .28fr repeat(5, 1fr)',
  };
};

export const isLkKine = (vendorId: number, productId: number) => vendorId === LK_KINE_PROFILE.vendorId && productId === LK_KINE_PROFILE.productId;
