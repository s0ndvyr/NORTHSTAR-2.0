/* NORTHSTAR: narrowly scoped Canvas integration and local-first workspace. */
(async () => {
'use strict';
const DEMO_COURSES = structuredClone(COURSES);
const DEMO_ASSIGNMENTS = structuredClone(ASSIGNMENTS);
let mode = 'demo', activeAssignment = null, dataFreshness = 'demo', lastCanvasSync = null;
let GROUPS = {}, COURSE_META = {};
let syncWarnings = [], syncCompleteness = 'unknown';
let canvasSyncInFlight = null, lastAutoSyncTrigger = 0;
const GRADES = window.Grades, AI = window.NorthstarAI, CANVAS_SYNC = window.NorthstarCanvasSync;
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
let persistentCredentials = null, persistentAiKey = '';
let credentialsRemembered = false, aiKeyRemembered = false;
// Earlier versions sent this token to third-party proxies and persisted it without encryption.
const hadOldToken = !!localStorage.getItem('canvas_token');
localStorage.removeItem('canvas_token');
localStorage.removeItem('canvas_base');
ACTIVITY.splice(0); AUTOPILOT.splice(0);
NOTES = store.get('northstar_notes_v2', []);
let PERIODS = store.get('northstar_periods_v1', []);
const safe = value => String(value ?? '').replace(/[&<>"'`]/g, '');
const asText = html => { const node = document.createElement('div'); node.innerHTML = html || ''; return safe(node.textContent.trim()); };
const urlFrom = value => {
  const u = new URL(value.trim());
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) throw Error('Use an HTTPS origin only, without a path, username, or query string.');
  return u.origin;
};
function getCredentials() { return persistentCredentials; }
async function setCredentials(c) {
  persistentCredentials = c;
  credentialsRemembered = !!$('#rememberCanvas')?.checked;
  if (credentialsRemembered && window.NorthstarVault) {
    try { await window.NorthstarVault.set('canvas-credentials', c); return true; }
    catch (error) { credentialsRemembered = false; pushEntry('err', 'Encrypted device storage unavailable; this connection will last only until the page is closed.'); return false; }
  }
  if (window.NorthstarVault) await window.NorthstarVault.remove('canvas-credentials').catch(()=>{});
  return false;
}
async function hydrateSavedSecrets() {
  if (!window.NorthstarVault) return;
  try {
    persistentCredentials = await window.NorthstarVault.get('canvas-credentials', null);
    persistentAiKey = await window.NorthstarVault.get('gemini-api-key', '');
    credentialsRemembered = !!persistentCredentials; aiKeyRemembered = !!persistentAiKey;
  } catch (error) { console.warn('NORTHSTAR secure storage unavailable:', error); }
  // Migrate an existing tab-only session without writing plaintext to browser storage.
  if (!persistentCredentials) { try { persistentCredentials = JSON.parse(sessionStorage.getItem('northstar_canvas_session') || 'null'); } catch {} }
  if (!persistentAiKey) { try { persistentAiKey = sessionStorage.getItem('northstar_gemini_session') || ''; } catch {} }
  // Migrate legacy tab-only values into encrypted device storage when the user has opted in.
  if (persistentCredentials && $('#rememberCanvas')?.checked && !credentialsRemembered) { try { await window.NorthstarVault.set('canvas-credentials', persistentCredentials); credentialsRemembered = true; } catch {} }
  if (persistentAiKey && $('#rememberGemini')?.checked && !aiKeyRemembered) { try { await window.NorthstarVault.set('gemini-api-key', persistentAiKey); aiKeyRemembered = true; } catch {} }
  try { sessionStorage.removeItem('northstar_canvas_session'); sessionStorage.removeItem('northstar_gemini_session'); sessionStorage.removeItem('northstar_gemini_model'); } catch {}
}
/* ---------- connection debug console (lives inside the Connect modal) ---------- */
const DBG = window.CanvasDebug || {redact:s=>String(s),redactStack:s=>String(s),parseRetryAfter:()=>null,buildEvent:()=>({kind:'unknown',httpError:'',hint:'',actions:[],verdict:''}),verdictForFailure:()=>({verdict:'',hint:''})};
const debugState={entries:[],verdict:'',hint:'',attemptId:0,startedAt:0,mode:''};
const dbgEl=id=>document.getElementById(id);
function dbgNow(){const d=new Date(),p=(n,l)=>{let s=String(n);while(s.length<(l||2))s='0'+s;return s;};return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+'.'+p(d.getMilliseconds(),3);}
function pushEntry(level,msg){
  const entry={t:dbgNow(),level:level,msg:String(msg)};
  debugState.entries.push(entry);
  if(debugState.entries.length>400)debugState.entries.splice(0,debugState.entries.length-400);
  const log=dbgEl('debugLog');
  if(log){const li=document.createElement('li');li.className='debug-entry debug-'+level;
    li.textContent=(debugState.attemptId?'attempt '+debugState.attemptId+'  ':'')+entry.t+'  '+entry.msg;
    log.appendChild(li);log.scrollTop=log.scrollHeight;}
  return entry;
}
function dbgSetDot(state){const dot=dbgEl('debugDot');if(dot){dot.className='debug-dot'+(state?' is-'+state:'');dot.setAttribute('data-state',state||'idle');}}
function dbgHeader(text){const el=dbgEl('debugHeaderMeta');if(el)el.textContent=text;}
function dbgVerdict(kind,title,lines){
  debugState.verdict=kind;debugState.hint=(lines||[]).join(' ');
  const box=dbgEl('debugVerdict');if(!box)return;
  box.hidden=false;box.className='debug-verdict is-'+kind;box.textContent='';
  const h=document.createElement('strong');h.textContent=title;box.appendChild(h);
  (lines||[]).forEach(line=>{if(!line)return;const p=document.createElement('p');p.textContent=line;box.appendChild(p);});
}
function scrollDebugIntoView(){const c=document.querySelector('.debug-console');if(c&&c.scrollIntoView){try{c.scrollIntoView({block:'nearest'});}catch{}}}
function resetDebug(mode){
  debugState.attemptId++;debugState.entries=[];debugState.verdict='';debugState.hint='';
  debugState.startedAt=performance.now();debugState.mode=mode||'';
  const log=dbgEl('debugLog');if(log)log.textContent='';
  const box=dbgEl('debugVerdict');if(box){box.hidden=true;box.textContent='';}
  dbgSetDot('run');dbgHeader('running · '+(mode==='bridge'?'via your bridge':'direct to Canvas'));
  return debugState.attemptId;
}
function summarizeConnect(error){
  let event=null;for(const e of debugState.entries)if(e.event)event=e.event;
  const ms=debugState.startedAt?Math.round(performance.now()-debugState.startedAt):0;
  if(error&&error.kind==='invalid-input'){dbgSetDot('bad');dbgHeader('nothing sent');dbgVerdict('bad','Check your entries',[error.message]);scrollDebugIntoView();return;}
  if(!error&&event&&event.kind==='success'){dbgSetDot('ok');dbgHeader('connected · '+ms+'ms');dbgVerdict('ok','Connected',['Every traced request was accepted by Canvas. The full trace stays here for this attempt.']);return;}
  if(event&&event.kind!=='success'){
    dbgSetDot('bad');dbgHeader((event.verdict||'failed')+(ms?' · '+ms+'ms':''));
    dbgVerdict('bad',event.verdict||'Connection failed',[event.httpError,event.hint].concat(event.actions||[]));
    scrollDebugIntoView();return;
  }
  const summary=DBG.verdictForFailure(error||{});
  if(error){
    dbgSetDot('bad');dbgHeader((summary.verdict||'failed')+(ms?' · '+ms+'ms':''));
    dbgVerdict('bad',summary.verdict||'Connection failed',[summary.hint||(error.message?DBG.redact(error.message):'')]);
    scrollDebugIntoView();
  }else{dbgSetDot('ok');dbgHeader('ready');dbgVerdict('ok','Ready to connect',['Press Connect & sync — every request will be traced here.']);}
}
function buildDebugReport(){
  const lines=[];
  lines.push('NORTHSTAR Canvas debug report · '+new Date().toString());
  lines.push('Attempt: '+(debugState.attemptId||'-')+(debugState.mode?' ('+(debugState.mode==='bridge'?'bridge':'direct')+')':''));
  lines.push('Page origin: '+(typeof location!=='undefined'?location.origin:'-'));
  lines.push('User agent: '+(typeof navigator!=='undefined'?navigator.userAgent:'-'));
  if(debugState.verdict)lines.push('Verdict: '+debugState.verdict+(debugState.hint?' — '+debugState.hint:''));
  lines.push('','Entries:');
  if(!debugState.entries.length)lines.push('(no entries yet)');
  debugState.entries.forEach(entry=>{
    lines.push(entry.t+'  '+entry.msg);
  });
  lines.push('','Security: the Canvas token never appears in this report.');
  return DBG.redact(lines.join('\n'));
}
function fallbackCopy(text){
  try{const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}catch{}
}
function copyDebugReport(){
  const text=buildDebugReport();
  const done=()=>{const btn=dbgEl('debugCopy');if(!btn)return;const old=btn.textContent;btn.textContent='Copied ✓';setTimeout(()=>{btn.textContent=old;},1600);};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done,()=>{fallbackCopy(text);done();});
  else{fallbackCopy(text);done();}
}
function bootstrapDebug(){
  const copyBtn=dbgEl('debugCopy'),clearBtn=dbgEl('debugClear'),toggleBtn=dbgEl('debugToggle'),body=dbgEl('debugBody');
  if(copyBtn)copyBtn.addEventListener('click',copyDebugReport);
  if(clearBtn)clearBtn.addEventListener('click',()=>{
    debugState.entries=[];debugState.verdict='';debugState.hint='';
    const log=dbgEl('debugLog');if(log)log.textContent='';
    const box=dbgEl('debugVerdict');if(box){box.hidden=true;box.textContent='';}
    dbgSetDot('idle');dbgHeader('cleared — press Connect & sync to trace again');
  });
  if(toggleBtn&&body)toggleBtn.addEventListener('click',()=>{
    const open=body.hasAttribute('hidden');
    if(open){body.removeAttribute('hidden');toggleBtn.setAttribute('aria-expanded','true');toggleBtn.textContent='Hide';}
    else{body.setAttribute('hidden','');toggleBtn.setAttribute('aria-expanded','false');toggleBtn.textContent='Show';}
  });
  dbgSetDot('idle');dbgHeader('waiting for a connection attempt…');
}
/* Diagnostic probes for failed requests: is the host reachable, does it answer
   without credentials, does it redirect, and (bridge) does it allow this origin? */
async function probeDiagnostics(creds,target,mode){
  const out={reachable:null,probe:null,originAllowed:null};
  const root=(mode==='bridge'?creds.proxy:creds.base).replace(/\/+$/,'')+'/';
  const to=ms=>(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)?AbortSignal.timeout(ms):undefined;
  try{await fetch(root,{method:'HEAD',mode:'no-cors',cache:'no-store',signal:to(5000)});out.reachable=true;pushEntry('info','probe: host reachable — '+root);}
  catch{out.reachable=false;pushEntry('err','probe: host unreachable — '+root+' (DNS, TLS, or offline; Canvas never contacted)');return out;}
  try{
    const r=await fetch(target,{method:'GET',cache:'no-store',redirect:'follow',signal:to(8000)});
    out.probe={readable:true,status:r.status,redirected:r.redirected,finalUrl:r.url};
    pushEntry('info','probe: unauthenticated GET → HTTP '+r.status+(r.redirected?' (redirected → '+r.url+')':'')+' · response readable by this page');
  }catch(e){
    out.probe={readable:false,error:String((e&&e.message)||e)};
    pushEntry('info','probe: unauthenticated GET → blocked ('+String((e&&e.message)||e)+')');
  }
  if(mode==='bridge'){
    try{
      const r=await fetch(creds.proxy,{method:'OPTIONS',cache:'no-store',signal:to(5000)});
      out.originAllowed=(r.status===204||r.ok);
      pushEntry(out.originAllowed?'info':'err','probe: bridge origin check → '+(out.originAllowed?'ALLOWED (HTTP '+r.status+')':'REFUSED (HTTP '+r.status+')'));
    }catch{
      out.originAllowed=false;
      pushEntry('err','probe: bridge origin check → REFUSED (403 without CORS headers — ALLOWED_ORIGIN does not match this site)');
    }
  }
  return out;
}
async function canvasPage(creds, path) {
  const api = new URL(path, creds.base);
  if (api.origin !== creds.base || !api.pathname.startsWith('/api/v1/')) { pushEntry('err','Invalid Canvas API path: '+path); throw Error('Invalid Canvas API path.'); }
  const mode = creds.proxy ? 'bridge' : 'direct';
  let target = api.href;
  if (creds.proxy) { const bridge = new URL(creds.proxy); bridge.searchParams.set('path', api.pathname + api.search); target = bridge.href; }
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  pushEntry('info', elapsed()+'ms  GET '+api.pathname+api.search+(mode==='bridge'?'  →  bridge '+creds.proxy:'  →  direct'));
  let response;
  try {
    response = await fetch(target, {
      headers:{Authorization:'Bearer '+creds.token, Accept:'application/json'},
      redirect:'error',
      cache:'no-store',
      signal:(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)?AbortSignal.timeout(20000):undefined
    });
  } catch (e) {
    const raw = String((e && e.message) || e);
    const name = String((e && e.name) || '');
    let kind = 'network';
    if (name === 'TimeoutError' || /timeout|timed out/i.test(raw)) kind = 'timeout';
    else if (name === 'AbortError' || /\baborted?\b/i.test(raw)) kind = 'abort';
    else if (/redirect/i.test(raw)) kind = 'redirect';
    pushEntry('info', elapsed()+'ms  '+(kind==='timeout'?'TIMED OUT after 20s':kind==='abort'?'ABORTED by the browser':kind==='redirect'?'REDIRECT refused (redirect: error)':'NO RESPONSE — '+raw));
    let probes = null;
    if (kind === 'network' || kind === 'timeout' || kind === 'redirect') {
      pushEntry('info', 'diagnostics: checking host reachability and an unauthenticated probe…');
      probes = await probeDiagnostics(creds, target, mode);
    }
    const event = DBG.buildEvent({mode:mode,status:null,path:api.pathname,thrown:{kind:kind,message:raw},probes:probes,hostHint:api.host,durationMs:elapsed()});
    if (kind === 'redirect' && !event.redirectLocation && probes && probes.probe && probes.probe.redirected) event.redirectLocation = probes.probe.finalUrl;
    const lines = [elapsed()+'ms  '+(event.verdict||'FAILED')];
    if (event.httpError) lines.push(event.httpError);
    if (event.hint) lines.push(event.hint);
    (event.actions||[]).forEach(a=>lines.push('→ '+a));
    const errEntry = pushEntry('err', DBG.redact(lines.join('\n')));
    errEntry.event = event;
    const err = new Error(kind === 'network' ? 'Could not reach Canvas: '+raw+'. '+event.hint : (event.httpError || raw));
    err.kind = kind === 'network' ? 'network' : kind;
    err.status = null;
    err.event = event;
    throw err;
  }
  const status = response.status;
  const hdr = n => { try { return response.headers.get(n) || ''; } catch { return ''; } };
  const server = hdr('server');
  const contentType = hdr('content-type');
  const retryAfter = hdr('retry-after');
  let requestId = hdr('x-request-id') || hdr('x-correlation-id');
  let requestIdSource = requestId ? 'response header' : '';
  if (!requestId) { try { requestId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()); } catch { requestId = String(Date.now()); } requestIdSource = 'local'; }
  if (!response.ok) {
    const rawBody = await response.text().catch(() => '');
    let bodyPreview = '', bodyError = '';
    try { const parsed = JSON.parse(rawBody); bodyPreview = JSON.stringify(parsed).slice(0,240); if (parsed && typeof parsed.error === 'string') bodyError = parsed.error; }
    catch { bodyPreview = rawBody.replace(/\s+/g,' ').trim().slice(0,240); }
    const event = DBG.buildEvent({mode:mode,status:status,statusText:response.statusText||'',server:server,contentType:contentType,requestId:requestId,requestIdSource:requestIdSource,retryAfter:retryAfter,bodyPreview:bodyPreview,bodyError:bodyError,path:api.pathname,durationMs:elapsed(),hostHint:api.host});
    const lines = [elapsed()+'ms  HTTP '+status+(response.statusText?' '+response.statusText:'')+'  '+api.pathname];
    if (event.httpError) lines.push(event.httpError);
    if (event.hint) lines.push(event.hint);
    (event.actions||[]).forEach(a=>lines.push('→ '+a));
    if (server) lines.push('Server: '+server);
    if (contentType) lines.push('Content-Type: '+contentType);
    if (event.retryAfter != null) lines.push('Retry-After: '+event.retryAfter+'s');
    lines.push('X-Request-Id: '+requestId+(requestIdSource?' ('+requestIdSource+')':''));
    if (bodyPreview) lines.push('Body: '+bodyPreview);
    const errEntry = pushEntry('err', DBG.redact(lines.join('\n')));
    errEntry.event = event;
    const err = new Error(event.httpError || ('Canvas returned HTTP '+status+'.'));
    err.kind = 'http';
    err.status = status;
    err.event = event;
    throw err;
  }
  let data;
  try { data = await response.json(); }
  catch {
    const event = DBG.buildEvent({mode:mode,status:status,statusText:response.statusText||'',server:server,contentType:contentType,requestId:requestId,requestIdSource:requestIdSource,durationMs:elapsed(),nonJson:true,path:api.pathname,hostHint:api.host});
    const lines = [elapsed()+'ms  HTTP '+status+' — body is not JSON  '+api.pathname];
    if (event.httpError) lines.push(event.httpError);
    if (event.hint) lines.push(event.hint);
    (event.actions||[]).forEach(a=>lines.push('→ '+a));
    if (server) lines.push('Server: '+server);
    if (contentType) lines.push('Content-Type: '+contentType);
    lines.push('X-Request-Id: '+requestId+(requestIdSource?' ('+requestIdSource+')':''));
    const errEntry = pushEntry('err', DBG.redact(lines.join('\n')));
    errEntry.event = event;
    const err = new Error('Canvas did not return valid JSON ('+(contentType||'unknown content type')+'). Check the school URL and bridge.');
    err.kind = 'http';
    err.status = status;
    err.event = event;
    throw err;
  }
  const count = Array.isArray(data) ? data.length+(data.length===1?' item':' items') : 'JSON object';
  const okEntry = pushEntry('ok', elapsed()+'ms  HTTP 200  '+api.pathname+'  ('+count+')');
  okEntry.event = {kind:'success', status:200, path:api.pathname};
  return data;
}
async function allPages(creds, path) {
  let items = [];
  for (let page=1; page<=100; page++) {
    const u = new URL(path, creds.base); u.searchParams.set('per_page','100'); u.searchParams.set('page', String(page));
    const chunk = await canvasPage(creds, u.pathname+u.search);
    if (!Array.isArray(chunk)) throw Error('Canvas returned an unexpected response.');
    items.push(...chunk); if(chunk.length<100) return items;
  }
  throw Error('Too many Canvas pages to sync safely. No changes were made.');
}
const typeOf = a => {
  const types = Array.isArray(a.submission_types) ? a.submission_types : [];
  if (types.includes('discussion_topic')) return 'Discussion';
  if (types.includes('online_quiz')) return 'Quiz';
  if (types.includes('external_tool')) return 'External Tool';
  if (types.includes('online_upload')) return 'File Upload';
  if (types.includes('online_text_entry')) return 'Writing';
  if (types.includes('online_url')) return 'Website';
  if (types.includes('media_recording')) return 'Media Recording';
  if (types.includes('none')) return 'No Submission';
  return 'Assignment';
};
function numberOrNull(value) { return CANVAS_SYNC.numberOrNull(value); }
function courseEnrollmentGrade(course) { return CANVAS_SYNC.courseGrade(course); }
function convertCourses(rows) {
  const palette=['#c4e87b','#9cd9bd','#c6bded','#eac988','#efa99c','#a7cce1'];
  return rows.filter(c => Number.isInteger(c.id)).map((c,i)=>({id:'canvas_'+c.id, code:safe(c.course_code || 'COURSE'), name:safe(c.name || 'Untitled course'), prof:'Canvas course', office:'Not available', color:palette[i%palette.length], grade:0, credits:0, modules:[], canvasId:c.id, canvasUrl: c.html_url, canvasGrade:courseEnrollmentGrade(c)}));
}
function convertAssignments(rows,c,base) {
  return rows.filter(a => Number.isInteger(a.id)).map(a=>{
    const sub=CANVAS_SYNC.submission(a.submission), parsed = a.due_at ? new Date(a.due_at) : null, hasDue = parsed && Number.isFinite(parsed.getTime());
    let href=''; try { const u=new URL(a.html_url); if(u.protocol==='https:' && u.origin===base) href=u.href; } catch {}
    return {id:'canvas_'+a.id+'_'+c.canvasId, canvasId:a.id, title:safe(a.name || 'Untitled assignment'), course:c.id, type:typeOf(a), due:hasDue?parsed:new Date('2999-01-01T00:00:00Z'), noDue:!hasDue, points:numberOrNull(a.points_possible)??0, priority:'Normal', status:sub.status, progress:sub.submitted?100:0, desc:asText(a.description).slice(0,1000) || 'Open this assignment in Canvas for its full instructions.', rubric:[], score:sub.score, grade:sub.grade, excused:sub.excused, missing:sub.missing, late:sub.late, latePolicyStatus:sub.latePolicyStatus, groupId:a.assignment_group_id, subState:sub.workflowState, submittedAt:sub.submittedAt, gradedAt:sub.gradedAt, attempt:sub.attempt, gradeMatchesCurrentSubmission:sub.gradeMatchesCurrentSubmission, submissionTypes:a.submission_types||[], allowedExtensions:a.allowed_extensions||[], annotatableAttachmentId:a.annotatable_attachment_id||null, canvasUrl:href, assignmentPublished:a.published!==false,lockedForUser:!!a.locked_for_user,unlockAt:a.unlock_at||null,lockAt:a.lock_at||null};
  });
}
const originalRenderDashboard=renderDashboard, originalRenderLab=renderLab;
const oldMomentum=renderMomentum; renderMomentum=function(){if(mode==='demo'){oldMomentum();return;}$('#momentumList').innerHTML=COURSES.map(c=>{const as=ASSIGNMENTS.filter(a=>a.course===c.id);const done=as.filter(a=>['Submitted','Completed','Awaiting Grading','Excused'].includes(a.status)).length;const g=gradeForCourse(c.id),official=c.canvasGrade||{},hasOfficial=official.currentPercent!==null||!!official.currentLetter,shownGrade=hasOfficial?(official.currentLetter||fmtPct(official.currentPercent)):(fmtPct(g.percent)+(g.letter?' · '+g.letter:''));return `<div class="mom-row" onclick="openCourse('${c.id}')"><div class="flex" style="justify-content:space-between"><b class="small">${c.code}</b><span class="small muted">${done}/${as.length} submitted</span></div><div class="flex" style="justify-content:space-between;align-items:center;margin-top:4px"><span class="small" style="color:${c.color};font-weight:700">${shownGrade}</span><span class="tiny muted">${hasOfficial?'Canvas current grade':'assignment estimate'}</span></div><div class="progress mt"><i style="width:${as.length?Math.round(done/as.length*100):0}%;background:${c.color}"></i></div></div>`;}).join('') || '<p class="small muted">No courses found.</p>';};
const originalRelDue=relDue;
relDue = d => new Date(d).getFullYear() >= 2999 ? 'No due date' : originalRelDue(d);
statusOf = a => { if(CANVAS_SYNC.isResolved(a.status)) return a.status; if(a.status==='Missing') return 'Missing'; if(a.noDue)return a.status; const now=new Date(), d=new Date(a.due); if(d<now)return 'Overdue'; if(d.toDateString()===now.toDateString())return 'Due Today'; return a.status; };
function dynamicOverview() {
  const pending=ASSIGNMENTS.filter(a=>!CANVAS_SYNC.isResolved(a.status));
  const today=pending.filter(a=>statusOf(a)==='Due Today'), late=pending.filter(a=>['Overdue','Missing'].includes(statusOf(a)));
  const current=GRADES?GRADES.currentPeriod(PERIODS,new Date()):null;
  $('#heroSub').textContent=(current?current.name+' · ':'')+`${today.length} due today  ·  ${late.length} need attention  ·  ${pending.length} open`;
  $('#syncLabel').textContent=mode!=='live'?'Demo workspace · not synced':dataFreshness==='cached'?'Saved Canvas data · offline':syncCompleteness==='partial'?'Canvas connected · some grade data unavailable':'Canvas connected · live data';
  $('#dataState').textContent=mode!=='live'?'SAMPLE DATA · Connect Canvas to see your real coursework':dataFreshness==='cached'?'SAVED CANVAS SNAPSHOT · Last successful sync '+(lastCanvasSync?new Date(lastCanvasSync).toLocaleString():'time unavailable'):syncCompleteness==='partial'?'CANVAS CONNECTED · Some official grade details were unavailable':'CANVAS CONNECTED · Your synced coursework';$('#dataState').classList.toggle('live',mode==='live');
  $('#ledgerCount').textContent=`${$('#ledgerList').children.length} shown · ${ASSIGNMENTS.length} assignments · ${mode==='live'?'Canvas':'sample data'}`;
  $('#hsStreak').textContent='—'; $('#hsHours').textContent='Example';
  if(mode==='live') { $('#hsGpa').textContent='—'; $('#hsGpa').title='Unavailable'; }
  const sampleTip=$('#focusBars').nextElementSibling; if(sampleTip) sampleTip.textContent='Example focus data, not your recorded time.';
  const health=Math.max(40,Math.min(98,100-late.length*12-(today.length>2?6:0)));$('#statusPct').textContent=health+'%';$('#statusRing').style.strokeDashoffset=263.9*(1-health/100);$('#statusBadge').textContent=late.length?'● Needs attention':'● On track';
  $('#statusText').textContent=late.length ? `${late.length} item${late.length===1?' needs':'s need'} attention. Open your priority queue to get started.` : 'No overdue items in the current data.';
  if(!ASSIGNMENTS.length){$('#focusCard').innerHTML='<p class="muted small">No assignments yet. Sync Canvas to bring your coursework here.</p>'; $('#priorityList').innerHTML='<p class="muted small">Your queue is clear.</p>';}
  $('#activityList').innerHTML=ACTIVITY.length ? ACTIVITY.slice(0,5).map(actHTML).join('') : '<p class="small muted">No activity yet.</p>';
  $('#drawerList').innerHTML=ACTIVITY.length ? ACTIVITY.map(actHTML).join('') : '<p class="small muted">No activity yet.</p>';
  $('#bellN').textContent=ACTIVITY.length;
}
renderDashboard = function(){ originalRenderDashboard(); dynamicOverview(); if(typeof SETTINGS !== 'undefined') applySettings(); };
matchesStatus = function(a){
  if(statusFilter==='All')return true;
  const st=statusOf(a);
  if(statusFilter==='Upcoming')return !CANVAS_SYNC.isResolved(a.status)&&!a.noDue&&new Date(a.due)>new Date();
  if(statusFilter==='Missing')return a.status==='Missing';
  if(statusFilter==='Overdue')return st==='Overdue';
  if(statusFilter==='Completed')return a.status==='Completed';
  if(statusFilter==='Submitted')return a.status==='Submitted';
  if(statusFilter==='Awaiting Grading')return a.status==='Awaiting Grading';
  if(statusFilter==='Excused')return a.status==='Excused';
  return st===statusFilter||a.status===statusFilter;
};
filterAndGo = function(f){statusFilter=f;showView('ledger');initLedger();};
const oldRenderLedger=renderLedger;
function ledgerRow(a){
  const c=courseById(a.course); const st=statusOf(a);
  const stColor = st==="Overdue"||st==="Missing"?"badge-rose":st==="Due Today"?"badge-amber":st==="Completed"||st==="Submitted"?"badge-green":st==="In Progress"||st==="Awaiting Grading"?"badge-cyan":"badge-violet";
  const barCls = st==="Overdue"||st==="Missing"?"rose":st==="Completed"||st==="Submitted"?"green":"";
  return `<div class="ledger-row" style="--lc:${c.color}" onclick="openWorkspace('${a.id}')">
    <div><h4>${esc(a.title)}</h4><div class="meta">${typeIcon(a.type)} ${a.type} · ${a.points} pts · ${a.priority} priority ${a.score!=null?`· <b style="color:#6ee7b7">${a.score}/${a.points}</b>`:""}</div></div>
    <div class="hide-ipad"><span class="course-chip" style="background:${c.color}22;color:${c.color}"><span class="dotc" style="background:${c.color}"></span>${c.code}</span><div class="meta">${c.name}</div></div>
    <div><b class="mono small">${fmtDate(a.due)}</b><div class="meta">${relDue(a.due)}</div></div>
    <div><div class="progress ${barCls}"><i style="width:${a.progress}%"></i></div><div class="meta mono">${a.progress}%</div></div>
    <div><span class="badge ${stColor}">${st}</span></div>
    <button class="btn btn-ghost btn-sm">Open →</button></div>`;
}
function emptyLedger(){ return `<div class="card" style="text-align:center;padding:36px"><p class="muted">No assignments match these filters. Try clearing a facet.</p></div>`; }
renderLedger = function(){
  if(mode!=='live'){ oldRenderLedger(); $('#ledgerCount').textContent=`${$('#ledgerList').children.length} shown · ${ASSIGNMENTS.length} assignments · sample data`; return; }
  const fc=$("#fCourse").value, ft=$("#fType").value, fp=$("#fPriority").value, fs=$("#fSort").value, q=($("#fSearch").value||"").toLowerCase();
  let list=ASSIGNMENTS.filter(a=>matchesStatus(a)&&(!fc||a.course===fc)&&(!ft||a.type===ft)&&(!fp||a.priority===fp)&&(!q||a.title.toLowerCase().includes(q)));
  if(fs==="due")list.sort((a,b)=>a.due-b.due); else if(fs==="points")list.sort((a,b)=>b.points-a.points); else list.sort((a,b)=>courseById(a.course).code.localeCompare(courseById(b.course).code));
  $('#ledgerCount').textContent=`${list.length} of ${ASSIGNMENTS.length} assignments · Canvas`;
  if(!PERIODS.length || !GRADES){ $('#ledgerList').innerHTML = list.map(ledgerRow).join("") || emptyLedger(); return; }
  const b=GRADES.bucketByPeriod(list, PERIODS, new Date());
  const section=(title, items, badge)=> items.length ? `<div class="period-section"><div class="period-head"><h3>${esc(title)}</h3>${badge||''}<span class="tiny muted">${items.length} item${items.length===1?'':'s'}</span></div>${items.map(ledgerRow).join('')}</div>` : '';
  let html='';
  b.buckets.forEach(bk=>{ html += section(bk.period.name, bk.items, bk.archived?'<span class="badge badge-violet">ARCHIVED</span>':''); });
  html += section('Not in a marking period', b.unassigned, '');
  html += section('No due date', b.noDue, '');
  $('#ledgerList').innerHTML = html || emptyLedger();
};
const oldRenderWhatIf=renderWhatIf;
renderWhatIf = function(){
  if(mode!=='live' || !COURSES.length){ oldRenderWhatIf(); return; }
  $('#whatifList').innerHTML = COURSES.map(c=>{
    const g=gradeForCourse(c.id);
    return `<div style="margin-bottom:14px">
      <div class="flex" style="justify-content:space-between"><span class="small"><b style="color:${c.color}">${c.code}</b> ${c.name} <span class="muted">· current ${fmtPct(g.percent)}${g.letter?' ('+g.letter+')':''} · ${g.counts.pending} pending (${g.pendingPoints} pts)</span></span><b class="mono" id="wi-val-${c.id}">—</b></div>
      <input type="range" min="0" max="100" value="85" data-c="${c.id}" class="wi-slider">
      <div class="tiny muted">↳ Projected final if remaining work averages this score</div></div>`;
  }).join('');
  $$('.wi-slider').forEach(s=>s.oninput=updateWhatIfLive);
  updateWhatIfLive();
};
function updateWhatIfLive(){
  let gpaSum=0, n=0, curSum=0, cn=0;
  COURSES.forEach(c=>{
    const slider=$(`.wi-slider[data-c="${c.id}"]`);
    const cur=gradeForCourse(c.id);
    if(cur.percent!=null){ curSum+=gradeToGpa(cur.percent); cn++; }
    if(slider){
      const proj=GRADES?GRADES.projectWith(ASSIGNMENTS.filter(a=>a.course===c.id), GROUPS[c.id]||[], gradeOptsFor(c.id), +slider.value):null;
      $('#wi-val-'+c.id).textContent = proj==null?'—':proj.toFixed(1)+'%';
      if(proj!=null){ gpaSum+=gradeToGpa(proj); n++; }
    }
  });
  const gpa=n?gpaSum/n:null, curGpa=cn?curSum/cn:null;
  $('#projGpa').textContent = gpa==null?'—':gpa.toFixed(2);
  const delta=(gpa!=null&&curGpa!=null)?gpa-curGpa:null;
  $('#projDelta').textContent = delta==null?'—':(delta>=0?'+':'')+delta.toFixed(2);
  $('#projDelta').style.color = delta==null?'':(delta>=0?'#6ee7b7':'#fda4af');
  $('#hsGpa').textContent = curGpa==null?'—':curGpa.toFixed(2);
}
const oldRenderCourses=renderCourses;
renderCourses = function(){ if(mode==='demo') {oldRenderCourses();return;} $('#courseGrid').innerHTML=COURSES.map(c=>{const work=ASSIGNMENTS.filter(a=>a.course===c.id); const done=work.filter(a=>CANVAS_SYNC.isResolved(a.status)).length; const g=gradeForCourse(c.id), official=c.canvasGrade||{}; const hasOfficial=official.currentPercent!==null||!!official.currentLetter; const gradeValue=hasOfficial?(official.currentLetter&&official.currentPercent!==null?official.currentLetter+' · '+fmtPct(official.currentPercent):(official.currentLetter||fmtPct(official.currentPercent))):(g.percent==null?'—':fmtPct(g.percent)+(g.letter?' · '+g.letter:'')); const gradeLabel=hasOfficial?'Canvas current grade':(syncWarnings.some(w=>w.startsWith(c.code+':'))?'Estimate · grade data incomplete':'Assignment estimate'); return `<button class="card course-card" style="--cc:${c.color};text-align:left" onclick="openCourse('${c.id}')"><span class="course-code">${c.code}</span><h3>${c.name}</h3><p class="muted small">Canvas course</p><div class="mini-stats"><div><b>${work.length}</b><span>Assignments</span></div><div><b>${done}</b><span>Submitted / excused</span></div><div><b>${gradeValue}</b><span>${gradeLabel}</span></div></div></button>`;}).join('') || '<p class="muted">No active Canvas courses were returned.</p>'; };
openCourse = function(id){ const c=courseById(id);if(!c)return;showView('courses');const list=ASSIGNMENTS.filter(a=>a.course===id&&!phase4IsHidden(a)).sort((a,b)=>a.due-b.due); $('#courseDetail').innerHTML=`<div class="card"><div class="card-head"><div><span class="eyebrow">${c.code}</span><h3 style="font:500 28px var(--serif);margin-top:8px">${c.name}</h3><p>${mode==='live'?'Canvas coursework':'Example course'}</p>${c.canvasGrade&&(c.canvasGrade.currentPercent!==null||c.canvasGrade.currentLetter)?`<p class="small mt"><b>Official Canvas current grade:</b> ${esc(c.canvasGrade.currentLetter||fmtPct(c.canvasGrade.currentPercent))}${c.canvasGrade.currentPercent!==null?' · '+fmtPct(c.canvasGrade.currentPercent):''}</p>${c.canvasGrade.currentPeriodTitle?`<p class="small muted">Canvas grading period: ${esc(c.canvasGrade.currentPeriodTitle)}${c.canvasGrade.currentPeriodPercent!==null?' · '+fmtPct(c.canvasGrade.currentPeriodPercent):''}</p>`:''}`:''}</div></div><h4 class="small">COURSEWORK</h4>${list.map(a=>`<button class="prio" style="width:100%;text-align:left" onclick="openWorkspace('${a.id}')"><div class="prio-info"><b>${esc(a.title)}</b><span>${a.type} · ${a.points} points</span></div><span class="small">${relDue(a.due)}</span></button>`).join('')||'<p class="small muted mt">No assignments found.</p>'}</div>`; $('#courseDetail').scrollIntoView({behavior:'smooth'}); };

function phase4HiddenSet(){return new Set(store.get('northstar_hidden_assignments_v1',[]).map(String));}
let phase4HiddenAssignments=phase4HiddenSet();
function phase4IsHidden(a){return !!a&&phase4HiddenAssignments.has(String(a.id));}
function phase4ToggleHidden(id){
  const key=String(id);
  if(phase4HiddenAssignments.has(key))phase4HiddenAssignments.delete(key);else phase4HiddenAssignments.add(key);
  store.set('northstar_hidden_assignments_v1',[...phase4HiddenAssignments]);refreshAll();
  const action=$('#phase4HideAssignment');if(action)action.textContent=phase4HiddenAssignments.has(key)?'Restore assignment':'Hide assignment';
  toast(phase4HiddenAssignments.has(key)?'Assignment hidden from active views':'Assignment restored to active views');
}
function phase4PeriodMatches(a,selection){
  if(selection==='all')return true;
  if(selection==='current'){const p=phase3CurrentPeriod();if(p)return phase3PeriodIdFor(a)===p.id;const start=new Date();start.setHours(0,0,0,0);return !a.noDue&&new Date(a.due).getTime()>=start.getTime();}
  return phase3PeriodIdFor(a)===selection;
}
function phase4QuestionMarkup(row,index){
  const q=row.quiz_question||row.question||row,qid=Number(q.id||row.id),type=String(q.question_type||q.type||'').toLowerCase(),answers=Array.isArray(q.answers)?q.answers:(Array.isArray(row.answers)?row.answers:[]),saved=row.answer;let control='';
  const prompt=phase4SafeNewQuizHtml(q.question_text||q.text||'Question',getCredentials()?.base||'');
  const optionLabel=(item,fallback)=>asText(item.text||item.answer_text||item.html||item.answer_text_html||item.answer_match_right||fallback);
  if(['multiple_choice_question','true_false_question'].includes(type)&&!answers.length)control='<p class="small muted">Canvas did not expose the answer choices to this account. Continue this same attempt in Canvas.</p>';
  else if(['multiple_choice_question','true_false_question'].includes(type))control=answers.map((v,i)=>'<label class="quiz-choice"><input type="radio" name="quiz-q-'+qid+'" data-quiz-answer="'+qid+'" value="'+Number(v.id)+'" '+(String(saved)===String(v.id)?'checked':'')+'><span>'+optionLabel(v,'Option '+(i+1))+'</span></label>').join('');
  else if(type==='multiple_answers_question'&&!answers.length)control='<p class="small muted">Canvas did not expose the answer choices to this account. Continue this same attempt in Canvas.</p>';
  else if(type==='multiple_answers_question'){const selected=Array.isArray(saved)?saved.map(String):[];control=answers.map((v,i)=>'<label class="quiz-choice"><input type="checkbox" data-quiz-answer="'+qid+'" value="'+Number(v.id)+'" '+(selected.includes(String(v.id))?'checked':'')+'><span>'+optionLabel(v,'Option '+(i+1))+'</span></label>').join('');}
  else if(type==='text_only_question')control='<p class="small muted">Read-only quiz information.</p>';
  else if(['essay_question','short_answer_question'].includes(type))control='<textarea class="editor quiz-text-answer" data-quiz-answer="'+qid+'" rows="'+(type==='essay_question'?7:3)+'" placeholder="Enter your response…">'+(typeof saved==='string'?safe(saved):'')+'</textarea>';
  else if(['numerical_question','calculated_question'].includes(type))control='<input class="select" type="number" step="any" data-quiz-answer="'+qid+'" value="'+(saved==null?'':safe(saved))+'" placeholder="Enter a number">';
  else if(type==='fill_in_multiple_blanks_question'||type==='multiple_dropdowns_question'){
    const blankIds=[...new Set(answers.map(item=>String(item.blank_id??'')).filter(Boolean))];
    control=blankIds.map(blankId=>{
      const savedValue=saved&&typeof saved==='object'?saved[blankId]:null;
      if(type==='multiple_dropdowns_question'){
        const options=answers.filter(item=>String(item.blank_id)===blankId);
        return '<label class="quiz-blank"><span>Blank '+safe(blankId)+'</span><select class="select" data-quiz-blank-for="'+qid+'" data-quiz-blank-id="'+safe(blankId)+'"><option value="">Choose an answer…</option>'+options.map((item,i)=>'<option value="'+Number(item.id)+'" '+(String(savedValue??'')===String(item.id)?'selected':'')+'>'+optionLabel(item,'Option '+(i+1))+'</option>').join('')+'</select></label>';
      }
      return '<label class="quiz-blank"><span>Blank '+safe(blankId)+'</span><input class="select" type="text" maxlength="500" data-quiz-blank-for="'+qid+'" data-quiz-blank-id="'+safe(blankId)+'" value="'+safe(savedValue??'')+'" placeholder="Enter this blank"></label>';
    }).join('')||'<p class="small muted">Canvas did not expose the blank identifiers needed to safely save this question. Continue this same attempt in Canvas.</p>';
  }
  else if(type==='matching_question'){
    const lefts=answers.filter(item=>item.answer_match_left),rights=answers.filter(item=>item.answer_match_right),prior=Array.isArray(saved)?saved:[];
    control=lefts.map((left,i)=>{
      const previous=prior.find(item=>String(item.answer_id)===String(left.id));
      return '<label class="quiz-blank"><span>'+asText(left.answer_match_left)+'</span><select class="select" data-quiz-match-for="'+qid+'" data-quiz-answer-id="'+Number(left.id)+'"><option value="">Choose a match…</option>'+rights.map((right,j)=>'<option value="'+Number(right.id)+'" '+(String(previous?.match_id??'')===String(right.id)?'selected':'')+'>'+optionLabel(right,'Match '+(j+1))+'</option>').join('')+'</select></label>';
    }).join('')||'<p class="small muted">Canvas did not expose the matching answer identifiers needed to safely save this question. Continue this same attempt in Canvas.</p>';
  }
  else if(type==='file_upload_question'){
    const savedId=Array.isArray(saved)?saved[0]:saved;
    control='<div class="quiz-file-answer"><label class="quiz-blank"><span>Choose a file to attach to this quiz question</span><input type="file" data-quiz-file-answer="'+qid+'"></label><p class="small muted" id="quiz-file-status-'+qid+'" role="status">'+(savedId?'Canvas attachment '+safe(savedId)+' is already attached. Choose a new file only to replace it.':'The selected file is uploaded to Canvas and attached to this question before the quiz answer is saved.')+'</p></div>';
  }
  else control='<p class="small muted">This question format ('+safe(type||'unknown')+') is not yet supported in the NORTHSTAR quiz editor. Continue this same attempt in Canvas.</p>';
  return '<article class="card quiz-question" data-question-id="'+qid+'" data-question-index="'+index+'"><div class="ns-quiz-question-head"><span class="eyebrow">QUESTION '+(index+1)+'</span><button type="button" class="ns-quiz-flag" data-quiz-flag="'+qid+'" aria-pressed="false">Flag for review</button></div><div class="quiz-prompt">'+prompt+'</div><div class="quiz-answer-list">'+control+'</div></article>';
}
function phase4QuestionSupported(row){return !!window.NorthstarWorkspace?.questionSupported?.(row);}
function phase4HasQuizAnswer(answer){
  if(answer===null||answer===undefined)return false;
  if(typeof answer==='string')return answer.trim().length>0;
  if(typeof answer==='number')return Number.isFinite(answer);
  if(Array.isArray(answer))return answer.length>0;
  if(typeof answer==='object')return Object.values(answer).some(value=>phase4HasQuizAnswer(value));
  return false;
}
function phase4IsQuestionAnswered(row,answer){
  const q=row?.quiz_question||row?.question||row||{},type=String(q.question_type||q.type||'').toLowerCase(),answers=Array.isArray(q.answers)?q.answers:[];
  if(type==='text_only_question')return true;
  if(type==='matching_question')return Array.isArray(answer)&&answer.length===answers.filter(item=>item.answer_match_left).length;
  if(type==='file_upload_question')return phase4HasQuizAnswer(answer);
  if(type==='fill_in_multiple_blanks_question'||type==='multiple_dropdowns_question'){
    const blanks=[...new Set(answers.map(item=>String(item.blank_id??'')).filter(Boolean))];
    return !!answer&&typeof answer==='object'&&blanks.length>0&&blanks.every(key=>Object.prototype.hasOwnProperty.call(answer,key)&&phase4HasQuizAnswer(answer[key]));
  }
  return phase4HasQuizAnswer(answer);
}
function phase4CollectQuizAnswers(questions){
  return questions.map(row=>{
    const q=row.quiz_question||row.question||row,id=Number(q.id||row.id),type=String(q.question_type||q.type||'').toLowerCase(),nodes=[...document.querySelectorAll('[data-quiz-answer="'+id+'"]')];
    if(type==='text_only_question'||!phase4QuestionSupported(row))return null;
    let answer=null;
    if(type==='file_upload_question'){
      const input=document.querySelector('[data-quiz-file-answer="'+id+'"]');
      const saved=row.answer, savedId=Array.isArray(saved)?saved[0]:saved;
      answer=input?.dataset.quizFileId||savedId||null;
    }
    else if(type==='multiple_answers_question'){const selected=nodes.filter(n=>n.checked).map(n=>Number(n.value));answer=selected.length?selected:null;}
    else if(['multiple_choice_question','true_false_question'].includes(type)){const chosen=nodes.find(n=>n.checked);answer=chosen?Number(chosen.value):null;}
    else if(type==='matching_question'){
      const pairs=[...document.querySelectorAll('[data-quiz-match-for="'+id+'"]')].filter(node=>node.value).map(node=>({answer_id:Number(node.dataset.quizAnswerId),match_id:Number(node.value)}));
      answer=pairs.length?pairs:null;
    }
    else if(type==='fill_in_multiple_blanks_question'||type==='multiple_dropdowns_question'){
      answer={};
      document.querySelectorAll('[data-quiz-blank-for="'+id+'"]').forEach(node=>{
        const key=String(node.dataset.quizBlankId||'');if(!key||!node.value.trim())return;
        answer[key]=type==='multiple_dropdowns_question'?Number(node.value):String(node.value);
      });
      if(!Object.keys(answer).length)answer=null;
    }
    else {const value=String(nodes[0]?.value??'');answer=value.trim()?value:null;}
    return {id,answer};
  }).filter(Boolean);
}
function phase4UpdateQuizProgress(){
  const s=activeQuizSession;if(!s)return;
  const eligible=s.questions.filter(row=>phase4QuestionSupported(row)&&String((row.quiz_question||row.question||row).question_type||(row.quiz_question||row.question||row).type||'').toLowerCase()!=='text_only_question');
  const answers=new Set(phase4CollectQuizAnswers(s.questions).filter(item=>phase4IsQuestionAnswered(s.questions.find(row=>Number((row.quiz_question||row.question||row).id||row.id)===Number(item.id)),item.answer)).map(item=>Number(item.id)));
  const count=$('#phase4QuizProgressText');if(count)count.textContent=answers.size+' of '+eligible.length+' supported questions answered';
  const bar=$('#phase4QuizProgressBar');if(bar)bar.style.width=(eligible.length?Math.round(answers.size/eligible.length*100):100)+'%';
  document.querySelectorAll('[data-quiz-jump]').forEach(button=>{const id=Number(button.dataset.questionId);const answered=answers.has(id);button.classList.toggle('is-answered',answered);button.setAttribute('aria-label','Question '+button.dataset.quizJump+' '+(answered?'answered':'not answered'));});
}
let activeQuizSession=null;let phase4QuizTimer=null;let phase4QuizResyncTimer=null;
function phase4QuizSessionKey(a){const c=courseById(a.course),quizId=a.quizId||a.canvasId,scope=String(location.pathname||'').includes('/preview/')?'preview_':'';return 'northstar_'+scope+'active_quiz_v1_'+String(c?.canvasId||'')+'_'+String(quizId||'');}
function phase4ReadQuizSession(a){try{return JSON.parse(sessionStorage.getItem(phase4QuizSessionKey(a))||'null');}catch{return null;}}
function phase4PersistQuizSession(a,submission,accessCode,flaggedQuestionIds=[]){if(!submission?.id||!submission?.attempt||!submission?.validation_token)return false;try{sessionStorage.setItem(phase4QuizSessionKey(a),JSON.stringify({id:Number(submission.id),attempt:Number(submission.attempt),validation_token:String(submission.validation_token),accessCode:String(accessCode||''),started_at:submission.started_at||null,flaggedQuestionIds:Array.isArray(flaggedQuestionIds)?flaggedQuestionIds.map(Number).filter(Number.isSafeInteger):[]}));return true;}catch{return false;}}
function phase4ClearQuizSession(a){try{sessionStorage.removeItem(phase4QuizSessionKey(a));}catch{}}
function phase4IsActiveQuizSubmission(submission){return !!(submission&&submission.id&&submission.started_at&&!submission.finished_at&&!['complete','pending_review'].includes(String(submission.workflow_state||'').toLowerCase()));}
function phase4ShowQuizRecoveryMessage(a,body,message){body.innerHTML='<div class="ns-room-loading-error"><h3>Existing Canvas attempt detected</h3><p>'+safe(message)+'</p><p class="ns-room-help">NORTHSTAR will not start another attempt while Canvas reports an unfinished one. Continue the same attempt in Canvas, or reopen NORTHSTAR in this same browser tab if its temporary session details are still available.</p><a class="btn btn-primary mt" href="'+safe(a.canvasUrl||'#')+'" target="_blank" rel="noopener noreferrer">Continue current attempt in Canvas ↗</a></div>';}
function phase4SafeNewQuizHtml(markup,base){
  const holder=document.createElement('div');
  if(window.NorthstarAssignmentRoom?.sanitizeHtml)holder.append(window.NorthstarAssignmentRoom.sanitizeHtml(String(markup||''),base));
  else holder.textContent=String(markup||'').replace(/<[^>]*>/g,'');
  return holder.innerHTML;
}
function phase4RenderNewQuizPreview(a,c,quiz,items,creds){
  const body=$('#nsQuizBody');if(!body)return;
  const rows=Array.isArray(items)?items:null;
  const points=Number(quiz.points_possible);
  const timeSeconds=Number(quiz.session_time_limit_in_seconds)||0;
  const timeLabel=quiz.has_time_limit&&timeSeconds?Math.round(timeSeconds/60)+' minute limit':'No time limit reported';
  const launch=a.canvasUrl||quiz.html_url||'';
  const instructions=phase4SafeNewQuizHtml(quiz.instructions||a.desc||'No additional instructions were provided.',creds?.base||'');
  const itemHtml=rows?.length?rows.map((item,index)=>{
    const entry=item.entry||{};
    const kind=String(entry.interaction_type_slug||item.entry_type||'Question').replace(/[-_]/g,' ');
    const prompt=entry.item_body||entry.body||entry.instructions||'';
    const safePrompt=prompt?phase4SafeNewQuizHtml(prompt,creds?.base||''):'<p class="ns-room-help">Question details are not available for this item.</p>';
    const title=safe(entry.title||item.title||('Question '+(index+1)));
    const pts=Number(item.points_possible);
    return '<article class="ns-newquiz-item"><div class="ns-newquiz-item-head"><span>ITEM '+(index+1)+' · '+safe(kind)+'</span><b>'+(Number.isFinite(pts)?pts+' pts':'')+'</b></div><h3>'+title+'</h3><div class="ns-newquiz-prompt">'+safePrompt+'</div></article>';
  }).join(''):'<div class="ns-room-empty"><div class="ns-room-empty-inner"><h3>Question preview unavailable</h3><p>The quiz itself was found, but Canvas did not return readable item content for this student session.</p></div></div>';
  body.innerHTML='<div class="ns-newquiz-brief"><div><span class="eyebrow">NEW QUIZZES · CANVAS CONTENT</span><h2>'+safe(quiz.title||a.title)+'</h2><p>'+(Number.isFinite(points)?points+' points · ':'')+timeLabel+(quiz.workflow_state?' · '+safe(quiz.workflow_state.replace(/_/g,' ')):'')+'</p></div><div class="ns-newquiz-instructions">'+instructions+'</div><p class="ns-room-help">This preview is read-only. NORTHSTAR does not create a New Quizzes attempt or store New Quizzes answers. Use Canvas’s authenticated quiz player for the official timed attempt, answer submission and completion.</p><button class="btn btn-primary mt" type="button" id="nsLaunchNewQuiz">Open official New Quizzes player inside NORTHSTAR</button><p class="ns-room-help mt" id="nsNewQuizLaunchStatus">Canvas handles the timed attempt, answers and final submission through its authenticated student player.</p></div><div class="ns-newquiz-list"><div class="ns-newquiz-list-head"><span class="eyebrow">QUESTION PREVIEW</span><span class="ns-room-help">'+(rows?rows.length+' items':'Items not available')+'</span></div>'+itemHtml+'</div>';
  const launchButton=$('#nsLaunchNewQuiz');if(launchButton)launchButton.onclick=()=>launchCanvasAssignmentExperience('new-quiz');
  $('#nsQuizTitle').textContent=quiz.title||a.title;
  $('#nsQuizSubhead').textContent=(rows?rows.length+' items':'Question preview unavailable')+' · New Quizzes · official attempt remains in Canvas';
}
async function openCanvasQuiz(a){
  activeAssignment=a;const c=courseById(a.course),creds=getCredentials(),quizId=a.quizId||a.canvasId;
  $('#workspace').innerHTML='<div class="ns-assignment-page"><header class="ns-room-header"><button class="ns-room-back" onclick="closeAssignmentRoom()"><span>←</span> Back to coursework</button><div class="ns-room-title"><span class="eyebrow">'+safe(c.code)+' / CANVAS QUIZ</span><h1 id="nsQuizTitle">'+safe(a.title)+'</h1><p id="nsQuizSubhead">Loading official quiz details…</p></div><div class="ns-room-actions"><span class="ns-room-status">Canvas connected</span><button class="btn btn-ghost btn-sm" id="phase4HideAssignment">'+(phase4IsHidden(a)?'Restore':'Hide')+'</button></div></header><div class="ns-room-layout" style="grid-template-columns:minmax(0,1fr)"><section class="ns-room-main"><div class="ns-room-card"><div class="ns-room-card-head"><div><span class="eyebrow">ASSESSMENT WORKSPACE</span><h2>Quiz environment</h2><p>Canvas-authoritative assessment workspace</p></div></div><div class="ns-room-panel" id="nsQuizBody">'+window.NorthstarAssignmentRoom.loadingMarkup(a.title,c.code)+'</div></div></section></div></div>';
  $('#wsOverlay').classList.add('open');
  $('#phase4HideAssignment').onclick=()=>phase4ToggleHidden(a.id);
  if(!creds?.proxy){$('#nsQuizBody').innerHTML='<div class="ns-room-loading-error"><h3>Private Canvas bridge required</h3><p>A quiz attempt cannot be started safely until NORTHSTAR is connected through your private Canvas bridge. No attempt has been created.</p></div>';return;}
  try{
    const api=window.NorthstarWorkspace.transport(creds);
    const newQuizPath='/api/quiz/v1/courses/'+Number(c.canvasId)+'/quizzes/'+Number(a.canvasId);
    let newQuiz=null;
    try{newQuiz=await api.get(newQuizPath);}catch(error){if(![403,404,405].includes(Number(error.status)))throw error;}
    if(newQuiz){
      let newItems=[];
      try{const response=await api.get(newQuizPath+'/items');newItems=Array.isArray(response)?response:(Array.isArray(response?.items)?response.items:[]);}
      catch(error){newItems=null;}
      phase4RenderNewQuizPreview(a,c,newQuiz,newItems,creds);
      return;
    }
    const quiz=await api.get('/api/v1/courses/'+Number(c.canvasId)+'/quizzes/'+Number(quizId));
    let currentSubmission=null;
    try{currentSubmission=await window.NorthstarWorkspace.getCurrentQuizSubmission({credentials:creds,courseId:c.canvasId,quizId});}
    catch(error){if(error.status!==404){$('#nsQuizBody').innerHTML='<div class="ns-room-loading-error"><h3>Could not verify your current attempt</h3><p>'+safe(error.message)+'</p><p class="ns-room-help">To prevent accidentally creating a duplicate attempt, NORTHSTAR will not offer a new quiz start until Canvas can confirm the current attempt state.</p></div>';return;}}
    if(phase4IsActiveQuizSubmission(currentSubmission)){
      const saved=phase4ReadQuizSession(a);
      if(saved&&Number(saved.id)===Number(currentSubmission.id)&&Number(saved.attempt)===Number(currentSubmission.attempt)&&saved.validation_token){
        try{const resumed=await window.NorthstarWorkspace.resumeQuiz({credentials:creds,courseId:c.canvasId,quizId,submission:currentSubmission,validationToken:saved.validation_token,accessCode:saved.accessCode||''});activeQuizSession={assignment:a,submission:resumed.submission,questions:resumed.questions,timing:resumed.timing||null,accessCode:resumed.accessCode||'',flaggedQuestionIds:Array.isArray(saved.flaggedQuestionIds)?saved.flaggedQuestionIds:undefined,timeLimit:Number(quiz.time_limit)||0,extraTime:Number(resumed.submission.extra_time)||0};phase4RenderQuizAttempt();return;}
        catch(error){phase4ShowQuizRecoveryMessage(a,$('#nsQuizBody'),'Canvas reports an unfinished attempt, but NORTHSTAR could not safely restore its questions: '+error.message);return;}
      }
      phase4ShowQuizRecoveryMessage(a,$('#nsQuizBody'),'Canvas reports an unfinished attempt that was started earlier. The temporary validation details are not available in this tab, so NORTHSTAR cannot safely resume it through the API.');return;
    }
    phase4ClearQuizSession(a);
    $('#nsQuizTitle').textContent=quiz.title||a.title;
    $('#nsQuizSubhead').textContent=(quiz.question_count??'')+' questions · '+(quiz.time_limit?quiz.time_limit+' minute limit':'No time limit reported')+' · '+(quiz.points_possible??a.points)+' points';
    $('#nsQuizBody').innerHTML='<div class="grid2"><div class="card"><span class="eyebrow">QUIZ BRIEF</span><div class="small mt" style="line-height:1.7">'+asText(quiz.description||a.desc||'')+'</div><div class="divider"></div><p class="small muted">Starting creates an official Canvas attempt. Canvas controls availability, time limits, attempt limits, access codes and grading.</p><label class="set-lbl" for="phase4QuizAccess">Access code (if required)</label><input id="phase4QuizAccess" class="select" type="password" autocomplete="off" placeholder="Optional access code"><button class="btn btn-primary mt" id="phase4StartQuiz">Start quiz in NORTHSTAR</button><p id="phase4QuizStatus" class="small muted mt" role="status">No attempt started.</p></div><div class="card"><span class="eyebrow">CANVAS STATUS</span><h3 class="mt">'+safe(quiz.workflow_state||'Status not reported')+'</h3><p class="small muted mt">New Quizzes, locked quizzes, IP restrictions and unsupported question formats may require the official Canvas provider workflow. NORTHSTAR will not simulate a result.</p></div></div>';
    $('#phase4StartQuiz').onclick=()=>phase4StartQuizAttempt(a,quiz,creds);
  }catch(error){
    $('#nsQuizBody').innerHTML='<div class="ns-room-loading-error"><h3>Quiz could not be loaded in NORTHSTAR</h3><p>'+safe(error.message)+'</p><p class="ns-room-help">This quiz may use New Quizzes or a provider feature not exposed through the classic Canvas Quiz API. No quiz attempt has been started.</p></div>';
  }
}
async function phase4StartQuizAttempt(a,quiz,creds){
  const c=courseById(a.course),status=$('#phase4QuizStatus'),button=$('#phase4StartQuiz');if(!confirm('Start an official Canvas quiz attempt now? This may start the timer and count against your allowed attempts.'))return;button.disabled=true;status.textContent='Starting attempt with Canvas…';
  try{const result=await window.NorthstarWorkspace.startQuiz({credentials:creds,courseId:c.canvasId,quizId:a.quizId||a.canvasId,accessCode:$('#phase4QuizAccess').value});phase4PersistQuizSession(a,result.submission,$('#phase4QuizAccess').value);activeQuizSession={assignment:a,submission:result.submission,questions:result.questions,timing:result.timing||null,accessCode:$('#phase4QuizAccess').value||'',timeLimit:Number(quiz.time_limit)||0,extraTime:Number(result.submission.extra_time)||0};phase4RenderQuizAttempt();}
  catch(error){
    if(error.quizSubmission){
      phase4PersistQuizSession(a,error.quizSubmission,$('#phase4QuizAccess').value);
      activeQuizSession={assignment:a,submission:error.quizSubmission,questions:[],accessCode:$('#phase4QuizAccess').value||''};
      status.textContent='Canvas started an attempt, but NORTHSTAR could not load its questions. Do not start again; continue this attempt in Canvas.';
      button.disabled=true;
      const link=document.createElement('a');link.className='btn btn-ghost mt';link.href=a.canvasUrl||'#';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Continue attempt in Canvas ↗';status.after(link);
    }else{
      let current=null;
      try{current=await window.NorthstarWorkspace.getCurrentQuizSubmission({credentials:creds,courseId:c.canvasId,quizId:a.quizId||a.canvasId});}catch{}
      if(phase4IsActiveQuizSubmission(current)){
        button.disabled=true;
        phase4ShowQuizRecoveryMessage(a,$('#nsQuizBody'),'The start request did not return a confirmed response, but Canvas now reports an unfinished attempt. NORTHSTAR has blocked another start to protect that attempt.');
      }else{status.textContent=error.message;button.disabled=false;}
    }
  }
}
let phase4QuizSaveTimer=null,phase4QuizSaveInFlight=false,phase4QuizSavePending=false,phase4LastQuizSavedSignature='',phase4LastQuizSavedAnswersSignature='';
function phase4QuizAnswersSignature(answers,flags=[]){return JSON.stringify({answers:answers||[],flags:flags||[]});}
function phase4ScheduleQuizAutoSave(){if(!activeQuizSession)return;if(phase4QuizSaveTimer)clearTimeout(phase4QuizSaveTimer);const status=$('#phase4AttemptStatus');if(status)status.textContent='Quiz response changed · saving to Canvas shortly…';phase4QuizSaveTimer=setTimeout(()=>phase4AutoSaveQuizAnswers(),1200);}
function phase4CollectQuizFlags(s=activeQuizSession){
  if(!s)return[];
  const flagged=new Set((s.flaggedQuestionIds||[]).map(Number));
  return s.questions.filter(phase4QuestionSupported).map(row=>{const q=row.quiz_question||row.question||row;return {id:Number(q.id||row.id),flagged:flagged.has(Number(q.id||row.id))};}).filter(item=>Number.isSafeInteger(item.id)&&item.id>0);
}
function phase4CurrentQuizSignature(s=activeQuizSession){
  return s?phase4QuizAnswersSignature(phase4CollectQuizAnswers(s.questions),phase4CollectQuizFlags(s)):'';
}
async function phase4SaveQuizState(s=activeQuizSession){
  if(!s)return;
  const answers=phase4CollectQuizAnswers(s.questions),flags=phase4CollectQuizFlags(s);
  const desiredSignature=phase4QuizAnswersSignature(answers,flags);
  const savedFlags=new Set((s.canvasFlaggedQuestionIds||[]).map(Number));
  const answerSignature=phase4QuizAnswersSignature(answers);
  if(answers.length&&answerSignature!==phase4LastQuizSavedAnswersSignature){
    await window.NorthstarWorkspace.saveQuizAnswers({credentials:getCredentials(),submission:s.submission,answers,accessCode:s.accessCode});
    phase4LastQuizSavedAnswersSignature=answerSignature;
  }
  for(const flag of flags){
    if(savedFlags.has(flag.id)===flag.flagged)continue;
    await window.NorthstarWorkspace.updateQuizQuestionFlag({credentials:getCredentials(),submission:s.submission,questionId:flag.id,flagged:flag.flagged,accessCode:s.accessCode});
    if(flag.flagged)savedFlags.add(flag.id);else savedFlags.delete(flag.id);
    s.canvasFlaggedQuestionIds=[...savedFlags];
  }
  phase4LastQuizSavedSignature=desiredSignature;
  phase4PersistQuizSession(s.assignment,s.submission,s.accessCode,s.flaggedQuestionIds);
}
async function phase4AutoSaveQuizAnswers(){
 const s=activeQuizSession;if(!s)return;if(phase4QuizSaveInFlight){phase4QuizSavePending=true;return;}
 const signature=phase4CurrentQuizSignature(s);if(signature===phase4LastQuizSavedSignature)return;
 phase4QuizSaveInFlight=true;const status=$('#phase4AttemptStatus');let saved=false;
 try{
  if(status)status.textContent='Saving answers and review flags to Canvas…';
  await phase4SaveQuizState(s);saved=true;
  if(status)status.textContent='Answers and review flags saved to Canvas automatically.';
 }catch(error){if(status)status.textContent='Save could not be confirmed: '+error.message+' Check Canvas before manually retrying; NORTHSTAR will not repeat an uncertain request.';}
 finally{phase4QuizSaveInFlight=false;const pending=phase4QuizSavePending;phase4QuizSavePending=false;if(saved&&pending&&phase4CurrentQuizSignature(s)!==phase4LastQuizSavedSignature)phase4ScheduleQuizAutoSave();}
}
function phase4RenderQuizAttempt(){
  const s=activeQuizSession;if(!s)return;const unsupported=s.questions.filter(row=>!phase4QuestionSupported(row));
  s.canvasFlaggedQuestionIds=Array.isArray(s.canvasFlaggedQuestionIds)?s.canvasFlaggedQuestionIds:s.questions.filter(row=>{const q=row.quiz_question||row.question||row;return !!(row.flagged||q.flagged);}).map(row=>{const q=row.quiz_question||row.question||row;return Number(q.id||row.id);});
  s.flaggedQuestionIds=Array.isArray(s.flaggedQuestionIds)?s.flaggedQuestionIds:[...s.canvasFlaggedQuestionIds];
  $('#nsQuizSubhead').textContent='Attempt '+s.submission.attempt+' · '+s.questions.length+' questions · Canvas attempt in progress';
  if(phase4QuizTimer)clearInterval(phase4QuizTimer);if(phase4QuizResyncTimer)clearInterval(phase4QuizResyncTimer);
  const navigator=s.questions.map((row,index)=>{const q=row.quiz_question||row.question||row;return '<button type="button" data-quiz-jump="'+(index+1)+'" data-question-id="'+Number(q.id||row.id)+'" title="Go to question '+(index+1)+'">'+(index+1)+'</button>';}).join('');
  $('#nsQuizBody').innerHTML='<div class="card mb"><span class="eyebrow">LIVE CANVAS ATTEMPT</span><p id="phase4QuizTimer" class="mono mt">'+(s.timeLimit?('Time limit: '+s.timeLimit+' minutes'):'No timer reported by Canvas')+'</p><div class="ns-quiz-progress-track"><i id="phase4QuizProgressBar"></i></div><p id="phase4QuizProgressText" class="small muted mt">0 supported questions answered</p><p class="small muted mt">Save answers sends them to Canvas. Submit quiz permanently completes this attempt.</p><div class="flex mt" style="gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="phase4SaveQuiz">Save answers to Canvas</button><button class="btn btn-primary btn-sm" id="phase4CompleteQuiz">Submit quiz to Canvas</button></div><p id="phase4AttemptStatus" class="small muted mt" role="status">Attempt started. Answers have not yet been saved.</p></div><nav class="ns-quiz-navigator" aria-label="Quiz question navigation">'+navigator+'</nav><div class="quiz-question-stack">'+s.questions.map(phase4QuestionMarkup).join('')+'</div>'+(unsupported.length?'<div class="card mt"><p class="small muted">'+unsupported.length+' question(s) use formats NORTHSTAR cannot safely edit. Complete these in the same attempt in Canvas before submitting.</p><a class="btn btn-ghost mt" href="'+safe(s.assignment.canvasUrl||'#')+'" target="_blank" rel="noopener noreferrer">Continue unsupported questions in Canvas ↗</a></div>':'');
  $('#phase4SaveQuiz').onclick=phase4SaveQuizAnswers;$('#phase4CompleteQuiz').onclick=phase4CompleteQuizAttempt;
  document.querySelectorAll('[data-quiz-jump]').forEach(button=>button.onclick=()=>{const target=document.querySelector('.quiz-question[data-question-index="'+(Number(button.dataset.quizJump)-1)+'"]');if(target)target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
  document.querySelectorAll('[data-quiz-flag]').forEach(button=>{const id=Number(button.dataset.quizFlag),flagged=s.flaggedQuestionIds.includes(id);button.setAttribute('aria-pressed',String(flagged));button.classList.toggle('is-flagged',flagged);if(flagged)button.textContent='Flagged';button.onclick=()=>{const at=s.flaggedQuestionIds.indexOf(id);if(at>=0)s.flaggedQuestionIds.splice(at,1);else s.flaggedQuestionIds.push(id);button.setAttribute('aria-pressed',String(at<0));button.classList.toggle('is-flagged',at<0);button.textContent=at<0?'Flagged':'Flag for review';phase4PersistQuizSession(s.assignment,s.submission,s.accessCode,s.flaggedQuestionIds);phase4ScheduleQuizAutoSave();};});
  const quizStack=document.querySelector('.quiz-question-stack');
  if(quizStack){
    quizStack.querySelectorAll('[data-quiz-file-answer]').forEach(input=>{
      input.addEventListener('change',async event=>{
        event.stopPropagation();
        const file=input.files?.[0];if(!file)return;
        const qid=Number(input.dataset.quizFileAnswer),status=$('#quiz-file-status-'+qid);
        if(file.size>25000000){if(status)status.textContent='Choose a file under 25 MB. Canvas has not received this file.';input.value='';return;}
        input.disabled=true;
        if(status)status.textContent='Uploading '+file.name+' to the active Canvas quiz attempt…';
        try{
          const course=courseById(s.assignment.course),quizId=s.assignment.quizId||s.assignment.canvasId;
          const uploaded=await window.NorthstarWorkspace.uploadQuizSubmissionFile({credentials:getCredentials(),courseId:course.canvasId,quizId,file});
          input.dataset.quizFileId=String(uploaded.id);
          const row=s.questions.find(item=>Number((item.quiz_question||item.question||item).id||item.id)===qid);
          if(row)row.answer=String(uploaded.id);
          if(status)status.textContent='Uploaded to Canvas: '+uploaded.name+'. Saving this question answer…';
          phase4UpdateQuizProgress();
          await phase4AutoSaveQuizAnswers();
          if(status)status.textContent='Canvas attachment '+uploaded.id+' uploaded and linked to this quiz question.';
        }catch(error){
          if(status)status.textContent='Quiz file upload was not confirmed: '+error.message+' Check this attempt in Canvas before retrying.';
        }finally{input.disabled=false;}
      });
    });
  }
  phase4LastQuizSavedAnswersSignature=phase4QuizAnswersSignature(phase4CollectQuizAnswers(s.questions));phase4LastQuizSavedSignature=phase4CurrentQuizSignature(s);
  if(quizStack){const update=()=>{phase4UpdateQuizProgress();phase4ScheduleQuizAutoSave();};quizStack.addEventListener('input',update);quizStack.addEventListener('change',update);}
  phase4UpdateQuizProgress();
  if(phase4QuizSaveTimer)clearTimeout(phase4QuizSaveTimer);
  if(s.timeLimit||Number.isFinite(Number(s.timing?.time_left))){const started=Date.parse(s.submission.started_at)||Date.now(),fallback=(s.timeLimit+s.extraTime)*60;let serverLeft=Number(s.timing?.time_left);if(!Number.isFinite(serverLeft))serverLeft=fallback-Math.floor((Date.now()-started)/1000);let syncedAt=Date.now();const tick=()=>{const remaining=Math.max(0,serverLeft-Math.floor((Date.now()-syncedAt)/1000)),node=$('#phase4QuizTimer');if(node){const mm=String(Math.floor(remaining/60)).padStart(2,'0'),ss=String(remaining%60).padStart(2,'0');node.textContent='Canvas time remaining · '+mm+':'+ss;if(remaining===0)node.textContent='Canvas time limit reached · verify attempt status in Canvas';}};tick();phase4QuizTimer=setInterval(tick,1000);phase4QuizResyncTimer=setInterval(async()=>{try{const timing=await window.NorthstarWorkspace.getQuizTime({credentials:getCredentials(),courseId:courseById(s.assignment.course).canvasId,quizId:s.assignment.quizId||s.assignment.canvasId,submissionId:s.submission.id});if(Number.isFinite(Number(timing.time_left))){serverLeft=Number(timing.time_left);syncedAt=Date.now();s.timing=timing;}}catch(error){}},30000);}
}
async function phase4SaveQuizAnswers(){
  const s=activeQuizSession;if(!s)return;const status=$('#phase4AttemptStatus'),button=$('#phase4SaveQuiz');
  if(phase4QuizSaveTimer){clearTimeout(phase4QuizSaveTimer);phase4QuizSaveTimer=null;}
  if(phase4QuizSaveInFlight){if(status)status.textContent='A Canvas save is already in progress. Wait for its confirmation.';return;}
  if(phase4CurrentQuizSignature(s)===phase4LastQuizSavedSignature){if(status)status.textContent='All answers and review flags are already saved to Canvas.';return;}
  try{phase4QuizSaveInFlight=true;if(button)button.disabled=true;if(status)status.textContent='Saving answers and review flags to Canvas…';await phase4SaveQuizState(s);if(status)status.textContent='Answers and review flags saved to Canvas.';}
  catch(error){if(status)status.textContent='Save could not be confirmed: '+error.message+' Check Canvas before retrying.';}
  finally{phase4QuizSaveInFlight=false;if(button)button.disabled=false;}
}
async function phase4CompleteQuizAttempt(){
  const s=activeQuizSession;if(!s)return;
  if(s.questions.some(row=>!phase4QuestionSupported(row))){toast('This quiz contains question formats NORTHSTAR cannot safely edit. Continue the same attempt in Canvas before submitting.');return;}
  const answers=phase4CollectQuizAnswers(s.questions),flags=phase4CollectQuizFlags(s);
  const unanswered=s.questions.filter(row=>!phase4IsQuestionAnswered(row,answers.find(x=>Number(x.id)===Number((row.quiz_question||row.question||row).id||row.id))?.answer)).length;
  if(phase4QuizSaveInFlight){toast('Wait for the current answer save to finish before submitting.');return;}
  const confirmation='Submit this quiz to Canvas now? Canvas will mark this attempt complete and answers can no longer be changed.'+(unanswered?'\n\n'+unanswered+' supported question(s) are unanswered. Submit anyway?':'');
  if(!confirm(confirmation))return;
  const status=$('#phase4AttemptStatus'),button=$('#phase4CompleteQuiz');
  try{phase4QuizSaveInFlight=true;if(phase4QuizSaveTimer){clearTimeout(phase4QuizSaveTimer);phase4QuizSaveTimer=null;}button.disabled=true;$('#phase4SaveQuiz').disabled=true;status.textContent='Saving final answers and review flags to Canvas…';if(phase4CurrentQuizSignature(s)!==phase4LastQuizSavedSignature)await phase4SaveQuizState(s);status.textContent='Completing quiz attempt in Canvas…';await window.NorthstarWorkspace.completeQuiz({credentials:getCredentials(),courseId:courseById(s.assignment.course).canvasId,quizId:s.assignment.quizId||s.assignment.canvasId,submission:s.submission,accessCode:s.accessCode});phase4ClearQuizSession(s.assignment);phase4QuizSaveInFlight=false;status.textContent='Canvas confirmed completion. Refreshing coursework…';activeQuizSession=null;if(phase4QuizTimer)clearInterval(phase4QuizTimer);if(phase4QuizResyncTimer)clearInterval(phase4QuizResyncTimer);await syncCanvas({quiet:true});refreshAll();$('#nsQuizBody').innerHTML='<div class="card"><h2>Quiz submitted</h2><p class="small muted mt">Canvas confirmed completion. Your official score will appear when Canvas releases it.</p><button class="btn btn-primary mt" onclick="closeOverlay(\'wsOverlay\')">Return to coursework</button></div>';}
  catch(error){phase4QuizSaveInFlight=false;status.textContent=error.message+' Check Canvas before retrying; NORTHSTAR will not automatically repeat a completion request.';button.disabled=false;$('#phase4SaveQuiz').disabled=false;}
}


async function openCanvasDiscussion(a){
  activeAssignment=a;const c=courseById(a.course),creds=getCredentials(),topicId=a.discussionTopicId||a.canvasId;
  $('#workspace').innerHTML='<div class="ns-assignment-page"><header class="ns-room-header"><button class="ns-room-back" onclick="closeAssignmentRoom()"><span>←</span> Back to coursework</button><div class="ns-room-title"><span class="eyebrow">'+safe(c.code)+' / CANVAS DISCUSSION</span><h1 id="nsDiscussionTitle">'+safe(a.title)+'</h1><p id="nsDiscussionSubhead">Loading the official discussion…</p></div><div class="ns-room-actions"><span class="ns-room-status">Canvas connected</span><button class="btn btn-ghost btn-sm" id="phase4HideAssignment">'+(phase4IsHidden(a)?'Restore':'Hide')+'</button></div></header><div class="ns-room-layout"><section class="ns-room-main"><div class="ns-room-card"><div class="ns-room-card-head"><div><span class="eyebrow">DISCUSSION WORKSPACE</span><h2>Course conversation</h2><p>Read the thread and contribute from inside NORTHSTAR.</p></div></div><div class="ns-room-panel" id="nsDiscussionBody">'+window.NorthstarAssignmentRoom.loadingMarkup(a.title,c.code)+'</div></div></section></div></div>';
  $('#wsOverlay').classList.add('open');
  $('#phase4HideAssignment').onclick=()=>phase4ToggleHidden(a.id);
  if(!creds?.proxy){$('#nsDiscussionBody').innerHTML='<div class="ns-room-loading-error"><h3>Private Canvas bridge required</h3><p>Connect through your private Canvas bridge to read and publish discussion posts from NORTHSTAR.</p></div>';return;}
  try{
    const api=window.NorthstarWorkspace.transport(creds);
    const topic=await api.get('/api/v1/courses/'+Number(c.canvasId)+'/discussion_topics/'+Number(topicId));
    let entries=[];try{const result=await api.get('/api/v1/courses/'+Number(c.canvasId)+'/discussion_topics/'+Number(topicId)+'/entries?per_page=50');entries=Array.isArray(result)?result:result.entries||[];}catch(error){}
    $('#nsDiscussionTitle').textContent=topic.title||a.title;
    $('#nsDiscussionSubhead').textContent=(topic.require_initial_post?'Initial post required · ':'')+(entries.length+' visible discussion thread(s)');
    $('#nsDiscussionBody').innerHTML='<div class="grid2"><div><div class="card"><span class="eyebrow">ASSIGNMENT BRIEF</span><div class="small mt" style="line-height:1.7">'+asText(topic.message||a.desc||'')+'</div><div class="divider"></div><label class="set-lbl" for="phase4DiscussionDraft">Your discussion post</label><textarea class="editor" id="phase4DiscussionDraft" rows="8" placeholder="Write your response…"></textarea><button class="btn btn-primary mt" id="phase4PostDiscussion">Post to Canvas</button><p id="phase4DiscussionStatus" class="small muted mt" role="status">Your draft stays here until you choose Post.</p></div></div><div><div class="card"><span class="eyebrow">DISCUSSION THREADS</span><div id="phase4DiscussionEntries">'+(entries.length?entries.map((e,i)=>'<article class="card mt"><p class="small">'+asText(e.message||'')+'</p><p class="tiny muted mt">'+safe(e.user_name||'Canvas participant')+' · '+(e.created_at?new Date(e.created_at).toLocaleString():'')+'</p><button class="btn btn-ghost btn-sm mt" data-discussion-reply="'+Number(e.id)+'">Reply</button><div id="phase4ReplyBox'+Number(e.id)+'"></div></article>').join(''):'<p class="small muted mt">No visible posts yet, or Canvas requires your initial post before displaying the thread.</p>')+'</div></div></div></div><div class="ns-room-resource-note">Posts and replies are published to Canvas immediately after confirmation.</div>';
    $('#phase4PostDiscussion').onclick=()=>phase4SendDiscussionMessage(a,topicId,null);
    document.querySelectorAll('[data-discussion-reply]').forEach(button=>button.onclick=()=>{const id=Number(button.dataset.discussionReply),box=$('#phase4ReplyBox'+id);box.innerHTML='<textarea class="editor" rows="3" id="phase4ReplyDraft'+id+'" placeholder="Write a reply…"></textarea><button class="btn btn-primary btn-sm mt" id="phase4ReplySend'+id+'">Post reply</button>';$('#phase4ReplySend'+id).onclick=()=>phase4SendDiscussionMessage(a,topicId,id);});
  }catch(error){$('#nsDiscussionBody').innerHTML='<div class="ns-room-loading-error"><h3>Discussion could not be loaded</h3><p>'+safe(error.message)+'</p></div>';}
}
async function phase4SendDiscussionMessage(a,topicId,replyTo){
  const c=courseById(a.course),input=replyTo?$('#phase4ReplyDraft'+replyTo):$('#phase4DiscussionDraft'),status=$('#phase4DiscussionStatus'),message=(input?.value||'').trim();
  if(!message){if(status)status.textContent='Write your response before posting.';return;}
  if(!confirm((replyTo?'Post this reply':'Publish your discussion post')+' to Canvas now?'))return;
  const button=replyTo?$('#phase4ReplySend'+replyTo):$('#phase4PostDiscussion');if(button)button.disabled=true;
  try{const path='/api/v1/courses/'+Number(c.canvasId)+'/discussion_topics/'+Number(topicId)+(replyTo?'/entries/'+Number(replyTo)+'/replies':'/entries');await window.NorthstarWorkspace.transport(getCredentials()).post(path,{message});if(input)input.value='';if(status)status.textContent='Canvas confirmed your post. Refreshing assignment status…';await syncCanvas({quiet:true});refreshAll();if(status)status.textContent='Canvas confirmed your post. Your discussion is published.';toast('Discussion posted to Canvas');}
  catch(error){if(status)status.textContent=error.message;if(button)button.disabled=false;}
}

function phase441StatusLabel(a){const current=statusOf(a);return current==='Awaiting Grading'?'Submitted · Awaiting grading':current;}
function phase441ShowTab(tab){
  document.querySelectorAll('[data-ns-room-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.nsRoomTab===tab));
  document.querySelectorAll('.ns-room-panel[data-ns-room-panel]').forEach(p=>p.hidden=p.dataset.nsRoomPanel!==tab);
}
let phase441ResourceObjectUrl=null;
function phase441ResourceKind(file){
  const type=String(file.contentType||'').toLowerCase(),name=String(file.name||'').toLowerCase();
  if(type.includes('pdf')||name.endsWith('.pdf'))return 'PDF';
  if(type.startsWith('image/')||/\.(png|jpe?g|gif|webp|svg|heic)$/i.test(name))return 'Image';
  if(type.startsWith('video/')||/\.(mp4|m4v|webm|mov)$/i.test(name))return 'Video';
  if(type.startsWith('audio/')||/\.(mp3|m4a|wav|ogg|aac)$/i.test(name))return 'Audio';
  if(type.startsWith('text/')||/\.(txt|csv|md|json|xml|log)$/i.test(name))return 'Text';
  if(name.endsWith('.docx')||type.includes('wordprocessingml'))return 'Word';
  if(name.endsWith('.xlsx')||type.includes('spreadsheetml'))return 'Spreadsheet';
  if(name.endsWith('.pptx')||type.includes('presentationml'))return 'Presentation';
  return 'File';
}
function phase441ReleaseResourceUrl(){if(phase441ResourceObjectUrl){URL.revokeObjectURL(phase441ResourceObjectUrl);phase441ResourceObjectUrl=null;}}
window.addEventListener('northstar:assignment-room-exit',phase441ReleaseResourceUrl);
function phase441DownloadPreparedFile(file,statusNode){
  try{
    const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name||'NORTHSTAR-response';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    if(statusNode)statusNode.textContent='Downloaded '+(file.name||'your edited file')+'. This file has not been submitted to Canvas.';
  }catch(error){if(statusNode)statusNode.textContent='File download failed: '+error.message;}
}
function phase441OfferPreparedFile(file,statusNode){
  const a=activeAssignment;
  if(!a||!(a.submissionTypes||[]).includes('online_upload')){phase441DownloadPreparedFile(file,statusNode);return;}
  const ext=String(file.name||'').split('.').pop().toLowerCase(),allowed=(a.allowedExtensions||[]).map(x=>String(x).replace(/^\\./,'').toLowerCase());
  if(allowed.length&&!allowed.includes(ext)){phase441DownloadPreparedFile(file,statusNode);if(statusNode)statusNode.textContent+=' Canvas does not allow the .'+ext+' extension for this assignment.';return;}
  phase441PreparedFile.set(String(a.id),file);
  const typeSelect=$('#submissionType');if(typeSelect&&[...typeSelect.options].some(option=>option.value==='online_upload')){typeSelect.value='online_upload';typeSelect.onchange();}
  const node=$('#nsSelectedFiles');if(node)node.textContent=[file.name,...Array.from($('#submissionFile')?.files||[]).map(item=>item.name)].join(' · ');
  if(statusNode)statusNode.textContent='Ready to attach: '+file.name+' · '+Math.ceil(file.size/1024)+' KB. Review it in Submit, then confirm the Canvas submission.';
  phase441ShowTab('submit');
}
async function phase441RenderOfficeResource(kind,result,file,stage){
  const bytes=result.bytes.buffer.slice(result.bytes.byteOffset,result.bytes.byteOffset+result.bytes.byteLength);
  if(kind==='Word'){
    const module=await import('https://cdn.jsdelivr.net/npm/mammoth@1.9.0/+esm');
    const mammoth=module.default||module;
    const converted=await mammoth.convertToHtml({arrayBuffer:bytes});
    const safeHtml=window.NorthstarSubmissions.sanitizeRichTextHtml(converted.value||'<p>No readable text was found in this document.</p>');
    const shell=document.createElement('section');shell.className='ns-office-document ns-office-word-shell';
    const toolbar=document.createElement('div');toolbar.className='ns-office-toolbar';
    const importButton=document.createElement('button');importButton.type='button';importButton.className='btn btn-primary btn-sm';importButton.textContent='Use this Word document as my draft';
    const status=document.createElement('p');status.className='ns-office-note';status.setAttribute('role','status');status.textContent='Import the document into Your Work, edit it in NORTHSTAR, then export a Word response if needed.';
    const page=document.createElement('article');page.className='ns-office-document ns-office-word';page.innerHTML=safeHtml;
    importButton.onclick=()=>{
      const editor=$('#assignmentDraft');if(!editor){status.textContent='Open the assignment Work panel before importing this document.';return;}
      const current=(editor.innerText||editor.textContent||'').trim();
      if(current&&!confirm('Replace the current assignment draft with the contents of '+file.name+'? Your current draft is saved locally, but this will replace the editor contents.'))return;
      editor.innerHTML=window.NorthstarSubmissions.sanitizeRichTextHtml(safeHtml);
      editor.dispatchEvent(new Event('input',{bubbles:true}));
      phase441ShowTab('work');
      status.textContent='Word document imported into Your Work. Review and edit it before submitting.';
    };
    if(converted.messages?.length){const note=document.createElement('p');note.className='ns-office-note';note.textContent='Some Word layout elements may not be represented exactly. The original attachment is unchanged.';page.prepend(note);}
    toolbar.append(importButton);shell.append(toolbar,status,page);stage.replaceChildren(shell);return;
  }
  if(kind==='Spreadsheet'){
    const module=await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    const XLSX=module.default?.read?module.default:module;
    const workbook=XLSX.read(bytes,{type:'array',cellDates:true,cellStyles:true});
    if(!workbook.SheetNames?.length)throw Error('The workbook does not contain readable worksheets.');
    const shell=document.createElement('section');shell.className='ns-office-document ns-office-spreadsheet';
    const toolbar=document.createElement('div');toolbar.className='ns-office-toolbar';
    const label=document.createElement('label');label.textContent='Worksheet';
    const select=document.createElement('select');select.className='select';
    workbook.SheetNames.forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);});
    const exportButton=document.createElement('button');exportButton.type='button';exportButton.className='btn btn-primary btn-sm';exportButton.textContent='Prepare edited workbook (.xlsx)';
    const tableWrap=document.createElement('div');tableWrap.className='ns-office-table-wrap';
    const note=document.createElement('p');note.className='ns-office-note';note.textContent='Editable worksheet preview. Only the first 250 rows and 30 columns are shown. Editing a formula cell replaces its formula with the new value. Recalculation, macros, charts and advanced formatting are not reproduced in this editor.';
    const render=()=>{
      tableWrap.textContent='';const sheet=workbook.Sheets[select.value];if(!sheet)return;
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,blankrows:false,defval:''}).slice(0,250);
      const table=document.createElement('table');table.className='ns-office-table';
      rows.forEach((row,rowIndex)=>{const tr=document.createElement('tr');row.slice(0,30).forEach((value,colIndex)=>{const cell=document.createElement(rowIndex===0?'th':'td');cell.textContent=String(value??'');cell.contentEditable='true';cell.spellcheck=false;cell.dataset.row=String(rowIndex);cell.dataset.col=String(colIndex);cell.dataset.original=String(value??'');cell.setAttribute('aria-label','Row '+(rowIndex+1)+', column '+(colIndex+1));tr.append(cell);});table.append(tr);});
      tableWrap.append(table);
      if(rows.length>=250){const cap=document.createElement('p');cap.className='ns-office-note';cap.textContent='Preview limited to the first 250 rows and 30 columns. Other cells remain in the original workbook.';tableWrap.append(cap);}
    };
    exportButton.onclick=async()=>{
      exportButton.disabled=true;note.textContent='Applying cell edits and preparing an .xlsx copy…';
      try{
        const sheet=workbook.Sheets[select.value];
        tableWrap.querySelectorAll('[data-row][data-col]').forEach(cell=>{
          const value=cell.textContent??'',original=cell.dataset.original??'';if(value===original)return;
          const address=XLSX.utils.encode_cell({r:Number(cell.dataset.row),c:Number(cell.dataset.col)}),current=sheet[address]||{t:'s'};
          delete current.f;delete current.F;delete current.D;
          if(current.t==='n'&&value.trim()!==''&&Number.isFinite(Number(value))){current.v=Number(value);current.t='n';}
          else if(current.t==='b'&&/^(true|false)$/i.test(value.trim())){current.v=/^true$/i.test(value.trim());current.t='b';}
          else{current.v=value;current.t='s';}
          sheet[address]=current;cell.dataset.original=value;
        });
        const output=XLSX.write(workbook,{bookType:'xlsx',type:'array',cellStyles:true});
        const blob=new Blob([output],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        const name=(file.name||'NORTHSTAR-workbook.xlsx').replace(/\\.xlsx$/i,'')+'-edited.xlsx';
        const exported=typeof File==='function'?new File([blob],name,{type:blob.type}):blob;if(!exported.name)Object.defineProperty(exported,'name',{value:name});
        phase441OfferPreparedFile(exported,note);
      }catch(error){note.textContent='Could not prepare the edited workbook: '+error.message;}
      finally{exportButton.disabled=false;}
    };
    select.addEventListener('change',render);toolbar.append(label,select,exportButton);shell.append(toolbar,tableWrap,note);stage.replaceChildren(shell);render();return;
  }
  if(kind==='Presentation'){
    const module=await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
    const JSZip=module.default||module;
    const zip=await JSZip.loadAsync(bytes);
    const slideNames=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort((a,b)=>Number(a.match(/slide(\d+)/i)?.[1]||0)-Number(b.match(/slide(\\d+)/i)?.[1]||0));
    if(!slideNames.length)throw Error('No readable slides were found in this presentation.');
    const shell=document.createElement('section');shell.className='ns-office-document ns-office-presentation';
    const toolbar=document.createElement('div');toolbar.className='ns-office-toolbar';
    const exportButton=document.createElement('button');exportButton.type='button';exportButton.className='btn btn-primary btn-sm';exportButton.textContent='Prepare edited PowerPoint (.pptx)';
    const note=document.createElement('p');note.className='ns-office-note';note.textContent='Slide text is editable. Theme, layout, images, audio, animations, SmartArt and embedded media are retained but not edited by NORTHSTAR.';
    const slideRecords=[];
    for(let index=0;index<slideNames.length;index++){
      const xml=await zip.file(slideNames[index]).async('string'),doc=new DOMParser().parseFromString(xml,'application/xml');
      if(doc.querySelector('parsererror'))continue;
      const slide=document.createElement('article');slide.className='ns-office-slide';slide.dataset.slideName=slideNames[index];
      const heading=document.createElement('div');heading.className='ns-office-slide-number';heading.textContent='SLIDE '+(index+1);slide.append(heading);
      const paragraphs=[...doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','p')];
      paragraphs.forEach((paragraph,pIndex)=>{const text=[...paragraph.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','t')].map(node=>node.textContent||'').join('');if(text.trim()){const p=document.createElement('p');p.textContent=text;p.contentEditable='true';p.spellcheck=false;p.dataset.pptxParagraph=String(pIndex);slide.append(p);}});
      if(slide.children.length===1){const empty=document.createElement('p');empty.className='ns-office-note';empty.textContent='No extractable text on this slide. It may contain images or other embedded objects.';slide.append(empty);}
      shell.append(slide);slideRecords.push({name:slideNames[index],xml});
    }
    exportButton.onclick=async()=>{
      exportButton.disabled=true;note.textContent='Applying text edits and preparing a .pptx copy…';
      try{
        for(const record of slideRecords){
          const slide=[...shell.querySelectorAll('[data-slide-name]')].find(node=>node.dataset.slideName===record.name);if(!slide)continue;
          const doc=new DOMParser().parseFromString(record.xml,'application/xml');
          const paragraphs=[...doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','p')];
          slide.querySelectorAll('[data-pptx-paragraph]').forEach(edit=>{
            const target=paragraphs[Number(edit.dataset.pptxParagraph)];if(!target)return;
            const textNodes=[...target.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','t')];
            if(!textNodes.length)return;
            textNodes[0].textContent=edit.textContent||'';textNodes.slice(1).forEach(node=>node.textContent='');
          });
          zip.file(record.name,new XMLSerializer().serializeToString(doc));
        }
        const output=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',compression:'DEFLATE'});
        const name=(file.name||'NORTHSTAR-presentation.pptx').replace(/\\.pptx$/i,'')+'-edited.pptx';
        const exported=typeof File==='function'?new File([output],name,{type:output.type}):output;if(!exported.name)Object.defineProperty(exported,'name',{value:name});
        phase441OfferPreparedFile(exported,note);
      }catch(error){note.textContent='Could not prepare the edited presentation: '+error.message;}
      finally{exportButton.disabled=false;}
    };
    toolbar.append(exportButton);shell.prepend(toolbar);shell.append(note);stage.replaceChildren(shell);return;
  }
  throw Error('No native office renderer is available for this file format.');
}
window.addEventListener('northstar:assignment-room-exit',()=>{if(phase4QuizTimer)clearInterval(phase4QuizTimer);if(phase4QuizResyncTimer)clearInterval(phase4QuizResyncTimer);if(phase4QuizSaveTimer)clearTimeout(phase4QuizSaveTimer);});
async function phase441OpenResource(file,a,c){
  if(!file)return;
  if(phase441ResourceKind(file)==='PDF')return phase441OpenPdf(file,a,c);
  const stage=$('#nsDocumentStage');if(!stage)return;
  phase441ReleaseResourceUrl();
  if(file.size&&file.size>30000000){stage.innerHTML='<div class="ns-room-loading-error"><h3>This file is too large to preview here</h3><p>Files over 30 MB are not downloaded into the workspace. You can continue with the assignment and use the secure source link when available.</p></div>';return;}
  stage.innerHTML='<div class="ns-room-loading"><div class="ns-loading-brand"><span class="ns-loading-orb"></span><span>NORTHSTAR <i>/ RESOURCE CENTER</i></span></div><div class="ns-loading-title"><h1>'+esc(file.name)+'</h1><p>Retrieving this resource through your private Canvas bridge…</p></div><div class="ns-loading-main"><span></span><span></span></div></div>';
  try{
    const result=await window.NorthstarWorkspace.downloadCanvasFile({credentials:getCredentials(),courseId:c.canvasId,fileId:file.id});
    const ext=String(file.name||'').split('.').pop().toLowerCase(),known={txt:'text/plain',csv:'text/csv',md:'text/markdown',json:'application/json',xml:'application/xml',log:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',aac:'audio/aac',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
    const mime=(result.contentType&&result.contentType!=='application/octet-stream'?result.contentType:(known[ext]||'application/octet-stream')).split(';')[0].toLowerCase();
    if(mime==='application/pdf'||String.fromCharCode(...result.bytes.slice(0,5))==='%PDF-')return phase441OpenPdf(file,a,c);
    const officeKind=phase441ResourceKind(file);if(['Word','Spreadsheet','Presentation'].includes(officeKind)){await phase441RenderOfficeResource(officeKind,result,file,stage);return;}
    if(mime.startsWith('text/')||mime==='application/json'||mime==='application/xml'||mime==='application/rtf'){
      const pre=document.createElement('pre');pre.className='ns-resource-text';pre.textContent=new TextDecoder('utf-8',{fatal:false}).decode(result.bytes);stage.replaceChildren(pre);return;
    }
    const blob=new Blob([result.bytes],{type:mime});phase441ResourceObjectUrl=URL.createObjectURL(blob);
    if(mime.startsWith('image/')){const img=document.createElement('img');img.className='ns-resource-image';img.alt=file.name;img.src=phase441ResourceObjectUrl;stage.replaceChildren(img);return;}
    if(mime.startsWith('video/')){const video=document.createElement('video');video.className='ns-resource-player';video.controls=true;video.playsInline=true;video.preload='metadata';video.src=phase441ResourceObjectUrl;stage.replaceChildren(video);return;}
    if(mime.startsWith('audio/')){const audio=document.createElement('audio');audio.className='ns-resource-player';audio.controls=true;audio.preload='metadata';audio.src=phase441ResourceObjectUrl;stage.replaceChildren(audio);return;}
    phase441ReleaseResourceUrl();
    stage.innerHTML='<div class="ns-room-loading-error"><h3>Open with the original document provider</h3><p>'+esc(file.name)+'</p><p class="ns-room-help">NORTHSTAR has not found a safe native renderer for this format. Open the Canvas-hosted document preview through an authenticated Canvas session; your assignment and draft remain open.</p><button class="btn btn-primary mt" type="button" id="nsOpenCanvasDocument">Open Canvas document viewer inside NORTHSTAR</button>'+(file.url?'<p class="ns-room-help mt"><a href="'+esc(file.url)+'" target="_blank" rel="noopener noreferrer">Open the signed source resource separately ↗</a></p>':'')+'</div>';
    const openCanvasDoc=$('#nsOpenCanvasDocument');if(openCanvasDoc)openCanvasDoc.onclick=()=>launchCanvasFileInApp(file,a,c);
  }catch(error){stage.innerHTML='<div class="ns-room-loading-error"><h3>Resource could not be opened</h3><p>'+esc(error.message)+'</p><p class="ns-room-help">The assignment page and your saved draft are still available.</p></div>';}
}
function phase441SubmissionDetailsMarkup(data,assignmentDetails){
  if(!data)return '<p class="ns-room-help">Submission history and instructor feedback were not available from Canvas for this assignment.</p>';
  const history=Array.isArray(data.submission_history)?data.submission_history:[];
  const comments=Array.isArray(data.submission_comments)?data.submission_comments:[];
  const rubric=data.rubric_assessment&&typeof data.rubric_assessment==='object'?data.rubric_assessment:{};
  const criteria=Array.isArray(assignmentDetails?.rubric)?assignmentDetails.rubric:[];
  const historyHtml=history.length?history.slice().sort((a,b)=>Number(b.attempt||0)-Number(a.attempt||0)).map(item=>{
    const score=item.score===null||item.score===undefined?'Not graded':String(item.score)+(assignmentDetails?.points_possible!==undefined?' / '+assignmentDetails.points_possible:'');
    const date=item.submitted_at?new Date(item.submitted_at).toLocaleString():'No submission timestamp';
    return '<article class="ns-submission-attempt"><div><strong>Attempt '+safe(item.attempt||'—')+'</strong><span>'+safe(String(item.workflow_state||'unknown').replace(/_/g,' '))+'</span></div><p>'+safe(date)+'</p><p class="ns-submission-score">'+safe(score)+(item.grade?' · '+safe(item.grade):'')+'</p></article>';
  }).join(''):'<p class="ns-room-help">Canvas has not returned any attempt-history records.</p>';
  const commentHtml=comments.length?comments.map(comment=>'<article class="ns-submission-comment"><p>'+esc(asText(comment.comment||comment.text_comment||'Instructor comment'))+'</p><span>'+esc(comment.author_name||'Canvas instructor')+' · '+esc(comment.created_at?new Date(comment.created_at).toLocaleString():'')+'</span></article>').join(''):'<p class="ns-room-help">No submission comments were returned.</p>';
  const rubricKeys=Object.keys(rubric);
  const rubricHtml=rubricKeys.length?rubricKeys.map(id=>{const row=rubric[id]||{},criterion=criteria.find(item=>String(item.id)===String(id));return '<article class="ns-submission-rubric"><strong>'+esc(criterion?.description||criterion?.long_description||id)+'</strong><span>'+esc(row.points===null||row.points===undefined?'Points not released':row.points)+'</span>'+(row.comments?'<p>'+esc(asText(row.comments))+'</p>':'')+'</article>';}).join(''):'<p class="ns-room-help">No released rubric assessment was returned.</p>';
  return '<div class="ns-submission-feedback"><span class="eyebrow">CANVAS RECORD</span><h4>Submission history</h4>'+historyHtml+'<h4>Instructor feedback</h4>'+commentHtml+'<h4>Rubric assessment</h4>'+rubricHtml+'</div>';
}
function phase441RenderRoom(a,c,details,files,submissionDetails){
  const period=(GRADES&&PERIODS.length)?GRADES.periodForDate(a.due,PERIODS):null;
  const hidden=phase4IsHidden(a);
  $('#workspace').innerHTML='<div class="ns-assignment-page">'+
    '<header class="ns-room-header"><button class="ns-room-back" id="nsRoomBack" type="button"><span>←</span> Back to dashboard</button>'+
    '<div class="ns-room-title"><span class="eyebrow">'+esc(c.code)+' / '+esc(a.type)+(period?' · '+esc(period.name):'')+'</span><h1>'+esc(a.title)+'</h1><div class="ns-room-meta"><span>'+ (a.noDue?'No due date':fmtDate(a.due)+' · '+fmtTime(a.due)) +'</span><span>·</span><span>'+a.points+' points</span><span>·</span><span id="nsRoomStatusText">'+esc(phase441StatusLabel(a))+'</span></div></div>'+
    '<div class="ns-room-actions"><span class="ns-room-status">'+(mode==='live'?'Canvas connected':'Example workspace')+'</span><button class="btn btn-ghost btn-sm" id="phase4HideAssignment">'+(hidden?'Restore':'Hide')+'</button></div></header>'+
    '<div class="ns-room-layout"><section class="ns-room-main">'+
    '<div class="ns-room-card ns-room-document"><div class="ns-room-card-head"><div><span class="eyebrow">DOCUMENT STUDIO</span><h2>Assignment workspace</h2><p>Read, annotate and prepare your work without leaving NORTHSTAR.</p></div><span class="badge">NATIVE WORKSPACE</span></div>'+
    '<div class="ns-room-files" id="nsAssignmentFiles"><span class="small muted">Checking assignment resources…</span></div>'+
    '<div class="ns-room-document-body" id="nsDocumentStage"><div class="ns-room-empty"><div class="ns-room-empty-inner"><div class="ns-room-empty-mark">✦</div><h2>Your workspace is ready</h2><p>Assignment resources will appear here. Write your response in Your Work, or open an attached PDF to read and annotate it.</p></div></div></div>'+
    '<div class="ns-room-resource-note"><strong>Apple Pencil tools:</strong> Pencil, highlighter and eraser strokes accept pen input only. Finger touch is reserved for scrolling and page navigation.</div></div>'+
    '<div class="ns-room-card"><div class="ns-room-card-head"><div><span class="eyebrow">ASSIGNMENT BRIEF</span><h3>Instructions &amp; requirements</h3></div><span class="tiny muted">'+(details?'Loaded from Canvas':'Local assignment details')+'</span></div><div class="ns-room-brief" id="nsAssignmentBrief"><p class="small muted">Loading instructions…</p></div></div>'+
    '</section><aside class="ns-room-sidebar"><div class="ns-room-card"><div class="ns-room-tabs" role="tablist" aria-label="Assignment workspace panels">'+
    '<button type="button" data-ns-room-tab="work" class="is-active">Your Work</button><button type="button" data-ns-room-tab="details">Details</button><button type="button" data-ns-room-tab="submit">Submit</button></div>'+
    '<section class="ns-room-panel" data-ns-room-panel="work"><span class="eyebrow">PRIVATE WORKSPACE</span><h3 style="font:500 22px var(--serif);margin:8px 0 5px">Your draft</h3><p class="ns-room-help" style="margin:0 0 12px">Your writing saves automatically on this device. It is not submitted until you review and send it.</p><label for="assignmentDraft">Response, notes or working draft</label><div class="ns-rich-editor-shell"><div class="ns-rich-editor-toolbar" role="toolbar" aria-label="Writing formatting"><button type="button" data-ns-format="bold" aria-label="Bold"><strong>B</strong></button><button type="button" data-ns-format="italic" aria-label="Italic"><em>I</em></button><button type="button" data-ns-format="underline" aria-label="Underline"><u>U</u></button><span></span><button type="button" data-ns-format="insertUnorderedList" aria-label="Bulleted list">• List</button><button type="button" data-ns-format="insertOrderedList" aria-label="Numbered list">1. List</button><button type="button" data-ns-format="blockquote" aria-label="Quote">Quote</button></div><div id="assignmentDraft" class="ns-rich-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Assignment response editor" data-placeholder="Start writing your response…"></div><div class="ns-rich-editor-footer"><span id="draftStatus" class="ns-room-help">Saved locally, not submitted.</span><span id="draftMetrics" class="ns-room-help">0 words · 0 characters</span></div></div><div class="flex mt" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-ghost btn-sm" id="nsPrepareDocx">Prepare Word document (.docx)</button><span id="nsPrepareDocxStatus" class="ns-room-help" role="status">Export your draft as a Word document, or attach it when Canvas accepts file uploads.</span></div><div class="ns-room-divider"></div><span class="eyebrow">STUDY ASSISTANCE</span><div class="flex mt" style="gap:7px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" type="button" onclick="askAiAboutAssignment(\'explain\')">Explain</button><button class="btn btn-ghost btn-sm" type="button" onclick="askAiAboutAssignment(\'summarize\')">Summarize</button><button class="btn btn-ghost btn-sm" type="button" onclick="askAiAboutAssignment(\'practice\')">Practice</button><button class="btn btn-ghost btn-sm" type="button" onclick="askAiAboutAssignment(\'feedback\')">Draft feedback</button></div><div id="aiOut" class="mt"><p class="small muted">Add a Gemini key in Settings to enable AI study tools.</p></div></section>'+
    '<section class="ns-room-panel" data-ns-room-panel="details" hidden><span class="eyebrow">COURSEWORK DETAILS</span><h3 style="font:500 22px var(--serif);margin:8px 0 14px">Assignment details</h3><label>Course</label><p class="small">'+esc(c.name)+'</p><label style="margin-top:15px">Due date</label><p class="small">'+(a.noDue?'No due date':fmtDate(a.due)+' · '+fmtTime(a.due))+'</p><label style="margin-top:15px">Points possible</label><p class="small">'+a.points+'</p><label style="margin-top:15px">Submission status</label><p class="small">'+esc(statusOf(a))+'</p><label style="margin-top:15px">Submission method</label><p class="small">'+esc((a.submissionTypes||[]).join(', ')||'Not specified')+'</p><div class="ns-room-divider"></div><div id="nsSubmissionHistory">'+phase441SubmissionDetailsMarkup(submissionDetails,details)+'</div><div class="ns-room-divider"></div><p class="ns-room-help">Canvas controls due dates, availability, attempt limits, grading and the official submission record.</p></section>'+
    '<section class="ns-room-panel" data-ns-room-panel="submit" hidden><span class="eyebrow">CANVAS DELIVERY</span><div id="nsRoomSubmission"></div></section></div></aside></div></div>';
  $('#nsRoomBack').onclick=()=>window.closeAssignmentRoom();
  const hideButton=$('#phase4HideAssignment');hideButton.onclick=()=>phase4ToggleHidden(a.id);
  document.querySelectorAll('[data-ns-room-tab]').forEach(button=>button.onclick=()=>phase441ShowTab(button.dataset.nsRoomTab));
  const input=$('#assignmentDraft'),key=phase441ScopedStorageKey('draft_'+a.id);
  input.innerHTML=window.NorthstarSubmissions.sanitizeRichTextHtml(localStorage.getItem(key)||'');
  const updateDraft=()=>{const html=window.NorthstarSubmissions.sanitizeRichTextHtml(input.innerHTML),plain=input.innerText||input.textContent||'';phase441PreparedFile.delete(String(a.id));try{localStorage.setItem(key,html);$('#draftStatus').textContent='Saved on this device · not submitted';}catch{$('#draftStatus').textContent='Could not save on this device.';}const words=plain.trim()?plain.trim().split(/\s+/).length:0,metrics=$('#draftMetrics');if(metrics)metrics.textContent=words+' words · '+plain.length.toLocaleString()+' characters';const wordStatus=$('#nsPrepareDocxStatus');if(wordStatus)wordStatus.textContent='Draft changed. Prepare a fresh Word file before attaching it.';};
  input.addEventListener('input',updateDraft);
  input.addEventListener('paste',event=>{event.preventDefault();const text=event.clipboardData?.getData('text/plain')||'';document.execCommand('insertText',false,text);});
  document.querySelectorAll('[data-ns-format]').forEach(button=>{button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>{input.focus();const action=button.dataset.nsFormat;if(action==='blockquote')document.execCommand('formatBlock',false,'blockquote');else document.execCommand(action,false,null);updateDraft();});});
  updateDraft();
  $('#nsRoomSubmission').innerHTML=submissionPanel(a);
  const reconcileSubmissionButton=$('#nsReconcileSubmission');if(reconcileSubmissionButton)reconcileSubmissionButton.onclick=()=>phase441ReconcileSubmission(a);
  const docxButton=$('#nsPrepareDocx');if(docxButton)docxButton.onclick=async()=>{
    const wordStatus=$('#nsPrepareDocxStatus');docxButton.disabled=true;if(wordStatus)wordStatus.textContent='Preparing your Word document…';
    try{
      if(!window.NorthstarDocumentExport?.createWordDocument)throw Error('The Word document exporter has not loaded. Reload NORTHSTAR and try again.');
      const file=await window.NorthstarDocumentExport.createWordDocument({html:input.innerHTML,title:a.title,filename:(a.title||'northstar-assignment')+'-response.docx'});
      if((a.submissionTypes||[]).includes('online_upload')){
        phase441PreparedFile.set(String(a.id),file);
        if(wordStatus)wordStatus.textContent='Word file ready to attach: '+file.name+' · '+Math.ceil(file.size/1024)+' KB. Choose File upload in Submit to Canvas.';
        const select=$('#submissionType');if(select&&[...select.options].some(option=>option.value==='online_upload')){select.value='online_upload';select.onchange();}
        const fileList=$('#nsSelectedFiles');if(fileList)fileList.textContent=[file.name,...Array.from($('#submissionFile')?.files||[]).map(item=>item.name)].join(' · ');
        phase441ShowTab('submit');
      }else{
        const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        if(wordStatus)wordStatus.textContent='Word document downloaded. This assignment does not accept file uploads; use its supported Canvas submission method.';
      }
    }catch(error){if(wordStatus)wordStatus.textContent='Word export failed: '+error.message;}
    finally{docxButton.disabled=false;}
  };
  const typeSelect=$('#submissionType');if(typeSelect)typeSelect.onchange=()=>{const t=typeSelect.value;if($('#submissionUrlWrap'))$('#submissionUrlWrap').hidden=t!=='online_url';if($('#submissionFileWrap'))$('#submissionFileWrap').hidden=t!=='online_upload';};if(typeSelect)typeSelect.onchange();const filePicker=$('#submissionFile');if(filePicker)filePicker.addEventListener('change',()=>{const files=Array.from(filePicker.files||[]),prepared=phase441PreparedFile.get(String(a.id)),node=$('#nsSelectedFiles');if(node)node.textContent=[...(prepared?[prepared]:[]),...files].map(file=>file.name+' · '+Math.ceil(file.size/1024)+' KB').join('  |  ')||'No files selected.';});
  phase441AnnotatedPdf=null;
  const attachAnnotated=$('#nsUseAnnotatedPdf');if(attachAnnotated)attachAnnotated.onclick=async()=>{try{const file=await window.NorthstarAssignmentRoom.getAnnotatedFile();phase441AnnotatedPdf={assignmentId:a.id,file};const node=$('#nsAnnotatedPdfStatus');if(node)node.textContent='Ready to submit: '+file.name+' · '+Math.ceil(file.size/1024)+' KB. The exported PDF will be uploaded to Canvas instead of the selected file.';if(typeSelect){typeSelect.value='online_upload';typeSelect.onchange();}phase441ShowTab('submit');}catch(error){const node=$('#nsAnnotatedPdfStatus');if(node)node.textContent=error.message;}};

  const brief=$('#nsAssignmentBrief');brief.innerHTML='';if(details?.description&&window.NorthstarAssignmentRoom)brief.append(window.NorthstarAssignmentRoom.sanitizeHtml(details.description,getCredentials()?.base||'https://nnps.instructure.com'));else brief.textContent=a.desc||'No additional instructions were provided.';
  brief.addEventListener('click',event=>{
    const link=event.target.closest('a[data-ns-resource-link]');if(!link)return;
    let target;try{target=new URL(link.href);}catch{return;}
    const origin=getCredentials()?.base;
    if(origin&&target.origin===origin){
      const assignmentMatch=target.pathname.match(/\/courses\/(\d+)\/assignments\/(\d+)/);
      const quizMatch=target.pathname.match(/\/courses\/(\d+)\/quizzes\/(\d+)/);
      const fileMatch=target.pathname.match(/\/files\/(\d+)(?:\/download)?/);
      if(assignmentMatch){const next=ASSIGNMENTS.find(item=>Number(item.canvasId)===Number(assignmentMatch[2])&&Number(courseById(item.course)?.canvasId)===Number(assignmentMatch[1]));if(next){event.preventDefault();openWorkspace(next.id);return;}}
      if(quizMatch){const next=ASSIGNMENTS.find(item=>Number(item.quizId||item.canvasId)===Number(quizMatch[2])&&Number(courseById(item.course)?.canvasId)===Number(quizMatch[1]));if(next){event.preventDefault();openWorkspace(next.id);return;}}
      if(fileMatch){const attached=files.find(item=>Number(item.id)===Number(fileMatch[1]))||{id:Number(fileMatch[1]),name:link.textContent.trim()||'Canvas resource',url:link.href};event.preventDefault();phase441OpenResource(attached,a,c);return;}
    }
    event.preventDefault();if(typeof previewResourceInDashboard==='function')previewResourceInDashboard(target.href,link.textContent.trim()||'Assignment resource');
  });
  const filesNode=$('#nsAssignmentFiles');
  if(!files.length){filesNode.innerHTML='<span class="small muted">No attached files were returned by Canvas.</span>';}
  else{
    filesNode.innerHTML=files.map(file=>'<button class="ns-room-file" type="button" data-ns-file="'+file.id+'" aria-pressed="false"><span class="ns-room-file-icon">'+(phase441ResourceKind(file)==='Image'?'▧':phase441ResourceKind(file)==='Video'?'▷':phase441ResourceKind(file)==='Audio'?'♫':phase441ResourceKind(file)==='Text'?'≡':'▤')+'</span><strong>'+esc(file.name)+'</strong><span class="ns-room-file-kind">'+phase441ResourceKind(file)+'</span></button>').join('');
    filesNode.querySelectorAll('[data-ns-file]').forEach(button=>button.onclick=()=>phase441OpenResource(files.find(f=>String(f.id)===button.dataset.nsFile),a,c));
    const firstPdf=files.find(f=>phase441ResourceKind(f)==='PDF');
    const firstPreview=files.find(f=>phase441ResourceKind(f)!=='File');
    if(firstPdf)phase441OpenPdf(firstPdf,a,c);else if(firstPreview)phase441OpenResource(firstPreview,a,c);
  }
}
async function phase441OpenPdf(file,a,c){
  if(!file)return;phase441ReleaseResourceUrl();
  const stage=$('#nsDocumentStage');if(!stage)return;
  $('#nsAssignmentFiles')?.querySelectorAll('[data-ns-file]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.nsFile===String(file.id)?'true':'false'));
  stage.innerHTML='<div class="ns-room-loading"><div class="ns-loading-brand"><span class="ns-loading-orb"></span><span>NORTHSTAR <i>/ DOCUMENT STUDIO</i></span></div><div class="ns-loading-title"><h1>'+esc(file.name)+'</h1><p>Loading the Canvas document into your workspace…</p></div><div class="ns-loading-main"><span></span><span></span></div></div>';
  const credentials=getCredentials();
  try{await window.NorthstarAssignmentRoom.openPdf(stage,file,{id:a.id,title:a.title,canvasCourseId:c.canvasId},credentials);}
  catch(error){
    const report=window.CanvasDebug?.buildFileDiagnosticReport?window.CanvasDebug.buildFileDiagnosticReport({
      environment:String(location.pathname||'').includes('/preview/')?'preview':'production',
      stage:error.stage||'client',
      code:error.code||'PDF_PREVIEW_FAILED',
      bridgeStatus:error.bridgeStatus||error.status||null,
      upstreamStatus:error.upstreamStatus,
      workerVersion:error.workerVersion||'',
      requestId:error.requestId||'',
      diagnostics:error.diagnostics||{},
      browserDelivery:error.browserDelivery||null,
      assignmentId:a.canvasId||a.id,
      courseId:c.canvasId,
      fileId:file.id,
      fileName:file.name,
      canvasHost:credentials.base,
      bridgeHost:credentials.proxy
    }):'NORTHSTAR Canvas attachment diagnostic\\n'+String(error.message||'PDF preview failed');
    stage.innerHTML='<div class="ns-room-loading-error"><h3>Could not open this document here</h3><p>'+esc(error.message)+'</p><p class="ns-room-help">The diagnostic report contains the failed stage, HTTP statuses and safe request references. It excludes Canvas credentials, signed download links and document contents.</p><div class="flex mt" style="gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary btn-sm" type="button" id="nsCopyFileDiagnostic">Copy diagnostic report</button><span class="ns-room-help" id="nsCopyFileDiagnosticStatus" role="status" aria-live="polite"></span></div><p class="ns-room-help">Your assignment instructions and saved draft remain available.</p></div>';
    const copyButton=$('#nsCopyFileDiagnostic'),copyStatus=$('#nsCopyFileDiagnosticStatus');
    if(copyButton)copyButton.onclick=async()=>{
      if(copyStatus)copyStatus.textContent='Preparing report…';
      try{
        if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(report);
        else{
          const area=document.createElement('textarea');area.value=report;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();
          const copied=document.execCommand('copy');area.remove();if(!copied)throw Error('Clipboard permission unavailable');
        }
        if(copyStatus)copyStatus.textContent='Copied. Paste it into your NORTHSTAR support conversation.';
      }catch{
        if(copyStatus)copyStatus.textContent='Copy was blocked by Safari. Please try again or use the browser share/copy controls.';
      }
    };
  }
}
async function openWorkspace(id,options){
  phase441ReleaseResourceUrl();
  if(phase4QuizTimer)clearInterval(phase4QuizTimer);if(phase4QuizResyncTimer)clearInterval(phase4QuizResyncTimer);if(phase4QuizSaveTimer)clearTimeout(phase4QuizSaveTimer);
  activeQuizSession=null;
  const a=ASSIGNMENTS.find(x=>x.id===id);if(!a)return;
  options=options||{};activeAssignment=a;
  if(window.NorthstarAssignmentRoom)window.NorthstarAssignmentRoom.enter(id,{fromHistory:!!options.fromHistory});
  const c=courseById(a.course);if(!c)return;
  if(mode==='live'&&a.type==='Quiz'){openCanvasQuiz(a);return;}
  if(mode==='live'&&a.type==='Discussion'){openCanvasDiscussion(a);return;}
  a.canvasCourseId=c.canvasId;
  $('#workspace').innerHTML=window.NorthstarAssignmentRoom.loadingMarkup(a.title,c.code);
  let details=null,files=[],submissionDetails=null;
  if(mode==='live'){
    // Fail closed while a fresh Canvas availability/submission record is loading.
    a.canSubmit=false;
    try{
      const creds=getCredentials(),api=window.NorthstarWorkspace.transport(creds);
      details=await api.get('/api/v1/courses/'+Number(c.canvasId)+'/assignments/'+Number(a.canvasId)+'?include%5B%5D=submission&include%5B%5D=can_submit&all_dates=true');
      if(Object.prototype.hasOwnProperty.call(details,'submission'))phase441UnknownSubmissionChecks.delete(String(a.id));
      a.desc=asText(details.description||a.desc||'').slice(0,1600)||a.desc;
      a.submissionTypes=details.submission_types||a.submissionTypes||[];
      a.allowedExtensions=details.allowed_extensions||a.allowedExtensions||[];
      a.canSubmit=details.can_submit===true;
      a.lockedForUser=details.locked_for_user===true;
      a.published=details.published!==false;
      a.lockExplanation=details.lock_explanation||details.lock_info?.asset_string||'';
      a.unlockAt=details.unlock_at||null;
      a.groupAssignment=Number.isInteger(details.group_category_id)&&details.group_category_id>0;
      a.annotatableAttachmentId=details.annotatable_attachment_id||a.annotatableAttachmentId||null;
      if(details.points_possible!==undefined)a.points=numberOrNull(details.points_possible)??a.points;
      if(details.submission){const sub=CANVAS_SYNC.submission(details.submission);Object.assign(a,{status:sub.status,subState:sub.workflowState,progress:sub.submitted?100:a.progress,score:sub.score,grade:sub.grade,missing:sub.missing,late:sub.late,submittedAt:sub.submittedAt,gradedAt:sub.gradedAt,attempt:sub.attempt});}
      files=window.NorthstarAssignmentRoom.collectFiles(details,creds.base);
      try{
        const me=await api.get('/api/v1/users/self'),userId=Number(me?.id);
        if(Number.isSafeInteger(userId)&&userId>0)submissionDetails=await api.get('/api/v1/courses/'+Number(c.canvasId)+'/assignments/'+Number(a.canvasId)+'/submissions/'+userId+'?include%5B%5D=submission_history&include%5B%5D=submission_comments&include%5B%5D=full_rubric_assessment');
      }catch(historyError){syncWarnings.push(c.code+': Submission history or feedback is unavailable: '+historyError.message);}
    }catch(error){syncWarnings.push(c.code+': Assignment detail could not be loaded in the in-app workspace: '+error.message);}
  }
  phase441RenderRoom(a,c,details,files,submissionDetails);
}
window.openWorkspace=openWorkspace;

let submissionBusy=false;let phase441AnnotatedPdf=null;const phase441PendingUploads=new Map();const phase441PreparedFile=new Map();const phase441UnknownSubmissionChecks=new Set();
function phase441ScopedStorageKey(key){return 'northstar_'+(String(location.pathname||'').includes('/preview/')?'preview_':'')+key;}
function phase441FileSignature(file){return [file.name,file.size,file.lastModified||0,file.type||''].join('|');}
async function phase441UploadSelectedFiles(files,a,c,credentials,status){
  const rows=Array.from(files||[]);
  if(!rows.length)throw Error('Choose at least one file.');
  if(rows.length>10)throw Error('Choose no more than 10 files for one submission.');
  const total=rows.reduce((sum,file)=>sum+Number(file.size||0),0);
  if(total>100000000)throw Error('Selected files exceed the 100 MB total upload limit.');
  const allowed=(a.allowedExtensions||[]).map(value=>String(value).replace(/^\./,'').toLowerCase());
  for(const file of rows){
    if(!file.size||file.size>25000000)throw Error(file.name+' is empty or larger than the 25 MB per-file limit.');
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    if(allowed.length&&!allowed.includes(ext))throw Error(file.name+' is not an allowed file type for this Canvas assignment.');
  }
  const staged=phase441PendingUploads.get(String(a.id))||new Map();phase441PendingUploads.set(String(a.id),staged);const result=[];
  for(let index=0;index<rows.length;index++){
    const file=rows[index],key=phase441FileSignature(file);let record=staged.get(key);
    if(!record){
      status.textContent='Uploading '+(index+1)+' of '+rows.length+': '+file.name+'…';
      try{
        const uploaded=await window.NorthstarWorkspace.uploadAssignmentFile({credentials,courseId:c.canvasId,assignmentId:a.canvasId,file});
        record={id:Number(uploaded.id),name:String(uploaded.display_name||uploaded.filename||file.name),size:file.size,type:file.type||'application/octet-stream'};
        if(!Number.isSafeInteger(record.id)||record.id<1)throw Error('Canvas returned an invalid file ID for '+file.name+'.');
        staged.set(key,record);
      }catch(error){error.uploadedFiles=result.slice();error.failedFile=file.name;throw error;}
    }else status.textContent='Reusing the Canvas upload already staged for '+file.name+'…';
    result.push(record);
  }
  return result;
}
async function phase441ReconcileSubmission(a){
  const status=$('#submissionStatus'),button=$('#nsReconcileSubmission'),warning=$('#nsSubmissionUnknown');
  if(!a||!getCredentials()?.proxy){if(status)status.textContent='Connect Canvas through the private bridge before checking submission status.';return;}
  if(button)button.disabled=true;
  if(status)status.textContent='Refreshing the official Canvas assignment and submission record…';
  try{
    const c=courseById(a.course),api=window.NorthstarWorkspace.transport(getCredentials());
    const details=await api.get('/api/v1/courses/'+Number(c.canvasId)+'/assignments/'+Number(a.canvasId)+'?include%5B%5D=submission&include%5B%5D=can_submit&all_dates=true');
    if(!Object.prototype.hasOwnProperty.call(details,'submission'))throw Error('Canvas did not include the current submission record. The previous result remains unconfirmed; do not submit again yet.');
    a.canSubmit=details.can_submit===true;
    a.lockedForUser=details.locked_for_user===true;
    a.published=details.published!==false;
    a.lockExplanation=details.lock_explanation||details.lock_info?.asset_string||'';
    a.unlockAt=details.unlock_at||null;
    a.groupAssignment=Number.isInteger(details.group_category_id)&&details.group_category_id>0;
    if(details.submission){
      const current=CANVAS_SYNC.submission(details.submission);
      Object.assign(a,{status:current.status,subState:current.workflowState,progress:current.submitted?100:a.progress,score:current.score,grade:current.grade,missing:current.missing,late:current.late,submittedAt:current.submittedAt,gradedAt:current.gradedAt,attempt:current.attempt});
    }else{
      Object.assign(a,{status:'Not Started',subState:'unsubmitted',progress:0,score:null,grade:null,missing:false,late:false,submittedAt:null,gradedAt:null,attempt:null});
    }
    phase441UnknownSubmissionChecks.delete(String(a.id));
    await persistCurrentSnapshot();
    refreshAll();
    if(warning)warning.hidden=true;
    if(status)status.textContent='Canvas status refreshed: '+statusOf(a)+(a.attempt?' · attempt '+a.attempt:'')+'. Review the current record before deciding whether a permitted resubmission is needed.';
  }catch(error){
    if(status)status.textContent='Canvas status could not be confirmed: '+error.message+' The submit action remains locked to prevent a duplicate attempt.';
  }finally{
    if(button)button.disabled=false;
    const submit=$('#submitWork');
    if(submit)submit.disabled=phase441UnknownSubmissionChecks.has(String(a.id))||a.canSubmit!==true||a.lockedForUser===true||a.published===false||a.groupAssignment===true;
  }
}
function submissionPanel(a){
  if(mode!=='live') return '';
  const allTypes=Array.isArray(a.submissionTypes)?a.submissionTypes:[],types=allTypes.filter(t=>['online_text_entry','online_url','online_upload'].includes(t));
  const hasNoOnlineSubmission=allTypes.includes('none')||allTypes.includes('on_paper')||allTypes.length===0;
  const availabilityBlocked=a.lockedForUser===true||a.published===false||a.groupAssignment===true||(!hasNoOnlineSubmission&&a.canSubmit!==true);
  const blocked=availabilityBlocked;
  const reason=a.groupAssignment?'This is a group assignment. NORTHSTAR has not verified the group submission identity; use the official Canvas group submission flow.':a.lockedForUser===true||a.published===false||(!hasNoOnlineSubmission&&a.canSubmit===false)?(a.lockExplanation||'Canvas reports that this assignment is locked, unpublished or unavailable for submission.'):'Canvas did not confirm that this assignment is currently open for submission.';
  const lockNote=blocked?'<div class="ns-submission-availability" role="status"><strong>Submission is not available in NORTHSTAR.</strong><p>'+esc(reason)+' Your draft and documents remain available, but NORTHSTAR will not send an unverified submission.</p>'+(a.unlockAt?'<p>Unlocks: '+esc(new Date(a.unlockAt).toLocaleString())+'</p>':'')+'</div>':'';
  const disabled=blocked?' disabled':'';
  if(!types.length){
    if(allTypes.includes('external_tool')||allTypes.includes('basic_lti_launch'))return '<div class="ns-room-submission">'+lockNote+'<h3>Authenticated course tool</h3><p class="small">Canvas generates the official LTI launch. The provider controls its own assessment, identity checks, timer, answers and final submission. NORTHSTAR opens the provider within the workspace when the provider permits embedding; otherwise use the visible external fallback.</p><button class="btn btn-primary mt" type="button"'+disabled+' onclick="launchCanvasExternalTool()">Launch provider inside NORTHSTAR</button><p id="nsExternalToolStatus" class="ns-room-help mt" role="status">No provider launch has been requested.</p></div>';
    if(allTypes.includes('media_recording'))return '<div class="ns-room-submission">'+lockNote+'<h3>Media recording submission</h3><p class="small">The original Canvas assignment opens in NORTHSTAR’s secure content view. Canvas retains control of the recorder and submission.</p><button class="btn btn-primary mt" type="button"'+disabled+' onclick="launchCanvasAssignmentExperience(\'media-recording\')">Open Canvas recorder inside NORTHSTAR</button><p id="nsMediaRecordingStatus" class="ns-room-help mt" role="status">No recorder session has been requested.</p></div>';
    if(allTypes.includes('student_annotation'))return '<div class="ns-room-submission">'+lockNote+'<h3>Canvas DocViewer annotation</h3><p class="small">Canvas owns the official annotation state. NORTHSTAR opens the authenticated Canvas Student Annotation workflow inside the workspace where supported.</p><button class="btn btn-primary mt" type="button"'+disabled+' onclick="launchCanvasAssignmentExperience(\'student-annotation\')">Open Canvas Student Annotation inside NORTHSTAR</button><p id="nsStudentAnnotationStatus" class="ns-room-help mt" role="status">No annotation session has been requested.</p><p class="ns-room-help mt">Stay in Canvas until it confirms submission. An exported PDF is not substituted for native Canvas annotation state.</p></div>';
    if(allTypes.includes('none')||allTypes.includes('on_paper'))return '<div class="ns-room-submission">'+lockNote+'<h3>No online submission configured</h3><p class="small">Canvas identifies this assignment as '+(allTypes.includes('on_paper')?'an in-person or paper submission.':'not requiring an online submission.')+' NORTHSTAR will not invent a submission type or mark this work submitted on your behalf.</p><button class="btn btn-ghost mt" type="button" onclick="launchCanvasAssignmentExperience(\'assignment\')">Review official assignment in Canvas</button></div>';
    return '<div class="ns-room-submission">'+lockNote+'<p class="small muted mt">This assignment requires a provider-specific or unsupported Canvas workflow. NORTHSTAR will not simulate completion.</p><button class="btn btn-ghost mt" type="button" onclick="launchCanvasAssignmentExperience(\'assignment\')">Open official assignment in Canvas</button></div>';
  }
  const accept=(a.allowedExtensions||[]).map(x=>'.'+safe(x)).join(',');
  return `<div class="card mt"><h3>Submit to Canvas</h3><p class="small muted mt">Your submission is sent to Canvas. Resubmissions follow the instructor’s rules and preserve prior attempts. Canvas remains the source of truth for due dates, availability and grading.</p><div class="ns-submission-availability" id="nsSubmissionUnknown" role="alert" hidden><strong>Submission result not yet confirmed</strong><p>Canvas may have received the previous request even though NORTHSTAR did not receive a clear response. Do not submit again until the official record has been refreshed.</p><button class="btn btn-ghost btn-sm mt" type="button" id="nsReconcileSubmission">Refresh Canvas status</button></div>${lockNote}<label class="set-lbl" for="submissionType">Submission type</label><select id="submissionType"${disabled}>${types.map(t=>`<option value="${t}">${t==='online_url'?'Website URL':t==='online_upload'?'File upload':'Formatted text entry'}</option>`).join('')}</select><div id="submissionUrlWrap"><label class="set-lbl" for="submissionUrl">Website URL</label><input id="submissionUrl" type="url" style="width:100%" placeholder="https://…"${disabled}></div><div id="submissionFileWrap" hidden><label class="set-lbl" for="submissionFile">Choose files ${accept?'('+accept+')':''}</label><input id="submissionFile" type="file" multiple accept="${accept}" style="width:100%"${disabled}><p class="tiny muted mt">Up to 10 files · 25 MB per file · 100 MB combined. Files upload to Canvas before the submission is created. An interrupted upload can reuse files already staged in this open tab.</p><div id="nsSelectedFiles" class="ns-selected-files" aria-live="polite">No files selected.</div><button type="button" class="btn btn-ghost btn-sm mt" id="nsUseAnnotatedPdf">Use annotated PDF from Document Studio</button><p class="tiny muted mt" id="nsAnnotatedPdfStatus">Open a PDF and annotate it to attach an exported copy.</p></div><button id="submitWork" class="btn btn-primary mt" onclick="submitAssignment()"${disabled}>${blocked?'Submission unavailable in Canvas':'Review and submit…'}</button><p id="submissionStatus" class="small muted mt" role="status">Nothing sent yet. Confirmation is required.</p></div>`;
}
window.submitAssignment=async function(){
  if(submissionBusy||!activeAssignment) return;
  const a=activeAssignment,c=courseById(a.course),status=$('#submissionStatus'),button=$('#submitWork');
  if(phase441UnknownSubmissionChecks.has(String(a.id))){const warning=$('#nsSubmissionUnknown');if(warning)warning.hidden=false;if(status)status.textContent='Canvas has not confirmed the previous result. Refresh the official Canvas status before submitting again.';if(button)button.disabled=true;return;}
  let submissionRequestStarted=false;
  try{
    const creds=getCredentials();
    if(!creds?.proxy) throw Error('Connect using your private Canvas bridge first. Direct-mode submissions are disabled.');
    if(a.canSubmit!==true||a.lockedForUser===true||a.published===false||a.groupAssignment===true)throw Error('Canvas has not confirmed that this assignment is currently available for individual submission. Your draft is safe; refresh the assignment after checking Canvas.');
    const type=$('#submissionType')?.value;
    if(!(a.submissionTypes||[]).includes(type)) throw Error('Unsupported submission type.');
    const annotated=phase441AnnotatedPdf?.assignmentId===a.id?phase441AnnotatedPdf.file:null;
    const prepared=phase441PreparedFile.get(String(a.id));
    const selectedFiles=type==='online_upload'?[...(prepared?[prepared]:[]),...Array.from($('#submissionFile')?.files||[]),...(annotated?[annotated]:[])]:[];
    if(type==='online_upload'&&!selectedFiles.length)throw Error('Choose at least one file before submitting.');
    if(type==='online_upload'&&selectedFiles.length>10)throw Error('Choose no more than 10 files for this Canvas submission.');
    const editor=$('#assignmentDraft'),draftHtml=editor?.innerHTML||'',draftText=(editor?.innerText||editor?.textContent||'').trim();
    const value=type==='online_url'?$('#submissionUrl').value:draftText;
    let data=type==='online_upload'?null:type==='online_text_entry'?window.NorthstarSubmissions.richTextPayload(draftHtml):window.NorthstarSubmissions.payload(type,value);
    const fileSummary=selectedFiles.map(file=>file.name+' · '+Math.ceil(file.size/1024)+' KB').join('\n');
    const preview=type==='online_upload'?fileSummary:type==='online_url'?data.submission.url:value;
    if(!confirm(`Submit to Canvas?\nCourse: ${c.name}\nAssignment: ${a.title}\nType: ${type}\n\n${preview.slice(0,1500)}${preview.length>1500?'\n… (preview truncated; your entire draft will be sent)':''}\n\nThis may create a new attempt and will not erase earlier submissions. Send now?`)) return;
    submissionBusy=true;button.disabled=true;
    if(type==='online_upload'){
      status.textContent='Preparing '+selectedFiles.length+' file(s) for Canvas… do not close this workspace.';
      const uploaded=await phase441UploadSelectedFiles(selectedFiles,a,c,creds,status);
      data=window.NorthstarSubmissions.payload('online_upload',uploaded.map(item=>item.id));
      status.textContent='All '+uploaded.length+' file(s) uploaded. Sending the assignment submission to Canvas…';
    }else status.textContent='Sending once… do not close this workspace.';
    submissionRequestStarted=true;
    const result=await window.NorthstarSubmissions.send({credentials:creds,courseId:c.canvasId,assignmentId:a.canvasId,data});
    const normalized=CANVAS_SYNC.submission(result);
    Object.assign(a,{
      status:normalized.status,subState:normalized.workflowState,
      progress:normalized.submitted?100:a.progress,
      score:normalized.score,grade:normalized.grade,
      excused:normalized.excused,missing:normalized.missing,late:normalized.late,
      latePolicyStatus:normalized.latePolicyStatus,
      submittedAt:normalized.submittedAt,gradedAt:normalized.gradedAt,
      attempt:normalized.attempt,
      gradeMatchesCurrentSubmission:normalized.gradeMatchesCurrentSubmission
    });
    const snapshotSaved=await persistCurrentSnapshot();
    status.textContent='Canvas confirmed your submission'+(result.attempt?' · attempt '+result.attempt:'')+'. '+(type==='online_upload'?selectedFiles.length+' file(s) attached. ':'')+'Your local draft was kept.'+(snapshotSaved?' Offline coursework snapshot updated.':' Offline snapshot could not be updated; sync Canvas before relying on cached status.');
    phase441PendingUploads.delete(String(a.id));phase441PreparedFile.delete(String(a.id));
    if(phase441AnnotatedPdf?.assignmentId===a.id)phase441AnnotatedPdf=null;
    refreshAll();
  }catch(error){
    const message=String(error?.message||error);
    const uncertain=submissionRequestStarted&&(error?.status>=500||/outcome unknown|response unreadable|no response|not confirmed|could not be confirmed/i.test(message));
    if(uncertain){
      phase441UnknownSubmissionChecks.add(String(a.id));
      const warning=$('#nsSubmissionUnknown');if(warning)warning.hidden=false;
      if(status)status.textContent='Canvas may have received this submission, but NORTHSTAR did not receive a definitive response. Do not submit again until you refresh Canvas status.';
    }else if(status)status.textContent=message+(Array.isArray(error.uploadedFiles)&&error.uploadedFiles.length?' '+error.uploadedFiles.length+' file(s) were already staged in Canvas; they are not submitted yet and are retained for this open tab.':'');
  }
  finally{submissionBusy=false;if(button&&(phase441UnknownSubmissionChecks.has(String(a.id))||a.canSubmit!==true||a.lockedForUser===true||a.published===false||a.groupAssignment===true))button.disabled=true;else if(button)button.disabled=false;}
};
renderNotes = function(){const select=$('#nCourse'), previous=select.value;select.innerHTML='<option value="">All courses</option>'+COURSES.map(c=>`<option value="${c.id}">${c.code}</option>`).join('');select.value=previous; select.onchange=renderNotes;$('#nTag').oninput=renderNotes;const q=$('#nTag').value.toLowerCase();const list=NOTES.filter(n=>(!select.value||n.course===select.value)&&(!q||(n.tags||[]).join(' ').toLowerCase().includes(q)));$('#notesGrid').innerHTML=list.map(n=>{const c=courseById(n.course);return `<button class="card note-card" style="text-align:left" onclick="openNote('${safe(n.id)}')"><span class="eyebrow">${c?c.code:'GENERAL NOTE'}</span><h4 style="margin-top:12px">${esc(n.title)}</h4><p>${esc(n.body.slice(0,140))}</p></button>`;}).join('')||'<p class="muted small">No notes yet. Start a fresh page.</p>';$('#noteLink').innerHTML='<option value="">Link to assignment…</option>'+ASSIGNMENTS.map(a=>`<option value="${a.id}">${esc(a.title)}</option>`).join('');};
openNote = function(id){currentNote=id;const n=NOTES.find(x=>x.id===id);if(!n)return;$('#noteEditor').style.display='block';$('#noteTitleInput').value=n.title;$('#noteMeta').textContent=courseById(n.course)?.code||'Personal note';$('#noteBody').value=n.body;$('#noteLink').value=n.link||'';updateNoteWords();$('#noteEditor').scrollIntoView({behavior:'smooth'});};
newNote = function(){const n={id:'n'+Date.now(),title:'Untitled Note',course:COURSES[0]?.id||'',tags:[],body:'',link:''};NOTES.unshift(n);store.set('northstar_notes_v2',NOTES);renderNotes();openNote(n.id);};
updateNoteWords = function(){const value=$('#noteBody').value;$('#noteWords').textContent=(value.trim()?value.trim().split(/\s+/).length:0)+' words'; const n=NOTES.find(x=>x.id===currentNote);if(n){n.body=value;n.title=$('#noteTitleInput').value.trim()||'Untitled Note';n.link=$('#noteLink').value;$('#noteSaved').textContent=store.set('northstar_notes_v2', NOTES)?'✓ Saved locally':'Could not save';}};
saveNote = function(){updateNoteWords();renderNotes();toast('Note saved locally');};
deleteNote = function(){if(!currentNote)return;if(!confirm('Delete this note from this browser?'))return;NOTES=NOTES.filter(n=>n.id!==currentNote);currentNote=null;store.set('northstar_notes_v2',NOTES);$('#noteEditor').style.display='none';renderNotes();toast('Note deleted');};
$('#noteLink').addEventListener('change',updateNoteWords);
$('#noteTitleInput').addEventListener('input',updateNoteWords);
$('#noteBody').addEventListener('input',()=>updateNoteWords());
renderLab = function(){originalRenderLab();};
rateFlash = function(r){const f=FLASHCARDS[flashIdx];f.mastery=Math.max(0,Math.min(100,f.mastery+(r==='Easy'?12:r==='Good'?6:-10)));toast('Confidence updated for this session');nextFlash();};
copilotReply = function(raw){const q=raw.toLowerCase();const pending=ASSIGNMENTS.filter(a=>!CANVAS_SYNC.isResolved(a.status)).sort((a,b)=>a.due-b.due);if(/due|deadline|today/.test(q))return pending.length?'<b>Up next:</b><br>'+pending.slice(0,5).map(a=>'• '+esc(a.title)+' · '+relDue(a.due)).join('<br>'):'No pending assignments in this view.';if(/plan|week|study/.test(q))return pending.length?'<b>Try a focus sprint for:</b><br>'+pending.slice(0,3).map((a,i)=>(i+1)+'. '+esc(a.title)).join('<br>'):'Your queue is clear. Try a focus sprint in Study Lab.';return 'I’m a simple, rule-based study guide, not an AI model. Ask “what is due?” or “plan my week” for suggestions based on your current assignments.';};
connectCanvas = async function(){
  let creds; try{const base=urlFrom($('#canvasUrl').value);const token=$('#canvasToken').value.trim();const proxy=$('#canvasProxy').value.trim()?urlFrom($('#canvasProxy').value):'';if(!token)throw Error('Enter your Canvas access token.');creds={base,token,proxy};}
  catch(e){resetDebug('');pushEntry('err','Validation failed — nothing was sent: '+e.message);summarizeConnect({kind:'invalid-input',message:e.message});$('#canvasStatus').textContent=e.message;return;}
  const mode=creds.proxy?'bridge':'direct';
  resetDebug(mode);
  pushEntry('info','Attempt #'+debugState.attemptId+' · '+(mode==='bridge'?'bridge mode':'direct mode'));
  pushEntry('info',mode==='bridge'?('Bridge: '+creds.proxy+' — path forwarded as ?path=…; token sent only in the Authorization header'):('Canvas: '+creds.base));
  pushEntry('info','Token: '+creds.token.length+' characters · never displayed, logged, or copied');
  $('#canvasStatus').textContent='Connecting and loading courses…';$('#connectAction').disabled=true;
  try{const syncResult=await pullCanvasExclusive(creds);const remembered=await setCredentials(creds);$('#canvasToken').value=creds.token;pushEntry('ok','Connected — '+COURSES.length+' courses and '+ASSIGNMENTS.length+' assignments loaded · '+syncResult.completeness+' data');summarizeConnect(null);$('#canvasStatus').textContent=`Connected: ${COURSES.length} courses and ${ASSIGNMENTS.length} assignments loaded. ${syncResult.warnings.length?syncResult.warnings.length+' data-quality warning(s); review grade-source labels. ':''}${remembered?'Credentials encrypted and remembered on this device.':'Connection remains active until this page is closed.'}`;toast(syncResult.warnings.length?'Canvas connected with data warnings':'Canvas connected and coursework synced');}
  catch(e){pushEntry('err','Connection failed: '+DBG.redact(String((e&&e.message)||e)));summarizeConnect(e);$('#canvasStatus').textContent=e.message;$('#canvasTroubleshoot').open=true;toast('Canvas connection failed. See the debug console in this menu.');}finally{$('#connectAction').disabled=false;}
};
async function pullCanvasExclusive(creds){
  if(canvasSyncInFlight) throw Error('A Canvas synchronization is already running. Wait for it to finish before starting another.');
  const task=pullCanvas(creds);
  canvasSyncInFlight=task;
  try{return await task;}
  finally{if(canvasSyncInFlight===task)canvasSyncInFlight=null;}
}
async function pullCanvas(creds){
  // Build a complete candidate snapshot off to the side. A failed refresh must never
  // replace the last known-good courses, assignments, or grade metadata.
  const courseQuery='/api/v1/courses?enrollment_state=active&enrollment_type=student&include%5B%5D=total_scores&include%5B%5D=current_grading_period_scores&include%5B%5D=grading_periods';
  const rawCourses=await allPages(creds,courseQuery);
  const courses=convertCourses(rawCourses);
  const assignments=[], nextGroups={}, nextCourseMeta={}, warnings=[];
  for(const c of courses){
    const rows=await allPages(creds,`/api/v1/courses/${c.canvasId}/assignments?include%5B%5D=submission`);
    const converted=convertAssignments(rows,c,creds.base);assignments.push(...converted);
    try{const quizRows=await allPages(creds,`/api/v1/courses/${c.canvasId}/quizzes`);const quizByAssignment=new Map(quizRows.filter(q=>Number.isInteger(q.assignment_id)&&Number.isInteger(q.id)).map(q=>[q.assignment_id,q.id]));converted.forEach(a=>{if(a.type==='Quiz')a.quizId=quizByAssignment.get(a.canvasId)||a.quizId||a.canvasId;});}
    catch(error){if(converted.some(a=>a.type==='Quiz'))warnings.push(`${c.code}: Canvas quiz metadata unavailable; quiz assignments may need to open in Canvas.`);}
    try{const topics=await allPages(creds,`/api/v1/courses/${c.canvasId}/discussion_topics`);const topicByAssignment=new Map(topics.filter(t=>Number.isInteger(t.id)&&Number.isInteger(t.assignment_id||t.assignment?.id)).map(t=>[t.assignment_id||t.assignment.id,t.id]));converted.forEach(a=>{if(a.type==='Discussion')a.discussionTopicId=topicByAssignment.get(a.canvasId)||null;});}
    catch(error){if(converted.some(a=>a.type==='Discussion'))warnings.push(`${c.code}: Discussion topics could not be loaded through the Canvas API.`);}
    try{
      const detail=await canvasPage(creds,`/api/v1/courses/${c.canvasId}`);
      nextCourseMeta[c.id]={weighted:!!detail.apply_assignment_group_weights || !!detail.weighted_assignment_groups, scheme:Array.isArray(detail.grading_standard)?detail.grading_standard:null, dropLowest:Number(detail.drop_lowest)||0, dropHighest:Number(detail.drop_highest)||0};
    }catch(e){
      nextCourseMeta[c.id]={weighted:false,scheme:null,dropLowest:0,dropHighest:0,metadataUnavailable:true};
      warnings.push(`${c.code}: course grading configuration could not be retrieved; computed grade is an estimate.`);
    }
    try{
      const grows=await allPages(creds,`/api/v1/courses/${c.canvasId}/assignment_groups`);
      nextGroups[c.id]=grows.filter(g=>Number.isInteger(g.id)).map(g=>({id:g.id,name:safe(g.name||'Group'),weight:Number(g.group_weight)||0,dropLowest:Number(g.rules?.drop_lowest)||0,dropHighest:Number(g.rules?.drop_highest)||0}));
    }catch(e){
      nextGroups[c.id]=[];
      warnings.push(`${c.code}: assignment-group weights unavailable; NORTHSTAR cannot verify weighted grade calculations for this course.`);
      pushEntry('err','Assignment groups unavailable for '+c.code+' — official Canvas course totals remain separate; local grade estimate may be incomplete.');
    }
    if(c.canvasGrade.currentPercent===null && c.canvasGrade.currentLetter===null && c.canvasGrade.finalPercent===null && c.canvasGrade.finalLetter===null){
      warnings.push(`${c.code}: Canvas did not return official enrollment grade totals (possibly hidden or unavailable).`);
    }
  }
  const syncedAt=new Date().toISOString();
  lastAutoSyncTrigger=Date.now();
  const snapshot={version:2,courses,assignments,groups:nextGroups,courseMeta:nextCourseMeta,lastSyncedAt:syncedAt,snapshotUpdatedAt:syncedAt,warnings,completeness:warnings.length?'partial':'complete'};
  // Commit in-memory state only after all required course and assignment pages succeed.
  COURSES.splice(0,COURSES.length,...courses);
  ASSIGNMENTS=assignments;
  GROUPS=nextGroups;
  COURSE_META=nextCourseMeta;
  syncWarnings=warnings;
  syncCompleteness=snapshot.completeness;
  mode='live';dataFreshness='live';lastCanvasSync=syncedAt;
  if(window.NorthstarVault){
    try{await window.NorthstarVault.set('canvas-snapshot',snapshot);}
    catch(error){pushEntry('err','Canvas is live, but the new offline snapshot could not be saved securely. The previous saved snapshot is retained.');}
  }
  ACTIVITY.splice(0,ACTIVITY.length,{icon:'↻',color:'#a7d9bd',title:'Canvas synced',sub:`${assignments.length} assignments · ${courses.length} courses${warnings.length?' · '+warnings.length+' data warnings':''}`,time:'Just now'});
  if(warnings.length) pushEntry('err','Sync completed with '+warnings.length+' data-quality warning(s). Review the course grade-source indicators.');
  refreshAll();
  return snapshot;
}
async function persistCurrentSnapshot(){
  if(!window.NorthstarVault)return false;
  const snapshot={
    version:2,courses:COURSES,assignments:ASSIGNMENTS,groups:GROUPS,
    courseMeta:COURSE_META,lastSyncedAt:lastCanvasSync,
    snapshotUpdatedAt:new Date().toISOString(),warnings:syncWarnings,
    completeness:syncCompleteness
  };
  try{await window.NorthstarVault.set('canvas-snapshot',snapshot);return true;}
  catch(error){pushEntry('err','Canvas submission was confirmed, but the offline snapshot could not be updated securely.');return false;}
}

/* ---------- exact grade math (via grades.js) ---------- */
function gradeOptsFor(courseId){ const m=COURSE_META[courseId]||{weighted:false,scheme:null,dropLowest:0,dropHighest:0}; return {weighted:m.weighted,scheme:m.scheme,courseDropLowest:m.dropLowest,courseDropHighest:m.dropHighest}; }
function gradeForCourse(courseId){
  if(!GRADES) return {percent:null,letter:null,earned:0,possible:0,pendingPoints:0,groups:[],counts:{graded:0,missing:0,excused:0,pending:0}};
  return GRADES.computeCourseGrade(ASSIGNMENTS.filter(a=>a.course===courseId), GROUPS[courseId]||[], gradeOptsFor(courseId));
}
function fmtPct(p){ return p==null?'—':p.toFixed(1)+'%'; }

/* ---------- marking periods (user-defined; Canvas exposes no API for them) ---------- */
function savePeriods(){ store.set('northstar_periods_v1', PERIODS); }
function addPeriod(){
  const name=($('#periodName')?.value||'').trim(), start=$('#periodStart')?.value, end=$('#periodEnd')?.value;
  if(!name||!start||!end){ toast('Give the period a name and start/end dates.'); return; }
  if(new Date(end)<new Date(start)){ toast('End date must be after the start date.'); return; }
  PERIODS.push({id:'p'+Date.now(), name:name, start:start, end:end});
  PERIODS.sort((a,b)=>new Date(a.start)-new Date(b.start));
  savePeriods(); renderPeriodsManager(); renderLedger(); renderDashboard(); toast('Marking period added: '+name);
}
function deletePeriod(id){ PERIODS=PERIODS.filter(p=>p.id!==id); savePeriods(); renderPeriodsManager(); renderLedger(); renderDashboard(); }
function exportPeriods(){
  const payload={format:'northstar-marking-periods',version:1,exportedAt:new Date().toISOString(),periods:PERIODS};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='northstar-marking-periods-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('Marking-period backup exported');
}
async function importPeriods(input){
  const file=input.files&&input.files[0];if(!file)return;
  try{
    if(file.size>1024*1024)throw Error('Backup file is too large.');
    const data=JSON.parse(await file.text()),rows=Array.isArray(data)?data:data.periods;
    if((data.format&&data.format!=='northstar-marking-periods')||(data.version&&data.version!==1)||!Array.isArray(rows))throw Error('This is not a supported NORTHSTAR marking-period backup.');
    const valid=rows.map((p,i)=>{const name=String(p.name||'').trim(),start=String(p.start||''),end=String(p.end||'');if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||Number.isNaN(Date.parse(start))||Number.isNaN(Date.parse(end))||end<start)throw Error('Invalid marking period at row '+(i+1)+'.');return {id:String(p.id||'p'+Date.now()+'_'+i),name,start,end};});
    if(!confirm(`Import ${valid.length} marking period(s)? Existing periods will be kept; matching names and date ranges will not be duplicated.`))return;
    const seen=new Set(PERIODS.map(p=>p.name.toLowerCase()+'|'+p.start+'|'+p.end));
    valid.forEach(p=>{const key=p.name.toLowerCase()+'|'+p.start+'|'+p.end;if(!seen.has(key)){PERIODS.push(p);seen.add(key);}});
    PERIODS.sort((a,b)=>a.start.localeCompare(b.start));savePeriods();renderPeriodsManager();renderLedger();renderDashboard();toast('Marking periods restored');
  }catch(error){toast('Import failed: '+error.message);}finally{input.value='';}
}
window.exportPeriods=exportPeriods;window.importPeriods=importPeriods;
window.toggleSecretVisibility=function(id,button){const field=document.getElementById(id);if(!field)return;const show=field.type==='password';field.type=show?'text':'password';button.textContent=show?'Hide':'Show';button.setAttribute('aria-label',(show?'Hide':'Show')+' '+(id==='canvasToken'?'Canvas token':'Gemini key'));};
function renderPeriodsManager(){
  const box=$('#periodsManager'); if(!box) return;
  const now=new Date(), cur=GRADES?GRADES.currentPeriod(PERIODS,now):null;
  box.innerHTML = PERIODS.length ? PERIODS.map(p=>{
    const isCur = cur && cur.id===p.id, past = new Date(p.end+'T23:59:59.999') < now;
    return `<div class="period-row"><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="tiny muted">${fmtDate(p.start)} – ${fmtDate(p.end)}</div></div>${isCur?'<span class="badge badge-green">CURRENT</span>':past?'<span class="badge badge-violet">ARCHIVED</span>':''}<button class="btn btn-ghost btn-sm" onclick="deletePeriod('${p.id}')">Delete</button></div>`;
  }).join('') : '<p class="small muted">No marking periods yet. Add your school’s periods above — assignments will be organized by them, and old periods archive automatically.</p>';
}

/* ---------- AI study tools (Gemini free tier, optional encrypted device key) ---------- */
function getAiKey(){ return persistentAiKey || ''; }
async function setAiKey(k){
  persistentAiKey = k || ''; aiKeyRemembered = !!$('#rememberGemini')?.checked;
  if (aiKeyRemembered && persistentAiKey && window.NorthstarVault) { await window.NorthstarVault.set('gemini-api-key', persistentAiKey); return true; }
  if (window.NorthstarVault) await window.NorthstarVault.remove('gemini-api-key').catch(()=>{});
  return false;
}
function getAiModel(){ return store.get('northstar_gemini_model_v1', AI?AI.DEFAULT_MODEL:'gemini-2.0-flash'); }
function setAiModel(m){ store.set('northstar_gemini_model_v1', m || (AI?AI.DEFAULT_MODEL:'gemini-2.0-flash')); }
function aiContext(){
  const lines=COURSES.map(c=>{ const g=gradeForCourse(c.id); return `${c.code} ${c.name}: ${g.percent==null?'no grade yet':g.percent.toFixed(1)+'%'+(g.letter?' ('+g.letter+')':'')} · ${g.counts.pending} pending`; });
  const pend=ASSIGNMENTS.filter(a=>!CANVAS_SYNC.isResolved(a.status)).sort((a,b)=>a.due-b.due).slice(0,12)
    .map(a=>`- ${a.title} (${courseById(a.course)?.code||''}) due ${a.noDue?'no date':fmtDate(a.due)} [${statusOf(a)}]`).join('\n');
  return `My courses and current grades:\n${lines.join('\n')}\n\nMy upcoming work:\n${pend||'none'}`;
}
const AI_SYSTEM='You are NORTHSTAR, a study assistant inside a student dashboard. Help the student understand concepts, plan study time, summarize material, and generate practice questions. Teach and guide — do not complete assignments or answer quiz/exam questions for them. Be concise, practical, and encouraging.';
async function aiAsk(prompt, system){
  if(!AI) throw new Error('AI module not loaded.');
  return AI.generate(prompt, {key:getAiKey(), model:getAiModel(), system:system||AI_SYSTEM});
}
const ruleCopilotReply = copilotReply;
sendChat = async function(){
  const inp=$('#chatInput'); const v=inp.value.trim(); if(!v) return;
  addMsg('user', esc(v)); inp.value='';
  if(getAiKey()){
    addMsg('ai','<span class="muted">✧ Thinking…</span>');
    try{
      const reply=await aiAsk(aiContext()+'\n\nMy question: '+v);
      const box=$('#chatBox'), last=box.lastElementChild; if(last) last.remove();
      addMsg('ai', esc(reply).replace(/\n/g,'<br>'));
    }catch(e){
      const box=$('#chatBox'), last=box.lastElementChild; if(last) last.remove();
      addMsg('ai', '<span style="color:#fda4af">AI error: '+esc(e.message)+'</span><br><span class="muted">Built-in guide:</span><br>'+ruleCopilotReply(v));
    }
  } else {
    setTimeout(()=>addMsg('ai', ruleCopilotReply(v)), 350);
  }
};
quickChat = async function(q){ const inp=$('#chatInput'); if(inp) inp.value=q; sendChat(); };
async function askAiAboutAssignment(action){
  const a=activeAssignment; if(!a) return;
  const out=$('#aiOut'); if(!out) return;
  if(!getAiKey()){ out.innerHTML='<p class="small muted">Add a free Gemini key in Settings to use AI tools.</p>'; return; }
  const c=courseById(a.course);
  const brief=(a.desc||'')+'\n\nRubric: '+((a.rubric&&a.rubric.length)?a.rubric.join('; '):'none provided');
  let prompt='';
  if(action==='explain') prompt=`Explain this assignment to me like a tutor. What is it asking, what are the key concepts, and what is a good approach? Do not do the work for me.\n\nCourse: ${c?c.code+' '+c.name:''}\nAssignment: ${a.title}\n${brief}`;
  else if(action==='summarize') prompt=`Summarize this assignment brief in a few bullet points: what to do, the deliverable, and any constraints.\n\n${a.title}\n${brief}`;
  else if(action==='practice') prompt=`Create 3 practice questions to help me prepare for this assignment. Give the questions first; I will ask for answers.\n\n${a.title}\n${brief}`;
  else if(action==='feedback'){ const draft=(($('#assignmentDraft')?.innerText||$('#assignmentDraft')?.textContent)||'').trim(); prompt=`Give me feedback on my draft for this assignment. Focus on structure, clarity, and rubric alignment. Do not rewrite it for me.\n\nAssignment: ${a.title}\nRubric: ${(a.rubric||[]).join('; ')}\n\nMy draft:\n${draft||'(no draft yet)'}`; }
  out.innerHTML='<p class="small muted">✧ Thinking…</p>';
  try{ const r=await aiAsk(prompt); out.innerHTML='<div class="ai-response">'+esc(r).replace(/\n/g,'<br>')+'</div>'; }
  catch(e){ out.innerHTML='<p class="small" style="color:#fda4af">AI error: '+esc(e.message)+'</p>'; }
}
async function saveAiSettings(){
  const k=($('#geminiKey')?.value||'').trim(), m=($('#geminiModel')?.value||'').trim();
  try { const remembered=await setAiKey(k); if(m) setAiModel(m);
    const st=$('#aiStatus'); if(st) st.textContent = k ? (remembered?'Gemini key encrypted and remembered on this device.':'Gemini key active until this page is closed.') : 'No Gemini key set — the built-in guide is active.';
    toast(k?'Gemini key saved':'Gemini key cleared');
  } catch(error) { const st=$('#aiStatus'); if(st) st.textContent='Could not save securely: '+error.message; toast('Secure key storage failed'); }
}
async function testAiKey(){
  const st=$('#aiStatus'); if(st) st.textContent='Testing key…';
  try{ await aiAsk('Reply with exactly: ok'); if(st) st.textContent='✓ Key works — Gemini is connected.'; toast('Gemini connected'); }
  catch(e){ if(st) st.textContent='✗ '+e.message; }
}

function ensureViewerExternalLink(url,label){
  let link=$('#viewerExternalLink');
  if(!link){
    link=document.createElement('a');
    link.id='viewerExternalLink';
    link.className='btn btn-ghost btn-sm';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.referrerPolicy='no-referrer';
    $('#viewerOverlay .ws-head').insertBefore(link,$('#viewerOverlay .ws-head .ws-close'));
  }
  link.href=url;
  link.textContent=label||'Open externally ↗';
  link.hidden=false;
  link.style.display='';
  link.setAttribute('aria-label',link.textContent.replace(/\s*↗$/,''));
  return link;
}
function openCanvasExperienceInApp(url,title,note){
  let target;
  try{target=new URL(url);}catch{throw Error('Canvas returned an invalid secure experience URL.');}
  if(target.protocol!=='https:'||target.username||target.password)throw Error('Secure Canvas experiences must use HTTPS and cannot contain embedded credentials.');
  const nativeBridge=window.webkit?.messageHandlers?.northstarSecureContent;
  if(nativeBridge&&typeof nativeBridge.postMessage==='function'){
    closeViewer();
    nativeBridge.postMessage({action:'open',url:target.href,title:String(title||'Canvas experience').slice(0,160)});
    return 'native';
  }
  const frame=$('#viewerFrame'),overlay=$('#viewerOverlay'),heading=$('#viewerOverlay .ws-head h2'),noteNode=$('#viewerNote');
  if(!frame||!overlay)throw Error('The NORTHSTAR secure content view is unavailable.');
  if(heading)heading.textContent=title||'Canvas experience';
  if(noteNode)noteNode.textContent=(note||'Canvas is opening its official authenticated experience inside NORTHSTAR.')+' This browser preview may be blocked by Canvas/provider framing rules or cross-site cookie restrictions. Use the in-app native WKWebView host where installed, or the explicit external fallback if the provider refuses embedding.';
  frame.referrerPolicy='no-referrer';
  frame.src=target.href;
  ensureViewerExternalLink(target.href,'Open in a separate browser tab ↗');
  overlay.classList.add('open');
  return 'embedded';
}
async function launchCanvasAssignmentExperience(kind){
  const a=activeAssignment;
  if(!a)return;
  const c=courseById(a.course);
  if(!c?.canvasId||!a.canvasId)return;
  const status=kind==='new-quiz'?$('#nsNewQuizLaunchStatus'):kind==='student-annotation'?$('#nsStudentAnnotationStatus'):kind==='media-recording'?$('#nsMediaRecordingStatus'):$('#submissionStatus');
  if(status)status.textContent='Requesting a short-lived authenticated Canvas browser session…';
  try{
    const returnTo='/courses/'+Number(c.canvasId)+'/assignments/'+Number(a.canvasId);
    const session=await window.NorthstarWorkspace.getCanvasSessionUrl({credentials:getCredentials(),returnTo});
    const title=kind==='student-annotation'?'Canvas Student Annotation · '+a.title:kind==='new-quiz'?'New Quizzes · '+a.title:kind==='media-recording'?'Canvas Media Recorder · '+a.title:a.title;
    const note=kind==='student-annotation'
      ?'Canvas has opened the original assignment. In that page, choose Start Assignment, then Student Annotation. Canvas—not NORTHSTAR—owns the official annotation state and submission confirmation.'
      :'Canvas has issued a short-lived session URL. The official Canvas assignment page/player will handle this workflow and its submission state.';
    const host=openCanvasExperienceInApp(session.sessionUrl,title,note);
    if(status)status.textContent=host==='native'?'Canvas opened in NORTHSTAR’s secure native web view.':'Canvas opened in the embedded NORTHSTAR preview. If the page is blank or repeatedly asks you to sign in, use the visible browser fallback or the native WKWebView host.';
  }catch(error){
    if(status)status.textContent='Could not start the authenticated Canvas session: '+error.message;
    toast('Canvas session could not be opened.');
  }
}
async function launchCanvasExternalTool(){
  const a=activeAssignment;
  if(!a)return;
  const c=courseById(a.course),status=$('#nsExternalToolStatus');
  if(status)status.textContent='Asking Canvas to generate the assignment-specific LTI assessment launch…';
  try{
    const launch=await window.NorthstarWorkspace.getExternalToolLaunch({credentials:getCredentials(),courseId:c.canvasId,assignmentId:a.canvasId});
    const host=openCanvasExperienceInApp(launch.url,launch.name||('Course tool · '+a.title),'This is a Canvas-generated sessionless LTI assessment launch. The provider owns its assessment, identity checks, timer, answers and final submission.');
    if(status)status.textContent=host==='native'?'Provider launched in NORTHSTAR’s secure native web view.':'Provider opened in the embedded preview. If it blocks framing, use the visible browser fallback or the native WKWebView host.';
  }catch(error){
    if(status)status.textContent='Canvas could not create the external-tool launch: '+error.message;
    toast('External tool launch failed.');
  }
}
async function launchCanvasFileInApp(file,a,c){
  if(!file?.id||!a||!c?.canvasId)return;
  try{
    const session=await window.NorthstarWorkspace.getCanvasSessionUrl({credentials:getCredentials(),returnTo:'/courses/'+Number(c.canvasId)+'/files/'+Number(file.id)});
    openCanvasExperienceInApp(session.sessionUrl,file.name||'Canvas document','Canvas is opening its own authenticated document preview.');
  }catch(error){toast('Canvas document preview failed: '+error.message);}
}
window.launchCanvasAssignmentExperience=launchCanvasAssignmentExperience;
window.launchCanvasExternalTool=launchCanvasExternalTool;
function previewResourceInDashboard(url,title){
  let target;
  try{target=new URL(url);}catch{toast('This resource does not have a valid link.');return;}
  if(target.protocol!=='https:'||target.username||target.password){
    toast('Only secure HTTPS resources without embedded credentials can be previewed.');
    return;
  }
  const frame=$('#viewerFrame'),overlay=$('#viewerOverlay'),heading=$('#viewerOverlay .ws-head h2'),note=$('#viewerNote');
  if(!frame||!overlay)return;
  if(heading)heading.textContent=title||'Assignment resource';
  if(note)note.textContent='NORTHSTAR is attempting an in-dashboard preview. Some course and publisher sites block embedding; use the visible external fallback only when the embedded view cannot load.';
  frame.referrerPolicy='no-referrer';
  frame.src=target.href;
  ensureViewerExternalLink(target.href,'Open externally ↗');
  overlay.classList.add('open');
}
function openInDashboard(url){
  let target;
  try{target=new URL(url);}catch{toast('This assignment does not have a valid external link.');return;}
  if(target.protocol!=='https:'||target.username||target.password){
    toast('Only secure HTTPS assignment links can be opened.');
    return;
  }
  previewResourceInDashboard(target.href,'Assignment resource');
}
function closeViewer(){
  const overlay=$('#viewerOverlay');
  if(overlay)overlay.classList.remove('open');
  const frame=$('#viewerFrame');
  if(frame){frame.src='about:blank';frame.referrerPolicy='no-referrer';}
  const link=$('#viewerExternalLink');
  if(link){link.removeAttribute('href');link.hidden=true;link.style.display='none';}
}
// Expose handlers that index.html calls via onclick (premium.js is an IIFE).
window.addPeriod = addPeriod;
window.deletePeriod = deletePeriod;
window.saveAiSettings = saveAiSettings;
window.testAiKey = testAiKey;
window.askAiAboutAssignment = askAiAboutAssignment;
window.openInDashboard = openInDashboard;
window.previewResourceInDashboard = previewResourceInDashboard;
window.closeViewer = closeViewer;

syncCanvas = async function(options={}){
  const quiet=!!options.quiet, c=getCredentials();
  if(!c){if(!quiet){openConnect();toast('Connect Canvas first.');}return;}
  if(canvasSyncInFlight){if(!quiet)toast('Canvas is already synchronizing. Please wait.');return;}
  const syncMode=c.proxy?'bridge':'direct';resetDebug(syncMode);
  pushEntry('info','Sync · '+(syncMode==='bridge'?'bridge mode':'direct mode'));
  pushEntry('info',syncMode==='bridge'?('Bridge: '+c.proxy):('Canvas: '+c.base));
  pushEntry('info','Token: '+c.token.length+' characters · never displayed, logged, or copied');
  if(!quiet)toast('Syncing Canvas…');
  try{const result=await pullCanvasExclusive(c);pushEntry('ok','Sync complete — '+COURSES.length+' courses, '+ASSIGNMENTS.length+' assignments · '+result.completeness+' data');summarizeConnect(null);if(!quiet)toast(result.warnings.length?'Canvas synced with '+result.warnings.length+' data warning(s)':'Canvas sync complete');}
  catch(e){pushEntry('err','Sync failed: '+DBG.redact(String((e&&e.message)||e)));summarizeConnect(e);$('#canvasStatus').textContent=e.message;if(!quiet){$('#canvasTroubleshoot').open=true;openConnect();toast('Canvas sync failed. See the debug console.');}else toast('Canvas refresh failed. Your last saved coursework is still available.');}
};
window.disconnectCanvas = async function(){
  // Disconnect removes the credential, not the student's academic history.
  // Keep the last successful snapshot available as read-only offline data.
  persistentCredentials=null;
  if(window.NorthstarVault) await window.NorthstarVault.remove('canvas-credentials').catch(()=>{});
  try{sessionStorage.removeItem('northstar_canvas_session');}catch{}
  $('#canvasToken').value='';
  if(debugState.attemptId)pushEntry('info','Disconnected — saved credential cleared; last successful Canvas snapshot retained');
  dbgSetDot('idle');dbgHeader('disconnected');
  if(mode==='live'){
    dataFreshness='cached';
    $('#canvasStatus').textContent='Disconnected. Your last successful Canvas snapshot remains available offline. Reconnect to refresh it.';
  }else{
    mode='demo';dataFreshness='demo';lastCanvasSync=null;
    COURSES.splice(0,COURSES.length,...structuredClone(DEMO_COURSES));
    ASSIGNMENTS=structuredClone(DEMO_ASSIGNMENTS);
    $('#canvasStatus').textContent='Disconnected. Sample data is shown. Your local notes and settings remain on this device.';
  }
  refreshAll();
};
function refreshAll(){statusFilter='All';renderDashboard();initLedger();renderCourses();renderNotes();renderLab();renderAutopilot();}
// Keep demo-only metrics and rule-based assistant behavior clearly labeled.
$('#syncLabel').textContent='Demo workspace · not synced';
$('.side-user-meta .tiny').textContent='Your academic space';
$('#view-lab .grid3').insertAdjacentHTML('beforebegin','<p class="small muted mt">The charts and flashcards below are examples, not analytics from your school.</p>');
$('#view-copilot .section-title p').textContent='Powered by Google Gemini when a key is set (Settings); otherwise a built-in guide.';
$('#view-copilot .chat-box').innerHTML='';addMsg('ai','<b>Welcome to your study guide.</b><br>Ask what is due or request a simple study plan. This guide uses templates, not an AI model.');
$('#view-ledger .card-head p').textContent='Computed from synced scores and category weights; missing work counts as zero. Projections assume the selected average on pending work. GPA is an unweighted estimate, not an official transcript.';
$('#projGpa').parentElement.nextElementSibling.querySelector('.mono').textContent='Estimate';
$('#hsGpa').title='Illustrative demo projection only';
$('#canvasStatus').textContent=hadOldToken?'An earlier version stored your token in plain text and may have sent it to a third-party proxy. Consider revoking it in Canvas and creating a new token.':'Demo mode: sample coursework is shown until you connect.';
await hydrateSavedSecrets();
if(window.NorthstarVault){
  try{const cached=await window.NorthstarVault.get('canvas-snapshot',null);if(cached&&[1,2].includes(cached.version)&&Array.isArray(cached.courses)&&Array.isArray(cached.assignments)){COURSES.splice(0,COURSES.length,...cached.courses);ASSIGNMENTS=cached.assignments;GROUPS=cached.groups||{};COURSE_META=cached.courseMeta||{};syncWarnings=Array.isArray(cached.warnings)?cached.warnings:[];syncCompleteness=cached.completeness||(cached.version===1?'unknown':'complete');mode='live';dataFreshness='cached';lastCanvasSync=cached.lastSyncedAt||null;refreshAll();}}catch(error){console.warn('Could not restore the last Canvas snapshot:',error);}
}
const existing=getCredentials();if(existing){$('#canvasUrl').value=existing.base;$('#canvasProxy').value=existing.proxy||'';$('#canvasToken').value=existing.token||'';$('#canvasStatus').textContent=credentialsRemembered?'Saved encrypted connection found. Synchronizing Canvas…':'Session connection found. Tap Sync Canvas to load your coursework.';}
// Refresh stale coursework when Safari returns to the foreground or connectivity returns.
// This is event-driven (not a background polling loop) and rate-limited to protect Canvas.
function maybeRefreshCanvas(force=false){
  if(document.visibilityState!=='visible'||!getCredentials()||canvasSyncInFlight)return;
  const now=Date.now(),last=lastCanvasSync?Date.parse(lastCanvasSync):0;
  if(!force&&last&&now-last<5*60*1000)return;
  if(now-lastAutoSyncTrigger<60*1000)return;
  lastAutoSyncTrigger=now;
  syncCanvas({quiet:true});
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')maybeRefreshCanvas(false);});
window.addEventListener('online',()=>maybeRefreshCanvas(true));
bootstrapDebug();
renderPeriodsManager();
if($('#geminiKey')) $('#geminiKey').value=getAiKey();
if($('#rememberCanvas')) $('#rememberCanvas').checked=credentialsRemembered || !existing;
if($('#rememberGemini')) $('#rememberGemini').checked=aiKeyRemembered || !persistentAiKey;
if($('#geminiModel')) $('#geminiModel').value=getAiModel();
if($('#aiStatus')) $('#aiStatus').textContent=getAiKey()?(aiKeyRemembered?'Gemini key encrypted and remembered on this device.':'Gemini key available for this session.'):'No Gemini key set — the built-in guide is active.';
refreshAll();
if(existing) syncCanvas();
/* ================= NORTHSTAR 0.4.3 · PHASE 3 ACADEMIC INTELLIGENCE =================
   StudentVUE grade imports remain clearly labeled as imports until an authorized
   district integration is supplied. The dashboard scope is always the active period. */
function northstarReleaseLabel(){
  const manifestVersion=window.NorthstarRelease?.manifest?.northstarVersion;
  const visibleVersion=(document.getElementById('versionPill')?.textContent||'').match(/\d+\.\d+\.\d+\.\d+/)?.[0];
  const version=manifestVersion||visibleVersion||'unknown';
  return 'NORTHSTAR / '+version;
}
const PHASE3_IGNORES_KEY = 'northstar_ignored_courses_v1';
let phase3IgnoredCourses = new Set(store.get(PHASE3_IGNORES_KEY, []));
let phase3StudentVue = null;
let phase3PeriodSelection = store.get('northstar_ledger_period_v1', 'current');

function phase3CurrentPeriod() {
  return GRADES && PERIODS.length ? GRADES.currentPeriod(PERIODS, new Date()) : null;
}
function phase3CourseIgnored(courseOrId) {
  const id = typeof courseOrId === 'string' ? courseOrId : courseOrId && courseOrId.id;
  return !!id && phase3IgnoredCourses.has(id);
}
function phase3ActiveCourses() { return COURSES.filter(c => !phase3CourseIgnored(c)); }
function phase3IsPublished(a) { return a.assignmentPublished !== false && a.published !== false && a.lockedForUser !== true; }
function phase3PeriodFor(a) {
  if (!a || a.noDue || !a.due || !GRADES) return null;
  return GRADES.periodForDate(a.due, PERIODS);
}
function phase3PeriodIdFor(a) { const p=phase3PeriodFor(a); return p ? p.id : null; }
function phase3VisibleAssignments(selection) {
  const chosen = selection || phase3PeriodSelection || 'current';
  let rows = ASSIGNMENTS.filter(a => phase3IsPublished(a) && !phase3CourseIgnored(a.course) && !!courseById(a.course) && !phase4IsHidden(a));
  if (chosen === 'all') return rows;
  if (chosen === 'current') {
    const current = phase3CurrentPeriod();
    if (current) return rows.filter(a => phase3PeriodIdFor(a) === current.id);
    const start = new Date(); start.setHours(0,0,0,0);
    // Without a configured current period, avoid letting old, unbucketed historical
    // assignments dominate. Keep today's and future dated work visible.
    return rows.filter(a => !a.noDue && new Date(a.due).getTime() >= start.getTime());
  }
  return rows.filter(a => phase3PeriodIdFor(a) === chosen);
}
function phase3OpenAssignments(selection) {
  return phase3VisibleAssignments(selection).filter(a => !CANVAS_SYNC.isResolved(a.status) && a.status !== 'Excused');
}
function phase3StudentVueFor(course) {
  if (!window.NorthstarStudentVue || !phase3StudentVue) return null;
  const period = phase3CurrentPeriod();
  return window.NorthstarStudentVue.forCourse(course, period ? period.name : null, phase3StudentVue);
}
function phase3GradeFor(course) {
  const imported = phase3StudentVueFor(course);
  if (imported) return {value: imported.display || 'N/A', source: 'StudentVUE import', record: imported};
  const official = course.canvasGrade || {};
  if (official.currentPercent !== null && official.currentPercent !== undefined || official.currentLetter) {
    const pct = official.currentPercent == null ? null : Number(official.currentPercent);
    const value = official.currentLetter && pct !== null ? official.currentLetter+' · '+pct.toFixed(1)+'%' : (official.currentLetter || pct.toFixed(1)+'%');
    return {value, source: 'Canvas official current grade', record: null};
  }
  const estimate = gradeForCourse(course.id);
  if (estimate.percent != null) return {value: estimate.percent.toFixed(1)+'%'+(estimate.letter?' · '+estimate.letter:''), source: 'NORTHSTAR assignment estimate', record: null};
  return {value: 'N/A', source: 'Grade unavailable', record: null};
}
function phase3RelativeSubmission(a) {
  const stamp = a.status === 'Completed' && a.gradedAt ? a.gradedAt : a.submittedAt;
  if (!stamp) return a.status === 'Completed' ? 'Graded' : a.status === 'Excused' ? 'Excused' : a.status;
  const date = new Date(stamp);
  if (!Number.isFinite(date.getTime())) return a.status === 'Completed' ? 'Graded' : 'Submitted';
  const days = Math.floor((Date.now()-date.getTime())/86400000);
  const when = days <= 0 ? 'today' : days === 1 ? '1 day ago' : days+' days ago';
  return (a.status === 'Completed' ? 'Graded' : 'Submitted')+' '+when+(a.late?' · submitted late':'');
}
function phase3DateMeta(a) {
  if (CANVAS_SYNC.isResolved(a.status)) return phase3RelativeSubmission(a);
  if (a.status === 'Missing') return a.noDue ? 'Missing' : 'Missing · due '+fmtDate(a.due);
  if (a.noDue) return 'No due date';
  return relDue(a.due);
}
statusOf = function(a) {
  if (!a) return 'Unknown';
  if (a.status === 'Excused' || a.excused) return 'Excused';
  if (CANVAS_SYNC.isResolved(a.status)) return a.status;
  if (a.status === 'Missing' || a.missing) return 'Missing';
  if (a.noDue) return a.status || 'Not Started';
  const due = new Date(a.due), now = new Date();
  if (!Number.isFinite(due.getTime())) return a.status || 'Not Started';
  if (due < now) return 'Overdue';
  if (due.toDateString() === now.toDateString()) return 'Due Today';
  return a.status || 'Upcoming';
};
fmtPct = p => p == null || !Number.isFinite(Number(p)) ? 'N/A' : Number(p).toFixed(1)+'%';
relDue = d => {
  const date=new Date(d); if(!Number.isFinite(date.getTime()) || date.getFullYear()>=2999)return 'No due date';
  const today=new Date();today.setHours(0,0,0,0);date.setHours(0,0,0,0);
  const diff=Math.round((date-today)/86400000);
  if(diff===0)return 'Due today'; if(diff===1)return 'Tomorrow'; if(diff>1)return 'In '+diff+' days';
  return (-diff)+'d overdue';
};
matchesStatus = function(a) {
  const st=statusOf(a);
  if(statusFilter==='All')return true;
  if(statusFilter==='Upcoming')return !CANVAS_SYNC.isResolved(a.status)&&!a.noDue&&new Date(a.due)>new Date();
  if(statusFilter==='Missing')return a.status==='Missing'||a.missing;
  if(statusFilter==='Overdue')return st==='Overdue';
  if(statusFilter==='Completed')return a.status==='Completed';
  if(statusFilter==='Submitted')return a.status==='Submitted';
  if(statusFilter==='Awaiting Grading')return a.status==='Awaiting Grading';
  if(statusFilter==='Excused')return a.status==='Excused'||a.excused;
  return st===statusFilter||a.status===statusFilter;
};
function phase3RenderLedgerRow(a) {
  const c=courseById(a.course); if(!c)return '';
  const st=statusOf(a);
  const color=st==='Overdue'||st==='Missing'?'badge-rose':st==='Due Today'?'badge-amber':['Completed','Submitted','Excused'].includes(st)?'badge-green':['In Progress','Awaiting Grading'].includes(st)?'badge-cyan':'badge-violet';
  const bar=st==='Overdue'||st==='Missing'?'rose':['Completed','Submitted'].includes(st)?'green':'';
  const score=a.score!=null?'<b style="color:#6ee7b7">'+esc(String(a.score))+'/'+esc(String(a.points))+'</b>':'';
  return '<div class="ledger-row" style="--lc:'+c.color+'" onclick="openWorkspace(\''+esc(a.id)+'\')">'+
    '<div><h4>'+esc(a.title)+'</h4><div class="meta">'+typeIcon(a.type)+' '+esc(a.type)+' · '+esc(String(a.points))+' pts · '+esc(a.priority||'Normal')+' priority '+(score?'· '+score:'')+'</div></div>'+
    '<div class="hide-ipad"><span class="course-chip" style="background:'+c.color+'22;color:'+c.color+'"><span class="dotc" style="background:'+c.color+'"></span>'+esc(c.code)+'</span><div class="meta">'+esc(c.name)+'</div></div>'+
    '<div><b class="mono small">'+fmtDate(a.due)+'</b><div class="meta">'+esc(phase3DateMeta(a))+'</div></div>'+
    '<div><div class="progress '+bar+'"><i style="width:'+Math.max(0,Math.min(100,Number(a.progress)||0))+'%"></i></div><div class="meta mono">'+Math.max(0,Math.min(100,Number(a.progress)||0))+'%</div></div>'+
    '<div><span class="badge '+color+'">'+esc(st)+'</span></div><button class="btn btn-ghost btn-sm">Open →</button></div>';
}
function phase3QueueSort(a,b) {
  const rank = x => {const s=statusOf(x);if(s==='Missing'||s==='Overdue')return 0;if(s==='Due Today')return 1;if(x.priority==='High')return 2;if(s==='In Progress')return 3;return 4;};
  const delta=rank(a)-rank(b); if(delta)return delta;
  return new Date(a.due)-new Date(b.due);
}
renderLedger = function() {
  const periodEl=$('#fPeriod'), selection=periodEl?periodEl.value:phase3PeriodSelection;
  if(selection)phase3PeriodSelection=selection;
  const fc=$('#fCourse')?.value||'', ft=$('#fType')?.value||'', fp=$('#fPriority')?.value||'', fs=$('#fSort')?.value||'due', q=($('#fSearch')?.value||'').toLowerCase(), visibility=$('#fVisibility')?.value||'active';
  let source=phase3VisibleAssignments(selection);
  if(visibility!=='active'){const hidden=ASSIGNMENTS.filter(a=>phase3IsPublished(a)&&!phase3CourseIgnored(a.course)&&!!courseById(a.course)&&phase4IsHidden(a)&&phase4PeriodMatches(a,selection));source=visibility==='hidden'?hidden:source.concat(hidden);}
  let list=source.filter(a=>matchesStatus(a)&&(!fc||a.course===fc)&&(!ft||a.type===ft)&&(!fp||a.priority===fp)&&(!q||String(a.title).toLowerCase().includes(q)));
  if(fs==='due')list.sort((a,b)=>a.due-b.due);else if(fs==='points')list.sort((a,b)=>b.points-a.points);else if(fs==='priority')list.sort(phase3QueueSort);else list.sort((a,b)=>(courseById(a.course)?.code||'').localeCompare(courseById(b.course)?.code||''));
  const total=source.length;
  $('#ledgerCount').textContent=list.length+' shown · '+total+' published assignments · '+(selection==='all'?'all marking periods':selection==='current'?(phase3CurrentPeriod()?.name||'current dated work'):(PERIODS.find(p=>p.id===selection)?.name||'selected marking period'))+' · '+(mode==='live'?'Canvas':'sample data');
  const html=list.map(phase3RenderLedgerRow).join('');
  $('#ledgerList').innerHTML=html||'<div class="card" style="text-align:center;padding:36px"><p class="muted">No published assignments match this marking period and filter. Try another marking period or clear a filter.</p></div>';
};
const phase3OriginalAddPeriod=addPeriod;
addPeriod=function(){phase3OriginalAddPeriod();initLedger();};
const phase3OriginalDeletePeriod=deletePeriod;
deletePeriod=function(id){phase3OriginalDeletePeriod(id);initLedger();};
const phase3OriginalImportPeriods=importPeriods;
importPeriods=async function(input){await phase3OriginalImportPeriods(input);initLedger();};
window.addPeriod=addPeriod;
window.deletePeriod=deletePeriod;
window.importPeriods=importPeriods;
const phase3BaseInitLedger=initLedger;
initLedger = function() {
  phase3BaseInitLedger();
  const select=$('#fPeriod'); if(!select)return;
  const previous=phase3PeriodSelection||'current';
  select.innerHTML='<option value="current">Current marking period</option><option value="all">All marking periods</option>'+
    PERIODS.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(p.id===phase3CurrentPeriod()?.id?' · CURRENT':'')+'</option>').join('');
  select.value=[...select.options].some(o=>o.value===previous)?previous:'current';
  phase3PeriodSelection=select.value;
  select.onchange=()=>{phase3PeriodSelection=select.value;store.set('northstar_ledger_period_v1',phase3PeriodSelection);renderLedger();};
  ['fCourse','fType','fPriority','fSort','fVisibility'].forEach(id=>{const el=$('#'+id);if(el)el.onchange=renderLedger;});
  const search=$('#fSearch');if(search)search.oninput=renderLedger;
  renderLedger();
};
function phase3RenderFocusAndPriorities() {
  const scoped=phase3VisibleAssignments('current');
  const open=scoped.filter(a=>!CANVAS_SYNC.isResolved(a.status)&&a.status!=='Excused');
  const queue=open.slice().sort(phase3QueueSort);
  const focusTop=queue.find(a=>statusOf(a)==='Due Today')||queue.find(a=>statusOf(a)==='In Progress'&&!a.noDue&&new Date(a.due)>=new Date())||queue.find(a=>statusOf(a)==='Upcoming')||queue[0];const top=focusTop, focus=$('#focusCard'), badge=$('#focusBadge');
  if(badge)badge.textContent=top?phase3DateMeta(top).toUpperCase():'CURRENT PERIOD CLEAR';
  if(focus){
    if(!top)focus.innerHTML='<p class="small muted">No published unfinished assignments in the current marking period. Your focus queue is clear.</p>';
    else {const c=courseById(top.course);focus.innerHTML=
      '<span class="course-chip" style="background:'+c.color+'22;color:'+c.color+'"><span class="dotc" style="background:'+c.color+'"></span>'+esc(c.code)+' · '+esc(c.name)+'</span>'+
      '<h3 style="font-family:var(--serif);font-size:22px;font-weight:500;margin:10px 0 4px;line-height:1.25">'+esc(top.title)+'</h3>'+
      '<p class="small muted" style="line-height:1.55">'+esc(top.desc||'Open this assignment to review its instructions and continue your work.')+'</p>'+
      '<div class="flex mt" style="justify-content:space-between"><span class="small"><b class="mono">'+(top.noDue?'No due date':fmtDate(top.due)+' · '+fmtTime(top.due))+'</b></span><span class="small muted">'+top.points+' pts · '+esc(top.type)+'</span></div>'+
      '<div class="progress mt"><i style="width:'+Math.max(0,Math.min(100,Number(top.progress)||0))+'%"></i></div>'+
      '<div class="flex mt" style="justify-content:space-between"><span class="tiny muted">'+(Number(top.progress)||0)+'% complete</span><span class="tiny muted">'+esc(top.priority||'Normal')+' priority</span></div>'+
      '<button class="btn btn-primary mt" style="width:100%" onclick="openWorkspace(\''+esc(top.id)+'\')">▶ Continue assignment</button>';}
  }
  const list=$('#priorityList');
  if(list)list.innerHTML=queue.slice(0,5).map((a,i)=>{const c=courseById(a.course),st=statusOf(a),over=st==='Overdue'||st==='Missing';return '<div class="prio" style="--pc:'+c.color+'" onclick="openWorkspace(\''+esc(a.id)+'\')"><div class="prio-rank">'+(i+1)+'</div><div class="prio-info"><b>'+esc(a.title)+'</b><span>'+esc(c.code)+' · '+esc(a.type)+' · '+a.points+' pts</span></div><div class="prio-due"><b style="color:'+(over?'#fda4af':'#e6edf7')+'">'+esc(phase3DateMeta(a))+'</b><span>'+ (a.noDue?'No due date':fmtDate(a.due))+' · '+esc(a.priority||'Normal')+'</span></div><button class="btn '+(over?'btn-danger':'btn-primary')+' btn-sm">Open →</button></div>';}).join('')||'<p class="small muted">No unfinished published assignments in this marking period.</p>';
  const today=queue.filter(a=>statusOf(a)==='Due Today');
  const sched=$('#todaySchedule');
  if(sched)sched.innerHTML=today.map(a=>{const c=courseById(a.course);return '<div class="sched" style="cursor:pointer" onclick="openWorkspace(\''+esc(a.id)+'\')"><span class="sched-time">'+fmtTime(a.due)+'</span><span class="sched-dot" style="background:'+c.color+'"></span><div style="flex:1;min-width:0"><b>'+esc(a.title)+'</b><span>'+esc(c.code)+' · '+esc(a.type)+'</span></div><span class="tiny muted">→</span></div>';}).join('')||'<p class="small muted" style="padding:12px 0">No assignments due today in the current marking period.</p>';
}
dynamicOverview = function() {
  const period=phase3CurrentPeriod(), scoped=phase3VisibleAssignments('current');
  const open=scoped.filter(a=>!CANVAS_SYNC.isResolved(a.status)&&a.status!=='Excused');
  const today=open.filter(a=>statusOf(a)==='Due Today').length;
  const late=open.filter(a=>['Overdue','Missing'].includes(statusOf(a))).length;
  const completed=scoped.filter(a=>CANVAS_SYNC.isResolved(a.status)||a.status==='Excused').length;
  const percent=scoped.length?Math.round(completed/scoped.length*100):0;
  $('#heroSub').textContent=(period?period.name+' · ':'No active marking period · ')+today+' due today · '+late+' overdue or missing · '+open.length+' unfinished';
  const label=$('#currentPeriodLabel');if(label)label.textContent=period?'CURRENT MARKING PERIOD · '+period.name.toUpperCase():'CURRENT MARKING PERIOD · NOT SET';
  $('#syncLabel').textContent=mode!=='live'?'Demo workspace · not synced':dataFreshness==='cached'?'Saved Canvas data · offline':syncCompleteness==='partial'?'Canvas connected · some grade data unavailable':'Canvas connected · live data';
  $('#ledgerCount').textContent=$('#ledgerCount').textContent;
  $('#hsStreak').textContent='N/A';$('#hsHours').textContent='Not tracked';
  if(mode==='live'){$('#hsGpa').textContent='N/A';$('#hsGpa').title='Official GPA is not supplied by Canvas assignment totals.';}
  const status=$('#statusPct');if(status)status.textContent=percent+'%';
  const ring=$('#statusRing');if(ring)ring.style.strokeDashoffset=263.9*(1-percent/100);
  $('#statusBadge').textContent=late?'● Needs attention':'● On track';
  $('#statusText').textContent=scoped.length?completed+' of '+scoped.length+' published assignments completed, submitted, or excused in '+(period?period.name:'the active date window')+'. '+open.length+' unfinished.':'No published assignments are assigned to the current marking period.';
  phase3RenderFocusAndPriorities();
  const sampleTip=$('#focusBars')?.nextElementSibling;if(sampleTip)sampleTip.textContent='Focus-time tracking is not connected; example chart values are not personal data.';
  if(!scoped.length){$('#activityList').innerHTML=ACTIVITY.length?ACTIVITY.slice(0,5).map(actHTML).join(''):'<p class="small muted">No activity yet.</p>';}
};
const phase3OriginalRenderMomentum=renderMomentum;
renderMomentum=function(){
  const box=$('#momentumList');if(!box)return;
  const courses=phase3ActiveCourses();
  box.innerHTML=courses.map(c=>{
    const work=phase3VisibleAssignments('current').filter(a=>a.course===c.id);
    const done=work.filter(a=>CANVAS_SYNC.isResolved(a.status)||a.status==='Excused').length;
    const grade=phase3GradeFor(c);
    return '<div class="mom-row" onclick="openCourse(\''+esc(c.id)+'\')"><div class="flex" style="justify-content:space-between"><b class="small">'+esc(c.code)+'</b><span class="small muted">'+done+'/'+work.length+' complete</span></div><div class="flex" style="justify-content:space-between;align-items:center;margin-top:4px"><span class="small" style="color:'+c.color+';font-weight:700">'+esc(grade.value)+'</span><span class="tiny muted">'+esc(grade.source)+'</span></div><div class="progress mt"><i style="width:'+(work.length?Math.round(done/work.length*100):0)+'%;background:'+c.color+'"></i></div></div>';
  }).join('')||'<p class="small muted">No included courses. Review ignored-course settings.</p>';
};
const phase3OriginalRenderCourses=renderCourses;
renderCourses=function(){
  if(mode==='demo'){phase3OriginalRenderCourses();return;}
  $('#courseGrid').innerHTML=COURSES.map(c=>{
    const ignored=phase3CourseIgnored(c),work=ASSIGNMENTS.filter(a=>a.course===c.id&&phase3IsPublished(a));
    const activeWork=work.filter(a=>!ignored&&phase3PeriodSelection!=='all'?phase3PeriodIdFor(a)===phase3CurrentPeriod()?.id:!ignored);
    const done=activeWork.filter(a=>CANVAS_SYNC.isResolved(a.status)||a.status==='Excused').length;
    const grade=ignored?{value:'Excluded',source:'Ignored course'}:phase3GradeFor(c);
    return '<button class="card course-card" style="--cc:'+c.color+';text-align:left;'+(ignored?'opacity:.48;filter:grayscale(.85);':'')+'" onclick="openCourse(\''+esc(c.id)+'\')"><span class="course-code">'+esc(c.code)+'</span><h3>'+esc(c.name)+'</h3><p class="muted small">Canvas course'+(ignored?' · IGNORED':'')+'</p><div class="mini-stats"><div><b>'+activeWork.length+'</b><span>Current-period assignments</span></div><div><b>'+done+'</b><span>Completed / submitted</span></div><div><b>'+esc(grade.value)+'</b><span>'+esc(grade.source)+'</span></div></div></button>';
  }).join('')||'<p class="muted">No active Canvas courses were returned.</p>';
};
function renderCourseIgnoreSettings(){
  const box=$('#courseIgnoreList');if(!box)return;
  if(!COURSES.length){box.innerHTML='<p class="small muted">Connect Canvas to manage courses.</p>';return;}
  box.innerHTML=COURSES.map(c=>{const ignored=phase3CourseIgnored(c);return '<label style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin:6px 0;border-radius:12px;background:var(--card2);opacity:'+(ignored?'.58':'1')+'"><input type="checkbox" '+(ignored?'checked':'')+' onchange="toggleIgnoredCourse(\''+esc(c.id)+'\',this.checked)"><span style="flex:1"><b>'+esc(c.code)+'</b><small style="display:block;color:var(--muted)">'+esc(c.name)+'</small></span><span class="badge '+(ignored?'badge-violet':'badge-green')+'">'+(ignored?'IGNORED':'INCLUDED')+'</span></label>';}).join('');
}
window.toggleIgnoredCourse=function(id,ignored){
  if(ignored)phase3IgnoredCourses.add(id);else phase3IgnoredCourses.delete(id);
  store.set(PHASE3_IGNORES_KEY,[...phase3IgnoredCourses]);
  renderCourseIgnoreSettings();renderDashboard();renderLedger();renderCourses();renderWhatIf();
};
async function phase3ReadStudentVueRecords(){
  if(window.NorthstarVault){
    const secure=await window.NorthstarVault.get('studentvue-grades',null);
    if(secure&&secure.format==='northstar-studentvue-grades'&&Array.isArray(secure.records))return secure;
  }
  // Migrate an earlier local import into encrypted device storage.
  const legacy=window.NorthstarStudentVue?window.NorthstarStudentVue.load():null;
  if(legacy&&window.NorthstarVault){
    await window.NorthstarVault.set('studentvue-grades',legacy);
    window.NorthstarStudentVue.remove();
    return legacy;
  }
  return legacy;
}
function renderStudentVueSettings(){
  const el=$('#studentVueStatus');if(!el)return;
  if(!phase3StudentVue){el.textContent='No StudentVUE grade records imported. Direct district API access has not been authorized or documented.';return;}
  const count=phase3StudentVue.records.length;
  el.textContent=count+' StudentVUE grade record(s) imported on '+new Date(phase3StudentVue.importedAt).toLocaleString()+'. Stored encrypted on this device; this is not a live connection.';
}
async function hydrateStudentVueGrades(){
  try{
    phase3StudentVue=await phase3ReadStudentVueRecords();
    renderStudentVueSettings();
    if(phase3StudentVue){renderDashboard();renderCourses();renderWhatIf();}
  }catch(error){
    const el=$('#studentVueStatus');if(el)el.textContent='Saved StudentVUE grades could not be opened from secure device storage.';
  }
}
window.importStudentVueGrades=async function(input){
  const file=input&&input.files&&input.files[0];if(!file)return;
  try{
    if(file.size>2*1024*1024)throw new Error('Grade file exceeds the 2 MB limit.');
    if(!window.NorthstarVault)throw new Error('Secure device storage is unavailable. No grade data was saved.');
    const raw=await file.text(),parsed=window.NorthstarStudentVue.parse(raw,file.name);
    const prior=phase3StudentVue||await phase3ReadStudentVueRecords(),map=new Map();
    (prior?.records||[]).forEach(r=>map.set(r.id,r));parsed.records.forEach(r=>map.set(r.id,r));
    const merged={...parsed,records:[...map.values()]};
    await window.NorthstarVault.set('studentvue-grades',merged);
    window.NorthstarStudentVue.remove();phase3StudentVue=merged;
    renderStudentVueSettings();refreshAll();
    toast('Imported '+parsed.records.length+' StudentVUE grade record(s). Encrypted on this device.');
  }catch(error){toast('StudentVUE import failed: '+error.message);const el=$('#studentVueStatus');if(el)el.textContent='Import failed: '+error.message;}
  finally{if(input)input.value='';}
};
window.clearStudentVueGrades=async function(){
  if(!confirm('Remove imported StudentVUE grade records from this device?'))return;
  if(window.NorthstarVault)await window.NorthstarVault.remove('studentvue-grades').catch(()=>{});
  if(window.NorthstarStudentVue)window.NorthstarStudentVue.remove();
  phase3StudentVue=null;renderStudentVueSettings();refreshAll();toast('Imported StudentVUE grades cleared.');
};
window.downloadStudentVueTemplate=function(){
  const csv='Course Code,Course Name,Marking Period,Grade,Letter Grade,School Year,Is Current,As Of\n';
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='northstar-studentvue-grade-template.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
};
const phase3OriginalRefreshAll=refreshAll;
refreshAll=function(){phase3OriginalRefreshAll();renderCourseIgnoreSettings();renderStudentVueSettings();};
const phase3OriginalInitLedger=initLedger;
const phase3OriginalRenderDashboard=renderDashboard;
renderDashboard=function(){
  phase3OriginalRenderDashboard();
  dynamicOverview();
  renderMomentum();
  // scripts/release.js owns the clickable version pill; never overwrite its manifest-driven markup here.
};
const phase3OriginalRenderWhatIf=renderWhatIf;
renderWhatIf=function(){
  if(mode==='demo'){phase3OriginalRenderWhatIf();return;}
  const courses=phase3ActiveCourses();
  $('#whatifList').innerHTML=courses.map(c=>{const g=gradeForCourse(c.id);return '<div style="margin-bottom:14px"><div class="flex" style="justify-content:space-between"><span class="small"><b style="color:'+c.color+'">'+esc(c.code)+'</b> '+esc(c.name)+' <span class="muted">· current '+fmtPct(g.percent)+(g.letter?' ('+g.letter+')':'')+' · '+g.counts.pending+' pending</span></span><b class="mono" id="wi-val-'+esc(c.id)+'">N/A</b></div><input type="range" min="0" max="100" value="85" data-c="'+esc(c.id)+'" class="wi-slider"><div class="tiny muted">Projected result if remaining work averages this score · estimate only</div></div>';}).join('')||'<p class="small muted">No included courses to project.</p>';
  $$('.wi-slider').forEach(s=>s.oninput=updateWhatIfLive);updateWhatIfLive();
};
const phase3OriginalUpdateWhatIf=updateWhatIfLive;
updateWhatIfLive=function(){
  let sum=0,count=0,base=0,baseCount=0;
  phase3ActiveCourses().forEach(c=>{
    const slider=$('.wi-slider[data-c="'+c.id+'"]'),current=gradeForCourse(c.id);
    if(current.percent!=null){base+=gradeToGpa(current.percent);baseCount++;}
    if(slider){const projected=GRADES.projectWith(ASSIGNMENTS.filter(a=>a.course===c.id&&!phase3CourseIgnored(c)&&phase3IsPublished(a)),GROUPS[c.id]||[],gradeOptsFor(c.id),Number(slider.value));$('#wi-val-'+c.id).textContent=projected==null?'N/A':projected.toFixed(1)+'%';if(projected!=null){sum+=gradeToGpa(projected);count++;}}
  });
  const projectedGpa=count?sum/count:null,currentGpa=baseCount?base/baseCount:null;
  $('#projGpa').textContent=projectedGpa==null?'N/A':projectedGpa.toFixed(2);
  $('#projDelta').textContent=projectedGpa==null||currentGpa==null?'N/A':(projectedGpa-currentGpa>=0?'+':'')+(projectedGpa-currentGpa).toFixed(2);
  $('#hsGpa').textContent=currentGpa==null?'N/A':currentGpa.toFixed(2);
};
aiContext=function(){
  const courses=phase3ActiveCourses();
  const lines=courses.map(c=>{const imported=phase3GradeFor(c),estimate=gradeForCourse(c.id);return c.code+' '+c.name+': '+imported.value+' ['+imported.source+'] · '+estimate.counts.pending+' pending';});
  const work=phase3OpenAssignments('current').sort(phase3QueueSort).slice(0,12).map(a=>'- '+a.title+' ('+(courseById(a.course)?.code||'')+') due '+(a.noDue?'no date':fmtDate(a.due))+' ['+statusOf(a)+']').join('\n');
  return 'Current marking period: '+(phase3CurrentPeriod()?.name||'not configured')+'\nMy courses and grade sources:\n'+lines.join('\n')+'\n\nMy current-period work:\n'+(work||'none');
};
renderCourseIgnoreSettings();
renderStudentVueSettings();
hydrateStudentVueGrades();

/* Phase 3 follow-through: calendar, course grade history, and initial UI refresh. */
renderCalendar=function(){
  const rows=phase3VisibleAssignments('current');
  const days=[];for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()+i);days.push(d);}
  let total=0;
  $('#calStrip').innerHTML=days.map((d,i)=>{
    const items=rows.filter(a=>!CANVAS_SYNC.isResolved(a.status)&&!a.noDue&&new Date(a.due).toDateString()===d.toDateString());
    total+=items.length;
    return '<div class="cal-day '+(i===0?'today':'')+'" onclick="filterAndGo(\''+(i===0?'Due Today':'Upcoming')+'\')"><span class="dow">'+d.toLocaleDateString('en-US',{weekday:'short'})+'</span><span class="dnum">'+d.getDate()+'</span><span class="dcnt">'+(items.length?items.length+' due':'Clear')+'</span><span class="dots">'+items.slice(0,4).map(a=>'<i style="background:'+courseById(a.course).color+'"></i>').join('')+'</span></div>';
  }).join('');
  $('#weekTotal').textContent=total+' due this week · '+(phase3CurrentPeriod()?.name||'active date window');
};
const phase3BaseOpenCourse=openCourse;
openCourse=function(id){
  phase3BaseOpenCourse(id);
  const course=courseById(id);if(!course)return;
  const history=window.NorthstarStudentVue?window.NorthstarStudentVue.historyForCourse(course,phase3StudentVue):[];
  const detail=$('#courseDetail');if(!detail)return;
  const grade=phase3GradeFor(course);
  const currentHtml=grade.source==='StudentVUE import'?'<div class="card mt"><div class="eyebrow">STUDENTVUE CURRENT GRADE</div><h3 style="font:500 28px var(--serif);margin-top:8px">'+esc(grade.value)+'</h3><p class="small muted">Imported from StudentVUE · '+new Date(grade.record.importedAt).toLocaleDateString()+'</p></div>':'';
  const historyHtml=history.length?'<div class="card mt"><div class="card-head"><div><h3>StudentVUE grade history</h3><p>Imported grade records · source and marking period retained</p></div><span class="badge badge-cyan">'+history.length+' records</span></div>'+history.map(r=>'<div class="period-row"><div style="flex:1;min-width:0"><b>'+esc(r.period)+'</b><div class="tiny muted">'+esc(r.schoolYear||'School year not provided')+(r.asOf?' · '+esc(r.asOf):'')+'</div></div><b class="mono">'+esc(r.display||'N/A')+'</b></div>').join('')+'</div>':'';
  if(currentHtml)detail.insertAdjacentHTML('beforeend',currentHtml);if(historyHtml)detail.insertAdjacentHTML('beforeend',historyHtml);
};
const phase3BaseRenderCourses=renderCourses;
renderCourses=function(){
  if(mode==='demo'){phase3BaseRenderCourses();return;}
  const scoped=phase3VisibleAssignments(phase3PeriodSelection||'current');
  $('#courseGrid').innerHTML=COURSES.map(course=>{
    const ignored=phase3CourseIgnored(course),work=scoped.filter(a=>a.course===course.id);
    const done=work.filter(a=>CANVAS_SYNC.isResolved(a.status)||a.status==='Excused').length;
    const grade=ignored?{value:'Excluded',source:'Ignored course'}:phase3GradeFor(course);
    return '<button class="card course-card" style="--cc:'+course.color+';text-align:left;'+(ignored?'opacity:.48;filter:grayscale(.85);':'')+'" onclick="openCourse(\''+esc(course.id)+'\')"><span class="course-code">'+esc(course.code)+'</span><h3>'+esc(course.name)+'</h3><p class="muted small">Canvas course'+(ignored?' · IGNORED':'')+'</p><div class="mini-stats"><div><b>'+work.length+'</b><span>Selected-period assignments</span></div><div><b>'+done+'</b><span>Complete / submitted</span></div><div><b>'+esc(grade.value)+'</b><span>'+esc(grade.source)+'</span></div></div></button>';
  }).join('')||'<p class="muted">No courses returned by Canvas.</p>';
};
const phase3BaseDynamicOverview=dynamicOverview;
dynamicOverview=function(){
  phase3BaseDynamicOverview();
  const period=phase3CurrentPeriod(),scoped=phase3VisibleAssignments('current');
  const completed=scoped.filter(a=>CANVAS_SYNC.isResolved(a.status)||a.status==='Excused').length;
  if(scoped.length&&typeof renderGauge==='function')renderGauge(completed,scoped.length-completed);
};
const periodCard=$('#view-dashboard .section-title');
$('#view-settings .head-actions .pill')?.replaceChildren(document.createTextNode(northstarReleaseLabel()));
const periodSelect=$('#fPeriod');
if(periodSelect)periodSelect.value=phase3PeriodSelection||'current';

/* Phase 3 dashboard data integrity: replace illustrative analytics with sourced work data. */
function phase3DueByDay(){
  const base=new Date();base.setHours(0,0,0,0);
  const scope=phase3VisibleAssignments('current');
  return Array.from({length:7},(_,i)=>{
    const date=new Date(base);date.setDate(base.getDate()+i);
    const items=scope.filter(a=>!CANVAS_SYNC.isResolved(a.status)&&a.status!=='Excused'&&!a.noDue&&new Date(a.due).toDateString()===date.toDateString());
    return {date,items,count:items.length};
  });
}
renderFocusBars=function(){
  if(mode!=='live'){$('#focusBars').innerHTML='<p class="small muted">Connect Canvas to see your current-period due dates here.</p>';$('#hsHours').textContent='N/A';return;}
  const days=phase3DueByDay(),max=Math.max(1,...days.map(d=>d.count)),total=days.reduce((n,d)=>n+d.count,0);
  $('#focusBars').innerHTML=days.map((d,i)=>'<div class="bar-row"><span class="lbl">'+(i===0?'Today':d.date.toLocaleDateString('en-US',{weekday:'short'}))+'</span><div class="bar-track"><div class="bar-fill" style="width:'+(d.count/max*100)+'%;background:linear-gradient(90deg,#22d3ee,#38bdf8)"></div></div><span class="val">'+d.count+'</span></div>').join('');
  $('#hsHours').textContent=total+' due / 7d';
};
renderRadar=function(){
  const days=mode==='live'?phase3DueByDay():[];
  if(!days.length){$('#radarChart').innerHTML='<p class="small muted">Connect Canvas to forecast published work in the current marking period.</p>';$('#radarNote').textContent='No live assignment data';return;}
  const W=580,H=190,left=28,right=12,top=18,bottom=36,plotH=H-top-bottom,plotW=W-left-right;
  const max=Math.max(1,...days.map(d=>d.count));
  const step=plotW/days.length,barW=Math.min(44,step*.56);
  const bars=days.map((d,i)=>{
    const height=d.count/max*plotH,x=left+i*step+(step-barW)/2,y=top+plotH-height;
    const label=i===0?'Today':d.date.toLocaleDateString('en-US',{weekday:'short'});
    return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+Math.max(2,height).toFixed(1)+'" rx="6" fill="#22d3ee" opacity=".88"><title>'+label+': '+d.count+' open assignment(s) due</title></rect>'+
      '<text x="'+(left+i*step+step/2).toFixed(1)+'" y="'+(H-12)+'" fill="#8796ac" font-size="10" text-anchor="middle">'+label+'</text>'+
      '<text x="'+(left+i*step+step/2).toFixed(1)+'" y="'+Math.max(12,y-6).toFixed(1)+'" fill="#e6edf7" font-size="10" text-anchor="middle">'+d.count+'</text>';
  }).join('');
  $('#radarChart').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Open assignments due by day for the next seven days" style="width:100%;height:auto"><line x1="'+left+'" y1="'+(top+plotH)+'" x2="'+(W-right)+'" y2="'+(top+plotH)+'" stroke="rgba(255,255,255,.12)"/>'+bars+'</svg>';
  $('#radarNote').textContent=(phase3CurrentPeriod()?.name||'Current date window')+' · '+days.reduce((n,d)=>n+d.count,0)+' open due';
};
renderHeatmap=function(){
  const box=$('#heatmap');if(!box)return;
  if(mode!=='live'){box.innerHTML='<span class="small muted">Connect Canvas to see submitted activity.</span>';$('#heatTotal').textContent='N/A';return;}
  const today=new Date();today.setHours(0,0,0,0);
  const counts=new Map();
  ASSIGNMENTS.filter(a=>!phase3CourseIgnored(a.course)&&CANVAS_SYNC.isResolved(a.status)&&a.submittedAt).forEach(a=>{
    const d=new Date(a.submittedAt);if(!Number.isFinite(d.getTime()))return;d.setHours(0,0,0,0);
    const diff=Math.floor((today-d)/86400000);if(diff>=0&&diff<98){const k=d.toISOString().slice(0,10);counts.set(k,(counts.get(k)||0)+1);}
  });
  const max=Math.max(1,...counts.values());let total=0;
  const cells=[];
  for(let ago=97;ago>=0;ago--){
    const d=new Date(today);d.setDate(today.getDate()-ago);const k=d.toISOString().slice(0,10),count=counts.get(k)||0;total+=count;
    const alpha=count?(.2+.8*count/max):.035;
    cells.push('<div class="heat-cell" title="'+k+': '+count+' submitted assignment(s)" aria-label="'+k+': '+count+' submissions" style="background:rgba(52,211,153,'+alpha.toFixed(2)+')"></div>');
  }
  box.innerHTML=cells.join('');
  $('#heatTotal').textContent=total+' submission'+(total===1?'':'s')+' / 14w';
  const labels=$('#heatTotal').parentElement.nextElementSibling;
  if(labels)labels.innerHTML='<span class="tiny muted">No submissions</span><span class="tiny muted">More activity →</span>';
};
function phase3RenderAcademicSignals(){
  const box=$('#academicSignals');if(!box)return;
  if(mode!=='live'){box.innerHTML='<p class="small muted">Connect Canvas to see academic signals from your coursework.</p>';return;}
  const current=phase3VisibleAssignments('current'),open=current.filter(a=>!CANVAS_SYNC.isResolved(a.status)&&a.status!=='Excused');
  const today=open.filter(a=>statusOf(a)==='Due Today'),late=open.filter(a=>['Overdue','Missing'].includes(statusOf(a))),week=phase3DueByDay().reduce((n,d)=>n+d.count,0);
  const next=open.filter(a=>!a.noDue&&new Date(a.due)>new Date()).sort((a,b)=>a.due-b.due);
  const rows=[
    {title:today.length+' due today',detail:today.length?today.slice(0,2).map(a=>a.title).join(' · '):'No unfinished assignments are due today.'},
    {title:week+' open assignment(s) due in the next 7 days',detail:next.length?'Next: '+next[0].title+' · '+relDue(next[0].due):'Your next seven days are clear.'},
    {title:late.length+' missing or overdue',detail:late.length?late.slice(0,2).map(a=>a.title+' · '+statusOf(a)).join(' · '):'No missing or overdue work in this marking period.'}
  ];
  box.innerHTML=rows.map(r=>'<div class="insight"><b>'+esc(r.title)+'</b><span>'+esc(r.detail)+'</span></div>').join('');
}
const phase3SignalsDynamicOverview=dynamicOverview;
dynamicOverview=function(){
  phase3SignalsDynamicOverview();
  if(mode==='live'){
    const scoped=phase3VisibleAssignments('current'),open=scoped.filter(a=>!CANVAS_SYNC.isResolved(a.status)&&a.status!=='Excused');
    const done=scoped.length-open.length;
    $('#hsDone').textContent=done;
    $('#hsStreak').textContent=open.length;
    $('#hsGpa').textContent='N/A';
    $('#hsGpa').title='Official GPA is not available from the connected Canvas grade data or imported StudentVUE grade rows.';
  }else{
    $('#hsGpa').textContent='N/A';$('#hsStreak').textContent='N/A';$('#hsDone').textContent='N/A';
  }
  phase3RenderAcademicSignals();
};
renderDashboard();
initLedger();
renderCourses();
renderWhatIf();
renderCourseIgnoreSettings();
renderStudentVueSettings();
const initialAssignmentRoute=window.NorthstarAssignmentRoom?.routeId();if(initialAssignmentRoute)openWorkspace(initialAssignmentRoute,{fromHistory:true});

})();
