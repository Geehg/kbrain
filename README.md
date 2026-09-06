# KBRAIN AI Command Deck

LUMINKEY NOVA KINE을 위한 AI 작업용 키맵·매크로 configurator입니다. 실제 Plate A–D 배열, 좌우 미러, 0°/90°/180°/270° 회전, USB-C·2.4GHz·Bluetooth 연결 상태를 한 화면에서 설계하고 설정 파일로 내보낼 수 있습니다.

## Links

- Live app: https://kbrain-ai-command-deck.kuriworks.chatgpt.site/
- 한국어 사용 가이드: https://kbrain-ai-command-deck.kuriworks.chatgpt.site/guide
- NOVA KINE 공식 설명서: https://cdn.shopify.com/s/files/1/0815/1800/2452/files/Nova_Kine_user_guide_77b098bd-6f5b-4df1-812a-a262a244c5c3.pdf?v=1781226519

## Main features

- Plate A/B/C/D의 실제 키 배열 편집
- Plate A/B/C 좌우 미러와 작업 방향 회전
- USB-C, 2.4GHz, Bluetooth 연결 모드 관리
- 레이어별 키·AI 프롬프트·매크로 설정
- JSON 설정 가져오기와 내보내기
- WebHID 기반 장치 연결 진단
- 한국어 NOVA KINE 연결·VIA·펌웨어 사용 가이드

## Local development

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

검증 명령:

```bash
npm run lint
npm run build
```

## Update workflow

1. 기능 또는 문서를 수정합니다.
2. `npm run lint`와 `npm run build`를 실행합니다.
3. 변경사항을 `main` 브랜치에 push합니다.
4. 배포 사이트와 `/guide` 경로를 확인합니다.
5. 사용자에게 영향을 주는 변경은 릴리스 설명에 기록합니다.

GitHub Actions는 push 및 pull request마다 lint와 production build를 자동 검사합니다.

## Docker deployment

SynoDockPilot 같은 Docker 관리 도구에서는 저장소 ZIP을 `Node.js 앱`으로 가져오면 됩니다. 컨테이너 내부 포트는 `3000`이며, 외부 포트는 관리 도구에서 비어 있는 포트로 연결합니다.

기본 Compose 설정은 NAS에서 새 Docker 네트워크를 만들지 않고 기존 `bridge` 네트워크를 재사용합니다. Docker 주소 풀이 많이 사용된 환경에서도 충돌 없이 기동하기 위한 설정입니다.

```bash
docker build -t kbrain-ai-command-deck .
docker run --rm -p 8500:3000 kbrain-ai-command-deck
```

## Project structure

```text
app/page.tsx          Configurator
app/guide/page.tsx    한국어 온라인 사용 가이드
app/globals.css       Configurator 스타일
app/guide/guide.css   사용 가이드 스타일
public/               공개 이미지와 아이콘
```

## Status

현재 한국어 UI를 기본으로 제공합니다. 영어 사용 가이드는 같은 정보 구조로 확장할 예정입니다.
