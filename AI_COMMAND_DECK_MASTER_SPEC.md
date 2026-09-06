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
- Plate A/B/C/D의 실제 4×6 유닛 배열과 1U·2U 키 조합
- Plate A/B/C 좌우 미러 및 0°/90°/180°/270° 작업 방향
- USB-C/2.4GHz/Bluetooth 전송 모드와 WebHID 연결 진단
- `/guide` 한국어 온라인 사용 가이드: 빠른 시작, 연결, 조합키, VIA, 배열, 펌웨어, 구성품
- 향후 영문 카피를 같은 정보 구조에 추가할 수 있는 언어 전환 UI

## Architecture boundary

Configurator는 명령을 설계하고 JSON 설정을 관리한다. 실제 macOS 앱·CLI 실행과 에이전트 상태 수집은 별도 Local Bridge가 담당한다. 하드웨어 직접 쓰기(WebHID/QMK)는 제조사 프로토콜이 확인된 뒤 추가한다.

## Device sync model

Bluetooth 또는 2.4GHz 페어링은 일반 키 입력을 위한 OS 연결이다. 키맵을 장치에 기록하려면 VIA 호환 Raw HID 인터페이스와 제조사의 VID/PID·VIA JSON·프로토콜 확인이 별도로 필요하다. v0.2 UI는 WebHID 장치 선택, 권한 획득, 제품명·VID·PID 진단을 제공하며 알 수 없는 HID 보고서는 전송하지 않는다. 최초 설정 경로는 USB-C 유선 모드를 기본으로 한다.

## Non-goals for v0.1

- 확인되지 않은 NOVA KINE 펌웨어에 직접 쓰기
- Codex/Claude 계정 인증 또는 클라우드 토큰 보관
- 임의 쉘 명령을 브라우저에서 직접 실행
