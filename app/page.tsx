'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

type ActionType = 'keyboard' | 'application' | 'ai' | 'agent' | 'macro' | 'system';
type KeyConfig = {
  id: string;
  label: string;
  glyph: string;
  kind: ActionType;
  action: string;
  prompt: string;
  confirm: boolean;
  hud: boolean;
  tone?: 'dark' | 'lime';
};
type Layer = { id: string; name: string; short: string; keys: KeyConfig[] };
type Macro = { id: string; name: string; steps: string[] };
type PlateId = 'A' | 'B' | 'C' | 'D';
type Rotation = 0 | 90 | 180 | 270;
type ConnectionMode = 'usb' | '2.4g' | 'bluetooth';
type HardwareConfig = { plate: PlateId; mirrored: boolean; rotation: Rotation; connectionMode: ConnectionMode };
type DeckConfig = { version: 1; profile: string; layers: Layer[]; macros: Macro[]; hardware?: HardwareConfig; updatedAt: string };
type PhysicalKey = { col: number; row: number; width?: number; height?: number };
type HidDeviceLike = { productName: string; vendorId: number; productId: number; opened: boolean; open: () => Promise<void>; close?: () => Promise<void> };

const defaultHardware: HardwareConfig = { plate: 'A', mirrored: false, rotation: 90, connectionMode: 'usb' };

const singles = (rows: number, cols: number): PhysicalKey[] => Array.from({ length: rows * cols }, (_, index) => ({ col:(index % cols)+1, row:Math.floor(index/cols)+1 }));
const plateLayouts: Record<PlateId, PhysicalKey[]> = {
  A: [
    ...singles(2,4),
    {col:1,row:3},{col:2,row:3},{col:3,row:3},{col:4,row:3,height:2},
    {col:1,row:4},{col:2,row:4},{col:3,row:4},
    {col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5,height:2},
    {col:1,row:6,width:2},{col:3,row:6},
  ],
  B: [
    ...singles(2,4),
    {col:1,row:3,height:2},{col:2,row:3},{col:3,row:3},{col:4,row:3},
    {col:2,row:4},{col:3,row:4},{col:4,row:4},
    {col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5},
    {col:1,row:6,width:2},{col:3,row:6,width:2},
  ],
  C: [
    ...singles(1,4),
    {col:1,row:2,width:2},{col:3,row:2,width:2},
    {col:1,row:3},{col:2,row:3},{col:3,row:3},{col:4,row:3,height:2},
    {col:1,row:4},{col:2,row:4},{col:3,row:4},
    ...Array.from({length:8},(_,index)=>({col:(index%4)+1,row:Math.floor(index/4)+5})),
  ],
  D: singles(6,4),
};

const transformLayout = (plate: PlateId, mirrored: boolean, rotation: Rotation) => {
  const base = plateLayouts[plate].map(cell => {
    const width=cell.width??1; const height=cell.height??1;
    return { ...cell, width, height, col:mirrored ? 6-cell.col-width : cell.col };
  });
  const cells = base.map(cell => {
    if (rotation===90) return { col:8-cell.row-cell.height, row:cell.col, width:cell.height, height:cell.width };
    if (rotation===180) return { col:6-cell.col-cell.width, row:8-cell.row-cell.height, width:cell.width, height:cell.height };
    if (rotation===270) return { col:cell.row, row:6-cell.col-cell.width, width:cell.height, height:cell.width };
    return cell;
  });
  return { cells, columns:rotation===90||rotation===270 ? 6 : 4, rows:rotation===90||rotation===270 ? 4 : 6 };
};

const key = (id: string, label: string, kind: ActionType, action: string, prompt = '', tone?: KeyConfig['tone']): KeyConfig => ({
  id, label, glyph: label.slice(0, 2).toUpperCase(), kind, action, prompt, confirm: ['APPROVE', 'STOP', 'DEPLOY', 'MERGE'].includes(label), hud: kind === 'ai' || kind === 'agent', tone,
});

