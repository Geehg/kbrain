import * as THREE from 'three';

// Rounded outer profile with an edge-open pocket. Extrude only the upper layer
// over a solid floor: the auxiliary button recess is not a through-hole.
export function edgeRecessOutline(w: number, d: number, radius: number, inset: number, opening: number, center = 0, pocketRadius = 1.1) {
  const p = new THREE.Shape(), x = w / 2, z = d / 2;
  const r = radius, a = center - opening / 2, b = center + opening / 2;
  const inner = x - inset, q = pocketRadius;
  p.moveTo(-x + r, -z); p.lineTo(x - r, -z); p.quadraticCurveTo(x, -z, x, -z + r);
  p.lineTo(x, a); p.lineTo(inner + q, a); p.quadraticCurveTo(inner, a, inner, a + q);
  p.lineTo(inner, b - q); p.quadraticCurveTo(inner, b, inner + q, b); p.lineTo(x, b);
  p.lineTo(x, z - r); p.quadraticCurveTo(x, z, x - r, z); p.lineTo(-x + r, z);
  p.quadraticCurveTo(-x, z, -x, z - r); p.lineTo(-x, -z + r); p.quadraticCurveTo(-x, -z, -x + r, -z);
  return p;
}

export function metalGrainTexture() {
  const size = 128, data = new Uint8Array(size * size * 4);
  let seed = 81724;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 170 + (seed >>> 25);
    data.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

// Consistent millimeter-scale grain on both extruded and rounded-box surfaces.
export function machinedUV(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  const uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i)), nz = Math.abs(normals.getZ(i));
    uv[i * 2] = (nx > ny && nx > nz ? positions.getZ(i) : positions.getX(i)) / 3;
    uv[i * 2 + 1] = (ny >= nx && ny >= nz ? positions.getZ(i) : positions.getY(i)) / 3;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// A shallow dished circle/stadium with a rounded lip, not a flat raised disc.
export function frostDishGeometry(w: number, d: number) {
  const radius = Math.min(w, d) / 2, ex = w / 2 - radius, ez = d / 2 - radius;
  const profile = [[0, 23.42], [.3, 23.42], [.58, 23.45], [.76, 23.57], [.87, 23.88], [.95, 24.12], [1, 24.07], [1.015, 23.86], [1.015, 23.35]];
  const positions: number[] = [], normals: number[] = [], uv: number[] = [], indices: number[] = [], segments = 80;
  for (const [i, [fraction, height]] of profile.entries()) for (let j = 0; j <= segments; j++) {
    // Reuse the first angle for the seam vertex. sin(2π) is a tiny negative
    // number, not zero: Math.sign would shift Z-long caps by the full straight
    // section and leave the final triangle strip open (FIGMA / APPROVE).
    const angle = j === segments ? 0 : j / segments * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
    const x = (c * radius + Math.sign(c) * ex) * fraction;
    const z = (s * radius + Math.sign(s) * ez) * fraction;
    positions.push(x, height, z); uv.push(x / w + .5, z / d + .5);
    const previous = profile[Math.max(0, i - 1)], next = profile[Math.min(profile.length - 1, i + 1)];
    const dy = next[1] - previous[1], dr = (next[0] - previous[0]) * radius;
    const normal = new THREE.Vector3(-c * dy, dr, -s * dy).normalize();
    normals.push(normal.x, normal.y, normal.z);
  }
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices); return geometry;
}

export function ledHaloTexture() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
    const alpha = Math.exp(-radius * radius * 7) * Math.max(0, 1 - radius) ** 2;
    data.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size); texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true; return texture;
}

// Soft, rounded stem outlines visible beneath smoky plastic. Generated in
// model coordinates so the three marks on a 2u cap stay circular, not stretched.
export function frostStemTexture(w: number, d: number) {
  const width = w > d ? 512 : 256, height = d > w ? 512 : 256;
  const data = new Uint8Array(width * height * 4);
  const offsets = w > 20 || d > 20 ? [-11, 0, 11] : [0];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const px = (x / (width - 1) - .5) * w, pz = (y / (height - 1) - .5) * d;
    let ink = 0;
    for (const offset of offsets) {
      const dx = px - (w > 20 ? offset : 0), dz = pz - (d > 20 ? offset : 0);
      const horizontal = Math.hypot(Math.max(Math.abs(dx) - 1.4, 0), dz) - .95;
      const vertical = Math.hypot(dx, Math.max(Math.abs(dz) - 1.4, 0)) - .95;
      const distance = Math.min(horizontal, vertical);
      ink = Math.max(ink, 1 - THREE.MathUtils.smoothstep(Math.abs(distance + .15), .27, .65));
    }
    const value = Math.round(96 - ink * 65);
    data.set([value, value + 2, value + 4, 255], (y * width + x) * 4);
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true;
  texture.needsUpdate = true; return texture;
}

// One continuous machined surface: fine axial grooves with bevelled end lips.
// Cylinder axis is X, matching the existing roller animation.
export function knurledRollerGeometry() {
  const teeth = 88, segments = teeth * 4;
  const profile = [[-5.9, 7.05], [-5.65, 7.48], [-5.35, 7.6], [5.35, 7.6], [5.65, 7.48], [5.9, 7.05]];
  const positions: number[] = [], indices: number[] = [];
  for (const [x, radius] of profile) for (let j = 0; j <= segments; j++) {
    const angle = j / segments * Math.PI * 2;
    const r = radius - (j % 4 === 0 ? .24 : j % 4 === 2 ? 0 : .055);
    positions.push(x, Math.cos(angle) * r, Math.sin(angle) * r);
  }
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + segments + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
