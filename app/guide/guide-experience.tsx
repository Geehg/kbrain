'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

type Mode = 'usb' | 'bluetooth' | 'receiver';
type PlateId = 'A' | 'B' | 'C' | 'D';
type Rotation = 0 | 90;
type Cell = { id:string; col:number; row:number; width?:number; height?:number };

const keypadKeys = [
  { id:'print', label:'Print', col:1, row:1 }, { id:'scroll', label:'Scroll', col:2, row:1 },
  { id:'pause', label:'Pause', col:3, row:1 }, { id:'home', label:'Home', sub:'hold · Fn', col:4, row:1 },
  { id:'num', label:'Num', sub:'Lock', col:1, row:2 }, { id:'divide', label:'÷', col:2, row:2 },
  { id:'multiply', label:'×', col:3, row:2 }, { id:'minus', label:'−', col:4, row:2 },
  { id:'7', label:'7', col:1, row:3 }, { id:'8', label:'8', col:2, row:3 }, { id:'9', label:'9', col:3, row:3 },
  { id:'plus', label:'+', col:4, row:3, height:2 },
  { id:'4', label:'4', col:1, row:4 }, { id:'5', label:'5', col:2, row:4 }, { id:'6', label:'6', col:3, row:4 },
  { id:'1', label:'1', col:1, row:5 }, { id:'2', label:'2', col:2, row:5 }, { id:'3', label:'3', col:3, row:5 },
  { id:'enter', label:'Enter', col:4, row:5, height:2 },
  { id:'0', label:'0', col:1, row:6, width:2 }, { id:'dot', label:'.', col:3, row:6 },
];

const plateLayouts:Record<PlateId,Cell[]> = {
  A:[
    ...Array.from({length:8},(_,i)=>({id:`a-${i}`,col:i%4+1,row:Math.floor(i/4)+1})),
    {id:'a-8',col:1,row:3},{id:'a-9',col:2,row:3},{id:'a-10',col:3,row:3},{id:'a-11',col:4,row:3,height:2},
    {id:'a-12',col:1,row:4},{id:'a-13',col:2,row:4},{id:'a-14',col:3,row:4},
    {id:'a-15',col:1,row:5},{id:'a-16',col:2,row:5},{id:'a-17',col:3,row:5},{id:'a-18',col:4,row:5,height:2},
    {id:'a-19',col:1,row:6,width:2},{id:'a-20',col:3,row:6},
  ],
  B:[
    ...Array.from({length:8},(_,i)=>({id:`b-${i}`,col:i%4+1,row:Math.floor(i/4)+1})),
    {id:'b-8',col:1,row:3,height:2},{id:'b-9',col:2,row:3},{id:'b-10',col:3,row:3},{id:'b-11',col:4,row:3},
    {id:'b-12',col:2,row:4},{id:'b-13',col:3,row:4},{id:'b-14',col:4,row:4},
    {id:'b-15',col:1,row:5},{id:'b-16',col:2,row:5},{id:'b-17',col:3,row:5},{id:'b-18',col:4,row:5},
    {id:'b-19',col:1,row:6,width:2},{id:'b-20',col:3,row:6,width:2},
  ],
  C:[
    ...Array.from({length:4},(_,i)=>({id:`c-${i}`,col:i+1,row:1})),
    {id:'c-4',col:1,row:2,width:2},{id:'c-5',col:3,row:2,width:2},
    {id:'c-6',col:1,row:3},{id:'c-7',col:2,row:3},{id:'c-8',col:3,row:3},{id:'c-9',col:4,row:3,height:2},
    {id:'c-10',col:1,row:4},{id:'c-11',col:2,row:4},{id:'c-12',col:3,row:4},
    ...Array.from({length:8},(_,i)=>({id:`c-${i+13}`,col:i%4+1,row:Math.floor(i/4)+5})),
  ],
  D:Array.from({length:24},(_,i)=>({id:`d-${i}`,col:i%4+1,row:Math.floor(i/4)+1})),
};

