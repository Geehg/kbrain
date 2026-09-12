import type { Metadata } from 'next';
import { HardwareMap, HeroDevice, PairingCoach, PlateExplorer } from './guide-experience';
import { LK_KINE_PROFILE } from '../lk-kine-profile';
import { CODEX_BINDINGS, CODEX_COMMANDS_URL } from '../codex-preset';
import { ProductBrand, ProductLink } from '../product-brand';
import './guide.css';

export const metadata: Metadata = {
  title: 'NOVA KINE 한국어 사용 가이드 | LUMINKEY',
  description: 'NOVA KINE 연결, VIA 설정, 조합키, 표시등과 펌웨어 업데이트 한국어 가이드',
  openGraph: {
    title: 'NOVA KINE 한국어 사용 가이드',
    description: '연결부터 VIA 키맵 설정과 펌웨어 업데이트까지',
  },
};

const manualUrl = 'https://cdn.shopify.com/s/files/1/0815/1800/2452/files/Nova_Kine_user_guide_77b098bd-6f5b-4df1-812a-a262a244c5c3.pdf?v=1781226519';

const contents = [
  ['device','장치 도면'], ['start','빠른 시작'], ['connect','연결 방법'], ['keys','조합키'],
  ['actions','앱·웹·AI 실행'], ['codex','GPT Codex 전용'], ['led-notifications','LED·작업 알림'], ['via','VIA 설정'], ['layout','플레이트 배열'], ['firmware','펌웨어'], ['package','구성품'],
];

function Combo({ keys, title, copy }: { keys:string[]; title:string; copy:string }) {
  return <article className="combo-card"><div className="key-combo">{keys.map((item,index)=><span key={item}>{index>0&&<i>+</i>}<kbd>{item}</kbd></span>)}</div><div><strong>{title}</strong><p>{copy}</p></div></article>;
}

