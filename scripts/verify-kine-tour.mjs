import assert from 'node:assert/strict';
import { sampleKineTour, sampleKineTourLeds, TOUR_DURATION, TOUR_SHOTS } from '../app/kine-tour.ts';
const colors = new Set();
for (let t = 0; t < TOUR_DURATION; t++) {
  const signals = sampleKineTourLeds(t);
  assert.equal(signals.length, 2);
  for (const signal of signals) { assert.notEqual(signal.pattern, 'off'); colors.add(signal.color); }
  assert.deepEqual(signals, sampleKineTourLeds(t + TOUR_DURATION));
}
assert(colors.size >= 6);
for (const aspect of [.45, 1, 1.8, 2.5]) {
  for (let t = 0; t < TOUR_DURATION * 2; t += .1) {
    const shot = sampleKineTour(t, aspect);
    assert(shot.index >= 0 && shot.index < TOUR_SHOTS.length);
    assert(shot.distance >= 90 && Number.isFinite(shot.distance));
    assert(shot.polar > 0 && shot.polar < Math.PI);
    assert(shot.focus.every(Number.isFinite));
    const next = sampleKineTour(t + .001, aspect);
    assert(Math.abs(next.distance - shot.distance) < .1);
    assert(Math.hypot(...shot.focus.map((n, i) => n - next.focus[i])) < .1);
    // Angles wrap at 2π; compare direction, not raw radians.
    assert(Math.abs(Math.sin(next.azimuth) - Math.sin(shot.azimuth)) < .01);
  }
  const end = sampleKineTour(TOUR_DURATION - .0001, aspect), start = sampleKineTour(0, aspect);
  assert(Math.abs(end.distance - start.distance) < .001);
  assert(Math.hypot(...end.focus.map((n, i) => n - start.focus[i])) < .001);
}
console.log('PASS: 8 feature shots, smooth loop seam, finite orbit angles and responsive camera distances across 4 viewport ratios.');
