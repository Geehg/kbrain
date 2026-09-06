# KBRAIN AI Command Deck — Master Spec v0.1

## Product goal

NOVA KINE을 단순 매크로패드가 아닌 Codex, Claude Code, 콘텐츠 제작 에이전트와 디자인 도구를 제어하는 범용 AI control surface로 사용한다.

## v0.1 scope

- NOVA KINE 24키, 측면 모드 버튼 3개, 수평 롤러 시각화
- AI Agents / Develop / Design / System 레이어
- 키보드 단축키, 앱 실행, AI 액션, 에이전트 액션, 매크로 할당
- 키별 지시문과 실행 전 확인, HUD 표시 설정
- 프로필 생성·복제·전환
- 매크로 단계 편집과 순서 변경
- 브라우저 로컬 저장, JSON 가져오기·내보내기
- 추후 Local Bridge가 사용할 안정적인 JSON 스키마

## Architecture boundary

Configurator는 명령을 설계하고 JSON 설정을 관리한다. 실제 macOS 앱·CLI 실행과 에이전트 상태 수집은 별도 Local Bridge가 담당한다. 하드웨어 직접 쓰기(WebHID/QMK)는 제조사 프로토콜이 확인된 뒤 추가한다.

## Non-goals for v0.1

- 확인되지 않은 NOVA KINE 펌웨어에 직접 쓰기
- Codex/Claude 계정 인증 또는 클라우드 토큰 보관
- 임의 쉘 명령을 브라우저에서 직접 실행
