export type LedScenario = 'auto' | 'usb' | 'bt-pairing' | 'receiver-pairing' | 'wireless' | 'battery-high' | 'battery-mid' | 'battery-low' | 'low-voltage' | 'off';
export type LedPattern = 'off' | 'steady' | 'pairing' | 'warning';
export type LedSignal = { color: string; pattern: LedPattern };
export type LedSettings = { scenario: LedScenario; slot: '1' | '2' | '3'; color: string; brightness: number; spill: boolean; paused: boolean; numLock: boolean };
export const DEFAULT_LED_SETTINGS: LedSettings = { scenario: 'auto', slot: '1', color: '#438dff', brightness: 75, spill: true, paused: false, numLock: false };
export const LED_SCENARIOS: [LedScenario, string][] = [
  ['auto', 'USB 연결 상태 기준'], ['usb', 'USB 기본 점등 예시'], ['bt-pairing', 'Bluetooth 페어링 예시'],
  ['receiver-pairing', '2.4GHz 페어링 예시'], ['wireless', '사용자 색상 · 지속 점등'],
  ['battery-high', '배터리 확인 · 50% 이상'], ['battery-mid', '배터리 확인 · 30–49%'],
  ['battery-low', '배터리 확인 · 30% 미만'], ['low-voltage', '저전압 경고 예시'], ['off', '소등 예시'],
];
const off = (): LedSignal => ({ color: '#000000', pattern: 'off' });
const on = (color: string, pattern: LedPattern = 'steady'): LedSignal => ({ color, pattern });

// Manual pp. 03/04/09/11. No firmware telemetry is inferred from a preview.
export function resolveKineLeds(settings: LedSettings, usbConnected: boolean) {
  const { scenario } = settings;
  let signals: [LedSignal, LedSignal] = [off(), off()];
  let title = 'USB 응답 없음 · LED 상태 미확인';
  let note = '실제 LED·Num Lock·무선·배터리 상태는 수신되지 않습니다. 소등 표시는 연결 확인 전의 화면 표현입니다.';
  const simulated = scenario !== 'auto';
  if (scenario === 'auto' && usbConnected) {
    signals[1] = on('#ff3020'); title = 'USB 응답 확인 · 기본 빨강 예상 표시';
    note = 'VIA 연결 응답을 기준으로 한 예상 표시입니다. 실제 LED를 읽은 값이 아니며 VIA에서 변경한 색과 다를 수 있습니다.';
  } else if (scenario === 'usb') {
    signals[1] = on('#ff3020'); title = 'USB 유선 · 기본 빨강'; note = '설명서 p03의 기본 색상입니다. 기기에서 색을 변경했다면 사용자 색상 예시를 이용하세요.';
  } else if (scenario === 'bt-pairing' || scenario === 'receiver-pairing') {
    signals[1] = on(settings.color, 'pairing');
    title = scenario === 'bt-pairing' ? `BT${settings.slot} · 페어링 빠른 점멸` : '2.4GHz · 페어링 빠른 점멸';
    note = scenario === 'bt-pairing'
      ? `실제 BT${settings.slot} 보호 키 또는 Home(Fn)+${settings.slot}을 3–5초 유지한 뒤 LK-KINE-BT${settings.slot}을 선택하세요.`
      : '실제 Home(Fn)+4를 3–5초 유지하고, 빠른 점멸을 확인한 다음 수신기를 꽂으세요.';
    note += ' 색과 점멸 주기는 예시이며, 이 선택으로 실제 페어링이 시작되지는 않습니다.';
  } else if (scenario === 'wireless') {
    signals[1] = on(settings.color); title = '사용자 색상 · 지속 점등 예시';
    note = 'VIA에 설정한 색을 화면에 맞춰보세요. 무선 연결 완료 여부나 실제 LED 색을 읽은 결과가 아닙니다.';
  } else if (scenario.startsWith('battery-') || scenario === 'low-voltage') {
    signals = scenario === 'battery-high' ? [on('#43ed72'), on('#43ed72')]
      : [off(), on(scenario === 'battery-mid' ? '#43ed72' : scenario === 'battery-low' ? '#ffd83d' : '#ff3020', scenario === 'low-voltage' ? 'warning' : 'steady')];
    title = LED_SCENARIOS.find(([id]) => id === scenario)![1];
    note = '실제 Home+Pause를 길게 눌러 배터리를 확인하세요. 설명서 p11의 색/개수 예시이며 측정값이 아닙니다. 한 개만 켜지는 위치와 점멸 주기는 설명서에 없어 화면용으로 배치했습니다.';
  } else if (scenario === 'off') {
    title = '소등 예시'; note = '화면의 조명만 끕니다. 기기의 전원이나 LED 설정은 바뀌지 않습니다.';
  }
  if (simulated && settings.numLock && !scenario.startsWith('battery-') && scenario !== 'low-voltage' && scenario !== 'off') signals[0] = on('#eff8ff');
  return { signals, title, note, simulated };
}

// The manual says "rapid" but specifies no cadence. Preview is limited to
// 2.5 flashes/sec; reduced-motion and pause show a steady, non-flashing sample.
export function ledLevel(signal: LedSignal, elapsedMs: number, freeze: boolean) {
  if (signal.pattern === 'off') return 0;
  if (signal.pattern === 'steady' || freeze) return 1;
  const period = signal.pattern === 'pairing' ? 400 : 1100;
  const phase = ((elapsedMs % period) + period) % period;
  const rise = Math.min(1, phase / 32), fall = Math.min(1, Math.max(0, (period * .48 - phase) / 45));
  const value = Math.min(rise, fall);
  return value * value * (3 - 2 * value);
}
