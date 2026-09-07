'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  isLkKine,
  LK_KINE_AUXILIARY,
  LK_KINE_PROFILE,
  transformLkKineLayout,
  type MatrixAddress,
  type PlateId,
  type Rotation,
} from './lk-kine-profile';
import {
  qmkKeycodeForAction,
  qmkKeycodeMatchesDomEvent,
  ViaWebHidClient,
  type LkKineHidApi,
  type LkKineHidDevice,
} from './via-webhid';

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
type ConnectionMode = 'usb' | '2.4g' | 'bluetooth';
type HardwareConfig = { plate: PlateId; mirrored: boolean; rotation: Rotation; connectionMode: ConnectionMode };
type ViaProfileRef = { name:string; vendorId:string; productId:string; matrix:{rows:number;cols:number}; auxiliaryKeys:string[]; encoder:string };
type DeckConfig = { version: 1; profile: string; layers: Layer[]; macros: Macro[]; hardware?: HardwareConfig; via?:ViaProfileRef; updatedAt: string };

const defaultHardware: HardwareConfig = { plate: 'A', mirrored: false, rotation: 90, connectionMode: 'usb' };
const viaProfile:ViaProfileRef = { name:LK_KINE_PROFILE.name, vendorId:LK_KINE_PROFILE.vendorIdHex, productId:LK_KINE_PROFILE.productIdHex, matrix:{...LK_KINE_PROFILE.matrix}, auxiliaryKeys:[...LK_KINE_PROFILE.auxiliaryKeys], encoder:LK_KINE_PROFILE.encoder };

const key = (id: string, label: string, kind: ActionType, action: string, prompt = '', tone?: KeyConfig['tone']): KeyConfig => ({
  id, label, glyph: label.slice(0, 2).toUpperCase(), kind, action, prompt, confirm: ['APPROVE', 'STOP', 'DEPLOY', 'MERGE'].includes(label), hud: kind === 'ai' || kind === 'agent', tone,
});