const modeInfo:Record<Mode,{label:string;color:string;steps:{title:string;copy:string;keys?:string[];signal?:string}[]}> = {
  usb:{ label:'USB-C 유선', color:'red', steps:[
    {title:'데이터 케이블을 준비하세요',copy:'충전 전용이 아닌 동봉 USB-C 데이터 케이블을 사용합니다.'},
    {title:'컴퓨터와 KINE을 연결하세요',copy:'케이블을 연결하면 장치가 자동으로 유선 모드로 전환됩니다.',signal:'red'},
    {title:'빨간 표시등을 확인하세요',copy:'빨간색 점등이 보이면 VIA 설정과 펌웨어 작업을 시작할 수 있습니다.',signal:'red'},
  ]},
  bluetooth:{ label:'Bluetooth', color:'blue', steps:[
    {title:'케이블을 빼고 후면 전원을 켜세요',copy:'뒷면 전원 스위치를 ON으로 옮깁니다. 최초 연결 시 빠른 점멸은 정상입니다.'},
    {title:'Home(Fn) + 슬롯 키를 길게 누르세요',copy:'Home을 누른 채 선택한 1·2·3 키를 3-5초 유지합니다.',keys:['home','slot']},
    {title:'빠른 점멸을 기다리세요',copy:'표시등이 빠르게 깜빡이면 페어링 검색 준비가 완료된 것입니다.',signal:'blue'},
    {title:'컴퓨터에서 장치를 선택하세요',copy:'Bluetooth 목록에서 LK-KINE-BT1/2/3 중 선택한 슬롯과 같은 이름을 연결합니다.',signal:'blue'},
  ]},
  receiver:{ label:'2.4GHz 동글', color:'green', steps:[
    {title:'케이블을 빼고 전원을 켜세요',copy:'2.4GHz 무선 사용 전 후면 스위치가 ON인지 확인합니다.'},
    {title:'먼저 짧게 Home(Fn) + 4',copy:'출고 페어링이 유지된 경우 짧게 눌러 2.4GHz 모드로 전환합니다.',keys:['home','4']},
    {title:'연결이 안 되면 3-5초 길게',copy:'Home(Fn) + 4를 길게 눌러 표시등이 빠르게 깜빡일 때까지 기다립니다.',keys:['home','4'],signal:'green'},
    {title:'점멸을 본 뒤 동글을 꽂으세요',copy:'재페어링할 때는 반드시 빠른 점멸이 시작된 후 수신기를 USB 포트에 연결합니다.',signal:'green'},
  ]},
};

function KeypadDiagram({ activeKeys=[], signal='off', compact=false }:{ activeKeys?:string[]; signal?:string; compact?:boolean }) {
  return <div className={`nk-device ${compact?'compact':''}`} aria-label="NOVA KINE 기본 키 배열 도면">
    <div className="nk-keybed">
      {keypadKeys.map(key=>{
        const style = { gridColumn:`${key.col} / span ${key.width??1}`, gridRow:`${key.row} / span ${key.height??1}` } as CSSProperties;
        return <span key={key.id} style={style} className={`nk-key ${activeKeys.includes(key.id)?'is-active':''} ${key.id==='home'?'fn-key':''}`}><b>{key.label}</b>{key.sub&&<small>{key.sub}</small>}</span>;
      })}
    </div>
    <div className="nk-side-module">
      <div className="nk-screen"><small>NOVA</small><b>KINE</b></div>
      <span className="nk-side-key"/><span className="nk-side-key"/><span className="nk-side-key"/>
      <div className="nk-roller"><i/></div>
      <div className="nk-indicators"><i className={signal}/><i className={signal}/></div>
    </div>
    <div className="nk-cable" aria-hidden="true"><i/></div>
  </div>;
}

export function HeroDevice() {
  return <div className="hero-device">
    <KeypadDiagram activeKeys={['home']} compact />
    <div className="device-facts"><span><b>3</b> 연결 모드</span><span><b>4</b> 플레이트</span><span><b>3</b> Bluetooth 슬롯</span></div>
  </div>;
}

export function HardwareMap() {
  const notes = [
    ['01','Print','누른 채 USB-C 연결 시 DFU 펌웨어 모드'],
    ['02','Home / Fn','짧게 Home · 길게 누르면 Fn 레이어'],
    ['03','숫자 1·2·3','Bluetooth 슬롯 1·2·3 페어링'],
    ['04','숫자 4·5','2.4GHz 모드 · USB 모드 전환'],
    ['05','표시등','연결 모드, 페어링, 배터리 상태 안내'],
    ['06','보조키·롤러','VIA Key Tester에서 키와 롤러 반응 확인'],
  ];
  return <div className="hardware-map">
    <div className="hardware-stage"><KeypadDiagram activeKeys={['print','home','1','2','3','4','5']} signal="blue"/></div>
    <div className="hardware-notes">{notes.map(([number,title,copy])=><div key={number}><span>{number}</span><p><b>{title}</b><small>{copy}</small></p></div>)}</div>
  </div>;
}