const createDefaultConfig = (): DeckConfig => ({
  version: 1,
  profile: 'Content Studio',
  hardware: defaultHardware,
  updatedAt: new Date().toISOString(),
  layers: [
    { id: 'ai', name: 'AI AGENTS', short: 'AI', keys: [
      key('ai-01','RFP','agent','RFP Analyst','선택한 프로젝트의 RFP를 분석하고 요구사항, 산출물, 위험요소를 정리해줘.'),
      key('ai-02','SCRIPT','agent','Script Analyst','원고의 구조, 메시지, 러닝타임과 개선점을 분석해줘.'),
      key('ai-03','VISUAL','agent','Visual Strategy','콘텐츠에 적합한 비주얼 콘셉트와 레퍼런스 방향을 제안해줘.'),
      key('ai-04','STORY','agent','Storyboard Planner','승인된 원고를 장면 단위 스토리보드로 변환해줘.'),
      key('ai-05','PLAN','agent','Instructional Designer'), key('ai-06','FORMAT','agent','Format Proposal'),
      key('ai-07','QA','agent','Production QA'), key('ai-08','PRODUCER','agent','AI Producer'),
      key('ai-09','ASK','ai','Ask current agent'), key('ai-10','FIX','ai','Fix selected output'),
      key('ai-11','REVIEW','ai','Review current work'), key('ai-12','APPROVE','system','Approve current task','', 'dark'),
      key('ai-13','RUN','system','Run selected workflow'), key('ai-14','STOP','system','Stop active workflow','', 'dark'),
      key('ai-15','RETRY','system','Retry failed step'), key('ai-16','EXPORT','system','Export deliverable'),
      key('ai-17','CODEX','application','Open Codex'), key('ai-18','CLAUDE','application','Open Claude Code'),
      key('ai-19','FIGMA','application','Open Figma'), key('ai-20','ADOBE','application','Open Adobe CC'),
      key('ai-21','VOICE','system','Push to talk'), key('ai-22','FILES','system','Attach files'),
      key('ai-23','CONTEXT','ai','Summarize context'), key('ai-24','SUMMARY','ai','Create handoff summary'),
    ]},
    { id: 'dev', name: 'DEVELOP', short: 'DEV', keys: [
      key('dev-01','CODEX','application','Open Codex'), key('dev-02','CLAUDE','application','Open Claude Code'), key('dev-03','GITHUB','application','Open GitHub'), key('dev-04','TERM','application','Open Terminal'),
      key('dev-05','DEV','macro','Start dev server'), key('dev-06','BUILD','macro','Production build'), key('dev-07','TEST','macro','Run test suite'), key('dev-08','DEPLOY','macro','Deploy site','', 'dark'),
      key('dev-09','ERROR','ai','Analyze error'), key('dev-10','DEBUG','ai','Debug issue'), key('dev-11','REVIEW','ai','Review changes'), key('dev-12','REFACTOR','ai','Refactor selection'),
      key('dev-13','COMMIT','macro','Git commit'), key('dev-14','PUSH','macro','Git push'), key('dev-15','PR','macro','Create pull request'), key('dev-16','MERGE','macro','Merge pull request','', 'dark'),
      key('dev-17','SERVER','system','Server status'), key('dev-18','DOCKER','application','Open Docker'), key('dev-19','NAS','application','Open NAS'), key('dev-20','LOGS','system','Tail logs'),
      key('dev-21','UNDO','keyboard','⌘Z'), key('dev-22','COPY','keyboard','⌘C'), key('dev-23','PASTE','keyboard','⌘V'), key('dev-24','SAVE','keyboard','⌘S'),
    ]},
    { id: 'design', name: 'DESIGN', short: 'DES', keys: [
      key('des-01','FIGMA','application','Open Figma'), key('des-02','PS','application','Open Photoshop'), key('des-03','ILLUST','application','Open Illustrator'), key('des-04','PREMIERE','application','Open Premiere'),
      key('des-05','IMAGE','ai','Generate image'), key('des-06','VIDEO','ai','Generate video'), key('des-07','UPSCALE','ai','Upscale asset'), key('des-08','CUTOUT','ai','Remove background'),
      key('des-09','PNG','macro','Export PNG'), key('des-10','JPG','macro','Export JPG'), key('des-11','PDF','macro','Export PDF'), key('des-12','MP4','macro','Export MP4'),
      key('des-13','PROJECT','system','Open project'), key('des-14','NAS','application','Open NAS'), key('des-15','REF','system','Open references'), key('des-16','PROMPTS','system','Open prompt library'),
      key('des-17','UNDO','keyboard','⌘Z'), key('des-18','REDO','keyboard','⇧⌘Z'), key('des-19','COPY','keyboard','⌘C'), key('des-20','PASTE','keyboard','⌘V'),
      key('des-21','ZOOM+','keyboard','⌘+'), key('des-22','ZOOM−','keyboard','⌘-'), key('des-23','FIT','keyboard','⇧1'), key('des-24','SAVE','keyboard','⌘S'),
    ]},
    { id: 'system', name: 'SYSTEM', short: 'SYS', keys: [
      key('sys-01','FINDER','application','Open Finder'), key('sys-02','BROWSER','application','Open Browser'), key('sys-03','CHATGPT','application','Open ChatGPT'), key('sys-04','CLAUDE','application','Open Claude'),
      key('sys-05','NAS','application','Open NAS'), key('sys-06','DOWNLOAD','system','Open Downloads'), key('sys-07','CAPTURE','keyboard','⇧⌘4'), key('sys-08','CLIP','system','Clipboard history'),
      key('sys-09','MUSIC','application','Open Music'), key('sys-10','VOL+','keyboard','Volume Up'), key('sys-11','VOL−','keyboard','Volume Down'), key('sys-12','MUTE','keyboard','Mute'),
      key('sys-13','CAL','application','Open Calendar'), key('sys-14','MAIL','application','Open Mail'), key('sys-15','NOTES','application','Open Notes'), key('sys-16','SEARCH','keyboard','⌘Space'),
      key('sys-17','DESKTOP','keyboard','F11'), key('sys-18','LOCK','keyboard','⌃⌘Q'), key('sys-19','MIC','system','Toggle microphone'), key('sys-20','FOCUS','system','Toggle Focus'),
      key('sys-21','AI','system','Switch to AI layer'), key('sys-22','DEV','system','Switch to Develop layer'), key('sys-23','DESIGN','system','Switch to Design layer'), key('sys-24','SLEEP','system','Sleep display','', 'dark'),
    ]},
  ],
  macros: [
    { id:'macro-dev', name:'Start dev server', steps:['프로젝트 폴더 열기','Terminal 실행','npm run dev','HUD 알림 표시'] },
    { id:'macro-build', name:'Production build', steps:['변경사항 저장','npm run build','결과 요약','HUD 알림 표시'] },
    { id:'macro-export', name:'Export deliverable', steps:['현재 산출물 검사','내보내기 실행','NAS 폴더 열기'] },
  ],
});

