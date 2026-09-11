import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../app/key-sound.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { mechanicalKeySamples, MechanicalKeyAudio } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
for (const rate of [22050, 44100, 48000, 96000]) {
  const samples = mechanicalKeySamples(rate);
  assert.equal(samples.length, Math.ceil(rate * .24));
  assert.ok(samples.every(Number.isFinite));
  assert.ok(samples.every(value => Math.abs(value) < .6), 'Headroom for overlapping clicks');
  assert.equal(Math.abs(samples[0]), 0); assert.equal(Math.abs(samples.at(-1)), 0);
  const energy = (from, to) => samples.slice(rate * from, rate * to).reduce((sum, value) => sum + value * value, 0);
  assert.ok(energy(.001, .03) > energy(.08, .11) * 100, 'Short mechanical attack, not a constant tone');
  assert.ok(energy(.16, .19) > energy(.12, .15) * 100, 'Audible release click');
}
let created = 0, buffers = 0, contexts = 0, closed = 0;
const live = new Set();
const context = {
  state: 'running', sampleRate: 48000, destination: {},
  createBuffer() { buffers++; return { copyToChannel() {} }; },
  createBufferSource() {
    created++;
    const node = { playbackRate: {}, connect() {}, disconnect() {}, start() { live.add(node); }, stop() { live.delete(node); node.onended?.(); } };
    return node;
  },
  createGain() { return { gain: {}, connect() {}, disconnect() {} }; },
  close() { closed++; return Promise.resolve(); },
};
const player = new MechanicalKeyAudio(() => { contexts++; return context; });
assert.equal(contexts, 0, 'No audio before user interaction');
await player.play(0); assert.equal(contexts, 0, 'Zero volume cannot start audio');
for (let i = 0; i < 25; i++) assert.equal(await player.play(.35), true);
assert.equal(created, 25); assert.equal(contexts, 1); assert.equal(buffers, 1);
assert.equal(live.size, 8, 'Rapid clicks are bounded to eight voices');
player.stop(); assert.equal(live.size, 0, 'Mute stops ongoing sound');
player.dispose(); assert.equal(closed, 1, 'Unmount closes the audio context');
let resolveResume;
context.state = 'suspended';
context.resume = () => new Promise(resolve => { resolveResume = () => { context.state = 'running'; resolve(); }; });
const waitingPlayer = new MechanicalKeyAudio(() => context);
const pending = waitingPlayer.play(.35);
waitingPlayer.stop(); resolveResume(); await pending;
assert.equal(live.size, 0, 'Muting cancels sound awaiting browser permission');
waitingPlayer.dispose();
assert.equal(await new MechanicalKeyAudio(() => { throw Error('not supported'); }).play(.5), false, 'Unavailable audio fails without breaking key selection');
console.log('PASS: mechanical click synthesis at four sample rates; click/release envelopes, finite samples, headroom, lazy audio, mute, context reuse/cleanup, polyphony cap, resume cancellation and unsupported audio.');