export function PairingCoach() {
  const [mode,setMode] = useState<Mode>('bluetooth');
  const [step,setStep] = useState(0);
  const [slot,setSlot] = useState('1');
  const [playing,setPlaying] = useState(true);
  const info = modeInfo[mode];
  const chooseMode = (next:Mode) => { setMode(next); setStep(0); setPlaying(true); };
  const chooseSlot = (next:string) => { setSlot(next); setStep(0); setPlaying(true); };
  useEffect(()=>{
    if (!playing) return;
    const timer=window.setTimeout(()=>setStep(current=>current>=info.steps.length-1?0:current+1),2800);
    return ()=>window.clearTimeout(timer);
  },[step,playing,info.steps.length]);
  const current=info.steps[step];
  const activeKeys=(current.keys??[]).map(key=>key==='slot'?slot:key);
  return <div className={`pairing-coach mode-${info.color}`}>
    <div className="pairing-tabs" role="tablist" aria-label="연결 방식 선택">
      {(Object.keys(modeInfo) as Mode[]).map(id=><button key={id} role="tab" aria-selected={mode===id} className={mode===id?'active':''} onClick={()=>chooseMode(id)}><i/>{modeInfo[id].label}</button>)}
    </div>
    {mode==='bluetooth'&&<div className="slot-picker"><span>연결할 Bluetooth 슬롯</span>{['1','2','3'].map(id=><button key={id} className={slot===id?'active':''} onClick={()=>chooseSlot(id)}>BT {id}</button>)}</div>}
    <div className="pairing-stage">
      <div className="pairing-visual"><KeypadDiagram activeKeys={activeKeys} signal={current.signal??'off'} compact/><div className="motion-caption"><span>{String(step+1).padStart(2,'0')}</span><div key={`${mode}-${slot}-${step}`}><b>{current.title}</b><p>{current.copy}</p></div></div></div>
      <ol className="pairing-steps">{info.steps.map((item,index)=><li key={item.title} className={index===step?'active':index<step?'done':''}><button onClick={()=>{setStep(index);setPlaying(false)}}><span>{index<step?'✓':index+1}</span><div><b>{item.title}</b><small>{item.copy}</small></div></button></li>)}</ol>
    </div>
    <div className="coach-controls"><button onClick={()=>setPlaying(value=>!value)}>{playing?'Ⅱ 자동 안내 멈춤':'▶ 자동 안내 계속'}</button><div aria-hidden="true"><i style={{width:`${((step+1)/info.steps.length)*100}%`}}/></div><span>{step+1} / {info.steps.length}</span></div>
  </div>;
}

function transformPlate(cells:Cell[], mirrored:boolean, rotation:Rotation) {
  const base=cells.map(cell=>{
    const width=cell.width??1; const height=cell.height??1;
    return {...cell,width,height,col:mirrored?6-cell.col-width:cell.col};
  });
  if (rotation===0) return {cells:base,columns:4,rows:6};
  return {cells:base.map(cell=>({ ...cell,col:8-cell.row-cell.height,row:cell.col,width:cell.height,height:cell.width })),columns:6,rows:4};
}

export function PlateExplorer() {
  const [plate,setPlate]=useState<PlateId>('A');
  const [mirrored,setMirrored]=useState(false);
  const [rotation,setRotation]=useState<Rotation>(0);
  const layout=useMemo(()=>transformPlate(plateLayouts[plate],mirrored&&plate!=='D',rotation),[plate,mirrored,rotation]);
  const descriptions:Record<PlateId,string>={A:'오른쪽 세로 2U 2개 + 하단 가로 2U',B:'왼쪽 세로 2U + 하단 가로 2U 2개',C:'상단 가로 2U 2개 + 오른쪽 세로 2U',D:'24개의 1U 키를 사용하는 직교 배열'};
  return <div className="plate-explorer">
    <div className="plate-toolbar"><div>{(['A','B','C','D'] as PlateId[]).map(id=><button key={id} className={plate===id?'active':''} onClick={()=>setPlate(id)}>PLATE {id}</button>)}</div><div><button disabled={plate==='D'} className={mirrored?'active':''} onClick={()=>setMirrored(value=>!value)}>↔ 좌우 미러</button><button className={rotation===90?'active':''} onClick={()=>setRotation(value=>value===0?90:0)}>↻ {rotation===0?'세로':'가로'}</button></div></div>
    <div className="plate-workbench">
      <div className={`plate-blueprint ${rotation===90?'landscape':''}`} style={{gridTemplateColumns:`repeat(${layout.columns},1fr)`,gridTemplateRows:`repeat(${layout.rows},1fr)`}}>{layout.cells.map(cell=><i key={cell.id} style={{gridColumn:`${cell.col} / span ${cell.width}`,gridRow:`${cell.row} / span ${cell.height}`}}><span>{cell.width>1||cell.height>1?'2U':'1U'}</span></i>)}</div>
      <div className="plate-detail"><p>PLATE {plate} · {mirrored&&plate!=='D'?'MIRRORED · ':''}{rotation===90?'LANDSCAPE':'PORTRAIT'}</p><h3>{descriptions[plate]}</h3><ul><li><b>{layout.cells.length}</b> 물리 키</li><li><b>{layout.cells.filter(cell=>cell.width>1||cell.height>1).length}</b> 2U 키</li><li><b>{rotation===90?'6 × 4':'4 × 6'}</b> 배치 면적</li></ul><small>도면은 스위치 플레이트의 점유 칸을 기준으로 표시합니다. 회전해도 키 ID와 저장된 기능은 유지됩니다.</small></div>
    </div>
  </div>;
}
