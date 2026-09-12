'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { actionIssue, actionSteps, assignmentIssue, browserCapable, deviceKeycode, safeWebUrl, shortcutFor, windowsScript, type ActionStep, type DeckAction } from './deck-actions';
import { qmkKeycodeMatchesDomEvent } from './via-webhid';
import './deck-actions.css';

export type ActionAssignment = { key:DeckAction; index:number; matrix:string };
export type ActionRunnerHandle = { test:(key:DeckAction)=>void };
type Job = { key:DeckAction; steps:ActionStep[]; index:number; confirmed:boolean };

export const ActionRunner = forwardRef<ActionRunnerHandle, { assignments:ActionAssignment[]; testing:boolean; profile:string }>(function ActionRunner({assignments,testing,profile}, ref) {
  const [enabled,setEnabled] = useState(false), [job,setJob] = useState<Job|null>(null);
  const [message,setMessage] = useState('실행 모드는 기본 OFF입니다. 화면 키 클릭은 설정 선택만 합니다.');
  const [busy,setBusy] = useState(false), [showExport,setShowExport] = useState(false);
  const operation = useRef(0), busyRef = useRef(false), timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const conflict = assignmentIssue(assignments);
  const record = useCallback((text:string) => setMessage(text), []);
  const cancel = useCallback(() => { operation.current++; if(timer.current) clearTimeout(timer.current); busyRef.current=false; setBusy(false); setJob(null); }, []);
  useEffect(() => () => { operation.current++; if(timer.current) clearTimeout(timer.current); }, []);
  // Never execute saved actions while importing, editing a field, testing keys,
  // holding a key, changing layers, or receiving asynchronous HID matrix reports.
  const execute = useCallback(async (next:Job) => {
    if(busyRef.current) return;
    const generation=++operation.current;
    busyRef.current=true; setBusy(true);
    setJob(next);
    const step=next.steps[next.index];
    try {
      if(step.kind==='url') {
        const child=window.open('about:blank','_blank');
        if(!child) throw new Error('팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 뒤 다시 실행하세요.');
        child.opener=null;
        child.location.replace(safeWebUrl(step.value)!);
      } else if(step.kind==='text') {
        if(!navigator.clipboard?.writeText) throw new Error('이 환경에서는 복사를 지원하지 않습니다. 아래 텍스트를 직접 복사하세요.');
        await navigator.clipboard.writeText(step.value);
      } else await new Promise<void>(resolve => { timer.current=setTimeout(resolve,Number(step.value)); });
      if(generation!==operation.current) return;
      const completed=next.index+1>=next.steps.length;
      record(`${next.key.label} · ${step.kind==='url'?'새 탭 열기 요청 전달':step.kind==='text'?'클립보드 복사 완료':'대기 완료'}${completed?'':` · 다음 단계 ${next.index+2}/${next.steps.length}`}`);
      setJob(completed?null:{...next,index:next.index+1,confirmed:true});
    } catch(error) { if(generation===operation.current) record(error instanceof Error?error.message:'실행하지 못했습니다.'); }
    finally { if(generation===operation.current) { busyRef.current=false; setBusy(false); } }
  }, [record]);
  const begin = useCallback((key:DeckAction) => {
    if(busyRef.current) return;
    const issue=actionIssue(key);
    if(issue) { record(issue); return; }
    if(!browserCapable(key)) { record(shortcutFor(key)?'이 단축키는 기기에 적용한 뒤 대상 앱에서 테스트하세요.':'프로그램 실행은 Windows 실행 파일을 사용하세요.'); return; }
    const next:Job={key,steps:actionSteps(key),index:0,confirmed:!key.confirm};
    if(!key.confirm&&next.steps.length===1) void execute(next);
    else { setJob(next); record('실행 내용을 확인한 뒤 단계 실행 버튼을 누르세요.'); }
  }, [execute,record]);
  useImperativeHandle(ref,()=>({test:begin}),[begin]);
  useEffect(() => {
    if (!showExport) return;
    const previous = document.activeElement;
    const modal = document.querySelector<HTMLElement>('.action-export');
    const controls = () => [...(modal?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],summary') ?? [])];
    controls()[0]?.focus();
    const onKey = (event:KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setShowExport(false); }
      if (event.key !== 'Tab') return;
      const items=controls(), first=items[0], last=items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown',onKey);
    return () => { document.removeEventListener('keydown',onKey); if(previous instanceof HTMLElement&&previous.isConnected) previous.focus(); };
  },[showExport]);
  useEffect(() => {
    if(!enabled||testing||showExport||conflict) return;
    const pressed=new Set<string>();
    const down=(event:KeyboardEvent) => {
      if(event.repeat||event.isComposing||!event.isTrusted||job||document.visibilityState!=='visible') return;
      const target=event.target;
      if(target instanceof Element&&target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      if(pressed.has(event.code)) return;
      const match=assignments.find(({key,index}) => {
        const code=deviceKeycode(key,index);
        return code!==null&&browserCapable(key)&&qmkKeycodeMatchesDomEvent(code,event);
      });
      if(!match) return;
      event.preventDefault(); pressed.add(event.code); begin(match.key);
    };
    const up=(event:KeyboardEvent)=>pressed.delete(event.code), blur=()=>pressed.clear();
    window.addEventListener('keydown',down); window.addEventListener('keyup',up); window.addEventListener('blur',blur);
    return ()=>{ window.removeEventListener('keydown',down); window.removeEventListener('keyup',up); window.removeEventListener('blur',blur); };
  },[assignments,enabled,testing,showExport,job,begin,conflict]);
  const prepared=assignments.filter(({key})=>!actionIssue(key));
  const exportable=prepared.filter(({key})=>!shortcutFor(key));
  const exportPreview=conflict??(exportable.length?windowsScript(assignments).source:'완성된 액션이 없습니다.');
  const download = () => {
    try {
      const result=windowsScript(assignments);
      const url=URL.createObjectURL(new Blob(['\uFEFF'+result.source],{type:'text/plain;charset=utf-8'}));
      const a=document.createElement('a'); a.href=url; a.download='AI-PAD-Windows.ahk'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000); setShowExport(false); setEnabled(false);
      record(`Windows 설정 ${result.count}개를 내보냈습니다. Windows에서 내용을 검토한 뒤 실행하세요.`);
    } catch(error) { record(error instanceof Error?error.message:'내보내기 실패'); }
  };
  return <section id="action-runner" className="action-runtime" aria-label="액션 실행">
    <div className="action-runtime-bar"><label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>사이트 실행 모드</label><span>{testing?'키 테스트 중 · 실행 일시 정지':enabled?'이 탭을 선택한 상태에서만 입력 받음':'편집 모드'}</span><button onClick={()=>setShowExport(true)}>Windows 실행 파일 받기</button></div>
    <p>{prepared.length}/{assignments.length}개 설정 완료 · 프로그램 실행은 Windows 연동 필요 · 기본 단축키는 사이트 없이 동작</p>
    {conflict&&<p role="alert">{conflict} 기기 적용·사이트 실행·Windows 내보내기는 잠시 중지됩니다.</p>}
    <p role="status" className="action-runtime-result">{message}</p>
    {job&&<div className="action-job" role="dialog" aria-modal="false" aria-label="액션 실행 확인"><header><b>{job.key.label} · {job.index+1}/{job.steps.length}단계</b><button onClick={cancel}>취소</button></header><p>{job.key.kind==='ai'||job.key.kind==='agent'?'지시문을 복사한 뒤 AI 페이지를 엽니다. 붙여넣기와 질문 전송은 직접 해주세요.':'웹페이지는 새 탭으로, 텍스트는 클립보드로 전달됩니다.'}</p><textarea aria-label="현재 단계 내용" readOnly value={job.steps[job.index].value}/><button disabled={busy} onClick={()=>void execute({...job,confirmed:true})}>{busy?'처리 중…':!job.confirmed?'승인하고 실행':job.steps[job.index].kind==='url'?'웹페이지 열기':job.steps[job.index].kind==='text'?'텍스트 복사':'대기 실행'}</button><small>브라우저 보안상 여러 단계는 각각 실행합니다. Windows 파일에서는 순차 자동 실행됩니다.</small></div>}
    {showExport&&<div className="modal-backdrop" onMouseDown={()=>setShowExport(false)}><section className="device-modal action-export" role="dialog" aria-modal="true" aria-label="Windows 실행 파일 검토" onMouseDown={e=>e.stopPropagation()}><header><h2>Windows에서 사이트 없이 사용</h2><button aria-label="Windows 안내 닫기" onClick={()=>setShowExport(false)}>×</button></header><p>{profile} · 저장된 설정 기준 {exportable.length}개 포함. 미설정 {assignments.length-prepared.length}개는 제외됩니다. 기기에 직접 기록되는 단축키도 파일에서 제외합니다.</p><ol><li><a href="https://www.autohotkey.com/" target="_blank" rel="noreferrer">공식 AutoHotkey v2</a>를 Windows에 한 번 설치합니다.</li><li>원하는 키의 세부 설정을 저장하고, 같은 배열·레이어를 기기에 적용합니다.</li><li>아래 파일 내용을 검토하고 다운로드한 뒤 Windows에서 실행합니다.</li><li>사이트 실행 모드는 OFF로 두세요. 프로그램은 해당 PC에 설치돼 있어야 합니다.</li></ol><p>USB·Bluetooth 모두 사용 가능하며, 사이트를 닫아도 파일이 실행 중이면 작동합니다. 변경 후에는 파일을 다시 받아 실행하세요. 여러 프로필 파일을 동시에 실행하지 마세요.</p><details><summary>생성될 파일 내용 확인</summary><pre>{exportPreview}</pre></details><p>파일에 프로그램 경로·URL·지시문이 포함됩니다. 비밀번호나 API 키는 넣지 마세요. 관리자 권한이나 자동 시작은 설정하지 않습니다. 중지: Windows 작업 표시줄의 AutoHotkey 아이콘 → Exit.</p><button className="save-button" disabled={!exportable.length||!!conflict} onClick={download}>검토한 Windows 설정 다운로드 (.ahk)</button></section></div>}
  </section>;
});
