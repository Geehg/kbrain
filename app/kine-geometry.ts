import { LK_KINE_PLATES, type MatrixAddress, type PlateId } from './lk-kine-profile';

// Overall dimensions: LUMINKEY product specifications. Interior dimensions are
// proportional reconstructions from the official manual and product photos,
// not manufacturing CAD or measured mechanical tolerances. All units are mm.
export const KINE_SIZE = { width: 111.65, depth: 136.01, height: 24.5 } as const;
export const KINE_PITCH = 19;

export type KineKeyPlacement = {
  matrix: MatrixAddress; index: number; x: number; z: number;
  width: number; depth: number; auxiliary: boolean;
};

export function kineKeyPlacements(plate: PlateId, mirrored: boolean): KineKeyPlacement[] {
  const keys = LK_KINE_PLATES[plate].map((cell, index) => {
    const width = cell.width ?? 1;
    const depth = cell.height ?? 1;
    const col = mirrored && plate !== 'D' ? 6 - cell.col - width : cell.col;
    // The empty KLE row is a 5.4 mm separator, not a full key pitch.
    const startZ = cell.row === 1 ? 8 : 32.4 + (cell.row - 3) * KINE_PITCH;
    return {
      matrix: cell.matrix, index,
      x: 6 + (col - 1) * KINE_PITCH + (width * KINE_PITCH - 1.4) / 2 - KINE_SIZE.width / 2,
      z: startZ + (depth * KINE_PITCH - 1.4) / 2 - KINE_SIZE.depth / 2,
      width: width * KINE_PITCH - 1.4, depth: depth * KINE_PITCH - 1.4,
      auxiliary: false,
    };
  });
  return [...keys, ...(['4,9', '4,10', '4,11'] as MatrixAddress[]).map((matrix, index) => ({
    matrix, index: 24 + index, x: 42.4, z: -23 + index * 18,
    width: 20.5, depth: 16.6, auxiliary: true,
  }))];
}
