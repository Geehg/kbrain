import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';

// Exercise actual source geometry without a WebGL context. No generated files.
const modules = new Map();
async function sourceModule(name) {
  if (modules.has(name)) return modules.get(name);
  let code = ts.transpileModule(await readFile(new URL(`../app/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  for (const match of [...code.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1];
    const url = specifier.startsWith('./') ? await sourceModule(specifier.slice(2)) : import.meta.resolve(specifier);
    code = code.replace(`from '${specifier}'`, `from '${url}'`).replace(`from "${specifier}"`, `from "${url}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  modules.set(name, url); return url;
}
const { kineKeyPlacements, KINE_SIZE } = await import(await sourceModule('kine-geometry'));
const { LK_KINE_PLATES, transformLkKineLayout } = await import(await sourceModule('lk-kine-profile'));
const { createKineModel, disposeModel } = await import(await sourceModule('kine-model'));
const { frostDishGeometry } = await import(await sourceModule('kine-detail-geometry'));
// Regress the FIGMA/APPROVE triangular gap: every contour must close exactly,
// including 2u caps along either intrinsic axis, before orientation is applied.
for (const [width, depth] of [[14.3, 14.3], [33.6, 14.3], [14.3, 33.6]]) {
  const geometry = frostDishGeometry(width, depth);
  for (const name of ['position', 'normal', 'uv']) {
    const attribute = geometry.getAttribute(name);
    for (let ring = 0; ring < 9; ring++) for (let component = 0; component < attribute.itemSize; component++) {
      const first = attribute.array[(ring * 81) * attribute.itemSize + component], last = attribute.array[(ring * 81 + 80) * attribute.itemSize + component];
      assert.ok(Math.abs(first - last) < 1e-6, `${width}x${depth}: ${name} ring ${ring} has an open seam (${first} vs ${last})`);
    }
  }
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const radius = Math.min(width, depth) / 2, ex = width / 2 - radius, ez = depth / 2 - radius;
  for (let ix = -18; ix <= 18; ix++) for (let iz = -18; iz <= 18; iz++) {
    const x = ix / 18 * width / 2, z = iz / 18 * depth / 2;
    if (Math.hypot(Math.max(Math.abs(x) - ex, 0), Math.max(Math.abs(z) - ez, 0)) >= radius * .94) continue;
    const hit = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
    assert.ok(hit, `${width}x${depth}: missing cap surface at ${x},${z}`);
  }
  geometry.dispose(); mesh.material.dispose();
}
const { DEFAULT_LED_SETTINGS, LED_SCENARIOS, resolveKineLeds, ledLevel } = await import(await sourceModule('kine-led'));
const automatic = connected => resolveKineLeds(DEFAULT_LED_SETTINGS, connected);
assert.deepEqual(automatic(false).signals.map(s => s.pattern), ['off', 'off']);
assert.equal(automatic(true).signals[1].color, '#ff3020');
assert.equal(automatic(true).signals[0].pattern, 'off', 'USB cannot establish Num Lock state');
assert.equal(automatic(false).signals[1].pattern, 'off', 'Disconnect clears expected USB lighting');
assert.equal(resolveKineLeds({ ...DEFAULT_LED_SETTINGS, numLock: true }, true).signals[0].pattern, 'off', 'Preview Num Lock cannot contaminate automatic mode');
for (const [scenario] of LED_SCENARIOS) {
  const settings = { ...DEFAULT_LED_SETTINGS, scenario };
  const state = resolveKineLeds(settings, false);
  assert.equal(state.simulated, scenario !== 'auto');
  for (const signal of state.signals) for (let elapsed = 0; elapsed < 2000; elapsed += 10) {
    const value = ledLevel(signal, elapsed, false);
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, 'LED intensity bounded');
    assert.equal(ledLevel(signal, elapsed, true), signal.pattern === 'off' ? 0 : 1, 'Paused/reduced motion never flashes');
  }
}
const pairing = resolveKineLeds({ ...DEFAULT_LED_SETTINGS, scenario: 'bt-pairing', slot: '3', color: '#22dd55' }, false);
assert.match(pairing.title, /BT3/); assert.match(pairing.note, /LK-KINE-BT3/);
assert.equal(pairing.signals[1].color, '#22dd55');
assert.equal(ledLevel(pairing.signals[1], 100, false), 1); assert.equal(ledLevel(pairing.signals[1], 250, false), 0);
for (const [scenario, count, color] of [['battery-high', 2, '#43ed72'], ['battery-mid', 1, '#43ed72'], ['battery-low', 1, '#ffd83d']]) {
  const state = resolveKineLeds({ ...DEFAULT_LED_SETTINGS, scenario }, false);
  assert.equal(state.signals.filter(s => s.pattern !== 'off').length, count);
  assert.equal(state.signals[1].color, color);
}
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ roundRect() {}, fill() {}, fillText() {} }) }) };
let configurations = 0;
for (const plate of ['A', 'B', 'C', 'D']) for (const mirrored of [false, true]) {
  const placements = kineKeyPlacements(plate, mirrored);
  assert.equal(placements.length, LK_KINE_PLATES[plate].length + 3);
  assert.equal(new Set(placements.map(k => k.matrix)).size, placements.length);
  for (const [i, key] of placements.entries()) {
    assert.ok(Math.abs(key.x) + key.width / 2 <= KINE_SIZE.width / 2, `${plate} ${key.matrix} outside width`);
    assert.ok(Math.abs(key.z) + key.depth / 2 <= KINE_SIZE.depth / 2, `${plate} ${key.matrix} outside depth`);
    for (const other of placements.slice(i + 1)) {
      const overlapX = Math.abs(key.x - other.x) < (key.width + other.width) / 2;
      const overlapZ = Math.abs(key.z - other.z) < (key.depth + other.depth) / 2;
      assert.ok(!(overlapX && overlapZ), `${plate}: ${key.matrix} overlaps ${other.matrix}`);
    }
  }
  const keys = placements.map(k => ({ id: k.matrix, matrix: k.matrix, label: k.matrix, glyph: 'NK', protected: false }));
  const model = createKineModel(plate, mirrored, keys, 'silver');
  assert.equal(model.cable.visible, false, 'No cable before USB confirmation');
  assert.equal(model.cable.position.z, -KINE_SIZE.depth / 2 - .15, 'Cable is anchored to the actual rear USB port');
  const cableBounds = new THREE.Box3().setFromObject(model.cable);
  assert.ok(cableBounds.max.z < -KINE_SIZE.depth / 2 + 1, 'Cable cannot pass through the keys or case');
  assert.ok(cableBounds.min.y > 0, 'Flexible jacket must not dip below the base plane');
  assert.ok(model.framingBounds.min.z > cableBounds.min.z + 60, 'Free cable tail must not shrink the default camera fit');
  model.cable.visible = true;
  model.keyMeshes.forEach(k => { k.label.visible = false; });
  model.root.updateMatrixWorld(true);
  const surfaceAt = (x, z) => new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0))
    .intersectObject(model.root, true).find(hit => hit.object.visible);
  const wheel = surfaceAt(42.4, 43.5);
  assert.equal(wheel.object.name, 'machined-roller');
  assert.ok(wheel.point.y > 18 && wheel.point.y < 20, 'Only the upper roller arc is proud of the deck');
  for (const x of [38.7, 45.7]) {
    const lens = surfaceAt(x, 61.6);
    assert.equal(lens.object.name, 'recessed-indicator-lens', 'LED aperture must expose its lens');
    assert.ok(lens.point.y < 15.6, 'Indicator lens must be below the metal deck');
  }
  for (const key of placements.filter(k => k.auxiliary)) {
    const pocket = surfaceAt(key.x + key.width / 2 - 1, key.z);
    const top = surfaceAt(key.x, key.z);
    assert.equal(pocket.object.name, 'auxiliary-pocket-floor', 'Finger pocket has a solid floor');
    assert.ok(top.point.y - pocket.point.y > .7, 'Finger pocket must be genuinely recessed');
    const side = new THREE.Raycaster(new THREE.Vector3(100, 13, key.z), new THREE.Vector3(-1, 0, 0)).intersectObject(model.root, true)[0];
    assert.ok(side.point.x < 34, 'Undercut below auxiliary keys must be open at the case edge');
  }
  for (const key of model.keyMeshes.filter(k => k.group.getObjectByName('dished-frost-cap'))) {
    const face = key.group.getObjectByName('dished-frost-cap');
    const position = face.geometry.getAttribute('position');
    assert.ok(position.getY(5 * 81) - position.getY(0) > .5, 'Frost cap has a raised curved lip');
  }
  model.root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const attribute of Object.values(object.geometry.attributes)) assert.ok([...attribute.array].every(Number.isFinite), `${object.name}: finite mesh attributes`);
  });
  model.keyMeshes.forEach(k => { k.label.visible = true; });
  for (const rotation of [0, 90, 180, 270]) {
    const twoD = transformLkKineLayout(plate, mirrored, rotation).cells;
    assert.deepEqual(twoD.map(k => k.matrix), placements.filter(k => !k.auxiliary).map(k => k.matrix));
    model.root.rotation.y = -rotation * Math.PI / 180; model.root.updateMatrixWorld(true);
    const cableOrigin = model.cable.getWorldPosition(new THREE.Vector3());
    const expectedOrigin = new THREE.Vector3(-11.4, 8, -KINE_SIZE.depth / 2 - .15).applyMatrix4(model.root.matrixWorld);
    assert.ok(cableOrigin.distanceTo(expectedOrigin) < 1e-7, 'Cable stays attached through every plate/mirror/rotation');
    // Key centers must be selectable from above after every orientation change.
    for (const key of model.keyMeshes) {
      const position = key.group.getWorldPosition(new THREE.Vector3()); position.y = 100;
      const ray = new THREE.Raycaster(position, new THREE.Vector3(0, -1, 0));
      const intersections = ray.intersectObject(model.root, true).filter(hit => hit.object.visible);
      let object = intersections[0]?.object;
      while (object && !object.userData.keyId) object = object.parent;
      assert.equal(object?.userData.keyId, key.id, `${plate}/${rotation}: key ${key.id} occluded`);
      position.y = -100;
      ray.set(position, new THREE.Vector3(0, 1, 0));
      let under = ray.intersectObject(model.root, true)[0]?.object;
      while (under && !under.userData.keyId) under = under.parent;
      assert.equal(under?.userData.keyId, undefined, 'Cannot select a key through the underside');
    }
    configurations++;
  }
  disposeModel(model.root);
}
console.log(`PASS: ${configurations} plate/mirror/rotation combinations; cable attachment/clearance/framing; key matrix identity, bounds, non-overlap, selection/occlusion, recessed LED/roller/pocket geometry; all 10 LED scenarios, USB connect/disconnect, battery colors/counts, blink phases and reduced motion.`);