const createDefaultConfig = (): DeckConfig => ({
  version: 1,
  profile: 'Content Studio',
  hardware: defaultHardware,
  via: viaProfile,
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
      key('ai-25','AI','system','Switch to AI layer'), key('ai-26','DEV','system','Switch to Develop layer'), key('ai-27','DES','system','Switch to Design layer'),
    ]},
    { id: 'dev', name: 'DEVELOP', short: 'DEV', keys: [
      key('dev-01','CODEX','application','Open Codex'), key('dev-02','CLAUDE','application','Open Claude Code'), key('dev-03','GITHUB','application','Open GitHub'), key('dev-04','TERM','application','Open Terminal'),
      key('dev-05','DEV','macro','Start dev server'), key('dev-06','BUILD','macro','Production build'), key('dev-07','TEST','macro','Run test suite'), key('dev-08','DEPLOY','macro','Deploy site','', 'dark'),
      key('dev-09','ERROR','ai','Analyze error'), key('dev-10','DEBUG','ai','Debug issue'), key('dev-11','REVIEW','ai','Review changes'), key('dev-12','REFACTOR','ai','Refactor selection'),
      key('dev-13','COMMIT','macro','Git commit'), key('dev-14','PUSH','macro','Git push'), key('dev-15','PR','macro','Create pull request'), key('dev-16','MERGE','macro','Merge pull request','', 'dark'),
      key('dev-17','SERVER','system','Server status'), key('dev-18','DOCKER','application','Open Docker'), key('dev-19','NAS','application','Open NAS'), key('dev-20','LOGS','system','Tail logs'),
      key('dev-21','UNDO','keyboard','⌘Z'), key('dev-22','COPY','keyboard','⌘C'), key('dev-23','PASTE','keyboard','⌘V'), key('dev-24','SAVE','keyboard','⌘S'),
      key('dev-25','AI','system','Switch to AI layer'), key('dev-26','DEV','system','Switch to Develop layer'), key('dev-27','DES','system','Switch to Design layer'),
    ]},
    { id: 'design', name: 'DESIGN', short: 'DES', keys: [
      key('des-01','FIGMA','application','Open Figma'), key('des-02','PS','application','Open Photoshop'), key('des-03','ILLUST','application','Open Illustrator'), key('des-04','PREMIERE','application','Open Premiere'),
      key('des-05','IMAGE','ai','Generate image'), key('des-06','VIDEO','ai','Generate video'), key('des-07','UPSCALE','ai','Upscale asset'), key('des-08','CUTOUT','ai','Remove background'),
      key('des-09','PNG','macro','Export PNG'), key('des-10','JPG','macro','Export JPG'), key('des-11','PDF','macro','Export PDF'), key('des-12','MP4','macro','Export MP4'),
      key('des-13','PROJECT','system','Open project'), key('des-14','NAS','application','Open NAS'), key('des-15','REF','system','Open references'), key('des-16','PROMPTS','system','Open prompt library'),
      key('des-17','UNDO','keyboard','⌘Z'), key('des-18','REDO','keyboard','⇧⌘Z'), key('des-19','COPY','keyboard','⌘C'), key('des-20','PASTE','keyboard','⌘V'),
      key('des-21','ZOOM+','keyboard','⌘+'), key('des-22','ZOOM−','keyboard','⌘-'), key('des-23','FIT','keyboard','⇧1'), key('des-24','SAVE','keyboard','⌘S'),
      key('des-25','AI','system','Switch to AI layer'), key('des-26','DEV','system','Switch to Develop layer'), key('des-27','DES','system','Switch to Design layer'),
    ]},
    { id: 'system', name: 'SYSTEM', short: 'SYS', keys: [
      key('sys-01','FINDER','application','Open Finder'), key('sys-02','BROWSER','application','Open Browser'), key('sys-03','CHATGPT','application','Open ChatGPT'), key('sys-04','CLAUDE','application','Open Claude'),
      key('sys-05','NAS','application','Open NAS'), key('sys-06','DOWNLOAD','system','Open Downloads'), key('sys-07','CAPTURE','keyboard','⇧⌘4'), key('sys-08','CLIP','system','Clipboard history'),
      key('sys-09','MUSIC','application','Open Music'), key('sys-10','VOL+','keyboard','Volume Up'), key('sys-11','VOL−','keyboard','Volume Down'), key('sys-12','MUTE','keyboard','Mute'),
      key('sys-13','CAL','application','Open Calendar'), key('sys-14','MAIL','application','Open Mail'), key('sys-15','NOTES','application','Open Notes'), key('sys-16','SEARCH','keyboard','⌘Space'),
      key('sys-17','DESKTOP','keyboard','F11'), key('sys-18','LOCK','keyboard','⌃⌘Q'), key('sys-19','MIC','system','Toggle microphone'), key('sys-20','FOCUS','system','Toggle Focus'),
      key('sys-21','AI','system','Switch to AI layer'), key('sys-22','DEV','system','Switch to Develop layer'), key('sys-23','DESIGN','system','Switch to Design layer'), key('sys-24','SLEEP','system','Sleep display','', 'dark'),
      key('sys-25','AI','system','Switch to AI layer'), key('sys-26','DEV','system','Switch to Develop layer'), key('sys-27','DES','system','Switch to Design layer'),
    ]},
  ],
  macros: [
    { id:'macro-dev', name:'Start dev server', steps:['프로젝트 폴더 열기','Terminal 실행','npm run dev','HUD 알림 표시'] },
    { id:'macro-build', name:'Production build', steps:['변경사항 저장','npm run build','결과 요약','HUD 알림 표시'] },
    { id:'macro-export', name:'Export deliverable', steps:['현재 산출물 검사','내보내기 실행','NAS 폴더 열기'] },
  ],
});

