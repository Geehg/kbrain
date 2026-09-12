import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const modules = new Map();
async function sourceModule(name) {
  if (modules.has(name)) return modules.get(name);
  let code = ts.transpileModule(await readFile(new URL(`../app/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  for (const match of [...code.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1];
    const url = specifier.startsWith('./') ? await sourceModule(specifier.slice(2)) : import.meta.resolve(specifier);
    code = code.replace(`from '${specifier}'`, `from '${url}'`).replace(`from "${specifier}"`, `from "${url}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  modules.set(name, url); return url;
}
const a = await import(await sourceModule('deck-actions'));
const via = await import(await sourceModule('via-webhid'));
const key = (kind, settings={}, action='') => ({id:'test',label:'TEST',kind,settings,action,prompt:'한글 지시문',confirm:true,hud:true});
assert.equal(a.parseShortcut('Ctrl+Shift+S'), 0x316);
assert.equal(a.parseShortcut('Win+D'), 0x807);
assert.equal(a.deviceKeycode(key('keyboard',{},'⌘C'),0),0x106);
for(const [shortcut,code] of [['Ctrl+Minus','Minus'],['Alt+Left','ArrowLeft'],['Enter','Enter'],['Mute','AudioVolumeMute']]) assert.equal(via.qmkKeycodeToDomCode(a.parseShortcut(shortcut)),code);
for(const s of ['Ctrl+Ctrl+A','Alt+','⌘C','Ctrl+Volume Up','Launch Photoshop','Ctrl+A+B']) assert.equal(a.parseShortcut(s),null,s);
for(const s of ['javascript:alert(1)','file:///C:/a.exe','https://u:p@example.com','https://ex ample.com','https://example.com\nX']) assert.equal(a.safeWebUrl(s),null,s);
assert.equal(a.safeWebUrl(' https://example.com/a?q=1 '),'https://example.com/a?q=1');
assert.ok(a.validAppPath('"C:\\Program Files\\Adobe\\Photoshop.exe"'));
for(const s of ['Photoshop','C:\\a.exe -silent','C:\\a.exe" & calc','C:\\a:stream.exe','\\\\server\\app.exe']) assert.equal(a.validAppPath(s),false,s);
const missing=key('application',{},'Open Photoshop');
assert.ok(a.actionIssue(missing)); assert.equal(a.deviceKeycode(missing,0),null);
const web=key('website',{url:'https://example.com/'});
for(let i=0;i<24;i++) {
  assert.equal(a.deviceKeycode(web,i),via.qmkKeycodeForAction('',i));
  assert.ok(via.qmkKeycodeMatchesDomEvent(a.deviceKeycode(web,i),{code:`F${13+i%12}`,ctrlKey:false,shiftKey:i>=12,altKey:false,metaKey:false}));
}
const steps=[{kind:'url',value:'https://example.com/'},{kind:'wait',value:'500'},{kind:'text',value:'한글 "text" `tick`\nline'}];
const macro=key('macro',{steps});
assert.equal(a.actionIssue(macro),null);
assert.deepEqual(a.sanitizeActionSettings(JSON.parse(JSON.stringify(macro.settings))),macro.settings);
for(const bad of [[{kind:'wait',value:'10001'}],[{kind:'wait',value:'-1'}],[{kind:'shell',value:'calc.exe'}],Array(17).fill(steps[0])]) assert.ok(a.actionIssue(key('macro',{steps:bad})));
assert.deepEqual(a.sanitizeActionSettings({url:{bad:true},steps:[{kind:'shell',value:'calc'}]}),{});
const assign=(key,index)=>({key,index,matrix:`${index},0`});
const collision=[assign(web,0),assign(key('keyboard',{shortcut:'F13'}),1)];
assert.ok(a.assignmentIssue(collision)); assert.throws(()=>a.windowsScript(collision));
assert.equal(a.assignmentIssue([assign(key('keyboard',{shortcut:'Ctrl+C'}),0),assign(key('keyboard',{shortcut:'Ctrl+C'}),1)]),null);
const app=key('application',{appPath:'C:\\Program Files\\Photoshop.exe'});
const generated=a.windowsScript([assign(web,0),assign(app,1),assign(macro,12),assign(missing,3),assign(key('keyboard',{shortcut:'Ctrl+C'}),4)]);
assert.equal(generated.count,3);
assert.match(generated.source,/F13 Up::/); assert.match(generated.source,/\+F13 Up::/);
assert.ok(generated.source.includes('Run('+a.ahkString('"C:\\Program Files\\Photoshop.exe"')+')'));
assert.ok(generated.source.includes('SendText('+a.ahkString(steps[2].value)+')'));
assert.match(generated.source,/Sleep\(500\)/);
assert.equal(a.ahkString('"\nRun("calc")\n;`'),'"`"`nRun(`"calc`")`n;``"');
assert.match(generated.source,/#Requires AutoHotkey v2\.0/);
assert.doesNotMatch(generated.source,/RunAs|powershell|cmd\.exe|Startup/);
console.log('PASS: Windows keycodes/DOM triggers, legacy shortcuts, missing-action skip, safe URL/path validation, macro bounds, JSON settings roundtrip, trigger collisions, AHK escaping and generated source. Native Windows execution is not tested here.');
