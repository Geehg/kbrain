'use client';

import type { CSSProperties } from 'react';
import { LED_SCENARIOS, resolveKineLeds, type LedScenario, type LedSettings } from './kine-led';

export default function KineLedControls({ settings, connected, onChange, onCloseup }: {
  settings: LedSettings; connected: boolean; onChange: (patch: Partial<LedSettings>) => void; onCloseup: () => void;
}) {
  const state = resolveKineLeds(settings, connected);
  const customColor = ['bt-pairing', 'receiver-pairing', 'wireless'].includes(settings.scenario);
  const battery = settings.scenario.startsWith('battery-') || settings.scenario === 'low-voltage';
  return <div className="kine-led-panel">
    <div className="kine-led-heading"><div><span>LED · LIGHT STUDY</span><strong>{state.simulated ? '안내 시뮬레이션' : 'USB 응답 기반 예상 표시'}</strong></div><button onClick={onCloseup}>LED 확대 ↗</button></div>
    <div className="kine-led-selector"><label htmlFor="kine-led-scenario">표시 상태</label><select id="kine-led-scenario" value={settings.scenario} onChange={event => onChange({ scenario: event.target.value as LedScenario })}>{LED_SCENARIOS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
    {settings.scenario === 'bt-pairing' && <div className="kine-led-slots" aria-label="페어링 예시 슬롯">{(['1', '2', '3'] as const).map(slot => <button key={slot} aria-pressed={settings.slot === slot} onClick={() => onChange({ slot })}>BT{slot}</button>)}</div>}
    <div className="kine-led-readout" aria-live="polite"><div className="kine-led-samples" aria-hidden="true" data-paused={settings.paused}>{state.signals.map((signal, i) => <i key={i} className={signal.pattern} style={{ '--led-color': signal.color } as CSSProperties} />)}</div><b>{state.title}</b></div>
    <p className="kine-led-explanation">{state.note}</p>
    <details className="kine-led-tuning"><summary>광원·점멸 세부 조정 <span>화면 전용</span></summary><div>
      {customColor && <label className="kine-led-color">VIA 색에 맞추기 <input aria-label="LED 미리보기 색" type="color" value={settings.color} onChange={event => onChange({ color: event.target.value })} /><code>{settings.color.toUpperCase()}</code></label>}
      <label className="kine-led-brightness">광원 밝기 <input aria-label="LED 광원 밝기" type="range" min="10" max="100" step="5" value={settings.brightness} onChange={event => onChange({ brightness: Number(event.target.value) })}/><span>{settings.brightness}%</span></label>
      <div className="kine-led-checks"><label><input type="checkbox" checked={settings.spill} onChange={event => onChange({ spill: event.target.checked })}/>주변 빛 번짐</label><label><input type="checkbox" checked={settings.paused} onChange={event => onChange({ paused: event.target.checked })}/>점멸 정지</label>{state.simulated && !battery && settings.scenario !== 'off' && <label><input type="checkbox" checked={settings.numLock} onChange={event => onChange({ numLock: event.target.checked })}/>Num Lock 흰색 예시</label>}</div>
      <small>무선 색·정확한 점멸 주기·Num Lock 색은 설명서에 명시되지 않아 예시로 제공합니다. 빠른 점멸은 초당 2.5회 이하이며, OS의 모션 줄이기 설정에서는 깜빡이지 않습니다.</small>
    </div></details>
  </div>;
}
