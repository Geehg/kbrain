import type { LedSignal } from './kine-led';

// Camera targets use the same millimetre coordinates as the physical model.
// Interpolate angles, not Cartesian positions, so the camera orbits outside
// the case when travelling from the top to the underside.
type Shot = { title: string; focus: [number, number, number]; azimuth: number; polar: number; distance: number };
export const TOUR_SHOTS: readonly Shot[] = [
  { title: '전체 실루엣', focus: [0, 12, 0], azimuth: .5, polar: .72, distance: 300 },
  { title: '키캡 · 곡면과 투명 소재', focus: [-14, 24, 0], azimuth: .15, polar: .48, distance: 185 },
  { title: 'E0 휠 · 금속 가공 질감', focus: [42, 14, 42], azimuth: 1, polar: .85, distance: 115 },
  { title: '매립형 LED · 렌즈 디테일', focus: [42, 15, 60], azimuth: 1.1, polar: .65, distance: 95 },
  { title: '보조 키 · 알루미늄 프레임', focus: [42, 15, -6], azimuth: 1.6, polar: .85, distance: 175 },
  { title: 'USB-C · 측면 프로파일', focus: [-11, 8, -58], azimuth: 3.14, polar: 1.42, distance: 230 },
  { title: '뒷면 · 명판과 전원 스위치', focus: [0, 4, 0], azimuth: 3.9, polar: 2.65, distance: 300 },
  { title: '플로팅 · 반사광과 윤곽', focus: [0, 12, 0], azimuth: 5.4, polar: 1.05, distance: 310 },
];
export const TOUR_SHOT_SECONDS = 8;
export const TOUR_DURATION = TOUR_SHOTS.length * TOUR_SHOT_SECONDS;
// Screen-only art direction, deliberately independent of device telemetry and
// saved LED preferences. A separate pair accompanies each camera chapter.
const TOUR_LED_PAIRS: readonly [LedSignal, LedSignal][] = [
  [{ color: '#eff8ff', pattern: 'steady' }, { color: '#00ddd0', pattern: 'spectrum' }],
  [{ color: '#168cff', pattern: 'breathe' }, { color: '#9959ff', pattern: 'breathe' }],
  [{ color: '#ffb13c', pattern: 'steady' }, { color: '#12d5ca', pattern: 'breathe' }],
  [{ color: '#eff8ff', pattern: 'steady' }, { color: '#00ddd0', pattern: 'spectrum' }],
  [{ color: '#18d96f', pattern: 'breathe' }, { color: '#268bff', pattern: 'breathe' }],
  [{ color: '#ff7140', pattern: 'warning' }, { color: '#eff8ff', pattern: 'steady' }],
  [{ color: '#9959ff', pattern: 'breathe' }, { color: '#268bff', pattern: 'steady' }],
  [{ color: '#12d5ca', pattern: 'steady' }, { color: '#00ddd0', pattern: 'spectrum' }],
];
export function sampleKineTourLeds(seconds: number) {
  const time = ((seconds % TOUR_DURATION) + TOUR_DURATION) % TOUR_DURATION;
  return TOUR_LED_PAIRS[Math.floor(time / TOUR_SHOT_SECONDS)];
}
export function sampleKineTour(seconds: number, aspect: number) {
  const time = ((seconds % TOUR_DURATION) + TOUR_DURATION) % TOUR_DURATION;
  const index = Math.floor(time / TOUR_SHOT_SECONDS);
  const a = TOUR_SHOTS[index], b = TOUR_SHOTS[(index + 1) % TOUR_SHOTS.length];
  // Briefly dwell on each feature, then ease into the next shot.
  const progress = Math.max(0, Math.min(1, (time % TOUR_SHOT_SECONDS - 1.5) / 6.5));
  const t = (1 - Math.cos(progress * Math.PI)) / 2;
  const mix = (x: number, y: number) => x + (y - x) * t;
  const delta = Math.atan2(Math.sin(b.azimuth - a.azimuth), Math.cos(b.azimuth - a.azimuth));
  return {
    index, title: a.title,
    focus: a.focus.map((n, i) => mix(n, b.focus[i])) as [number, number, number],
    azimuth: a.azimuth + delta * t,
    polar: mix(a.polar, b.polar),
    distance: mix(a.distance, b.distance) * Math.max(1, .9 / Math.max(.2, aspect)),
  };
}
