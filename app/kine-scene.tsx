'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MatrixAddress, PlateId, Rotation } from './lk-kine-profile';
import type { Finish, ModelKey, ModelPart } from './kine-model';
import KineLedControls from './kine-led-controls';
import { DEFAULT_LED_SETTINGS, ledLevel, resolveKineLeds, type LedSettings } from './kine-led';
import './kine-scene.css';

type View = 'perspective' | 'top' | 'bottom' | 'left' | 'right' | 'ports' | 'leds';
type Props = {
  plate: PlateId; mirrored: boolean; rotation: Rotation; keys: ModelKey[];
  selectedId: string; pressed: Set<MatrixAddress>; tested: Set<MatrixAddress>;
  connected: boolean; onSelect: (id: string) => void; onFallback: () => void;
};
type SceneApi = {
  rebuild: (props: Props, finish: Finish) => void;
  sync: (props: Props, labels: boolean) => void;
  view: (view: View) => void; zoom: (factor: number) => void;
  spin: (enabled: boolean) => void; power: (on: boolean) => void;
  leds: (settings: LedSettings) => void;
};

const views: [View, string][] = [['perspective', '입체'], ['top', '앞면'], ['bottom', '뒷면'], ['left', '왼쪽'], ['right', '오른쪽'], ['ports', 'USB 측면']];
const parts: Record<ModelPart, { title: string; copy: string }> = {
  antenna: { title: '무선 안테나 구획', copy: '반투명 프로스트 커버 안쪽에 무선 안테나가 있습니다. 화면이나 수신기 보관함이 아닙니다.' },
  roller: { title: '가로형 롤러 · E0', copy: '클릭하면 모델의 롤러가 회전합니다. 실제 기기의 기본 동작은 볼륨 조절이며 VIA에서 변경할 수 있습니다.' },
  power: { title: '뒷면 전원 스위치', copy: '무선 사용 전 실제 기기 바닥의 스위치를 ON으로 옮기세요. 아래 조작은 3D 모형에만 적용됩니다.' },
  usb: { title: 'USB-C 포트', copy: '상단 4개 키 뒤쪽의 짧은 측면에 있습니다. 데이터 케이블로 PC에 연결한 뒤 장치 연결 메뉴에서 키맵을 적용하세요.' },
  leds: { title: '매립형 상태 표시등', copy: '세로 정면 기준 왼쪽은 Num Lock, 오른쪽은 연결 모드입니다. 아래 LED 패널에서 연결·페어링·배터리 확인 예시를 볼 수 있습니다. 실제 LED 상태를 읽거나 바꾸지는 않습니다.' },
  back: { title: '알루미늄 바닥면', copy: 'NOVA KINE 명판, 전원 스위치, 원형으로 파인 홈과 긴 고무 받침을 재현했습니다. 세부 깊이는 공식 사진을 기준으로 추정했습니다.' },
};

