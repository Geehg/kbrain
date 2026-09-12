import { qmkKeycodeForAction } from './via-webhid';

export type ActionType = 'keyboard' | 'website' | 'application' | 'ai' | 'agent' | 'macro' | 'system';
export type ActionStep = { kind: 'url' | 'text' | 'wait'; value: string };
export type ActionSettings = { shortcut?: string; url?: string; appPath?: string; appExecutable?: string; appSearch?: 'auto'|'manual'; appDrives?: string; appDeepSearch?: boolean; text?: string; steps?: ActionStep[] };
export type DeckAction = { id: string; label: string; kind: ActionType; action: string; prompt: string; confirm: boolean; hud: boolean; settings?: ActionSettings };

export function sanitizeActionSettings(value: unknown): ActionSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw=value as Record<string,unknown>, result:ActionSettings={};
  for(const field of ['shortcut','url','appPath','appExecutable','appDrives','text'] as const) if(typeof raw[field]==='string') result[field]=raw[field];
  if(raw.appSearch==='auto'||raw.appSearch==='manual') result.appSearch=raw.appSearch;
  if(typeof raw.appDeepSearch==='boolean') result.appDeepSearch=raw.appDeepSearch;
  if(Array.isArray(raw.steps)&&raw.steps.length<=16&&raw.steps.every(step=>step&&typeof step==='object'&&['url','text','wait'].includes(step.kind)&&typeof step.value==='string')) result.steps=raw.steps.map(step=>({kind:step.kind,value:step.value}));
  return result;
}

const basic: Record<string, number> = {
  Enter: 0x28, Esc: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
  Minus: 0x2d, Equal: 0x2e, Backtick: 0x35, Slash: 0x38, Home: 0x4a, PageUp: 0x4b, Delete: 0x4c,
  End: 0x4d, PageDown: 0x4e, Right: 0x4f, Left: 0x50, Down: 0x51, Up: 0x52,
  Mute: 0xa8, 'Volume Up': 0xa9, 'Volume Down': 0xaa,
};
for (let i = 0; i < 26; i++) basic[String.fromCharCode(65 + i)] = 4 + i;
for (let i = 1; i <= 9; i++) basic[String(i)] = 0x1d + i;
basic['0'] = 0x27;
for (let i = 1; i <= 24; i++) basic[`F${i}`] = i <= 12 ? 0x39 + i : 0x68 + i - 13;
export const SHORTCUT_KEYS = Object.keys(basic);
const legacy: Record<string, string> = { '⌘C':'Ctrl+C', '⌘V':'Ctrl+V', '⌘Z':'Ctrl+Z', '⇧⌘Z':'Ctrl+Shift+Z', '⌘S':'Ctrl+S', '⌘+':'Ctrl+Shift+Equal', '⌘-':'Ctrl+Minus', '⇧1':'Shift+1', '⇧⌘4':'Win+Shift+S', '⌘Space':'Win+S', '⌃⌘Q':'Win+L' };
export const shortcutFor = (key: DeckAction) => key.kind === 'keyboard' ? (key.settings?.shortcut ?? legacy[key.action] ?? key.action) : key.kind === 'system' ? ({ 'Clipboard history':'Win+V', 'Show desktop':'Win+D' }[key.action] ?? '') : '';