const normalizeConfig = (candidate: DeckConfig): DeckConfig => {
  const defaults = createDefaultConfig();
  return {
    ...candidate,
    hardware: { ...defaultHardware, ...(candidate.hardware ?? {}) },
    via: viaProfile,
    layers: defaults.layers.map((defaultLayer) => {
      const saved = candidate.layers.find((layer) => layer.id === defaultLayer.id);
      if (!saved) return defaultLayer;
      return { ...saved, keys: defaultLayer.keys.map((fallback, index) => saved.keys[index] ?? fallback) };
    }),
  };
};

const profilePresets = [
  { name: 'Content Studio', layerId: 'ai', description: 'AI 제작·검토 워크플로' },
  { name: 'Development Hub', layerId: 'dev', description: 'Codex·Claude·Git 작업' },
  { name: 'Design Lab', layerId: 'design', description: 'Figma·Adobe·에셋 작업' },
] as const;

const typeLabels: Record<ActionType,string> = { keyboard:'키보드', application:'앱', ai:'AI', agent:'에이전트', macro:'매크로', system:'시스템' };
const actionOptions: Record<ActionType,string[]> = {
  keyboard:['⌘C','⌘V','⌘Z','⇧⌘Z','⌘S','⇧⌘4','⌘Space','사용자 지정 단축키'],
  application:['Open Codex','Open Claude Code','Open ChatGPT','Open Figma','Open Photoshop','Open Illustrator','Open Premiere','Open Finder','Open Browser','Open NAS'],
  ai:['Ask current agent','Analyze error','Debug issue','Review current work','Fix selected output','Refactor selection','Generate image','Generate video','Summarize context','Create handoff summary'],
  agent:['AI Producer','RFP Analyst','Instructional Designer','Script Analyst','Format Proposal','Visual Strategy','Storyboard Planner','Production QA'],
  macro:['Start dev server','Production build','Run test suite','Deploy site','Export deliverable','Custom workflow'],
  system:['Approve current task','Run selected workflow','Stop active workflow','Retry failed step','Push to talk','Attach files','Open prompt library','Clipboard history'],
};