export default function KineScene(props: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const propsRef = useRef(props);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [finish, setFinish] = useState<Finish>('silver');
  const [labels, setLabels] = useState(true);
  const [view, setView] = useState<View>('perspective');
  const [spinning, setSpinning] = useState(false);
  const [part, setPart] = useState<ModelPart | null>(null);
  const [powerOn, setPowerOn] = useState(true);
  const [ledSettings, setLedSettings] = useState<LedSettings>(DEFAULT_LED_SETTINGS);
  const ledSettingsRef = useRef(ledSettings);
  const keySignature = useMemo(() => JSON.stringify(props.keys), [props.keys]);

  useEffect(() => { propsRef.current = props; apiRef.current?.sync(props, labels); }, [props, labels]);
  useEffect(() => { ledSettingsRef.current = ledSettings; apiRef.current?.leds(ledSettings); }, [ledSettings]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false; let cleanup: (() => void) | undefined;
    async function initialize() {
      const [THREE, { OrbitControls }, { RoomEnvironment }, { createKineModel, disposeModel }] = await Promise.all([
        import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/environments/RoomEnvironment.js'), import('./kine-model'),
      ]);
      if (cancelled || !mount) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.domElement.setAttribute('aria-label', 'NOVA KINE 3D 모델. 드래그로 회전, 휠로 확대, 키를 클릭해 선택. 방향키로 시점 이동, 더하기와 빼기로 확대 축소.');
      renderer.domElement.tabIndex = 0; mount.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, .04); scene.environment = environment.texture;
      room.dispose(); pmrem.dispose();
      const camera = new THREE.PerspectiveCamera(34, 1, 1, 1800);
      camera.position.set(115, 220, 165);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 10, 0); controls.enableDamping = true; controls.dampingFactor = .1;
      controls.minDistance = 55; controls.maxDistance = 650; controls.enablePan = false;
      controls.autoRotateSpeed = .8; controls.update();
      const hemi = new THREE.HemisphereLight('#f4f8ff', '#79848a', 1.1); scene.add(hemi);
      const keyLight = new THREE.DirectionalLight('#ffffff', 2.1); keyLight.position.set(-90, 180, 40); keyLight.castShadow = true;
      Object.assign(keyLight.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 450 });
      keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.bias = -.001; keyLight.shadow.normalBias = .12; scene.add(keyLight);
      const fill = new THREE.DirectionalLight('#c5d6ed', 1.2); fill.position.set(80, -100, -90); scene.add(fill);
      let model = createKineModel(propsRef.current.plate, propsRef.current.mirrored, propsRef.current.keys, 'silver');
      scene.add(model.root);
      const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
      const targetPosition = camera.position.clone(); const targetFocus = controls.target.clone();
      let transition = false; let virtualPress: string | null = null; let pressUntil = 0; let rollerTarget = 0;
      let frame = 0; let visible = true; let lost = false; let lastTime = 0; let dirty = true; let ticking = false;
      let pointerStart: { x: number; y: number; id: number } | null = null;
      const activePointers = new Set<number>(); let gesture = false;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let labelsVisible = true;
      let currentLedSettings = ledSettingsRef.current;
      let currentLeds = resolveKineLeds(currentLedSettings, propsRef.current.connected);
      let ledEpoch = performance.now();
      const updateLeds = () => {
        const next = resolveKineLeds(currentLedSettings, propsRef.current.connected);
        if (JSON.stringify(next.signals) !== JSON.stringify(currentLeds.signals)) ledEpoch = performance.now();
        currentLeds = next;
      };
      const wake = () => { dirty = true; if (!frame && !ticking && visible && !lost) frame = requestAnimationFrame(tick); };
      const sync = (p: Props, showLabels: boolean) => {
        labelsVisible = showLabels;
        model.root.rotation.y = -p.rotation * Math.PI / 180;
        // Turn virtual labels upright after a physical orientation change.
        for (const key of model.keyMeshes) {
          key.label.rotation.set(-Math.PI / 2, 0, p.rotation * Math.PI / 180);
          key.label.scale.x = (p.rotation === 90 || p.rotation === 270) ? key.label.userData.landscapeWidth / key.label.userData.portraitWidth : 1;
          key.label.visible = showLabels;
          key.ring.visible = key.id === p.selectedId || p.pressed.has(key.matrix) || p.tested.has(key.matrix);
          (key.ring.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.set(p.pressed.has(key.matrix) ? '#84e8ff' : key.id === p.selectedId ? '#c8f135' : '#7ba66f');
        }
        updateLeds(); wake();
      };
      const chooseView = (next: View) => {
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        // Camera positions are relative to the device so named sides stay correct
        // when the user changes the portrait/landscape orientation.
        const vectors: Record<View, [number, number, number]> = {
          perspective: [.4, .78, .54], top: [0, 1, .001], bottom: [0, -1, .001],
          left: [-1, .13, .001], right: [1, .13, .001], ports: [0, .13, -1], leds: [.35, .8, .5],
        };
        targetPosition.set(...vectors[next]).normalize();
        if (next === 'left' || next === 'right' || next === 'ports' || next === 'leds') targetPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), model.root.rotation.y);
        targetFocus.set(0, 10, 0);
        // Fit the actual rotated case bounds, including its depth in perspective.
        const bounds = new THREE.Box3().setFromObject(model.root);
        const right = new THREE.Vector3(0, 1, 0).cross(targetPosition).normalize();
        const up = targetPosition.clone().cross(right).normalize();
        let distance = controls.minDistance;
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
          const corner = new THREE.Vector3(x, y, z).sub(targetFocus);
          distance = Math.max(distance, corner.dot(targetPosition) + Math.max(Math.abs(corner.dot(up)) / Math.tan(halfFov), Math.abs(corner.dot(right)) / (Math.tan(halfFov) * camera.aspect)));
        }
        targetPosition.multiplyScalar(distance * 1.2).add(targetFocus);
        if (next === 'leds') {
          targetFocus.set(42.2, 15.5, 52).applyAxisAngle(new THREE.Vector3(0, 1, 0), model.root.rotation.y);
          targetPosition.set(...vectors.leds).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), model.root.rotation.y).multiplyScalar(Math.max(84, 58 / camera.aspect)).add(targetFocus);
        }
        transition = !reduced.matches;
        if (!transition) { camera.position.copy(targetPosition); controls.target.copy(targetFocus); controls.update(); }
        controls.autoRotate = false; setSpinning(false); setView(next); wake();
      };
      const hit = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        // Stop at the first visible surface: never select front keys through the back.
        const intersection = raycaster.intersectObject(model.root, true).find(h => h.object.visible);
        let object = intersection?.object;
        while (object && object !== model.root) {
          if (object.userData.keyId || object.userData.part) return object.userData;
          object = object.parent ?? undefined;
        }
        return null;
      };
      const down = (event: PointerEvent) => {
        activePointers.add(event.pointerId); if (activePointers.size > 1) gesture = true;
        if (event.button !== 0) return;
        transition = false; pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId }; wake();
      };
      const move = (event: PointerEvent) => {
        if (activePointers.size) { wake(); return; }
        renderer.domElement.style.cursor = hit(event) ? 'pointer' : 'grab';
      };
      const up = (event: PointerEvent) => {
        activePointers.delete(event.pointerId);
        if (!gesture && pointerStart?.id === event.pointerId && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 6) {
          const found = hit(event);
          if (found?.keyId) { virtualPress = String(found.keyId); pressUntil = performance.now() + 190; propsRef.current.onSelect(virtualPress); setPart(null); }
          else if (found?.part) {
            setPart(found.part as ModelPart);
            if (found.part === 'roller') rollerTarget += Math.PI / 3;
          }
        }
        pointerStart = null; if (!activePointers.size) gesture = false; wake();
      };
      const cancel = (event: PointerEvent) => { activePointers.delete(event.pointerId); pointerStart = null; if (!activePointers.size) gesture = false; };
      const zoom = (factor: number) => {
        transition = false; const offset = camera.position.clone().sub(controls.target);
        offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(offset); controls.update(); wake();
      };
      const keyboard = (event: KeyboardEvent) => {
        if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(.87); }
        else if (event.key === '-') { event.preventDefault(); zoom(1.15); }
        else if (event.key === 'Home') { event.preventDefault(); chooseView('perspective'); }
        else if (event.key.startsWith('Arrow')) {
          event.preventDefault(); transition = false;
          const offset = camera.position.clone().sub(controls.target); const spherical = new THREE.Spherical().setFromVector3(offset);
          if (event.key === 'ArrowLeft') spherical.theta -= .16;
          if (event.key === 'ArrowRight') spherical.theta += .16;
          if (event.key === 'ArrowUp') spherical.phi -= .16;
          if (event.key === 'ArrowDown') spherical.phi += .16;
          spherical.makeSafe(); camera.position.copy(controls.target).add(offset.setFromSpherical(spherical)); controls.update(); wake();
        }
      };
      function tick(now: number) {
        frame = 0; if (!visible || lost) return;
        ticking = true;
        const dt = Math.min((now - lastTime) / 1000 || .016, .05); lastTime = now;
        let animating = transition || controls.autoRotate || activePointers.size > 0;
        if (transition) {
          camera.position.lerp(targetPosition, .16); controls.target.lerp(targetFocus, .16);
          if (camera.position.distanceTo(targetPosition) < .05) { camera.position.copy(targetPosition); transition = false; }
        }
        const p = propsRef.current;
        const freezeLeds = reduced.matches || currentLedSettings.paused;
        for (let i = 0; i < 2; i++) {
          const signal = currentLeds.signals[i], level = ledLevel(signal, now - ledEpoch, freezeLeds);
          const strength = level * currentLedSettings.brightness / 100;
          const material = model.ledMaterials[i];
          material.color.set(i ? '#c5cac7' : '#51585a').lerp(new THREE.Color(signal.color), strength * .45);
          material.emissive.set(signal.color); material.emissiveIntensity = strength * 4.2;
          model.ledLights[i].color.set(signal.color); model.ledLights[i].intensity = currentLedSettings.spill ? strength * 32 : 0;
          model.ledHalos[i].material.color.set(signal.color); model.ledHalos[i].material.opacity = currentLedSettings.spill ? strength * .7 : 0;
          if (!freezeLeds && (signal.pattern === 'pairing' || signal.pattern === 'warning')) animating = true;
        }
        for (const key of model.keyMeshes) {
          const pressed = p.pressed.has(key.matrix) || (virtualPress === key.id && now < pressUntil);
          const destination = pressed ? -1.5 : 0;
          if (Math.abs(key.group.position.y - destination) > .005) { key.group.position.y = reduced.matches ? destination : THREE.MathUtils.lerp(key.group.position.y, destination, .35); animating = true; }
        }
        if (Math.abs(model.rollerGroup.rotation.x - rollerTarget) > .002) { model.rollerGroup.rotation.x = THREE.MathUtils.lerp(model.rollerGroup.rotation.x, rollerTarget, .16); animating = true; }
        const changed = controls.update(dt);
        if (dirty || animating || changed) renderer.render(scene, camera);
        dirty = false; ticking = false; if (animating || changed || now < pressUntil) frame = requestAnimationFrame(tick);
      }
      const resize = () => {
        const w = Math.max(mount.clientWidth, 1), h = Math.max(mount.clientHeight, 1);
        camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); wake();
      };
      const observer = new ResizeObserver(resize); observer.observe(mount);
      const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting && !document.hidden; if (visible) wake(); }); visibility.observe(mount);
      const pageVisibility = () => { visible = !document.hidden; if (visible) wake(); };
      const contextLost = (event: Event) => { event.preventDefault(); lost = true; setError('3D 표시가 중단되었습니다. 새로고침하거나 2D 편집으로 계속할 수 있습니다.'); };
      const interaction = () => { transition = false; wake(); };
      const motionChanged = () => { if (reduced.matches) { controls.autoRotate = false; setSpinning(false); } wake(); };
      renderer.domElement.addEventListener('pointerdown', down);
      renderer.domElement.addEventListener('pointermove', move);
      renderer.domElement.addEventListener('pointerup', up);
      renderer.domElement.addEventListener('pointercancel', cancel);
      renderer.domElement.addEventListener('keydown', keyboard);
      renderer.domElement.addEventListener('webglcontextlost', contextLost);
      document.addEventListener('visibilitychange', pageVisibility); reduced.addEventListener('change', motionChanged);
      controls.addEventListener('start', interaction); controls.addEventListener('change', wake);
      apiRef.current = {
        rebuild: (p, nextFinish) => {
          scene.remove(model.root); disposeModel(model.root);
          model = createKineModel(p.plate, p.mirrored, p.keys, nextFinish); scene.add(model.root);
          rollerTarget = 0; sync(p, labelsVisible);
        }, sync, view: chooseView, zoom,
        spin: enabled => { controls.autoRotate = enabled; transition = false; wake(); },
        power: on => { model.switchThumb.position.x = on ? -1.8 : 1.8; wake(); },
        leds: settings => { currentLedSettings = settings; updateLeds(); wake(); },
      };
      // Preserve a single renderer across preset and input updates.
      sync(propsRef.current, true); resize(); chooseView('perspective'); setReady(true);
      cleanup = () => {
        if (frame) cancelAnimationFrame(frame);
        observer.disconnect(); visibility.disconnect(); controls.dispose();
        document.removeEventListener('visibilitychange', pageVisibility); reduced.removeEventListener('change', motionChanged);
        renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up);
        renderer.domElement.removeEventListener('pointercancel', cancel); renderer.domElement.removeEventListener('keydown', keyboard); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
        disposeModel(model.root); environment.dispose(); renderer.dispose(); renderer.domElement.remove(); apiRef.current = null;
      };
    }
    void initialize().catch(() => { if (!cancelled) setError('이 환경에서는 3D를 표시할 수 없습니다. 브라우저의 하드웨어 가속을 확인하거나 2D 편집을 이용하세요.'); });
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    apiRef.current?.rebuild(propsRef.current, finish);
  }, [keySignature, props.plate, props.mirrored, finish, ready]);
  useEffect(() => { if (ready) apiRef.current?.power(powerOn); }, [powerOn, ready, finish, keySignature, props.plate, props.mirrored]);
  const selectView = (next: View) => { apiRef.current?.view(next); setPart(next === 'bottom' ? 'back' : next === 'ports' ? 'usb' : null); };
  const focusLeds = () => {
    selectView('leds'); setPart(null);
    mountRef.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return <section className="kine-viewer" aria-label="NOVA KINE 3D 편집기">
    <div className="kine-viewbar"><div className="kine-view-presets" aria-label="3D 시점">{views.map(([id, label]) => <button key={id} aria-pressed={view === id} disabled={!ready || !!error} onClick={() => selectView(id)}>{label}</button>)}</div><button className="kine-reset" disabled={!ready || !!error} onClick={() => selectView('perspective')} title="처음 시점으로">↺ <span>시점 초기화</span></button></div>
    <div className="kine-canvas-wrap">
      <div className="kine-stage-heading"><b>NOVA KINE</b><span>360° PRODUCT VIEW</span></div>
      <div ref={mountRef} className="kine-canvas" />
      {!ready && !error && <div className="kine-loading" role="status">3D 모델을 준비하고 있습니다…</div>}
      {error && <div className="kine-error" role="alert"><p>{error}</p><button onClick={props.onFallback}>2D 편집으로 전환</button></div>}
      <div className="kine-zoom"><button aria-label="3D 확대" disabled={!ready || !!error} onClick={() => apiRef.current?.zoom(.87)}>＋</button><button aria-label="3D 축소" disabled={!ready || !!error} onClick={() => apiRef.current?.zoom(1.15)}>−</button></div>
      <div className="kine-stage-caption"><span>드래그 회전 · 휠/핀치 확대 · 키 클릭 선택</span><b>{props.plate} / {props.rotation}°</b></div>
      {part && <aside className="kine-part-info" aria-live="polite"><button className="kine-info-close" aria-label="부품 안내 닫기" onClick={() => setPart(null)}>×</button><strong>{parts[part].title}</strong><p>{parts[part].copy}</p>{part === 'power' && <button className="kine-power" aria-pressed={powerOn} onClick={() => setPowerOn(value => !value)}>모형 스위치 {powerOn ? 'ON' : 'OFF'}</button>}</aside>}
    </div>
    <div className="kine-options"><div className="kine-finishes" aria-label="모형 케이스 색상"><span>케이스</span>{([['silver', '실버'], ['gray', '그레이'], ['black', '블랙']] as [Finish, string][]).map(([id, name]) => <button key={id} aria-label={name} title={name} aria-pressed={finish === id} onClick={() => setFinish(id)}><i className={`finish-${id}`} /></button>)}</div><label><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} />키 이름</label><label><input type="checkbox" checked={spinning} disabled={!ready || !!error} onChange={e => { setSpinning(e.target.checked); apiRef.current?.spin(e.target.checked); }} />자동 회전</label></div>
    <div className="kine-part-links" aria-label="부품 살펴보기"><button onClick={() => { selectView('bottom'); setPart('power'); }}>전원 스위치</button><button onClick={() => { selectView('ports'); setPart('usb'); }}>USB-C</button><button onClick={() => { selectView('top'); setPart('antenna'); }}>안테나</button><button onClick={() => { selectView('leds'); setPart('leds'); }}>표시등</button></div>
    <KineLedControls settings={ledSettings} connected={props.connected} onChange={patch => setLedSettings(current => ({ ...current, ...patch }))} onCloseup={focusLeds}/>
    <p className="kine-model-note">공식 외형 111.65 × 136.01 × 24.5 mm를 기준으로 재구성한 모델입니다. 세부 곡면·깊이는 사진 기반 추정이며, 키 이름과 조명은 화면용 표시입니다. <a href="https://www.luminkey.com/products/luminkey-nova-kine-keyboard" target="_blank" rel="noreferrer">제품 자료 ↗</a> <a href="https://cdn.shopify.com/s/files/1/0815/1800/2452/files/Nova_Kine_user_guide_77b098bd-6f5b-4df1-812a-a262a244c5c3.pdf?v=1781226519" target="_blank" rel="noreferrer">공식 설명서 ↗</a></p>
  </section>;
}