const typeLabels: Record<ActionType,string> = { keyboard:'키보드', application:'앱', ai:'AI', agent:'에이전트', macro:'매크로', system:'시스템' };
const actionOptions: Record<ActionType,string[]> = {
  keyboard:['⌘C','⌘V','⌘Z','⇧⌘Z','⌘S','⇧⌘4','⌘Space','사용자 지정 단축키'],
  application:['Open Codex','Open Claude Code','Open ChatGPT','Open Figma','Open Photoshop','Open Illustrator','Open Premiere','Open Finder','Open Browser','Open NAS'],
  ai:['Ask current agent','Analyze error','Debug issue','Review current work','Fix selected output','Refactor selection','Generate image','Generate video','Summarize context','Create handoff summary'],
  agent:['AI Producer','RFP Analyst','Instructional Designer','Script Analyst','Format Proposal','Visual Strategy','Storyboard Planner','Production QA'],
  macro:['Start dev server','Production build','Run test suite','Deploy site','Export deliverable','Custom workflow'],
  system:['Approve current task','Run selected workflow','Stop active workflow','Retry failed step','Push to talk','Attach files','Open prompt library','Clipboard history'],
};

export default function Home() {
  const [config, setConfig] = useState<DeckConfig>(createDefaultConfig);
  const [activeLayerId, setActiveLayerId] = useState('ai');
  const [selectedKeyId, setSelectedKeyId] = useState('ai-01');
  const [draft, setDraft] = useState<KeyConfig>(() => createDefaultConfig().layers[0].keys[0]);
  const [toast, setToast] = useState('');
  const [showProfiles, setShowProfiles] = useState(false);
  const [showMacro, setShowMacro] = useState(false);
  const [showDevice, setShowDevice] = useState(false);
  const [deviceState, setDeviceState] = useState<'idle'|'requesting'|'connected'|'unsupported'|'error'>('idle');
  const [deviceInfo, setDeviceInfo] = useState<{name:string;vid:string;pid:string}|null>(null);
  const [macroSteps, setMacroSteps] = useState<string[]>(['현재 파일 저장','선택한 에이전트 실행','결과를 HUD에 표시']);
  const [newStep, setNewStep] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('kbrain-command-deck-v1');
      if (!saved) return;
      try {
        const next = JSON.parse(saved) as DeckConfig;
        const first = next.layers[0]?.keys[0];
        setConfig(next);
        if (first) { setActiveLayerId(next.layers[0].id); setSelectedKeyId(first.id); setDraft(first); }
      } catch { /* keep safe defaults */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeLayer = useMemo(() => config.layers.find(layer => layer.id === activeLayerId) ?? config.layers[0], [config, activeLayerId]);
  const selectedIndex = activeLayer.keys.findIndex(item => item.id === selectedKeyId);
  const hardware = config.hardware ?? defaultHardware;
  const physicalLayout = useMemo(() => transformLayout(hardware.plate, hardware.mirrored, hardware.rotation), [hardware]);

  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const switchLayer = (id: string) => {
    const next = config.layers.find(layer => layer.id === id) ?? config.layers[0];
    setActiveLayerId(next.id); setSelectedKeyId(next.keys[0].id); setDraft(next.keys[0]);
  };
  const selectKey = (item: KeyConfig) => { setSelectedKeyId(item.id); setDraft(item); };
  const saveDraft = () => {
    const next: DeckConfig = { ...config, updatedAt:new Date().toISOString(), layers:config.layers.map(layer => layer.id === activeLayerId ? { ...layer, keys:layer.keys.map(item => item.id === draft.id ? draft : item) } : layer) };
    setConfig(next); localStorage.setItem('kbrain-command-deck-v1', JSON.stringify(next)); flash(`${draft.label} 키를 저장했습니다`);
  };
  const resetLayer = () => {
    const original = createDefaultConfig().layers.find(layer => layer.id === activeLayerId)!;
    const next = { ...config, layers:config.layers.map(layer => layer.id === activeLayerId ? original : layer) };
    setConfig(next); setSelectedKeyId(original.keys[0].id); setDraft(original.keys[0]); flash('현재 레이어를 기본값으로 복원했습니다');
  };
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify({ ...config, updatedAt:new Date().toISOString() }, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href=url; anchor.download='kbrain-ai-command-deck.json'; anchor.click(); URL.revokeObjectURL(url); flash('JSON 설정을 내보냈습니다');
  };
  const importConfig = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const next = JSON.parse(String(reader.result)) as DeckConfig; if (next.version !== 1 || !Array.isArray(next.layers) || !next.layers[0]?.keys[0]) throw new Error(); const first=next.layers[0].keys[0]; setConfig(next); setActiveLayerId(next.layers[0].id); setSelectedKeyId(first.id); setDraft(first); localStorage.setItem('kbrain-command-deck-v1', JSON.stringify(next)); flash('설정을 가져왔습니다'); } catch { flash('올바른 Command Deck JSON이 아닙니다'); } };
    reader.readAsText(file); event.target.value='';
  };
  const selectProfile = (name: string) => { setConfig(prev => ({ ...prev, profile:name })); setShowProfiles(false); flash(`${name} 프로필로 전환했습니다`); };
  const addMacroStep = () => { if (!newStep.trim()) return; setMacroSteps(prev => [...prev, newStep.trim()]); setNewStep(''); };
  const updateHardware = (patch: Partial<HardwareConfig>) => {
    setConfig(prev => {
      const next = { ...prev, hardware:{ ...(prev.hardware??defaultHardware), ...patch }, updatedAt:new Date().toISOString() };
      localStorage.setItem('kbrain-command-deck-v1', JSON.stringify(next));
      return next;
    });
    setSelectedKeyId(activeLayer.keys[0].id); setDraft(activeLayer.keys[0]);
  };
  const connectHid = async () => {
    const hid = (navigator as Navigator & { hid?: { requestDevice:(options:{filters:object[]})=>Promise<HidDeviceLike[]> } }).hid;
    if (!hid) { setDeviceState('unsupported'); return; }
    setDeviceState('requesting');
    try {
      const [device] = await hid.requestDevice({ filters:[] });
      if (!device) { setDeviceState('idle'); return; }
      if (!device.opened) await device.open();
      setDeviceInfo({ name:device.productName||'HID Device', vid:`0x${device.vendorId.toString(16).padStart(4,'0')}`, pid:`0x${device.productId.toString(16).padStart(4,'0')}` });
      setDeviceState('connected');
      flash('HID 장치 권한과 연결을 확인했습니다');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setDeviceState(name==='NotFoundError' ? 'idle' : 'error');
    }
  };
  const checkSync = () => {
    if (!deviceInfo) { setShowDevice(true); flash('먼저 USB 또는 동글 HID 장치를 연결하세요'); return; }
    flash('연결 확인 완료 · VIA 프로토콜 정보가 필요합니다');
  };

  return (
    <main className="app-shell">
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <input ref={importRef} type="file" accept="application/json" hidden onChange={importConfig} />
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">K</span><div><strong>KBRAIN</strong><span>AI COMMAND DECK</span></div></div>
        <nav className="top-actions" aria-label="프로젝트 작업">
            <a className="guide-link" href="/guide">사용 가이드</a>
          <button className={`connection-button ${deviceState==='connected'?'connected':''}`} onClick={() => setShowDevice(true)}><i /> {deviceInfo ? deviceInfo.name : '장치 연결'}</button>
          <button className="ghost-button" onClick={() => importRef.current?.click()}>불러오기</button>
          <button className="primary-button" onClick={exportConfig}>설정 내보내기</button>
        </nav>
      </header>

      <section className="workspace">
        <aside className="rail">
          <p className="eyebrow">PROFILE</p>
          <div className="profile-wrap">
            <button className="profile-card" onClick={() => setShowProfiles(value => !value)}>
              <span>NK</span><div><strong>{config.profile}</strong><small>macOS · NOVA KINE</small></div><b>⌄</b>
            </button>
            {showProfiles && <div className="profile-menu">
              {['Content Studio','Development Hub','Design Lab'].map(name => <button key={name} className={config.profile === name ? 'active' : ''} onClick={() => selectProfile(name)}>{name}<span>{config.profile === name ? '✓' : ''}</span></button>)}
              <button onClick={() => selectProfile(`${config.profile} Copy`)}>＋ 현재 프로필 복제</button>
            </div>}
          </div>
          <p className="eyebrow layer-title">LAYERS</p>
          {config.layers.map((layer,index) => <button className={`layer-button ${activeLayer.id === layer.id ? 'active' : ''}`} key={layer.id} onClick={() => switchLayer(layer.id)}><span>0{index+1}</span>{layer.name}</button>)}
          <div className="rail-footer"><button onClick={() => flash('v0.1은 4개 핵심 레이어를 사용합니다')}>＋ 새 레이어</button><button onClick={() => flash('설정은 이 브라우저에 자동 저장됩니다')}>⚙ 환경설정</button></div>
        </aside>

        <section className="canvas-panel">
          <div className="section-heading">
            <div><p className="eyebrow">KEYMAP / LAYER {String(config.layers.indexOf(activeLayer)+1).padStart(2,'0')}</p><h1>{activeLayer.name}</h1></div>
            <div className="history-actions"><button aria-label="이전 키" onClick={() => selectKey(activeLayer.keys[(selectedIndex+23)%24])}>←</button><button aria-label="다음 키" onClick={() => selectKey(activeLayer.keys[(selectedIndex+1)%24])}>→</button><button onClick={resetLayer}>초기화</button></div>
          </div>

          <div className="hardware-toolbar" aria-label="물리 배열 설정">
            <div className="hardware-group"><span>PLATE</span>{(['A','B','C','D'] as PlateId[]).map(plate => <button key={plate} className={hardware.plate===plate?'active':''} onClick={() => updateHardware({plate})}>{plate}</button>)}</div>
            <div className="hardware-group"><span>MIRROR</span><button className={!hardware.mirrored?'active':''} onClick={() => updateHardware({mirrored:false})}>LEFT</button><button className={hardware.mirrored?'active':''} onClick={() => updateHardware({mirrored:true})}>RIGHT</button></div>
            <div className="hardware-group"><span>ROTATE</span>{([0,90,180,270] as Rotation[]).map(rotation => <button key={rotation} className={hardware.rotation===rotation?'active':''} onClick={() => updateHardware({rotation})}>{rotation}°</button>)}</div>
          </div>

          <div className="device-stage"><div>
            <div className="device-label"><span>NOVA KINE · PLATE {hardware.plate}</span><small>{hardware.rotation===90||hardware.rotation===270?'LANDSCAPE':'PORTRAIT'} · {hardware.mirrored?'RIGHT MIRROR':'LEFT STANDARD'} · {physicalLayout.cells.length} SWITCHES</small></div>
            <div className={`device-body rot-${hardware.rotation}`}>
              <div className="key-grid physical-grid" style={{gridTemplateColumns:`repeat(${physicalLayout.columns}, minmax(0,1fr))`,gridTemplateRows:`repeat(${physicalLayout.rows}, minmax(0,1fr))`}}>
                {physicalLayout.cells.map((cell,index) => { const item=activeLayer.keys[index]; return <button key={`${hardware.plate}-${index}`} style={{gridColumn:`${cell.col} / span ${cell.width}`,gridRow:`${cell.row} / span ${cell.height}`}} aria-label={`${item.label} 키 편집`} className={`deck-key ${selectedKeyId === item.id ? 'selected' : ''} ${item.tone ? 'accent-key' : ''} ${(cell.width??1)>1?'wide-key':''} ${(cell.height??1)>1?'tall-key':''}`} onClick={() => selectKey(item)}><span>{item.glyph}</span><strong>{item.label}</strong><small>{typeLabels[item.kind].toUpperCase()} · {String(index+1).padStart(2,'0')}</small></button>; })}
              </div>
              <div className="device-controls">
                <button className={activeLayerId==='ai'?'active':''} onClick={() => switchLayer('ai')}><span>AI</span><small>MODE</small></button>
                <button className={activeLayerId==='dev'?'active':''} onClick={() => switchLayer('dev')}><span>DEV</span><small>MODE</small></button>
                <button className={activeLayerId==='design'?'active':''} onClick={() => switchLayer('design')}><span>DES</span><small>MODE</small></button>
                <button className="roller" onClick={() => flash('롤러: 이전/다음 에이전트 · 회전 입력')}><span /><small>AGENT SELECT</small></button>
              </div>
            </div>
          </div></div>
          <footer className="status-strip"><span><i className={deviceState==='connected'?'live':''} /> {deviceState==='connected'?'HID 연결됨':'오프라인 설계 모드'}</span><span>{physicalLayout.cells.length} 물리 키 · {activeLayer.keys.filter(item => item.action).length} 액션</span><span>Plate {hardware.plate} · {hardware.rotation}°</span><button onClick={checkSync}>{deviceInfo?'동기화 확인':'장치 연결'} ↗</button></footer>
        </section>

        <aside className="inspector">
          <p className="eyebrow">SELECTED KEY</p>
          <div className="selected-summary"><span>{draft.glyph}</span><div><strong>{draft.label}</strong><small>Key {String(selectedIndex+1).padStart(2,'0')} · Layer {String(config.layers.indexOf(activeLayer)+1).padStart(2,'0')}</small></div></div>
          <div className="field-pair"><div><label htmlFor="label">키 라벨</label><input id="label" value={draft.label} onChange={e => setDraft({...draft,label:e.target.value.toUpperCase().slice(0,10)})} /></div><div><label htmlFor="glyph">아이콘</label><input id="glyph" value={draft.glyph} onChange={e => setDraft({...draft,glyph:e.target.value.slice(0,3)})} /></div></div>
          <label>액션 유형</label>
          <div className="type-grid">{(Object.keys(typeLabels) as ActionType[]).map(kind => <button key={kind} className={draft.kind===kind?'active':''} onClick={() => setDraft({...draft,kind,action:actionOptions[kind][0]})}>{typeLabels[kind]}</button>)}</div>
          <label htmlFor="action">실행 액션</label>
          <select id="action" value={draft.action} onChange={e => setDraft({...draft,action:e.target.value})}>{Array.from(new Set([draft.action,...actionOptions[draft.kind]])).map(option => <option key={option}>{option}</option>)}</select>
          {(draft.kind==='ai'||draft.kind==='agent') && <><label htmlFor="prompt">지시문</label><textarea id="prompt" value={draft.prompt} placeholder="에이전트에게 전달할 지시문을 입력하세요" onChange={e => setDraft({...draft,prompt:e.target.value})} /></>}
          {draft.kind==='macro' && <button className="secondary-wide" onClick={() => setShowMacro(true)}>워크플로 매크로 편집 ↗</button>}
          <div className="toggle-row"><div><strong>실행 전 확인</strong><small>중요 명령의 오작동을 방지합니다</small></div><button aria-label="실행 전 확인" className={`toggle ${draft.confirm?'on':''}`} onClick={() => setDraft({...draft,confirm:!draft.confirm})}><span /></button></div>
          <div className="toggle-row"><div><strong>HUD에 상태 표시</strong><small>Agent HUD로 진행 상태를 보냅니다</small></div><button aria-label="HUD 상태 표시" className={`toggle ${draft.hud?'on':''}`} onClick={() => setDraft({...draft,hud:!draft.hud})}><span /></button></div>
          <button className="save-button" onClick={saveDraft}>키 설정 저장</button>
        </aside>
      </section>

      {showDevice && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowDevice(false)}>
        <section className="device-modal" role="dialog" aria-modal="true" aria-labelledby="device-title" onMouseDown={event => event.stopPropagation()}>
          <header><div><p className="eyebrow">DEVICE & SYNC</p><h2 id="device-title">NOVA KINE 연결</h2></div><button aria-label="닫기" onClick={() => setShowDevice(false)}>×</button></header>
          <p className="modal-copy">타이핑용 페어링과 키맵 동기화는 별개입니다. 키맵을 쓰려면 VIA 호환 Raw HID 인터페이스가 보여야 하므로 첫 연결은 USB-C 유선 모드를 권장합니다.</p>
          <div className="transport-grid">
            {([
              ['usb','USB-C','동기화 권장','케이블 연결 · Wired 모드'],
              ['2.4g','2.4 GHz','입력 + 진단','동글 연결 후 HID 확인'],
              ['bluetooth','Bluetooth','입력 중심','macOS에서 먼저 페어링'],
            ] as [ConnectionMode,string,string,string][]).map(([mode,title,badge,copy]) => <button key={mode} className={hardware.connectionMode===mode?'active':''} onClick={() => updateHardware({connectionMode:mode})}><b>{title}</b><em>{badge}</em><span>{copy}</span></button>)}
          </div>
          <div className={`device-state-card ${deviceState}`}>
            <span className="device-pulse" />
            <div>
              <strong>{deviceState==='connected' ? deviceInfo?.name : deviceState==='requesting' ? '장치를 선택하세요' : deviceState==='unsupported' ? 'WebHID 미지원 브라우저' : deviceState==='error' ? '장치를 열 수 없습니다' : '연결된 설정 장치 없음'}</strong>
              <small>{deviceInfo ? `VID ${deviceInfo.vid} · PID ${deviceInfo.pid}` : 'Chrome 또는 Edge에서 USB-C 연결 후 장치 찾기를 누르세요.'}</small>
            </div>
            <button onClick={connectHid} disabled={deviceState==='requesting'}>{deviceState==='requesting'?'대기 중':'장치 찾기'}</button>
          </div>
          <ol className="sync-steps">
            <li className={deviceInfo?'done':'active'}><b>01</b><div><strong>OS 연결</strong><small>USB-C, 2.4G 동글 또는 Bluetooth 페어링</small></div></li>
            <li className={deviceInfo?'active':''}><b>02</b><div><strong>WebHID 권한</strong><small>브라우저에서 NOVA KINE Raw HID 선택</small></div></li>
            <li><b>03</b><div><strong>VIA 프로토콜 확인</strong><small>제조사 VID/PID와 VIA JSON 확보 후 쓰기 활성화</small></div></li>
          </ol>
          <aside className="protocol-note"><strong>현재 안전 모드</strong><p>장치 검색·권한·VID/PID 진단까지 구현되어 있습니다. 제조사가 NOVA KINE용 VIA JSON 또는 프로토콜을 공개하기 전에는 임의 HID 보고서를 보내지 않습니다.</p></aside>
          <footer><span>{deviceInfo?'HID transport ready':'Configuration stays local'}</span><button onClick={checkSync} disabled={!deviceInfo}>키맵 동기화 준비 확인</button></footer>
        </section>
      </div>}

      {showMacro && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowMacro(false)}>
        <section className="macro-modal" role="dialog" aria-modal="true" aria-labelledby="macro-title" onMouseDown={e => e.stopPropagation()}>
          <header><div><p className="eyebrow">WORKFLOW MACRO</p><h2 id="macro-title">{draft.kind==='macro'?draft.action:'Custom workflow'}</h2></div><button aria-label="닫기" onClick={() => setShowMacro(false)}>×</button></header>
          <p className="modal-copy">여러 동작을 순서대로 묶어 하나의 키로 실행합니다. 실제 실행은 Local Bridge가 담당합니다.</p>
          <div className="steps">{macroSteps.map((step,index) => <div className="macro-step" key={`${step}-${index}`}><b>{String(index+1).padStart(2,'0')}</b><span>{step}</span><button onClick={() => setMacroSteps(items => items.filter((_,i)=>i!==index))}>삭제</button></div>)}</div>
          <div className="add-step"><input value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key==='Enter'&&addMacroStep()} placeholder="새 단계 입력" /><button onClick={addMacroStep}>＋ 추가</button></div>
          <footer><span>{macroSteps.length} steps · 순차 실행</span><button onClick={() => { setShowMacro(false); flash('매크로를 저장했습니다'); }}>매크로 저장</button></footer>
        </section>
      </div>}
    </main>
  );
}
