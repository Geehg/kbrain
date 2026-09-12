import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const cache = new Map();
async function moduleUrl(name) {
  if (cache.has(name)) return cache.get(name);
  let code = ts.transpileModule(await readFile(new URL(`../app/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  for (const [, spec] of [...code.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const url = await moduleUrl(spec.slice(2));
    code = code.replace(`from '${spec}'`, `from '${url}'`).replace(`from "${spec}"`, `from "${url}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  cache.set(name, url); return url;
}
const { createCodexKeys, WHEEL_MODES, normalizeWheelMode } = await import(await moduleUrl('codex-preset'));
const { parseShortcut, deviceKeycode } = await import(await moduleUrl('deck-actions'));
const { transformLkKineLayout } = await import(await moduleUrl('lk-kine-profile'));
const { applyDevicePreset } = await import(await moduleUrl('apply-device-preset'));
const { ViaWebHidClient } = await import(await moduleUrl('via-webhid'));
const keys = createCodexKeys();
assert.equal(keys.length, 24);
assert.equal(normalizeWheelMode('__proto__'), 'keep');
for (const plate of ['A','B','C','D']) for (const mirror of [false,true]) for (const rotation of [0,90,180,270]) {
  const layout = transformLkKineLayout(plate, mirror, rotation);
  assert.equal(layout.cells[3].matrix, '3,0');
  assert.equal(layout.cells.length, plate === 'D' ? 24 : 21);
  layout.cells.forEach((cell, index) => assert.notEqual(deviceKeycode(keys[index], index), null));
}
for (const mode of Object.values(WHEEL_MODES)) if (mode.cw) {
  assert.notEqual(parseShortcut(mode.cw), null); assert.notEqual(parseShortcut(mode.ccw), null);
}
const assignments = [{ layer:0, address:'0,0', keycode:123, label:'test' }];
const encoder = [{ layer:0, clockwise:false, keycode:456 }];
let keyValue = 10, wheelValue = 20, writes = 0, failRead = true, failVerify = false;
const client = {
  getKeycode: async () => keyValue,
  getEncoderKeycode: async () => { if (failRead) throw Error('unsupported'); return wheelValue; },
  setKeycode: async (layer, address, value) => { writes++; keyValue = value; },
  setEncoderKeycode: async (layer, clockwise, value) => { writes++; wheelValue = value; if (failVerify) { failVerify = false; throw Error('readback failed'); } },
};
await assert.rejects(applyDevicePreset(client, assignments, encoder, () => {}), /변경하지 않았습니다/);
assert.equal(writes, 0);
failRead = false; failVerify = true;
await assert.rejects(applyDevicePreset(client, assignments, encoder, () => {}), /복원했습니다/);
assert.equal(keyValue, 10); assert.equal(wheelValue, 20);
await applyDevicePreset(client, assignments, encoder, () => {});
assert.equal(keyValue, 123); assert.equal(wheelValue, 456);
globalThis.window = globalThis;
const listeners = new Set(), packets = [], values = new Map();
const device = {
  addEventListener: (_, listener) => listeners.add(listener),
  removeEventListener: (_, listener) => listeners.delete(listener),
  sendReport: async (_, data) => {
    const packet = new Uint8Array(data); packets.push([...packet]);
    const address = `${packet[1]}:${packet[3]}`;
    if (packet[0] === 0x15) values.set(address, (packet[4] << 8) | packet[5]);
    if (packet[0] === 0x14) { const value = values.get(address) ?? 42; packet[4] = value >> 8; packet[5] = value & 255; }
    for (const listener of listeners) listener({ data: new DataView(packet.buffer), reportId:0 });
  },
};
const via = new ViaWebHidClient(device);
await via.setEncoderKeycode(0, false, 0x032b);
await via.setEncoderKeycode(0, true, 0x012b);
assert.deepEqual(packets[0].slice(0,6), [0x15,0,0,0,3,0x2b]);
assert.deepEqual(packets[2].slice(0,6), [0x15,0,0,1,1,0x2b]);
assert.equal(await via.getEncoderKeycode(0, false), 0x032b);
assert.equal(await via.getEncoderKeycode(0, true), 0x012b);
console.log('PASS: 32 layouts, Codex keys, wheel modes, unsupported preflight, readback-failure rollback, encoder packet direction and verification. No physical device writes.');
