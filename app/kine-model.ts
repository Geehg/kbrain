import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { KINE_SIZE, kineKeyPlacements } from './kine-geometry';
import { edgeRecessOutline, frostDishGeometry, frostStemTexture, knurledRollerGeometry, ledHaloTexture, machinedUV, metalGrainTexture } from './kine-detail-geometry';
import type { MatrixAddress, PlateId } from './lk-kine-profile';

export type Finish = 'silver' | 'gray' | 'black';
export type ModelKey = { id: string; matrix: MatrixAddress; label: string; glyph: string; protected: boolean };
export type ModelPart = 'antenna' | 'roller' | 'power' | 'usb' | 'leds' | 'back';
export type KeyMesh = { group: THREE.Group; ring: THREE.Mesh; label: THREE.Mesh; material: THREE.MeshStandardMaterial; restY: number; id: string; matrix: MatrixAddress };
export const FINISHES = { silver: '#c4c6c2', gray: '#626970', black: '#252a2e' };

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
  const grain = metalGrainTexture();
  const metal = new THREE.MeshStandardMaterial({ color: FINISHES[finish], metalness: .78, roughness: .54, roughnessMap: grain, bumpMap: grain, bumpScale: .018 });
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
  addBox(root, KINE_SIZE.width, 7.8, KINE_SIZE.depth, 0, 5.75, 0, metal, 2.2);
  const bodyShape = edgeRecessOutline(KINE_SIZE.width, KINE_SIZE.depth, 4, 24.2, 56.4, 5, .6);
  bodyShape.holes.push(shiftedPath(15.4, 19.2, 2, 42.4, 43.5));
  const upperBody = new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape, { depth: 3.05, bevelEnabled: false, curveSegments: 12 }), metal);
  upperBody.rotation.x = -Math.PI / 2; upperBody.position.y = 9.65; upperBody.castShadow = true; upperBody.receiveShadow = true; root.add(upperBody);

  // A true cut-out upper shell: wells remain recessed when viewed obliquely.
  const shell = edgeRecessOutline(KINE_SIZE.width, KINE_SIZE.depth, 4, 24.2, 56.4, 5, .6);
  shell.holes.push(shiftedPath(77.4, 20.3, 2, -11.7, -50.5));
  shell.holes.push(shiftedPath(77.4, 96.3, 2, -11.7, 11.3));
  shell.holes.push(shiftedPath(15.4, 19.2, 2, 42.4, 43.5));
  shell.holes.push(shiftedPath(22.3, 28, 1.4, 43.9, -53.25));
  for (let i = 0; i < 2; i++) {
    const hole = new THREE.Path(); hole.absarc(38.7 + i * 7, -61.6, 2.15, 0, Math.PI * 2, false); shell.holes.push(hole);
  }
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shell, { depth: 3.2, bevelEnabled: true, bevelThickness: .4, bevelSize: .4, bevelSegments: 2, curveSegments: 12 }), metal);
  frame.rotation.x = -Math.PI / 2; frame.position.y = 12.7; frame.castShadow = true; frame.receiveShadow = true; root.add(frame);
  const raisedShape = roundedPath(88.9, KINE_SIZE.depth, 3.7);
  raisedShape.holes.push(shiftedPath(77.4, 20.3, 2, -.325, -50.5));
  raisedShape.holes.push(shiftedPath(77.4, 96.3, 2, -.325, 11.3));
  const surroundSeam = new THREE.Mesh(new THREE.ExtrudeGeometry(raisedShape, { depth: .16, bevelEnabled: false }), dark);
  surroundSeam.rotation.x = -Math.PI / 2; surroundSeam.position.set(-11.375, 16.05, 0); root.add(surroundSeam);
  const raised = new THREE.Mesh(new THREE.ExtrudeGeometry(raisedShape, { depth: 1.65, bevelEnabled: true, bevelThickness: .3, bevelSize: .5, bevelSegments: 2 }), metal);
  raised.rotation.x = -Math.PI / 2; raised.position.set(-11.375, 16.25, 0); raised.castShadow = true; raised.receiveShadow = true; root.add(raised);
  addBox(root, 77.3, .5, 20.2, -11.7, 13, -50.5, dark);
  addBox(root, 77.3, .5, 96.2, -11.7, 13, 11.3, dark);
  addBox(root, 23.7, .25, 56, 43.6, 9.8, -5, dark, .1);
  addBox(root, .4, .2, 131, 32.95, 18.05, 0, bevelMetal, .1);
  // The dock is open at the outer edge, with a real undercut below the keys.
  addBox(root, .25, 5, 55.6, 31.75, 12.2, -5, dark, .1);

  const ringShape = (w: number, d: number) => {
    const shape = roundedPath(w + .8, d + .8, 2.2);
    shape.holes.push(roundedPath(w - .5, d - .5, 1.7));
    const geometry = new THREE.ShapeGeometry(shape, 16); geometry.rotateX(-Math.PI / 2); return geometry;
  };
  const faceMaterials = new Map<string, THREE.MeshPhysicalMaterial>();
  const frost = new THREE.MeshPhysicalMaterial({ color: '#a2a7ac', transparent: true, opacity: .18, metalness: .04, roughness: .38, clearcoat: .65, clearcoatRoughness: .3, depthWrite: false });
  for (const placement of kineKeyPlacements(plate, mirrored)) {
    const item = keysByAddress.get(placement.matrix);
    if (!item) continue;
    const { width: w, depth: d, auxiliary } = placement;
    const group = new THREE.Group(); group.position.set(placement.x, 0, placement.z);
    group.userData.keyId = item.id; group.userData.matrix = item.matrix; root.add(group);
    const keyMaterial = new THREE.MeshStandardMaterial({ color: auxiliary ? FINISHES[finish] : '#24292e', metalness: auxiliary ? .78 : .12, roughness: auxiliary ? .54 : .43, ...(auxiliary ? { roughnessMap: grain, bumpMap: grain, bumpScale: .018 } : {}) });
    const cap = addBox(group, w, auxiliary ? 2.2 : 5.7, d, 0, auxiliary ? 16.1 : 18.8, 0, keyMaterial, auxiliary ? .24 : 1.15);
    cap.name = auxiliary ? 'auxiliary-pocket-floor' : 'smoky-key-skirt';
    if (!auxiliary) {
      const vertices = cap.geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) {
        const taper = 1 - (vertices.getY(i) / 5.7 + .5) * .095;
        vertices.setX(i, vertices.getX(i) * taper); vertices.setZ(i, vertices.getZ(i) * taper);
      }
      vertices.needsUpdate = true; cap.geometry.computeVertexNormals();
      addBox(group, w - .85, 2, d - .85, 0, 22.3, 0, frost, .85);
      const fw = w > 20 ? w - 4 : 14.3, fd = d > 20 ? d - 4 : 14.3, signature = `${fw}/${fd}`;
      let faceMaterial = faceMaterials.get(signature);
      if (!faceMaterial) {
        faceMaterial = new THREE.MeshPhysicalMaterial({ map: frostStemTexture(fw, fd), roughness: .5, metalness: .08, clearcoat: .32, clearcoatRoughness: .38 });
        faceMaterials.set(signature, faceMaterial);
      }
      const faceGeometry = frostDishGeometry(fw, fd);
      const face = new THREE.Mesh(faceGeometry, faceMaterial); face.name = 'dished-frost-cap'; face.castShadow = true; group.add(face);
      const lens = new THREE.Mesh(faceGeometry, frost); lens.position.y = .12; group.add(lens);
    } else {
      const shape = edgeRecessOutline(w, d, .55, 3.3, 9.2, 0, 1.35);
      const top = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .85, bevelEnabled: true, bevelSize: .11, bevelThickness: .08, bevelSegments: 2, curveSegments: 12 }), keyMaterial);
      top.rotation.x = -Math.PI / 2; top.position.y = 17.2; top.name = 'auxiliary-pocket-rim'; top.castShadow = true; top.receiveShadow = true; group.add(top);
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
  const rollerGroup = new THREE.Group(); rollerGroup.position.set(42.4, 11.7, 43.5); rollerGroup.userData.part = 'roller'; root.add(rollerGroup);
  addBox(root, 15.3, .25, 19.1, 42.4, 9.85, 43.5, dark, 1);
  const roller = new THREE.Mesh(knurledRollerGeometry(), bevelMetal);
  roller.name = 'machined-roller'; rollerGroup.add(roller); roller.castShadow = true; roller.receiveShadow = true;
  for (const x of [-5.92, 5.92]) {
    const end = new THREE.Mesh(new THREE.CylinderGeometry(7.04, 7.04, .16, 64), dark);
    end.rotation.z = Math.PI / 2; end.position.x = x; rollerGroup.add(end);
  }
  const ledMaterials: THREE.MeshStandardMaterial[] = [];
  const ledLights: THREE.PointLight[] = [], ledHalos: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  const ledCores: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>[] = [];
  const haloTexture = ledHaloTexture();
  const boreMaterial = new THREE.MeshStandardMaterial({ color: '#626765', metalness: .72, roughness: .43, side: THREE.DoubleSide });
  for (let i = 0; i < 2; i++) {
    const bore = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(1.83, 14.45), new THREE.Vector2(1.83, 15.52), new THREE.Vector2(2.15, 15.95), new THREE.Vector2(2.48, 16.25)], 48), boreMaterial);
    bore.name = 'recessed-indicator-bore'; bore.position.set(38.7 + i * 7, 0, 61.6); bore.userData.part = 'leds'; root.add(bore);
    const mat = new THREE.MeshPhysicalMaterial({ color: i ? '#c5cac7' : '#51585a', roughness: i ? .36 : .64, clearcoat: .8, clearcoatRoughness: .23, emissive: '#000000' }); ledMaterials.push(mat);
    const led = new THREE.Mesh(i ? new THREE.SphereGeometry(1.78, 40, 20) : new THREE.CylinderGeometry(1.78, 1.78, .18, 40), mat);
    if (i) led.scale.y = .3;
    led.position.set(38.7 + i * 7, 14.85, 61.6); led.name = 'recessed-indicator-lens'; led.userData.part = 'leds'; root.add(led);
    // A color-preserving emitter inside the bore avoids ACES bleaching the
    // saturated LED into white. The physical lens still supplies depth/speculars.
    const core = new THREE.Mesh(new THREE.CircleGeometry(1.67, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    core.rotation.x = -Math.PI / 2; core.position.set(38.7 + i * 7, 15.43, 61.6); core.raycast = () => {};
    core.name = 'color-preserving-led-emitter'; root.add(core); ledCores.push(core);
    const light = new THREE.PointLight('#ffffff', 0, 18, 2);
    light.position.set(38.7 + i * 7, 16.8, 61.6); root.add(light); ledLights.push(light);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false, toneMapped: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(38.7 + i * 7, 16.34, 61.6); halo.raycast = () => {};
    root.add(halo); ledHalos.push(halo);
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
  // Keep the trailing cable out of auto-framing: a hidden accessory must never
  // shrink the device, and its free end is allowed to leave the product viewport.
  const framingBounds = new THREE.Box3().setFromObject(root);
  const cable = new THREE.Group(); cable.name = 'connected-usb-cable';
  cable.position.copy(port.position); cable.userData.part = 'usb'; cable.visible = false;
  root.add(cable);
  const jacket = new THREE.MeshStandardMaterial({ color: '#202528', roughness: .72, metalness: .03 });
  const moulding = new THREE.MeshStandardMaterial({ color: '#353a3b', roughness: .56, metalness: .08 });
  const plugMetal = new THREE.MeshStandardMaterial({ color: '#bfc8ce', roughness: .25, metalness: .94 });
  // Most of the USB-C metal shell is inside the receptacle; only the lip shows.
  addBox(cable, 8.25, 2.65, 1.8, 0, 0, -.55, plugMetal, .8).name = 'usb-plug-lip';
  addBox(cable, 10.6, 6.1, 16.8, 0, 0, -9.6, jacket, 1.4).name = 'usb-plug-housing';
  addBox(cable, 10.64, .18, 14.5, 0, -.1, -9.9, moulding, .08);
  addBox(cable, 8.9, .18, 9.3, 0, 3.05, -10.1, moulding, .08);
  addLabel(cable, ['USB-C'], 5.4, 2.3, 0, 3.16, -10.1);
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.8, 10, 32), jacket);
  relief.rotation.x = -Math.PI / 2; relief.position.z = -22; relief.castShadow = true; relief.receiveShadow = true; cable.add(relief);
  for (let i = 0; i < 6; i++) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(2.65 - i * .07, .2, 8, 32), moulding);
    collar.position.z = -18.6 - i * 1.25; collar.castShadow = true; cable.add(collar);
  }
  const leadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, -26), new THREE.Vector3(0, -.15, -34),
    new THREE.Vector3(-3, -2, -48), new THREE.Vector3(-17, -5.6, -65),
    new THREE.Vector3(-43, -5.6, -72), new THREE.Vector3(-72, -5.6, -91),
    new THREE.Vector3(-190, -5.6, -135), new THREE.Vector3(-410, -5.6, -170),
  ]);
  const lead = new THREE.Mesh(new THREE.TubeGeometry(leadCurve, 192, 2.1, 16, false), jacket);
  lead.name = 'usb-flexible-lead'; lead.castShadow = true; lead.receiveShadow = true; cable.add(lead);
  root.traverse(object => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && object.material.bumpMap === grain) machinedUV(object.geometry);
  });
  return { root, keyMeshes, rollerGroup, switchThumb, ledMaterials, ledLights, ledHalos, ledCores, cable, framingBounds };
}