const defaultInputMatrix: Record<string, MatrixAddress> = {
  PrintScreen:'0,0', ScrollLock:'1,0', Pause:'2,0', Home:'3,0',
  NumLock:'0,1', NumpadDivide:'1,1', NumpadMultiply:'2,1', NumpadSubtract:'3,1',
  Numpad7:'0,2', Numpad8:'1,3', Numpad9:'2,3', NumpadAdd:'3,3',
  Numpad4:'0,4', Numpad5:'1,4', Numpad6:'2,4',
  Numpad1:'0,6', Numpad2:'1,6', Numpad3:'2,6', NumpadEnter:'3,7',
  Numpad0:'1,8', NumpadDecimal:'2,7',
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
  const [deviceInfo, setDeviceInfo] = useState<{name:string;vid:string;pid:string;protocol:string}|null>(null);
  const [keyTestEnabled, setKeyTestEnabled] = useState(false);
  const [matrixPressed, setMatrixPressed] = useState<Set<MatrixAddress>>(() => new Set());
  const [domPressed, setDomPressed] = useState<Set<MatrixAddress>>(() => new Set());
  const [testedKeys, setTestedKeys] = useState<Set<MatrixAddress>>(() => new Set());
  const [testSource, setTestSource] = useState<'matrix'|'keyboard'|'waiting'>('waiting');
  const [applyState, setApplyState] = useState<{status:'idle'|'applying'|'success'|'error';done:number;total:number;message:string}>({status:'idle',done:0,total:0,message:''});
  const [macroSteps, setMacroSteps] = useState<string[]>(['현재 파일 저장','선택한 에이전트 실행','결과를 HUD에 표시']);
  const [newStep, setNewStep] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const deviceRef = useRef<LkKineHidDevice|null>(null);
  const viaClientRef = useRef<ViaWebHidClient|null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('kbrain-command-deck-v1');
      if (!saved) return;
      try {
        const next = normalizeConfig(JSON.parse(saved) as DeckConfig);
        const presetLayerId = profilePresets.find((preset) => preset.name === next.profile)?.layerId ?? next.layers[0]?.id;
        const restoredLayer = next.layers.find((layer) => layer.id === presetLayerId) ?? next.layers[0];
        const first = restoredLayer?.keys[0];
        setConfig(next);
        if (first) { setActiveLayerId(restoredLayer.id); setSelectedKeyId(first.id); setDraft(first); }
      } catch { /* keep safe defaults */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeLayer = useMemo(() => config.layers.find(layer => layer.id === activeLayerId) ?? config.layers[0], [config, activeLayerId]);
  const selectedIndex = activeLayer.keys.findIndex(item => item.id === selectedKeyId);
  const hardware = config.hardware ?? defaultHardware;
  const physicalLayout = useMemo(() => transformLkKineLayout(hardware.plate, hardware.mirrored, hardware.rotation), [hardware]);
  const pressedKeys = useMemo(() => new Set<MatrixAddress>([...matrixPressed, ...domPressed]), [matrixPressed, domPressed]);

  useEffect(() => {
    if (!keyTestEnabled || deviceState !== 'connected' || applyState.status === 'applying') return;
    let stopped = false;
    let busy = false;
    let failures = 0;
    const poll = async () => {
      const client = viaClientRef.current;
      if (!client || stopped || busy) return;
      busy = true;
      try {
        const next = await client.getMatrixState();
        if (stopped) return;
        failures = 0;
        setMatrixPressed(next);
        if (next.size) {
          setTestSource('matrix');
          setTestedKeys((current) => new Set([...current, ...next]));
        }
      } catch {
        failures += 1;
        if (failures >= 2 && !stopped) setTestSource('keyboard');
      } finally {
        busy = false;
      }
    };
    void poll();
    const timer = window.setInterval(poll, 90);
    return () => { stopped = true; window.clearInterval(timer); setMatrixPressed(new Set()); };
  }, [keyTestEnabled, deviceState, applyState.status]);

  useEffect(() => {
    if (!keyTestEnabled) return;
    const addressForEvent = (event: KeyboardEvent) => {
      const assignments = [
        ...physicalLayout.cells.map((cell,index)=>({address:cell.matrix,item:activeLayer.keys[index],index})),
        ...LK_KINE_AUXILIARY.map((address,index)=>({address,item:activeLayer.keys[24+index],index:24+index})),
      ];
      const presetMatch = assignments.find(({item,index}) => qmkKeycodeMatchesDomEvent(qmkKeycodeForAction(item?.action ?? '', index), event));
      return presetMatch?.address ?? defaultInputMatrix[event.code];
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const address = addressForEvent(event);
      if (!address) return;
      setTestSource((source) => source === 'matrix' ? source : 'keyboard');
      setDomPressed((current) => new Set([...current, address]));
      setTestedKeys((current) => new Set([...current, address]));
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const address = addressForEvent(event);
      if (!address) return;
      setDomPressed((current) => { const next = new Set(current); next.delete(address); return next; });
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [keyTestEnabled, physicalLayout.cells, activeLayer]);

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
    const blob = new Blob([JSON.stringify({ ...config, via:viaProfile, updatedAt:new Date().toISOString() }, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href=url; anchor.download='kbrain-ai-command-deck.json'; anchor.click(); URL.revokeObjectURL(url); flash('JSON 설정을 내보냈습니다');
  };
  const importConfig = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const imported = JSON.parse(String(reader.result)) as DeckConfig; if (imported.version !== 1 || !Array.isArray(imported.layers) || !imported.layers[0]?.keys[0]) throw new Error(); const next=normalizeConfig(imported); const first=next.layers[0].keys[0]; setConfig(next); setActiveLayerId(next.layers[0].id); setSelectedKeyId(first.id); setDraft(first); localStorage.setItem('kbrain-command-deck-v1', JSON.stringify(next)); flash('설정을 가져왔습니다'); } catch { flash('올바른 Command Deck JSON이 아닙니다'); } };
    reader.readAsText(file); event.target.value='';
  };
  const selectProfile = (name: string, layerId: string) => {
    setConfig((current) => {
      const next = { ...current, profile:name, updatedAt:new Date().toISOString() };
      localStorage.setItem('kbrain-command-deck-v1', JSON.stringify(next));
      return next;
    });
    switchLayer(layerId);
    setShowProfiles(false);
    flash(`${name} 프리셋을 화면에 불러왔습니다`);
  };
  const addMacroStep = () => { if (!newStep.trim()) return; setMacroSteps(prev => [...prev, newStep.trim()]); setNewStep(''); };
  const updateHardware = (patch: Partial<HardwareConfig>) => {
    setConfig(prev => {
      const next = { ...prev, hardware:{ ...(prev.hardware??defaultHardware), ...patch }, updatedAt:new Date().toISOString() };
      localStorage.setItem('kbrain-command-deck-v1', JSON.stringify(next));
      return next;
    });
    setSelectedKeyId(activeLayer.keys[0].id); setDraft(activeLayer.keys[0]);
    setTestedKeys(new Set());
  };
  const finishConnection = async (device: LkKineHidDevice) => {
    if (!device.opened) await device.open();
    const client = new ViaWebHidClient(device);
    const protocol = await client.getProtocolVersion();
    if (!isLkKine(device.vendorId,device.productId)) throw new Error('LK-KINE VID/PID와 일치하지 않습니다.');
    deviceRef.current = device;
    viaClientRef.current = client;
    setDeviceInfo({
      name:device.productName||'LK-KINE',
      vid:`0x${device.vendorId.toString(16).padStart(4,'0')}`,
      pid:`0x${device.productId.toString(16).padStart(4,'0')}`,
      protocol:`v${protocol}`,
    });
    setDeviceState('connected');
    setKeyTestEnabled(true);
    setTestSource('waiting');
    flash(`LK-KINE 연결 완료 · VIA protocol ${protocol}`);
  };
  const connectHid = async () => {
    const hid = (navigator as Navigator & { hid?: LkKineHidApi }).hid;
    if (!hid) { setDeviceState('unsupported'); return; }
    setDeviceState('requesting');
    try {
      const [device] = await hid.requestDevice({ filters:[{
        vendorId:LK_KINE_PROFILE.vendorId,
        productId:LK_KINE_PROFILE.productId,
        usagePage:LK_KINE_PROFILE.rawHid.usagePage,
        usage:LK_KINE_PROFILE.rawHid.usage,
      }] });
      if (!device) { setDeviceState('idle'); return; }
      await finishConnection(device);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setDeviceState(name==='NotFoundError' ? 'idle' : 'error');
      if (name !== 'NotFoundError') flash(error instanceof Error ? error.message : 'LK-KINE 연결에 실패했습니다');
    }
  };
  const applyPresetToDevice = async () => {
    const client = viaClientRef.current;
    if (!client || deviceState !== 'connected') { setShowDevice(true); flash('먼저 USB-C로 LK-KINE을 연결하세요'); return; }
    const layerIndex = config.layers.indexOf(activeLayer);
    const assignments = [
      ...physicalLayout.cells.map((cell,index) => ({ address:cell.matrix, item:activeLayer.keys[index], index })),
      ...LK_KINE_AUXILIARY.map((address,index) => ({ address, item:activeLayer.keys[24+index], index:24+index })),
    ];
    if (!window.confirm(`${config.profile}의 ${activeLayer.name} 키 ${assignments.length}개를 LK-KINE Layer ${layerIndex}에 기록할까요?`)) return;
    setKeyTestEnabled(false);
    setApplyState({status:'applying',done:0,total:assignments.length,message:'VIA 키맵을 기록하고 있습니다'});
    try {
      const layerCount = await client.getLayerCount();
      if (layerIndex >= layerCount) throw new Error(`장치 펌웨어는 ${layerCount}개 레이어만 지원합니다.`);
      for (let index = 0; index < assignments.length; index += 1) {
        const assignment = assignments[index];
        await client.setKeycode(layerIndex, assignment.address, qmkKeycodeForAction(assignment.item.action, assignment.index));
        setApplyState({status:'applying',done:index+1,total:assignments.length,message:`M[${assignment.address}] 검증 완료`});
      }
      setApplyState({status:'success',done:assignments.length,total:assignments.length,message:`Layer ${layerIndex} 읽기 검증 완료`});
      flash(`${config.profile} 프리셋을 장치에 적용했습니다`);
    } catch (error) {
      setApplyState({status:'error',done:0,total:assignments.length,message:error instanceof Error ? error.message : '프리셋 적용 실패'});
      flash(error instanceof Error ? error.message : '프리셋 적용에 실패했습니다');
    } finally {
      setKeyTestEnabled(true);
    }
  };
  const checkSync = () => {
    if (!deviceInfo) { setShowDevice(true); flash('먼저 USB 또는 동글 HID 장치를 연결하세요'); return; }
    setKeyTestEnabled(true);
    flash('VIA 연결 확인 완료 · 키 테스트를 시작합니다');
  };

  return (
    <main className="app-shell">
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <input ref={importRef} type="file" accept="application/json" hidden onChange={importConfig} />
      <header className="topbar">
        <div className="brand-lockup"><strong>AI PAD</strong></div>
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
              {profilePresets.map(preset => <button key={preset.name} className={config.profile === preset.name ? 'active' : ''} onClick={() => selectProfile(preset.name,preset.layerId)}><span><b>{preset.name}</b><small>{preset.description}</small></span><em>{config.profile === preset.name ? '✓' : '→'}</em></button>)}
            </div>}
          </div>
          <p className="eyebrow layer-title">LAYERS</p>
          {config.layers.map((layer,index) => <button className={`layer-button ${activeLayer.id === layer.id ? 'active' : ''}`} key={layer.id} onClick={() => switchLayer(layer.id)}><span>0{index+1}</span>{layer.name}</button>)}
          <div className="rail-footer"><button onClick={() => flash('v0.1은 4개 핵심 레이어를 사용합니다')}>＋ 새 레이어</button><button onClick={() => flash('설정은 이 브라우저에 자동 저장됩니다')}>⚙ 환경설정</button></div>
        </aside>

        <section className="canvas-panel">
          <div className="section-heading">
            <div><p className="eyebrow">KEYMAP / LAYER {String(config.layers.indexOf(activeLayer)+1).padStart(2,'0')}</p><h1>{activeLayer.name}</h1></div>
            <div className="history-actions"><button aria-label="이전 키" onClick={() => selectKey(activeLayer.keys[(selectedIndex+activeLayer.keys.length-1)%activeLayer.keys.length])}>←</button><button aria-label="다음 키" onClick={() => selectKey(activeLayer.keys[(selectedIndex+1)%activeLayer.keys.length])}>→</button><button onClick={resetLayer}>초기화</button></div>
          </div>

          <div className="hardware-toolbar" aria-label="물리 배열 설정">
            <div className="hardware-options-scroll" aria-label="배열 및 키 테스트 옵션">
              <div className="hardware-group"><span>PLATE</span>{(['A','B','C','D'] as PlateId[]).map(plate => <button key={plate} className={hardware.plate===plate?'active':''} onClick={() => updateHardware({plate})}>{plate}</button>)}</div>
              <div className="hardware-group"><span>MIRROR</span><button className={!hardware.mirrored?'active':''} onClick={() => updateHardware({mirrored:false})}>LEFT</button><button className={hardware.mirrored?'active':''} onClick={() => updateHardware({mirrored:true})}>RIGHT</button></div>
              <div className="hardware-group"><span>ROTATE</span>{([0,90,180,270] as Rotation[]).map(rotation => <button key={rotation} className={hardware.rotation===rotation?'active':''} onClick={() => updateHardware({rotation})}>{rotation}°</button>)}</div>
            </div>
            <div className="hardware-actions">
              <div className="hardware-group test-group"><span>KEY TEST</span><button className={keyTestEnabled?'active':''} onClick={() => { setKeyTestEnabled(value=>!value); setTestedKeys(new Set()); }}>{keyTestEnabled?'ON':'OFF'}</button><b>{testedKeys.size}/{physicalLayout.cells.length+3}</b></div>
              <button className="apply-device-button" disabled={applyState.status==='applying'} onClick={applyPresetToDevice}>{applyState.status==='applying'?`${applyState.done}/${applyState.total} 적용 중`:'프리셋을 기기에 적용'}</button>
            </div>
          </div>

          <div className="device-stage"><div>
            <div className="device-label"><span>NOVA KINE · PLATE {hardware.plate}</span><small>{hardware.rotation===90||hardware.rotation===270?'LANDSCAPE':'PORTRAIT'} · {hardware.mirrored?'RIGHT MIRROR':'LEFT STANDARD'} · {physicalLayout.cells.length} KEYS + 3 AUX + E0</small></div>
            <div className={`device-body rot-${hardware.rotation}`}>
              <div className="key-grid physical-grid" style={{gridTemplateColumns:physicalLayout.gridTemplateColumns,gridTemplateRows:physicalLayout.gridTemplateRows}}>
                {physicalLayout.cells.map((cell,index) => { const item=activeLayer.keys[index]; const pressed=pressedKeys.has(cell.matrix); const tested=testedKeys.has(cell.matrix); return <button key={`${hardware.plate}-${cell.matrix}`} style={{gridColumn:`${cell.col} / span ${cell.width}`,gridRow:`${cell.row} / span ${cell.height}`}} aria-label={`${item.label} 키 · 매트릭스 ${cell.matrix}`} className={`deck-key ${selectedKeyId === item.id ? 'selected' : ''} ${item.tone ? 'accent-key' : ''} ${pressed?'pressed':''} ${tested?'tested':''} ${(cell.width??1)>1?'wide-key':''} ${(cell.height??1)>1?'tall-key':''} ${cell.section==='function'?'function-key':''}`} onClick={() => selectKey(item)}><span>{item.glyph}</span><strong>{item.label}</strong><small>M[{cell.matrix}]</small></button>; })}
              </div>
              <div className="device-controls">
                <div className="device-screen"><small>NOVA</small><strong>KINE</strong></div>
                {LK_KINE_AUXILIARY.map((address,index) => { const item=activeLayer.keys[24+index]; const pressed=pressedKeys.has(address); const tested=testedKeys.has(address); return <button key={address} className={`${selectedKeyId===item.id?'selected':''} ${pressed?'pressed':''} ${tested?'tested':''}`} onClick={()=>selectKey(item)}><span>{item.label}</span><small>M[{address}]</small></button>; })}
                <button className="roller" onClick={() => flash('엔코더 e0는 회전 시 지정된 키코드로 검사됩니다')}><span /><small>ENCODER E0</small></button>
                <div className="device-lights" aria-label="상태 표시등"><i/><i className={deviceState==='connected'?'live':''}/></div>
              </div>
            </div>
            <div className={`test-readout ${keyTestEnabled?'active':''} ${applyState.status}`}><span><i/>{keyTestEnabled ? pressedKeys.size ? `입력 감지 · ${[...pressedKeys].map(value=>`M[${value}]`).join(' ')}` : testSource==='keyboard' ? '브라우저 키 입력 대기 · VIA Matrix 보안 모드' : '실제 키를 눌러 매트릭스를 확인하세요' : '키 테스트 꺼짐'}</span><b>{applyState.message || (deviceState==='connected' ? `VIA ${deviceInfo?.protocol}` : 'USB-C 연결 필요')}</b></div>
          </div></div>
          <footer className="status-strip"><span><i className={deviceState==='connected'?'live':''} /> {deviceState==='connected'?'LK-KINE VIA 연결됨':'오프라인 설계 모드'}</span><span>{physicalLayout.cells.length} KEYS · 3 AUX · E0</span><span>Matrix 5×12 · Plate {hardware.plate} · {hardware.rotation}°</span><button onClick={checkSync}>{deviceInfo?'키 테스트':'장치 연결'} ↗</button></footer>
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
          <button className="save-button" onClick={saveDraft}>브라우저에 키 설정 저장</button>
        </aside>
      </section>

      {showDevice && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowDevice(false)}>
        <section className="device-modal" role="dialog" aria-modal="true" aria-labelledby="device-title" onMouseDown={event => event.stopPropagation()}>
          <header><div><p className="eyebrow">DEVICE & SYNC</p><h2 id="device-title">NOVA KINE 연결</h2></div><button aria-label="닫기" onClick={() => setShowDevice(false)}>×</button></header>
          <p className="modal-copy">타이핑용 페어링과 키맵 동기화는 별개입니다. 첨부된 VIA 정의에 따라 <b>LK-KINE · VID {LK_KINE_PROFILE.vendorIdHex} · PID {LK_KINE_PROFILE.productIdHex}</b> 장치만 찾으며, 첫 설정은 USB-C 유선 모드를 권장합니다.</p>
          <div className="via-device-profile"><span>VIA DEVICE</span><b>{LK_KINE_PROFILE.name}</b><code>{LK_KINE_PROFILE.vendorIdHex}:{LK_KINE_PROFILE.productIdHex}</code><em>{LK_KINE_PROFILE.matrix.rows}×{LK_KINE_PROFILE.matrix.cols} MATRIX</em></div>
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
              <small>{deviceInfo ? `VID ${deviceInfo.vid.toUpperCase()} · PID ${deviceInfo.pid.toUpperCase()} · VIA ${deviceInfo.protocol}` : 'Chrome 또는 Edge에서 USB-C 연결 후 장치 찾기를 누르세요.'}</small>
            </div>
            <button onClick={connectHid} disabled={deviceState==='requesting'}>{deviceState==='requesting'?'대기 중':'장치 찾기'}</button>
          </div>
          <ol className="sync-steps">
            <li className={deviceInfo?'done':'active'}><b>01</b><div><strong>OS 연결</strong><small>USB-C, 2.4G 동글 또는 Bluetooth 페어링</small></div></li>
            <li className={deviceInfo?'done':''}><b>02</b><div><strong>Raw HID 확인</strong><small>Usage 0xFF60 · 0x61 응답 검증</small></div></li>
            <li className={deviceInfo?'active':''}><b>03</b><div><strong>키 테스트</strong><small>실제 키를 눌러 화면의 M[row,col] 확인</small></div></li>
          </ol>
          <aside className="protocol-note"><strong>VIA 실시간 연결</strong><p>연결 후 5×12 스위치 매트릭스를 읽어 누른 키를 표시합니다. 프리셋 적용은 현재 플레이트의 실제 좌표만 기록하고, 각 키를 다시 읽어 같은 키코드인지 검증합니다.</p></aside>
          <footer><span>{deviceInfo?`VIA ${deviceInfo.protocol} · Key Test ready`:'Configuration stays local'}</span><button onClick={() => { setShowDevice(false); checkSync(); }} disabled={!deviceInfo}>키 테스트 시작</button></footer>
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
