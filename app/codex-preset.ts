import type { DeckAction } from './deck-actions';

export const CODEX_COMMANDS_URL = 'https://learn.chatgpt.com/docs/reference/commands';
// Windows desktop defaults, verified 2026-09-12. These are keystrokes, not API commands.
// Index 3 is the physical HOME/FN position. The first 21 positions fit plates A–C.
export const CODEX_BINDINGS = [
  ['NEW', 'Ctrl+N', '새 작업 시작'],
  ['COMMAND', 'Ctrl+Shift+P', '명령 메뉴 열기'],
  ['ATTENTION', 'Ctrl+Alt+A', '응답이 필요한 다음 작업으로 이동'],
  ['HOME/FN', 'Home', '제조사 Home / 무선 Fn 보호 위치'],
  ['RECENT 1', 'Ctrl+Alt+1', '최근 작업 1 열기'],
  ['RECENT 2', 'Ctrl+Alt+2', '최근 작업 2 열기'],
  ['RECENT 3', 'Ctrl+Alt+3', '최근 작업 3 열기'],
  ['MODEL', 'Ctrl+Shift+M', '모델 선택 메뉴 열기 · 모델을 자동 변경하지 않음'],
  ['RECENT 4', 'Ctrl+Alt+4', '최근 작업 4 열기'],
  ['RECENT 5', 'Ctrl+Alt+5', '최근 작업 5 열기'],
  ['RECENT 6', 'Ctrl+Alt+6', '최근 작업 6 열기'],
  ['REVIEW', 'Ctrl+Shift+G', '변경사항 리뷰 탭 열기 · AI 검토 실행이 아님'],
  ['SIDEBAR', 'Ctrl+B', '작업 목록 사이드바 열기 / 닫기'],
  ['TERMINAL', 'Ctrl+Backtick', '터미널 패널 열기 / 닫기 · 명령을 실행하지 않음'],
  ['FILES', 'Ctrl+P', '프로젝트 파일 검색'],
  ['DICTATE', 'Ctrl+Shift+D', '음성 받아쓰기 시작 · 지원 버전과 마이크 권한 필요'],
  ['COPY', 'Ctrl+C', '선택한 내용 복사 · 터미널에서는 실행 중인 명령을 중단할 수 있음'],
  ['PASTE', 'Ctrl+V', '클립보드 붙여넣기 · 입력 위치를 먼저 확인'],
  ['FIND', 'Ctrl+F', '현재 작업 안에서 찾기'],
  ['PROJECT', 'Ctrl+Alt+Shift+O', '프로젝트 선택 메뉴 열기'],
  ['SIDE CHAT', 'Ctrl+Alt+S', '보조 대화 열기'],
  ['FILE TREE', 'Ctrl+Shift+E', '파일 트리 열기 / 닫기 · Plate D 추가 키'],
  ['PANEL', 'Ctrl+J', '하단 패널 열기 / 닫기 · Plate D 추가 키'],
  ['HELP', 'Ctrl+Slash', '단축키 설정 열기 · Plate D 추가 키'],
] as const;

export function createCodexKeys(): (DeckAction & { glyph: string; tone?: 'dark' | 'lime' })[] {
  return CODEX_BINDINGS.map(([label, shortcut, description], index) => ({
    id: `codex-${String(index + 1).padStart(2, '0')}`, label,
    glyph: label.startsWith('RECENT') ? label.slice(-1) : label.slice(0, 2),
    kind: 'keyboard', action: shortcut, settings: { shortcut }, prompt: description,
    confirm: false, hud: false, tone: index === 2 ? 'lime' : index === 11 ? 'dark' : undefined,
  }));
}

export const WHEEL_MODES = {
  keep: { label: '기기 휠 설정 유지', ccw: '', cw: '' },
  chats: { label: 'Codex · 이전 / 다음 작업·탭', ccw: 'Ctrl+Shift+Tab', cw: 'Ctrl+Tab' },
  font: { label: 'Codex · 글자 작게 / 크게', ccw: 'Ctrl+Minus', cw: 'Ctrl+Equal' },
  pages: { label: '문서 · 이전 / 다음 페이지', ccw: 'PageUp', cw: 'PageDown' },
} as const;
export type WheelMode = keyof typeof WHEEL_MODES;
export function normalizeWheelMode(value: unknown, fallback: WheelMode = 'keep'): WheelMode {
  return typeof value === 'string' && Object.hasOwn(WHEEL_MODES, value) ? value as WheelMode : fallback;
}