export function parseShortcut(value: string): number | null {
  if(typeof value!=='string') return null;
  const tokens = value.split('+').map(v => v.trim());
  const name = SHORTCUT_KEYS.find(k => k.toLowerCase() === tokens.at(-1)?.toLowerCase());
  if (!name) return null;
  let mods = 0;
  for (const token of tokens.slice(0, -1)) {
    const bit = ({ ctrl:1, shift:2, alt:4, win:8 } as Record<string, number>)[token.toLowerCase()];
    if (!bit || (mods & bit)) return null;
    mods |= bit;
  }
  if (basic[name] >= 0xa8 && mods) return null;
  return (mods << 8) | basic[name];
}
export function safeWebUrl(value: string): string | null {
  try {
    if(typeof value!=='string'||value.length>4096) return null;
    if (!/^https?:\/\//i.test(value.trim()) || /[\u0000-\u0020\u007f]/.test(value.trim())) return null;
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
export const cleanAppPath = (value: string) => typeof value==='string'?value.trim().replace(/^"(.*)"$/, '$1'):'';
export function validAppPath(value: string) {
  const path = cleanAppPath(value);
  return path.length <= 1024 && /^[a-z]:\\[^:"<>|?*\u0000-\u001f]+\.exe$/i.test(path);
}
export const APPLICATION_EXECUTABLES: Record<string,string[]> = {
  'Open Codex':['Codex.exe'], 'Open Claude Code':['claude.exe'], 'Open Claude':['Claude.exe'], 'Open ChatGPT':['ChatGPT.exe'],
  'Open Figma':['Figma.exe'], 'Open Photoshop':['Photoshop.exe'], 'Open Adobe CC':['Creative Cloud.exe'],
  'Open Illustrator':['Illustrator.exe'], 'Open Premiere':['Adobe Premiere Pro.exe'], 'Open GitHub':['GitHubDesktop.exe'],
  'Open Terminal':['WindowsTerminal.exe','wt.exe'], 'Open Docker':['Docker Desktop.exe'], 'Open Finder':['explorer.exe'],
  'Open Browser':['msedge.exe','chrome.exe','firefox.exe','brave.exe'], 'Open Music':['Spotify.exe','iTunes.exe'],
  'Open Calendar':['olk.exe','HxCalendarAppImm.exe'], 'Open Mail':['olk.exe','HxOutlook.exe'], 'Open Notes':['ONENOTE.EXE','Notepad.exe'],
};
export const validExecutableName = (value:string) => typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9 ._()+\-]{0,127}\.exe$/i.test(value.trim());
export function applicationExecutables(key:DeckAction) {
  const custom=key.settings?.appExecutable?.trim();
  return custom ? (validExecutableName(custom) ? [custom] : []) : (APPLICATION_EXECUTABLES[key.action] ?? []);
}
export const applicationSearchMode = (key:DeckAction) => key.settings?.appSearch ?? (key.settings?.appPath?.trim() ? 'manual' : applicationExecutables(key).length ? 'auto' : 'manual');
export function normalizedDriveLetters(value:string|undefined) {
  if(typeof value!=='string') return 'C';
  const letters=[...new Set(value.toUpperCase().split(/[\s,]+/).filter(Boolean))];
  return letters.length>0&&letters.length<=6&&letters.every(letter=>/^[A-Z]$/.test(letter))?letters.join(','):null;
}
export function actionSteps(key: DeckAction): ActionStep[] {
  const s = key.settings ?? {};
  if (key.kind === 'website' || (key.kind === 'system' && key.action === 'Open website')) return [{ kind:'url', value:s.url ?? '' }];
  if (key.kind === 'ai' || key.kind === 'agent') return [{ kind:'text', value:key.prompt }, { kind:'url', value:s.url ?? 'https://chatgpt.com/' }];
  if (key.kind === 'system' && key.action === 'Copy text') return [{ kind:'text', value:s.text ?? '' }];
  if (key.kind === 'macro') return s.steps ?? [];
  return [];
}
export function actionIssue(key: DeckAction): string | null {
  const shortcut = shortcutFor(key);
  if (shortcut) return parseShortcut(shortcut) === null ? '지원되는 단축키를 지정하세요. 예: Ctrl+Shift+S' : null;
  if (key.kind === 'application') {
    if(applicationSearchMode(key)==='manual') return validAppPath(key.settings?.appPath ?? '') ? null : 'Windows 프로그램의 전체 .exe 경로를 지정하세요.';
    if(key.settings?.appExecutable?.trim()&&!validExecutableName(key.settings.appExecutable)) return '실행 파일 이름을 Photoshop.exe처럼 입력하세요.';
    if(!applicationExecutables(key).length) return '찾을 실행 파일 이름(.exe)을 선택하거나 입력하세요.';
    if(key.settings?.appDeepSearch&&normalizedDriveLetters(key.settings?.appDrives)===null) return '검색할 드라이브는 C,D처럼 영문 드라이브 문자 1~6개로 입력하세요.';
    return null;
  }
  const steps = actionSteps(key);
  if (!Array.isArray(steps) || !steps.length || steps.length > 16) return '실행할 세부 동작을 설정하세요. 매크로는 1~16단계입니다.';
  for (const step of steps) {
    if (!step || typeof step.value !== 'string') return '잘못된 단계 형식입니다.';
    if (step.kind === 'url') { if (!safeWebUrl(step.value)) return 'http:// 또는 https:// 웹주소를 입력하세요. 계정 정보가 포함된 주소는 사용할 수 없습니다.'; }
    else if (step.kind === 'text') { if (!step.value.trim() || step.value.length > 8000) return '복사할 텍스트·지시문을 1~8,000자로 입력하세요.'; }
    else if (step.kind === 'wait') { if (!/^\d+$/.test(step.value) || Number(step.value) > 10000) return '대기 시간은 0~10,000ms로 입력하세요.'; }
    else return '지원하지 않는 매크로 단계입니다.';
  }
  return null;
}
export const deviceKeycode = (key: DeckAction, index: number): number | null => {
  if (actionIssue(key)) return null;
  const shortcut = shortcutFor(key);
  return shortcut ? parseShortcut(shortcut) : qmkKeycodeForAction('', index);
};
export const triggerLabel = (index: number) => `${index >= 24 ? 'Ctrl+' : index >= 12 ? 'Shift+' : ''}F${13 + index % 12}`;
export const browserCapable = (key: DeckAction) => !actionIssue(key) && !shortcutFor(key) && key.kind !== 'application';

export function assignmentIssue(assignments: { key: DeckAction; index: number }[]): string | null {
  const codes = new Map<number, DeckAction>();
  for (const {key,index} of assignments) {
    const code = deviceKeycode(key,index);
    if (code === null) continue;
    const previous = codes.get(code);
    if (previous && (!shortcutFor(previous) || !shortcutFor(key))) return `${previous.label} / ${key.label}: 실행 신호가 겹칩니다. 직접 단축키의 F13~F24 조합을 변경하세요.`;
    codes.set(code,key);
  }
  return null;
}

// Imported settings remain plain data. Never interpolate them into executable syntax.
export const ahkString = (value: string) => '"' + value.replace(/`/g, '``').replace(/"/g, '`"').replace(/\r/g, '`r').replace(/\n/g, '`n').replace(/\t/g, '`t') + '"';
export function windowsScript(assignments: { key: DeckAction; index: number; matrix: string }[]) {
  const conflict = assignmentIssue(assignments);
  if (conflict) throw new Error(conflict);
  const supported = assignments.filter(({ key }) => !actionIssue(key) && !shortcutFor(key));
  if (!supported.length) throw new Error('먼저 웹주소, 프로그램 경로, 지시문 또는 매크로를 저장하세요. 기본 단축키는 별도 파일 없이 작동합니다.');
  const blocks = supported.map(({key,index,matrix}) => {
    const auto=key.kind==='application'&&applicationSearchMode(key)==='auto';
    const statements = key.kind === 'application' ? auto ? [
      `appPath := AI_PAD_FindApp([${applicationExecutables(key).map(ahkString).join(', ')}], ${ahkString(key.settings?.appDeepSearch?(normalizedDriveLetters(key.settings?.appDrives)??''):'')})`,
      `if !appPath`,
      `    throw Error("프로그램을 찾지 못했습니다. 검색 드라이브 또는 직접 경로를 확인하세요.")`,
      `Run(Chr(34) appPath Chr(34))`,
    ] : [
      `if !FileExist(${ahkString(cleanAppPath(key.settings!.appPath!))})`,
      `    throw Error("프로그램 경로를 찾지 못했습니다. 사이트에서 경로를 확인하세요.")`,
      `Run(${ahkString('"' + cleanAppPath(key.settings!.appPath!) + '"')})`,
    ] : actionSteps(key).map(step => step.kind === 'url' ? `Run(${ahkString(safeWebUrl(step.value)!)})` : step.kind === 'wait' ? `Sleep(${Number(step.value)})` : key.kind === 'ai' || key.kind === 'agent' || key.kind === 'system' ? `A_Clipboard := ${ahkString(step.value)}` : `SendText(${ahkString(step.value)})`);
    return `; Matrix ${matrix.replace(/[^0-9,]/g, '')} · ${triggerLabel(index)}
${index >= 24 ? '^' : index >= 12 ? '+' : ''}F${13 + index % 12} Up:: {
    global AI_PAD_BUSY
    if AI_PAD_BUSY
        return
    AI_PAD_BUSY := true
    try {
${key.confirm ? `        if MsgBox(${ahkString(key.label + ' 실행할까요?')}, "AI PAD", "YesNo") != "Yes"
            return\n` : ''}${statements.map(line => '        ' + line).join('\n')}
${key.hud ? '        TrayTip("실행 요청 전달 완료 · 앱/AI 작업의 완료 여부는 확인하지 않습니다.", "AI PAD")\n' : ''}    } catch Error as err {
        MsgBox(err.Message, "AI PAD · 실행 오류")
    } finally {
        AI_PAD_BUSY := false
    }
}`;
  });
  const finder=supported.some(({key})=>key.kind==='application'&&applicationSearchMode(key)==='auto')?`
global AI_PAD_APP_CACHE := Map()
AI_PAD_FindApp(names, drives := "") {
    global AI_PAD_APP_CACHE
    cacheKey := ""
    for name in names
        cacheKey .= "|" name
    cacheKey .= "@" drives
    if AI_PAD_APP_CACHE.Has(cacheKey) && FileExist(AI_PAD_APP_CACHE[cacheKey])
        return AI_PAD_APP_CACHE[cacheKey]
    for name in names {
        for root in ["HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\", "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\", "HKEY_LOCAL_MACHINE\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\"] {
            try {
                found := Trim(RegRead(root name), Chr(34))
                if FileExist(found) {
                    AI_PAD_APP_CACHE[cacheKey] := found
                    return found
                }
            } catch {
            }
        }
    }
    roots := [A_ProgramFiles, EnvGet("ProgramFiles(x86)"), A_LocalAppData]
    for root in roots {
        if !root || !DirExist(root)
            continue
        for name in names {
            Loop Files, root "\\" name, "R" {
                AI_PAD_APP_CACHE[cacheKey] := A_LoopFileFullPath
                return A_LoopFileFullPath
            }
        }
    }
    for drive in StrSplit(drives, ",") {
        drive := Trim(drive)
        if !RegExMatch(drive, "^[A-Z]$") || !DirExist(drive ":\\")
            continue
        for name in names {
            Loop Files, drive ":\\" name, "R" {
                AI_PAD_APP_CACHE[cacheKey] := A_LoopFileFullPath
                return A_LoopFileFullPath
            }
        }
    }
    return ""
}
`:'';
  return { count:supported.length, source:`; AI PAD · AutoHotkey v2 · 사용자가 저장한 설정만 포함합니다.
; 먼저 메모장으로 내용을 확인한 뒤 실행하세요. 관리자 권한/자동 시작 설정 없음.
; 사이트 실행 모드는 OFF로 두세요. 동시에 프로필 파일 하나만 실행하세요.
; 중지: 작업 표시줄의 AutoHotkey 아이콘 → Exit. 이 파일은 자동으로 업데이트되지 않습니다.
#Requires AutoHotkey v2.0
#SingleInstance Force
global AI_PAD_BUSY := false
${finder}
${blocks.join('\n\n')}
` };
}