export default function GuidePage() {
  return (
    <main className="guide-shell">
      <header className="guide-topbar">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="guide-brand" href="/" aria-label="NOVA KINE 설정 화면"><ProductBrand /></a>
        <nav>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Configurator</a>
          <ProductLink />
          <a className="active" href="/guide">사용 가이드</a>
        </nav>
        <div className="language-switch" aria-label="언어"><button className="active">KO</button><button disabled title="추후 제공 예정">EN · SOON</button></div>
      </header>

      <section className="guide-hero">
        <div className="hero-copy"><p className="guide-eyebrow">NOVA KINE / USER GUIDE 01</p><h1>처음 연결부터<br/>키맵 설정까지.</h1><p>공식 설명서의 도면과 절차를 기준으로 키 위치, 표시등, 연결 모드를 한국어로 풀어냈습니다. 먼저 USB-C로 설정을 완료한 뒤 Bluetooth 또는 2.4GHz로 전환하세요.</p><div className="hero-actions"><a href="#device">장치 도면 보기</a><a href={manualUrl} target="_blank" rel="noreferrer">공식 PDF ↗</a></div></div>
        <HeroDevice />
      </section>

      <div className="guide-layout">
        <aside className="toc"><p>CONTENTS</p>{contents.map(([id,label],index)=><a key={id} href={`#${id}`}><span>{String(index+1).padStart(2,'0')}</span>{label}</a>)}<div className="toc-note"><b>안전한 설정 순서</b><p>USB-C 연결 → VIA JSON 로드 → 키 테스트 → 키맵 저장 → 무선 전환</p></div></aside>

        <article className="guide-content">
          <section id="device" className="guide-section">
            <div className="section-number">01</div><div className="section-copy"><p className="guide-eyebrow">HARDWARE MAP</p><h2>장치를 한눈에 보기</h2><p>설명서의 기본 숫자패드 도면을 그대로 읽을 수 있게 재구성했습니다. 핵심은 오른쪽 위 <kbd>Home</kbd> 키입니다. 짧게 누르면 Home, 길게 누른 상태에서는 Fn으로 동작합니다.</p><HardwareMap/><aside className="diagram-note"><b>VIA JSON에서 확인한 입력 구조</b><p>메인 플레이트 외에 오른쪽 RF/ST 영역의 보조키 3개는 matrix <code>4,9</code> · <code>4,10</code> · <code>4,11</code>, 롤러는 encoder <code>e0</code>입니다. AI PAD는 이 세 키를 모든 프리셋에서 <code>BT1</code> · <code>BT2</code> · <code>BT3</code>로 보호합니다.</p></aside></div>
          </section>

          <section id="start" className="guide-section">
            <div className="section-number">02</div><div className="section-copy"><p className="guide-eyebrow">QUICK START</p><h2>5분 빠른 시작</h2><div className="step-list">
              <div><b>1</b><span><strong>USB-C 케이블 연결</strong><small>원본 데이터 케이블로 컴퓨터와 연결하면 유선 모드로 자동 전환되고 표시등이 빨간색으로 켜집니다.</small></span></div>
              <div><b>2</b><span><strong>NOVA KINE JSON 준비</strong><small>LUMINKEY 자료실에서 기기에 맞는 VIA JSON 파일을 내려받습니다.</small></span></div>
              <div><b>3</b><span><strong>VIA에서 장치 승인</strong><small>Chrome 또는 Edge에서 usevia.app을 열고 장치 연결 권한을 승인합니다.</small></span></div>
              <div><b>4</b><span><strong>Design 탭에서 JSON 로드</strong><small>Settings의 Show Design tab을 켜고 Design에서 기존 정의를 지운 뒤 JSON을 불러옵니다.</small></span></div>
              <div><b>5</b><span><strong>키 테스트 후 설정</strong><small>Key Tester의 Test Matrix를 켜고 모든 키와 롤러가 반응하는지 확인한 뒤 키맵을 수정합니다.</small></span></div>
            </div></div>
          </section>

          <section id="connect" className="guide-section">
            <div className="section-number">03</div><div className="section-copy"><p className="guide-eyebrow">CONNECTION</p><h2>화면을 따라 연결하기</h2><p>연결 방식을 선택하면 눌러야 할 키와 확인해야 할 표시등이 순서대로 강조됩니다. 단계 목록을 직접 눌러 원하는 부분만 다시 볼 수도 있습니다.</p><PairingCoach/><div className="connection-cards">
              <article><span className="mode-dot red"/><b>USB-C 유선</b><em>설정 권장</em><p>케이블을 연결하면 자동으로 유선 모드가 됩니다. 표시등은 빨간색입니다. VIA 설정과 펌웨어 업데이트는 유선 모드에서 진행합니다.</p></article>
              <article><span className="mode-dot blue"/><b>Bluetooth</b><em>보호 슬롯 3개</em><p>케이블을 분리하고 후면 전원을 켭니다. 우측 <kbd>BT1/2/3</kbd>을 3-5초 눌러 빠른 점멸을 확인하세요. 반응이 없으면 보호된 기본 조합 <kbd>Home(Fn)</kbd> + <kbd>1/2/3</kbd>을 사용합니다.</p></article>
              <article><span className="mode-dot green"/><b>2.4GHz</b><em>동글</em><p>짧게 <kbd>Home(Fn)</kbd> + <kbd>4</kbd>를 눌러 전환하고 동글을 꽂습니다. 재페어링은 3-5초 길게 누른 뒤 빠른 점멸이 시작된 다음 동글을 연결합니다.</p></article>
            </div><aside className="callout"><b>프리셋 적용 후에도 두 경로를 보존합니다</b><p>우측 RF/ST 영역의 BT1·BT2·BT3는 제조사 커스텀 키코드 <code>MD_BLE1/2/3</code>를 직접 실행합니다. 동시에 오른쪽 위 Home 키의 <code>LT(2,KC_HOME)</code>과 Layer 2의 번호키 조합을 복구하므로, 기본 설명서 방식도 사라지지 않습니다.</p><code>BT1 / BT2 / BT3 · Home(Fn) + 1 / 2 / 3</code></aside></div>
          </section>

          <section id="keys" className="guide-section">
            <div className="section-number">04</div><div className="section-copy"><p className="guide-eyebrow">KEY COMBINATIONS</p><h2>꼭 기억할 조합키</h2><div className="combo-grid">
              <Combo keys={['Home','1 / 2 / 3']} title="Bluetooth 1/2/3" copy="3-5초 길게 눌러 각 Bluetooth 슬롯을 페어링합니다."/>
              <Combo keys={['Home','4']} title="2.4GHz" copy="짧게 누르면 모드 전환, 길게 누르면 동글 재페어링입니다."/>
              <Combo keys={['Home','5']} title="USB 모드" copy="길게 눌러 USB 유선 모드로 전환합니다."/>
              <Combo keys={['Home','Scroll']} title="수동 절전" copy="즉시 수동 절전 모드로 전환합니다."/>
              <Combo keys={['Home','Pause']} title="배터리 확인" copy="2 녹색: 50% 초과 · 1 녹색: 30-49% · 노란색: 30% 미만 · 빨간 점멸: 저전압"/>
              <Combo keys={['Home','Print']} title="공장 초기화" copy="길게 눌러 출고 설정으로 복원합니다. 사용자 키맵은 먼저 백업하세요."/>
            </div><div className="warning"><b>DFU 진입</b><p><kbd>Print</kbd>를 누른 상태에서 USB-C 케이블을 꽂으면 펌웨어 업데이트용 이동식 드라이브가 나타납니다. 일반 사용 중에는 실행하지 마세요.</p></div></div>
          </section>

          <section id="actions" className="guide-section">
            <div className="section-number">05</div><div className="section-copy"><p className="guide-eyebrow">ACTIONS · WINDOWS FIRST</p><h2>이제 실제 액션을 연결하세요</h2>
              <h3>설치 없이 사이트 안에서</h3><p>키를 선택하고 액션 유형을 지정하세요. 「웹사이트」에는 전체 웹주소, 「키보드」에는 Ctrl+Shift+S 같은 Windows 단축키를 입력합니다. 「AI·에이전트」는 사용할 AI 페이지와 지시문, 「시스템 → Copy text」는 복사할 텍스트를 설정합니다. 「저장 전 사이트에서 실행 테스트」로 먼저 확인한 뒤 「브라우저에 키 설정 저장」을 누르세요.</p>
              <p>USB-C로 기기에 적용한 뒤 키 테스트를 OFF, 사이트 실행 모드를 ON으로 전환하세요. 이 탭을 선택한 상태에서 실제 키를 누르면 저장한 액션을 처리합니다. 입력창 편집 중, 키 테스트 중, 다른 탭이나 프로그램에서는 실행하지 않습니다. 다른 키보드에서 같은 F13~F24 조합을 눌러도 반응할 수 있습니다.</p>
              <h3>Photoshop 등 Windows 프로그램 실행</h3><p>앱 유형을 선택하면 기본 실행 파일 이름이 준비됩니다. 「자동 검색」은 Windows 앱 등록 정보와 Program Files·LocalAppData를 먼저 확인합니다. 포터블 앱은 「.exe 파일 선택」으로 이름을 가져올 수 있습니다. 그래도 찾지 못하면 C,D처럼 드라이브를 지정해 전체 검색을 켜세요. 첫 검색은 오래 걸릴 수 있습니다.</p><p>브라우저 보안상 파일 선택 창은 전체 경로를 사이트에 공개하지 않습니다. 정확한 경로를 아는 경우에는 「직접 경로」를 선택하고 탐색기에서 경로를 복사해 붙여넣으세요. 실제 검색은 내려받은 Windows 연동 파일에서만 실행됩니다.</p>
              <div className="step-list"><div><b>1</b><span><strong>세부 설정 저장 → 기기에 적용</strong><small>프로그램 키에는 전용 F13~F24 조합이 기록됩니다. HOME/FN과 BT 보호 키는 유지합니다.</small></span></div><div><b>2</b><span><strong>AutoHotkey v2 한 번 설치</strong><small>사용할 Windows PC마다 공식 배포본을 설치하세요. 생성되는 설정 파일은 관리자 권한이나 자동 시작을 요청하지 않습니다. 회사 PC에서는 설치 정책을 확인하세요.</small></span></div><div><b>3</b><span><strong>Windows 실행 파일 받기 → 검토 → 실행</strong><small>사이트에서 저장한 설정으로 .ahk 파일을 만듭니다. 사이트 실행 모드는 OFF로 두세요. PC에서 이 파일이 실행 중이면 USB·Bluetooth 모두 사용할 수 있습니다.</small></span></div></div>
              <p>단축키는 키패드 자체가 보내므로 AutoHotkey가 필요 없습니다. 앱·웹·지시문·매크로는 .ahk 파일이 처리합니다. 프리셋이나 배열을 바꾸면 기기에 다시 적용하고 파일도 다시 받으세요. 여러 파일을 동시에 실행하지 마세요. 종료는 작업 표시줄의 AutoHotkey 아이콘 → Exit입니다.</p>
              <h3>AI와 매크로의 범위</h3><p>AI 액션은 지시문 복사와 AI 페이지 열기까지입니다. AI 서비스에서 직접 붙여넣고 전송하며, 응답이나 작업 완료 상태를 수집하지 않습니다. API 키나 비밀번호를 설정에 넣지 마세요. 매크로는 텍스트·웹주소·대기 1~16단계를 저장합니다. 사이트에서는 팝업·클립보드 권한 때문에 단계별 버튼으로 실행하고, Windows 파일에서는 순차 자동 실행합니다. Windows의 텍스트 단계는 현재 선택된 앱에 입력되므로 대상 창과 대기 시간을 먼저 확인하세요.</p>
              <aside className="callout"><b>‘기기 적용’과 ‘실행’은 다릅니다</b><p>기기 적용은 키코드 기록·읽기 검증입니다. 미설정 키는 기존 값을 유지하고 제외 개수를 표시합니다. 프로그램 존재 여부와 Windows 파일의 실제 동작은 대상 PC에서 확인해야 합니다. 자동 AI 작업, 임의 터미널 명령, 외부 에이전트 승인·중지 연동은 포함하지 않습니다.</p></aside>
              <div className="resource-row"><a href="https://www.autohotkey.com/" target="_blank" rel="noreferrer">AutoHotkey 공식 사이트 ↗</a><a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/open" target="_blank" rel="noreferrer">브라우저 팝업 제한 ↗</a></div>
            </div>
          </section>

          <section id="led-notifications" className="guide-section">
            <div className="section-number">LED</div><div className="section-copy"><p className="guide-eyebrow">LIGHTING · EVENT NOTIFICATIONS</p><h2>LED로 작업 상태를 알려줄 수 있나요?</h2>
              <h3>촬영 영상에 맞춘 유선 표시</h3><p>2026년 9월 12일 영상에서는 키 쪽 표시등이 흰색으로 유지되고, 바깥쪽 표시등은 청록 → 초록 → 노랑 → 분홍 → 보라 계열로 순환합니다. 3D의 기본 유선 표현은 이 모습을 재현합니다. 약 2초의 순환과 색·광량은 영상 기준 근사치이며, 기기의 실시간 측정값이 아닙니다. 설명서의 USB 기본 빨강은 별도 예시로 남겨 두었습니다.</p>
              <h3>먼저 화면에서 알림 패턴 시험하기</h3><p>설정 화면의 3D 보기 아래 LED 패널에서 「완료」, 「사용량·오류 중단」, 「질문·승인 대기」를 선택하세요. 「알림 해제」는 USB 연결 상태 표시로 돌아갑니다. 이 버튼은 실제 작업이 완료됐다는 뜻이 아니며 기기 설정을 바꾸지 않습니다.</p>
              <div className="step-list"><div><b>G</b><span><strong>완료 · 초록</strong><small>2.4초마다 부드럽게 점멸합니다.</small></span></div><div><b>R</b><span><strong>사용량·오류 중단 · 빨강</strong><small>초당 2.5회 점멸합니다. 일시적인 요청 제한과 사용량 소진은 서로 다른 원인으로 구분해야 합니다.</small></span></div><div><b>B</b><span><strong>질문·승인 대기 · 파랑</strong><small>초당 2.5회 점멸합니다. 모션 줄이기 또는 점멸 정지에서는 지속 점등합니다.</small></span></div></div>
              <h3>실제 기기 LED 연동에 필요한 것</h3><p>제공된 LK-KINE VIA 정의에는 Lighting → logo의 색·밝기·효과·속도 항목이 있습니다. QMK/VIA에는 이 값을 USB로 읽고 바꾸는 통신 방식도 있습니다. 따라서 연동 가능성이 있지만, 이 기기의 펌웨어가 명령에 응답하는지, 어느 표시등을 바꾸는지, 연결·배터리 표시가 우선하는지는 실기 검증이 필요합니다. 두 LED를 각각 자유롭게 제어할 수 있다고 확인된 상태는 아닙니다.</p>
              <p>구현 경로는 <b>앱의 작업 이벤트 → Windows 연동 프로그램 → USB LED 제어</b>입니다. 먼저 기존 조명을 읽어 백업하고, 일시적인 색 변경과 원상 복구를 검증해야 합니다. 이후 알림마다 저장 메모리를 다시 쓰지 않고 표시만 바꾸는 방식으로 확장합니다. Bluetooth 키 입력이 작동하더라도 같은 LED 설정 통신이 가능한 것은 아닙니다.</p>
              <h3>앱마다 받을 수 있는 알림이 다릅니다</h3><p>Codex의 공식 notify 설정은 현재 agent-turn-complete 이벤트를 제공합니다. 이는 응답 차례의 종료이며 요청한 모든 작업의 성공을 보증하지 않습니다. 이 설정 하나로 질문·승인·사용량 소진까지 모두 구분할 수는 없습니다. 지금 사용하는 Codex 데스크톱과 이 사이트 사이에도 자동 알림 연결은 없습니다.</p>
              <p>Claude Code는 Stop, StopFailure, Notification 등의 훅을 제공합니다. 지원되는 이벤트를 분류해 연동할 수 있지만, 질문 대기와 승인 요청은 사용하는 버전과 이벤트 종류를 확인해야 합니다. 일반 웹사이트나 Photoshop 작업은 해당 서비스의 웹훅·플러그인·API 등 별도 이벤트 출처가 필요합니다. 사이트 탭만 열어 두어서는 다른 앱의 완료 상태를 알 수 없습니다.</p>
              <aside className="callout"><b>현재 제공 범위</b><p>영상 기반 3D 조명과 수동 알림 미리보기까지 구현되어 있습니다. 실제 LED 쓰기, Windows 상주 연동 프로그램, 앱별 이벤트 연결은 아직 제공하지 않습니다. 기존에 받는 AutoHotkey 실행 파일도 LED 알림 기능은 포함하지 않습니다.</p></aside>
              <div className="resource-row"><a href="https://learn.chatgpt.com/docs/config-file/config-advanced#notifications" target="_blank" rel="noreferrer">OpenAI 공식 알림 문서 ↗</a><a href="https://code.claude.com/docs/en/hooks" target="_blank" rel="noreferrer">Claude Code 훅 ↗</a><a href="https://github.com/qmk/qmk_firmware/blob/master/quantum/via.c" target="_blank" rel="noreferrer">QMK/VIA 조명 통신 ↗</a></div>
            </div>
          </section>

          <section id="codex" className="guide-section">
            <div className="section-number">GPT</div><div className="section-copy"><p className="guide-eyebrow">CODEX DESKTOP · WINDOWS</p><h2>구체적인 Codex 작업 도구로 사용하기</h2>
              <p>「GPT CODEX」는 기존 AI AGENTS와 별도로 추가한 Windows 데스크톱용 프리셋입니다. 작업 전환과 편집 도구를 직접 키 입력으로 실행하며 기본 구성에는 별도 프로그램이나 API 키가 필요 없습니다. ChatGPT 웹이나 Codex CLI용 키맵은 아닙니다.</p>
              <div className="step-list"><div><b>1</b><span><strong>GPT CODEX 선택 후 USB로 적용</strong><small>화면에서 키와 E0 휠을 확인하고 「프리셋을 기기에 적용」을 누르세요. 사이트의 프리셋 선택은 미리보기이며, 적용해야 기기 Layer 0가 교체됩니다.</small></span></div><div><b>2</b><span><strong>Windows Codex 창에서 확인</strong><small>NEW → COMMAND → 최근 작업 → REVIEW 순서로 확인하세요. 설치 버전의 설정 → Keyboard Shortcuts와 다르면 키의 Windows 단축키를 수정하고 다시 적용하세요.</small></span></div><div><b>3</b><span><strong>무선으로 사용</strong><small>BT1/2/3으로 Windows에 연결하면 저장된 단축키를 전달합니다. 사이트는 닫아도 됩니다. Fn과 BT 보호 키는 다른 프리셋과 동일하게 유지됩니다.</small></span></div></div>
              <h3>각 키가 실제로 하는 일</h3><p>Plate A·B·C는 아래 첫 21개 위치를 사용하며 Home/Fn을 제외한 20개가 설정 키입니다. Plate D에는 마지막 3개가 추가됩니다. 가로·세로 회전은 표시 방향만 바꾸며 해당 키의 매트릭스 주소는 유지합니다.</p>
              <div className="combo-grid">{CODEX_BINDINGS.map(([label, shortcut, description]) => <Combo key={label} keys={[shortcut]} title={label} copy={description}/>)}</div>
              <h3>휠 E0 · 양방향 설정</h3><p>기본은 이전 / 다음 작업·탭 전환입니다. 글자 크기 또는 PageUp/PageDown으로 바꿀 수 있습니다. 시계·반시계는 기기 기준이며 화면 회전으로 뒤집지 않습니다. VIA의 엔코더 읽기·쓰기 명령을 지원하는 펌웨어에서만 기록하고 다시 읽어 검증합니다. 지원 확인이 실패하면 키를 포함해 기록 전에 중단합니다. 이때 「기기 휠 설정 유지」로 바꾸고 키만 적용하세요.</p>
              <aside className="callout"><b>실제 입력과 자동화의 경계</b><p>RECENT 1–6은 최근 작업 순서이지 고정된 에이전트 여섯 개가 아닙니다. MODEL은 선택 메뉴, REVIEW는 리뷰 화면, TERMINAL은 패널을 엽니다. 자동 승인·코드 실행·모델 변경·작업 완료 감지는 하지 않습니다. 휠 누름 입력은 별도 스위치가 확인되지 않아 할당하지 않았습니다. 연결 상태 LED와 AI 작업 알림 LED도 별개이며 현재 물리 LED 자동 연동은 제공하지 않습니다.</p></aside>
              <div className="warning"><b>활성 창과 입력 위치를 먼저 확인하세요</b><p>기기는 일반 키보드 입력을 보냅니다. 다른 앱을 선택하면 그 앱이 키를 받습니다. Ctrl+C는 터미널에서 명령 중단, Ctrl+V는 터미널 붙여넣기로 작동할 수 있습니다. 사이트의 「실행 전 확인」은 직접 키 입력을 막지 못합니다. 최근 작업의 순서는 사용하면서 바뀔 수 있고 음성 기능은 해당 앱 버전과 권한에 따라 달라집니다.</p></div>
              <h3>유사 사례에서 도입한 것과 제외한 것</h3><p><a href="https://github.com/dazer1234/codex-stream-deck" target="_blank" rel="noreferrer">codex-stream-deck</a>는 Stream Deck와 Codex Micro 연결을 다루는 비공식 프로젝트입니다. 작업 슬롯·상태 표시라는 사용 방식은 참고할 수 있지만, NOVA KINE을 꽂는 것만으로 호환되지 않으며 내부 연결 방식은 앱 업데이트에 따라 바뀔 수 있습니다. 이번 구현은 공식 단축키와 VIA 프로토콜을 사용하고 앱 패치·내부 통신 가로채기는 도입하지 않았습니다.</p>
              <p>공식 근거: <a href={CODEX_COMMANDS_URL} target="_blank" rel="noreferrer">데스크톱 Windows 단축키</a> · <a href="https://learn.chatgpt.com/docs/features/codex-micro" target="_blank" rel="noreferrer">Codex Micro</a> · <a href="https://github.com/qmk/qmk_firmware/blob/master/quantum/via.c" target="_blank" rel="noreferrer">QMK VIA 엔코더 프로토콜</a>. 확인: 2026-09-12. Windows 앱·실물 장치에서의 전체 동작 검증은 사용 환경에서 추가 확인이 필요합니다.</p>
            </div>
          </section>

          <section id="via" className="guide-section">
            <div className="section-number">06</div><div className="section-copy"><p className="guide-eyebrow">VIA CONFIGURATION</p><h2>VIA 키맵 설정</h2><div className="via-flow"><span>JSON 다운로드</span><i>→</i><span>Design에서 로드</span><i>→</i><span>Test Matrix</span><i>→</i><span>Configure</span></div>
              <div className="via-profile-panel"><div className="via-profile-head"><div><p>DEVICE DEFINITION</p><h3>{LK_KINE_PROFILE.name}</h3></div><div><span>VID <b>{LK_KINE_PROFILE.vendorIdHex}</b></span><span>PID <b>{LK_KINE_PROFILE.productIdHex}</b></span><span>MATRIX <b>{LK_KINE_PROFILE.matrix.rows}×{LK_KINE_PROFILE.matrix.cols}</b></span><span>ENCODER <b>{LK_KINE_PROFILE.encoder}</b></span></div></div><div className="via-keycodes">{LK_KINE_PROFILE.customKeycodes.slice(0,8).map(([code,label,copy])=><span key={code}><code>{code}</code><b>{label}</b><small>{copy}</small></span>)}</div></div>
              <h3>일반 키 변경</h3><p>VIA 왼쪽의 Configure에서 변경할 키를 선택하고 아래 키 목록에서 새 키값을 선택합니다. 설정 전 Key Tester에서 실제 스위치 위치가 화면 배열과 맞는지 먼저 확인하세요.</p>
              <h3>오른쪽 위 Home/Fn 키 변경</h3><p>이 키는 레이어 탭 기능이 포함된 <code>LT(2,KC_HOME)</code>입니다. 전체 코드를 일반 키로 바꾸면 Fn 조합이 사라집니다. 짧게 누르는 기능만 Enter로 바꾸려면 Any에서 두 번째 값만 바꿔 <code>LT(2,KC_ENT)</code>처럼 유지합니다.</p>
              <h3>로고 표시등 세부 설정</h3><p>유선 모드에서 Configure → Lighting → logo로 이동합니다. 밝기는 <code>0-200</code>, 효과 속도는 <code>0-4</code>이며, Effect는 <code>none</code> · <code>wave</code> · <code>fixed wave</code> · <code>spectrum</code> · <code>breathe</code> · <code>light</code> · <code>shutdown</code>을 지원합니다. 단색은 <code>light</code>를 선택한 뒤 Color에서 지정하세요.</p>
              <h3>무선·배터리·절전 키코드</h3><p>VIA의 Custom 항목에는 <code>MD_BLE1/2/3</code>, <code>MD_24G</code>, <code>MD_USB</code>, <code>QK_BAT</code>, <code>QMK_SLEEP</code>가 정의돼 있습니다. Fn 레이어에서 해당 코드를 교체할 때는 먼저 현재 키맵을 백업하세요.</p>
              <h3>AI PAD 프리셋의 무선 보호 규칙</h3><p><b>프리셋을 기기에 적용</b>하면 선택한 프리셋은 기본 Layer 0에 기록되고, 제조사 무선 Layer 2는 별도로 복구됩니다. 오른쪽 위 Home/Fn, Fn+1/2/3 Bluetooth, Fn+4 2.4GHz, Fn+5 USB, 배터리·절전·초기화 조합과 우측 BT1/2/3 키를 함께 읽어 검증합니다. 적용 도중 오류가 나면 시작 전에 읽어 둔 키맵으로 되돌리기를 시도합니다.</p>
              <div className="resource-row"><a href="https://www.usevia.app/" target="_blank" rel="noreferrer">VIA 실행 ↗</a><a href="https://cloud.luminkey.cn/" target="_blank" rel="noreferrer">LUMINKEY 자료실 ↗</a><a href="https://docs.qmk.fm/keycodes" target="_blank" rel="noreferrer">QMK 키코드 ↗</a></div>
            </div>
          </section>

          <section id="layout" className="guide-section">
            <div className="section-number">07</div><div className="section-copy"><p className="guide-eyebrow">LAYOUT</p><h2>플레이트와 방향</h2><p>Plate A/B/C는 2U 키 위치가 다른 21키 배열이며 좌우 미러가 가능합니다. Plate D는 24개의 1U 키를 사용하는 직교 배열입니다. 버튼으로 실제 점유 칸과 가로 회전 결과를 비교하세요.</p><PlateExplorer/>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="config-cta" href="/">Configurator에서 배열·미러·회전 설정하기 →</a>
          </div>
          </section>

          <section id="firmware" className="guide-section">
            <div className="section-number">08</div><div className="section-copy"><p className="guide-eyebrow">FIRMWARE UPDATE</p><h2>BIN 펌웨어 업데이트</h2><ol className="firmware-list"><li>LUMINKEY 자료실에서 NOVA KINE용 BIN 파일을 내려받습니다.</li><li>왼쪽 위 <kbd>Print</kbd> 키를 누른 상태로 USB-C 케이블을 연결합니다.</li><li>컴퓨터에 나타난 이동식 USB 드라이브에 BIN 파일을 복사합니다.</li><li>진행이 완료되고 드라이브가 자동으로 사라질 때까지 기다립니다.</li><li>표시등이 다시 켜지면 케이블을 분리했다가 다시 연결합니다.</li></ol><div className="danger"><b>업데이트 중 케이블을 분리하지 마세요.</b><p>드라이브가 자동으로 사라지기 전에 케이블을 빼거나 창을 강제로 닫으면 업데이트에 실패할 수 있습니다. 제품에 맞는 제조사 BIN 파일만 사용하세요.</p></div></div>
          </section>

          <section id="package" className="guide-section">
            <div className="section-number">09</div><div className="section-copy"><p className="guide-eyebrow">IN THE BOX</p><h2>기본 구성품</h2><div className="package-grid">{[['NOVA KINE','1'],['데이터 케이블','1'],['교체 플레이트','3'],['2.4G 수신기','1'],['1U 여분 키캡','6'],['여분 스위치','3'],['T6 드라이버','1'],['여분 나사 세트','1'],['키캡·스위치 풀러','1'],['빠른 시작 안내서','1']].map(([name,count])=><span key={name}><b>{name}</b><em>× {count}</em></span>)}</div></div>
          </section>

          <footer className="guide-footer"><div><strong>NOVA KINE</strong><p>본 페이지는 LUMINKEY NOVA KINE 공식 사용자 설명서를 바탕으로 재구성한 한국어 요약 가이드입니다.</p></div><a href={manualUrl} target="_blank" rel="noreferrer">원본 설명서 확인 ↗</a></footer>
        </article>
      </div>
    </main>
  );
}
