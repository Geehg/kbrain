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
  for (const rotation of [0, 90, 180, 270]) {
    const twoD = transformLkKineLayout(plate, mirrored, rotation).cells;
    assert.deepEqual(twoD.map(k => k.matrix), placements.filter(k => !k.auxiliary).map(k => k.matrix));
    model.root.rotation.y = -rotation * Math.PI / 180; model.root.updateMatrixWorld(true);
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
console.log(`PASS: ${configurations} plate/mirror/rotation combinations; matrix identity, bounds, non-overlap, front selection and underside occlusion.`);
