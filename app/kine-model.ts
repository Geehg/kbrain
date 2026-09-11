import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { KINE_SIZE, kineKeyPlacements } from './kine-geometry';
import type { MatrixAddress, PlateId } from './lk-kine-profile';

export type Finish = 'silver' | 'gray' | 'black';
export type ModelKey = { id: string; matrix: MatrixAddress; label: string; glyph: string; protected: boolean };
export type ModelPart = 'antenna' | 'roller' | 'power' | 'usb' | 'leds' | 'back';
export type KeyMesh = { group: THREE.Group; ring: THREE.Mesh; label: THREE.Mesh; material: THREE.MeshStandardMaterial; restY: number; id: string; matrix: MatrixAddress };
export const FINISHES = { silver: '#c2c9ca', gray: '#626970', black: '#252a2e' };

function roundedPath(w: number, h: number, radius: number) {
  const p = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  const r = Math.min(radius, w / 2, h / 2);
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

function shiftedPath(w: number, h: number, radius: number, x: number, z: number) {
  const p = roundedPath(w, h, radius);
  return new THREE.Path(p.getPoints(12).map(v => new THREE.Vector2(v.x + x, v.y - z)));
}

export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); geometries.forEach(value => value.dispose());
}

function textTexture(lines: string[], dark = false, label = false) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (label) { ctx.fillStyle = 'rgba(15,22,26,.87)'; ctx.roundRect(12, 30, 744, 196, 32); ctx.fill(); }
  ctx.textAlign = label ? 'center' : 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = dark ? '#182125' : '#edf3f2';
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? 700 : 500} ${label ? 74 : i === 0 ? 64 : 33}px Arial, sans-serif`;
    ctx.fillText(line, label ? 384 : 28, label ? 128 : 60 + i * 65, 704);
  });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createKineModel(plate: PlateId, mirrored: boolean, keys: ModelKey[], finish: Finish) {
  const root = new THREE.Group(); root.name = 'NOVA KINE';
  const metal = new THREE.MeshStandardMaterial({ color: FINISHES[finish], metalness: .78, roughness: .33 });
  const bevelMetal = new THREE.MeshStandardMaterial({ color: FINISHES[finish], metalness: .86, roughness: .22 });
  const dark = new THREE.MeshStandardMaterial({ color: '#161e23', metalness: .12, roughness: .75 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#232a2c', roughness: .98 });
  const keysByAddress = new Map(keys.map(k => [k.matrix, k]));
  const keyMeshes: KeyMesh[] = [];
  const addBox = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, radius = .7): THREE.Mesh<THREE.BufferGeometry, THREE.Material> => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, h / 2)), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const addLabel = (parent: THREE.Object3D, lines: string[], width: number, depth: number, x: number, y: number, z: number, darkInk = false, isKey = false) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: textTexture(lines, darkInk, isKey), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  addBox(root, KINE_SIZE.width - .5, 1.3, KINE_SIZE.depth - .5, 0, .85, 0, metal, .6);
  addBox(root, KINE_SIZE.width - .2, .4, KINE_SIZE.depth - .2, 0, 1.65, 0, dark, .15);
  addBox(root, KINE_SIZE.width, 10.9, KINE_SIZE.depth, 0, 7.3, 0, metal, 2.8);

  // A true cut-out upper shell: wells remain recessed when viewed obliquely.
  const shell = roundedPath(KINE_SIZE.width, KINE_SIZE.depth, 4);
  shell.holes.push(shiftedPath(77.4, 20.3, 2, -11.7, -50.5));
  shell.holes.push(shiftedPath(77.4, 96.3, 2, -11.7, 11.3));
  shell.holes.push(shiftedPath(21.8, 55, 1.3, 42.4, -5));
  shell.holes.push(shiftedPath(15.4, 24, 2, 42.4, 43.5));
  shell.holes.push(shiftedPath(22.3, 28, 1.4, 43.9, -53.25));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shell, { depth: 3.2, bevelEnabled: true, bevelThickness: .4, bevelSize: .4, bevelSegments: 2, curveSegments: 12 }), metal);
  frame.rotation.x = -Math.PI / 2; frame.position.y = 12.7; frame.castShadow = true; frame.receiveShadow = true; root.add(frame);
  const raisedShape = roundedPath(88.9, KINE_SIZE.depth, 3.7);
  raisedShape.holes.push(shiftedPath(77.4, 20.3, 2, -.325, -50.5));
  raisedShape.holes.push(shiftedPath(77.4, 96.3, 2, -.325, 11.3));
  const raised = new THREE.Mesh(new THREE.ExtrudeGeometry(raisedShape, { depth: 1.65, bevelEnabled: true, bevelThickness: .3, bevelSize: .3, bevelSegments: 2 }), metal);
  raised.rotation.x = -Math.PI / 2; raised.position.set(-11.375, 16.25, 0); raised.castShadow = true; raised.receiveShadow = true; root.add(raised);
  addBox(root, 77.3, .5, 20.2, -11.7, 13, -50.5, dark);
  addBox(root, 77.3, .5, 96.2, -11.7, 13, 11.3, dark);
  addBox(root, 21.7, .5, 55, 42.4, 13, -5, dark);
  addBox(root, .4, .2, 131, 32.95, 18.05, 0, bevelMetal, .1);
  // Recess below the three overhanging side buttons.
  addBox(root, .3, 4.8, 54.2, KINE_SIZE.width / 2 + .01, 13.1, -5, dark, .1);

  const ringShape = (w: number, d: number) => {
    const shape = roundedPath(w + .8, d + .8, 2.2);
    shape.holes.push(roundedPath(w - .5, d - .5, 1.7));
    const geometry = new THREE.ShapeGeometry(shape, 16); geometry.rotateX(-Math.PI / 2); return geometry;
  };
  for (const placement of kineKeyPlacements(plate, mirrored)) {
    const item = keysByAddress.get(placement.matrix);
    if (!item) continue;
    const { width: w, depth: d, auxiliary } = placement;
    const group = new THREE.Group(); group.position.set(placement.x, 0, placement.z);
    group.userData.keyId = item.id; group.userData.matrix = item.matrix; root.add(group);
    const keyMaterial = new THREE.MeshStandardMaterial({ color: auxiliary ? FINISHES[finish] : '#29313c', metalness: auxiliary ? .65 : .1, roughness: auxiliary ? .38 : .49 });
    const cap = addBox(group, w, auxiliary ? 3.2 : 5.7, d, 0, auxiliary ? 16.5 : 18.8, 0, keyMaterial, auxiliary ? 1 : 1.5);
    if (!auxiliary) {
      const vertices = cap.geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) {
        const taper = 1 - (vertices.getY(i) / 5.7 + .5) * .055;
        vertices.setX(i, vertices.getX(i) * taper); vertices.setZ(i, vertices.getZ(i) * taper);
      }
      vertices.needsUpdate = true; cap.geometry.computeVertexNormals();
      const frost = new THREE.MeshPhysicalMaterial({ color: '#8490a1', transparent: true, opacity: .24, metalness: .05, roughness: .43, clearcoat: .38, depthWrite: false });
      addBox(group, w - .7, 2.7, d - .7, 0, 22.3, 0, frost, 1.2);
      const inset = addBox(group, w > 20 ? w - 4 : 14.3, .8, d > 20 ? d - 4 : 14.3, 0, 23.9, 0, new THREE.MeshStandardMaterial({ color: '#505b6a', roughness: .56, metalness: .08 }), .4);
      // Circular/stadium finger surfaces on the factory Frost caps.
      inset.geometry.dispose();
      const faceShape = roundedPath(w > 20 ? w - 4 : 14.3, d > 20 ? d - 4 : 14.3, 7.15);
      const faceGeometry = new THREE.ExtrudeGeometry(faceShape, { depth: .7, bevelEnabled: true, bevelThickness: .22, bevelSize: .22, bevelSegments: 2, curveSegments: 20 });
      faceGeometry.rotateX(-Math.PI / 2); inset.geometry = faceGeometry; inset.position.y = 23.2;
      // The dark cross is the visible stem, not a printed legend.
      for (const offset of w > 20 ? [-11, 0, 11] : d > 20 ? [-11, 0, 11] : [0]) {
        const cx = w > 20 ? offset : 0, cz = d > 20 ? offset : 0;
        addBox(group, 4.8, .13, 1.5, cx, 24.18, cz, dark, .06);
        addBox(group, 1.5, .13, 4.8, cx, 24.18, cz, dark, .06);
      }
    } else {
      addBox(group, .3, .18, 9, w / 2 - 2.5, 18.25, 0, bevelMetal, .05);
    }
    const ring = new THREE.Mesh(ringShape(w, d), new THREE.MeshBasicMaterial({ color: '#c8f135', side: THREE.DoubleSide }));
    ring.position.y = auxiliary ? 18.6 : 24.55; ring.visible = false; group.add(ring);
    const label = addLabel(group, [item.label], Math.min(w - 1, 26), 5.6, 0, auxiliary ? 18.8 : 24.7, 0, false, true);
    label.userData.portraitWidth = Math.min(w - 1, 26); label.userData.landscapeWidth = Math.min(d - 1, 26);
    keyMeshes.push({ group, ring, label, material: keyMaterial, restY: 0, id: item.id, matrix: item.matrix });
  }

  // Frosted RF antenna window; this is not a display or dongle compartment.
  const antenna = addBox(root, 22.1, 6.2, 27.5, 43.9, 13.2, -53.25,
    new THREE.MeshPhysicalMaterial({ color: '#263039', roughness: .55, metalness: .05, transparent: true, opacity: .81, clearcoat: .6 }), 1.4);
  antenna.userData.part = 'antenna';
  addBox(root, 14, 1, 19, 43.9, 12, -53, dark);

  // Horizontal roller: cylinder axis follows the portrait horizontal direction.
  const rollerGroup = new THREE.Group(); rollerGroup.position.set(42.4, 16.4, 43.5); rollerGroup.userData.part = 'roller'; root.add(rollerGroup);
  addBox(root, 15.3, .4, 24, 42.4, 13, 43.5, dark, 1);
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 11.5, 64), bevelMetal);
  roller.rotation.z = Math.PI / 2; rollerGroup.add(roller); roller.castShadow = true;
  for (let i = 0; i < 48; i++) {
    const angle = i / 48 * Math.PI * 2;
    const rib = addBox(rollerGroup, 11.8, .32, .3, 0, Math.cos(angle) * 7.65, Math.sin(angle) * 7.65, metal, .12);
    rib.rotation.x = angle;
  }
  const ledMaterials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 2; i++) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, .6, 32), bevelMetal); rim.position.set(38.7 + i * 7, 16.2, 61.6); root.add(rim);
    const mat = new THREE.MeshStandardMaterial({ color: '#9da6a4', roughness: .28, emissive: '#000000' }); ledMaterials.push(mat);
    const led = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, .65, 32), mat); led.position.copy(rim.position).y += .22; led.userData.part = 'leds'; root.add(led);
  }

  // Underside nameplate and dimple panel. Screws are concealed by the rubber feet.
  const back = new THREE.Group(); back.rotation.set(0, Math.PI / 2, Math.PI); back.position.y = .05; root.add(back);
  const plaque = addBox(back, 114, .5, 30, 0, .25, -33, bevelMetal, .2); plaque.userData.part = 'back';
  addBox(back, 111, .35, 27, 0, .65, -33, metal, .15);
  addLabel(back, ['NOVA KINE', 'Design by LUMINKEY', 'www.luminkey.com'], 66, 22, -20, .9, -33, finish === 'silver');
  const panel = addBox(back, 114, .5, 61, 0, .3, 17, bevelMetal, .2); panel.userData.part = 'back';
  addBox(back, 111, .35, 58, 0, .7, 17, metal, .15);
  const dimpleGeo = new THREE.CylinderGeometry(1.75, 1.75, .08, 20);
  const dimples = new THREE.InstancedMesh(dimpleGeo, new THREE.MeshStandardMaterial({ color: FINISHES[finish], roughness: .65, metalness: .4 }), 91);
  const dimpleRimGeometry = new THREE.RingGeometry(1.72, 1.94, 24); dimpleRimGeometry.rotateX(-Math.PI / 2);
  const dimpleRims = new THREE.InstancedMesh(dimpleRimGeometry, new THREE.MeshStandardMaterial({ color: '#727d83', metalness: .65, roughness: .4 }), 91);
  const dummy = new THREE.Object3D();
  for (let r = 0; r < 7; r++) for (let c = 0; c < 13; c++) {
    dummy.position.set(-48 + c * 8, .9, -7 + r * 8); dummy.updateMatrix(); dimples.setMatrixAt(r * 13 + c, dummy.matrix); dimpleRims.setMatrixAt(r * 13 + c, dummy.matrix);
  }
  back.add(dimples, dimpleRims);
  for (const x of [-63, 63]) {
    addBox(back, 5.4, 1.2, 98, x, .8, -1, rubber, .55);
    addBox(back, 1.2, .1, 93, x, 1.45, -1, dark, .05);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, .2, 20), bevelMetal); screw.position.set(x, .4, 51.2); back.add(screw);
  }
  const powerGroup = new THREE.Group(); powerGroup.position.set(49, 1.1, -33); powerGroup.userData.part = 'power'; back.add(powerGroup);
  addBox(powerGroup, 7.5, .5, 3.9, 0, 0, 0, dark, .25);
  const switchThumb = addBox(powerGroup, 3.1, 1.3, 3.1, -1.8, .55, 0, metal, .5);
  const orange = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, .12, 24), new THREE.MeshStandardMaterial({ color: '#e46522', roughness: .5 })); orange.position.y = .7; switchThumb.add(orange);
  addLabel(back, ['ON   OFF'], 12, 4, 48, 1.25, -39, finish === 'silver');

  // USB-C aperture on the upper short edge (portrait reference orientation).
  const port = new THREE.Group(); port.position.set(-11.4, 8, -KINE_SIZE.depth / 2 - .15); port.userData.part = 'usb'; root.add(port);
  addBox(port, 10.4, 4.4, .55, 0, 0, 0, bevelMetal, .25);
  addBox(port, 8.8, 3, .65, 0, 0, -.3, dark, .3);
  addBox(port, 5.8, .65, .7, 0, 0, -.65, metal, .25);
  return { root, keyMeshes, rollerGroup, switchThumb, ledMaterials };
}
