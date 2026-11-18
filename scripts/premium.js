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
    return {id:'canvas_'+a.id+'_'+c.canvasId, canvasId:a.id, title:safe(a.name || 'Untitled assignment'), course:c.id, type:typeOf(a), due:hasDue?parsed:new Date('2999-01-01T00:00:00Z'), noDue:!hasDue, points:numberOrNull(a.points_possible)??0, priority:'Normal', status:sub.status, progress:sub.submitted?100:0, desc:asText(a.description).slice(0,1000) || 'Open this assignment in Canvas for its full instructions.', rubric:[], score:sub.score, grade:sub.grade, excused:sub.excused, missing:sub.missing, late:sub.late, latePolicyStatus:sub.latePolicyStatus, groupId:a.assignment_group_id, subState:sub.workflowState, submittedAt:sub.submittedAt, gradedAt:sub.gradedAt, attempt:sub.attempt, gradeMatchesCurrentSubmission:sub.gradeMatchesCurrentSubmission, submissionTypes:a.submission_types||[], canvasUrl:href, assignmentPublished:a.published!==false,lockedForUser:!!a.locked_for_user,unlockAt:a.unlock_at||null,lockAt:a.lock_at||null};
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
  const q=row.quiz_question||row.question||row,qid=Number(q.id||row.id),type=String(q.question_type||q.type||'').toLowerCase(),prompt=asText(q.question_text||q.text||'Question'),answers=Array.isArray(q.answers)?q.answers:(Array.isArray(row.answers)?row.answers:[]),saved=row.answer;let control='';
  if(['multiple_choice_question','true_false_question'].includes(type))control=answers.map((v,i)=>'<label class="quiz-choice"><input type="radio" name="quiz-q-'+qid+'" data-quiz-answer="'+qid+'" value="'+Number(v.id)+'" '+(String(saved)===String(v.id)?'checked':'')+'><span>'+asText(v.text||v.html||('Option '+(i+1)))+'</span></label>').join('');
  else if(type==='multiple_answers_question'){const selected=Array.isArray(saved)?saved.map(String):[];control=answers.map((v,i)=>'<label class="quiz-choice"><input type="checkbox" data-quiz-answer="'+qid+'" value="'+Number(v.id)+'" '+(selected.includes(String(v.id))?'checked':'')+'><span>'+asText(v.text||v.html||('Option '+(i+1)))+'</span></label>').join('');}
  else if(['essay_question','short_answer_question','text_only_question'].includes(type))control='<textarea class="editor quiz-text-answer" data-quiz-answer="'+qid+'" rows="'+(type==='essay_question'?7:3)+'" placeholder="Enter your response…">'+(typeof saved==='string'?safe(saved):'')+'</textarea>';
  else if(['numerical_question','calculated_question'].includes(type))control='<input class="select" type="number" step="any" data-quiz-answer="'+qid+'" value="'+(saved==null?'':safe(saved))+'" placeholder="Enter a number">';
  else control='<p class="small muted">This question format ('+safe(type||'unknown')+') is not yet supported in the NORTHSTAR quiz editor. Complete this question in Canvas.</p>';
  return '<article class="card quiz-question" data-question-id="'+qid+'"><div class="eyebrow">QUESTION '+(index+1)+'</div><h3 class="quiz-prompt">'+prompt+'</h3><div class="quiz-answer-list">'+control+'</div></article>';
}
function phase4CollectQuizAnswers(questions){return questions.map(row=>{const q=row.quiz_question||row.question||row,id=Number(q.id||row.id),type=String(q.question_type||q.type||'').toLowerCase(),nodes=[...document.querySelectorAll('[data-quiz-answer="'+id+'"]')];if(!nodes.length)return null;let answer;if(type==='multiple_answers_question')answer=nodes.filter(n=>n.checked).map(n=>Number(n.value));else if(['multiple_choice_question','true_false_question'].includes(type)){const chosen=nodes.find(n=>n.checked);if(!chosen)return null;answer=Number(chosen.value);}else{answer=nodes[0].value;if(answer==='')return null;}return {id,answer};}).filter(Boolean);}
let activeQuizSession=null;
async function openCanvasQuiz(a){
  activeAssignment=a;const c=courseById(a.course),creds=getCredentials(),quizId=a.quizId||a.canvasId;
  $('#workspace').innerHTML='<div class="ws-head"><div><span class="eyebrow">'+safe(c.code)+' / CANVAS QUIZ</span><h2>'+safe(a.title)+'</h2><p class="small muted mt">Loading quiz details…</p></div><button class="ws-close" onclick="closeOverlay(\'wsOverlay\')">✕</button></div><div class="ws-body"></div>';$('#wsOverlay').classList.add('open');const hideQuizButton=document.createElement('button');hideQuizButton.id='phase4HideAssignment';hideQuizButton.className='btn btn-ghost btn-sm';hideQuizButton.textContent=phase4IsHidden(a)?'Restore assignment':'Hide assignment';hideQuizButton.onclick=()=>phase4ToggleHidden(a.id);$('#workspace .ws-head').insertBefore(hideQuizButton,$('#workspace .ws-head .ws-close'));
  if(!creds?.proxy){$('#workspace .ws-body').innerHTML='<div class="card"><h3>Canvas bridge required</h3><p class="small muted mt">Connect through your private Canvas bridge before starting a quiz. No attempt has been created.</p><a class="btn btn-primary mt" href="'+safe(a.canvasUrl||'#')+'" target="_blank" rel="noopener noreferrer">Open assignment in Canvas ↗</a></div>';return;}
  try{const api=window.NorthstarWorkspace.transport(creds),quiz=await api.get('/api/v1/courses/'+Number(c.canvasId)+'/quizzes/'+Number(quizId));$('#workspace .ws-head h2').textContent=quiz.title||a.title;$('#workspace .ws-head p').textContent=(quiz.question_count??'')+' questions · '+(quiz.time_limit?quiz.time_limit+' minute limit':'No time limit reported')+' · '+(quiz.points_possible??a.points)+' points';
    $('#workspace .ws-body').innerHTML='<div class="grid2"><div class="card"><span class="eyebrow">QUIZ BRIEF</span><div class="small mt" style="line-height:1.7">'+asText(quiz.description||a.desc||'')+'</div><div class="divider"></div><p class="small muted">Starting creates an official Canvas attempt. Canvas controls availability, time limits, attempt limits, access codes and grading.</p><label class="set-lbl" for="phase4QuizAccess">Access code (if required)</label><input id="phase4QuizAccess" class="select" type="password" autocomplete="off" placeholder="Optional access code"><button class="btn btn-primary mt" id="phase4StartQuiz">Start quiz in NORTHSTAR</button><p id="phase4QuizStatus" class="small muted mt" role="status">No attempt started.</p></div><div class="card"><span class="eyebrow">CANVAS STATUS</span><h3 class="mt">'+safe(quiz.workflow_state||'Status not reported')+'</h3><p class="small muted mt">New Quizzes, locked quizzes, IP restrictions and unsupported question formats may require Canvas itself.</p><a class="btn btn-ghost mt" href="'+safe(a.canvasUrl||quiz.html_url||'#')+'" target="_blank" rel="noopener noreferrer">Open assignment ↗</a></div></div>';
    $('#phase4StartQuiz').onclick=()=>phase4StartQuizAttempt(a,creds);
  }catch(error){$('#workspace .ws-body').innerHTML='<div class="card"><h3>Quiz could not be loaded in NORTHSTAR</h3><p class="small muted mt">'+safe(error.message)+'</p><a class="btn btn-primary mt" href="'+safe(a.canvasUrl||'#')+'" target="_blank" rel="noopener noreferrer">Open assignment in Canvas ↗</a></div>';}
}
async function phase4StartQuizAttempt(a,creds){
  const c=courseById(a.course),status=$('#phase4QuizStatus'),button=$('#phase4StartQuiz');if(!confirm('Start an official Canvas quiz attempt now? This may start the timer and count against your allowed attempts.'))return;button.disabled=true;status.textContent='Starting attempt with Canvas…';
  try{const result=await window.NorthstarWorkspace.startQuiz({credentials:creds,courseId:c.canvasId,quizId:a.quizId||a.canvasId,accessCode:$('#phase4QuizAccess').value});activeQuizSession={assignment:a,submission:result.submission,questions:result.questions,accessCode:$('#phase4QuizAccess').value||''};phase4RenderQuizAttempt();}
  catch(error){if(error.quizSubmission){activeQuizSession={assignment:a,submission:error.quizSubmission,questions:[],accessCode:$('#phase4QuizAccess').value||''};status.textContent='Canvas started an attempt, but NORTHSTAR could not load its questions. Do not start again; continue this attempt in Canvas.';button.disabled=true;const link=document.createElement('a');link.className='btn btn-ghost mt';link.href=a.canvasUrl||'#';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Continue attempt in Canvas ↗';status.after(link);}else{status.textContent=error.message;button.disabled=false;}}
}
function phase4RenderQuizAttempt(){
  const s=activeQuizSession;if(!s)return;const allowed=['multiple_choice_question','true_false_question','multiple_answers_question','essay_question','short_answer_question','text_only_question','numerical_question','calculated_question'],unsupported=s.questions.filter(row=>{const q=row.quiz_question||row.question||row;return !allowed.includes(String(q.question_type||q.type||'').toLowerCase());});
  $('#workspace .ws-head p').textContent='Attempt '+s.submission.attempt+' · '+s.questions.length+' questions · Canvas attempt in progress';
  $('#workspace .ws-body').innerHTML='<div class="card mb"><span class="eyebrow">LIVE CANVAS ATTEMPT</span><p class="small muted mt">Save answers sends them to Canvas. Submit quiz permanently completes this attempt.</p><div class="flex mt" style="gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="phase4SaveQuiz">Save answers to Canvas</button><button class="btn btn-primary btn-sm" id="phase4CompleteQuiz">Submit quiz to Canvas</button></div><p id="phase4AttemptStatus" class="small muted mt" role="status">Attempt started. Answers have not yet been saved.</p></div><div class="quiz-question-stack">'+s.questions.map(phase4QuestionMarkup).join('')+'</div>'+(unsupported.length?'<div class="card mt"><p class="small muted">Some question types are not yet editable here. Complete those in Canvas before submitting.</p><a class="btn btn-ghost mt" href="'+safe(s.assignment.canvasUrl||'#')+'" target="_blank" rel="noopener noreferrer">Open assignment in Canvas ↗</a></div>':'');
  $('#phase4SaveQuiz').onclick=phase4SaveQuizAnswers;$('#phase4CompleteQuiz').onclick=phase4CompleteQuizAttempt;
}
async function phase4SaveQuizAnswers(){
  const s=activeQuizSession;if(!s)return;const status=$('#phase4AttemptStatus'),button=$('#phase4SaveQuiz');
  try{const answers=phase4CollectQuizAnswers(s.questions);if(!answers.length)throw Error('No supported answers are entered yet.');button.disabled=true;status.textContent='Saving answers to Canvas…';await window.NorthstarWorkspace.saveQuizAnswers({credentials:getCredentials(),submission:s.submission,answers,accessCode:s.accessCode});status.textContent=answers.length+' answer(s) saved to Canvas.';}
  catch(error){status.textContent=error.message;}finally{button.disabled=false;}
}
async function phase4CompleteQuizAttempt(){
  const s=activeQuizSession;if(!s)return;const allowed=['multiple_choice_question','true_false_question','multiple_answers_question','essay_question','short_answer_question','text_only_question','fill_in_multiple_blanks_question','numerical_question','calculated_question'];
  if(s.questions.some(row=>{const q=row.quiz_question||row.question||row;return !allowed.includes(String(q.question_type||q.type||'').toLowerCase());})){toast('Complete unsupported question types in Canvas before submitting.');return;}
  if(!confirm('Submit this quiz to Canvas now? Canvas will mark this attempt complete and answers can no longer be changed.'))return;
  const status=$('#phase4AttemptStatus'),button=$('#phase4CompleteQuiz');
  try{button.disabled=true;status.textContent='Saving final answers to Canvas…';const answers=phase4CollectQuizAnswers(s.questions);if(answers.length)await window.NorthstarWorkspace.saveQuizAnswers({credentials:getCredentials(),submission:s.submission,answers,accessCode:s.accessCode});status.textContent='Completing quiz attempt in Canvas…';await window.NorthstarWorkspace.completeQuiz({credentials:getCredentials(),courseId:courseById(s.assignment.course).canvasId,quizId:s.assignment.quizId||s.assignment.canvasId,submission:s.submission,accessCode:s.accessCode});status.textContent='Canvas confirmed completion. Refreshing coursework…';activeQuizSession=null;await syncCanvas({quiet:true});refreshAll();$('#workspace .ws-body').innerHTML='<div class="card"><h2>Quiz submitted</h2><p class="small muted mt">Canvas confirmed completion. Your official score will appear when Canvas releases it.</p><button class="btn btn-primary mt" onclick="closeOverlay(\'wsOverlay\')">Return to coursework</button></div>';}
  catch(error){status.textContent=error.message+' Check Canvas before retrying; NORTHSTAR will not automatically repeat a completion request.';button.disabled=false;}
}

openWorkspace = function(id){
  const a=ASSIGNMENTS.find(x=>x.id===id);if(!a)return;if(mode==='live'&&a.type==='Quiz'){openCanvasQuiz(a);return;}if(mode==='live'&&a.type==='Discussion'){openCanvasDiscussion(a);return;}activeAssignment=a;const c=courseById(a.course);const key='northstar_draft_'+a.id;
  const period=(GRADES&&PERIODS.length)?GRADES.periodForDate(a.due,PERIODS):null;
  $('#workspace').innerHTML=`<div class="ws-head"><div><span class="eyebrow">${c.code} / ${a.type}${period?' · '+esc(period.name):''}</span><h2>${esc(a.title)}</h2><p class="small muted mt">${a.noDue?'No due date':fmtDate(a.due)+' · '+fmtTime(a.due)} · ${a.points} points · ${statusOf(a)}${a.score!=null?' · scored '+a.score+'/'+a.points:''}</p></div><button class="ws-close" aria-label="Close" onclick="closeOverlay('wsOverlay')">✕</button></div><div class="ws-body"><div class="grid2"><div><div class="card"><div class="card-head"><div><h3>Your workspace</h3><p>Private draft saved in this browser</p></div></div><textarea class="editor" id="assignmentDraft" placeholder="Plan your work, collect notes, or write a first draft…"></textarea><p id="draftStatus" class="small muted mt">Saved locally, not submitted.</p></div><div class="card mt"><div class="card-head"><div><h3>✧ AI study tools</h3><p>Gemini explains and quizzes — it never does the work for you</p></div><span class="badge badge-violet">AI</span></div><div class="flex" style="flex-wrap:wrap;gap:8px"><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('explain')">Explain brief</button><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('summarize')">Summarize</button><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('practice')">Practice questions</button><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('feedback')">Feedback on my draft</button></div><div id="aiOut" class="mt"><p class="small muted">Add a free Gemini key in Settings to enable these.</p></div></div></div><div><div class="card"><span class="eyebrow">THE BRIEF</span><p class="small mt" style="line-height:1.75">${esc(a.desc)}</p><div class="divider"></div>${a.canvasUrl?`<div class="flex" style="gap:8px;flex-wrap:wrap"><button class="btn btn-primary" onclick="openInDashboard('${a.canvasUrl}')">Open assignment ↗</button><a class="btn btn-ghost" href="${a.canvasUrl}" target="_blank" rel="noopener noreferrer">Open in Canvas ↗</a></div>`:'<p class="small muted">This is sample coursework. Connect Canvas to see your assignments.</p>'}<p class="small muted mt">Text and URL submissions are available below through your private bridge. Other submission types must be completed in Canvas.</p></div></div></div></div>`;
  const hideButton=document.createElement('button');hideButton.id='phase4HideAssignment';hideButton.className='btn btn-ghost btn-sm';hideButton.textContent=phase4IsHidden(a)?'Restore assignment':'Hide assignment';hideButton.onclick=()=>phase4ToggleHidden(a.id);$('#workspace .ws-head').insertBefore(hideButton,$('#workspace .ws-head .ws-close'));
  $('#workspace .ws-body').insertAdjacentHTML('beforeend', submissionPanel(a));
  const typeSelect=$('#submissionType');if(typeSelect)typeSelect.onchange=()=>{const t=typeSelect.value;$('#submissionUrlWrap').hidden=t!=='online_url';$('#submissionFileWrap').hidden=t!=='online_upload';};if(typeSelect)typeSelect.onchange();
  const input=$('#assignmentDraft');input.value=localStorage.getItem(key)||'';input.oninput=()=>{try{localStorage.setItem(key,input.value);$('#draftStatus').textContent='Saved locally, not submitted.';}catch{$('#draftStatus').textContent='Could not save on this device.';}};$('#wsOverlay').classList.add('open');
};
let submissionBusy=false;
function submissionPanel(a){
  if(mode!=='live') return '';
  const types=(a.submissionTypes||[]).filter(t=>['online_text_entry','online_url','online_upload'].includes(t));
  if(!types.length) return '<p class="small muted mt">This assignment type must be completed in Canvas or its external learning tool. NORTHSTAR will not simulate a submission.</p>';
  const accept=(a.allowedExtensions||[]).map(x=>'.'+safe(x)).join(',');
  return `<div class="card mt"><h3>Submit to Canvas</h3><p class="small muted mt">Your submission is sent to Canvas. Resubmission creates another attempt where allowed; earlier attempts are preserved. Canvas enforces deadlines and attempt limits.</p><label class="set-lbl" for="submissionType">Submission type</label><select id="submissionType">${types.map(t=>`<option value="${t}">${t==='online_url'?'Website URL':t==='online_upload'?'File upload':'Text entry (uses your workspace draft)'}</option>`).join('')}</select><div id="submissionUrlWrap"><label class="set-lbl" for="submissionUrl">Website URL</label><input id="submissionUrl" type="url" style="width:100%" placeholder="https://…"></div><div id="submissionFileWrap" hidden><label class="set-lbl" for="submissionFile">Choose a file ${accept?'('+accept+')':''}</label><input id="submissionFile" type="file" accept="${accept}" style="width:100%"><p class="tiny muted mt">Maximum 25 MB. The file is uploaded to Canvas before the submission is created.</p></div><button id="submitWork" class="btn btn-primary mt" onclick="submitAssignment()">Review and submit…</button><p id="submissionStatus" class="small muted mt" role="status">Nothing sent yet. Confirmation is required.</p></div>`;
}
window.submitAssignment=async function(){
  if(submissionBusy||!activeAssignment) return;
  const a=activeAssignment,c=courseById(a.course),status=$('#submissionStatus'),button=$('#submitWork');
  try{
    const creds=getCredentials();
    if(!creds?.proxy) throw Error('Connect using your private bridge first. Direct-mode submissions are disabled.');
    const type=$('#submissionType').value;
    if(!(a.submissionTypes||[]).includes(type)) throw Error('Unsupported submission type.');
    const file=type==='online_upload'?$('#submissionFile')?.files?.[0]:null;
    if(type==='online_upload'&&!file)throw Error('Choose a file before submitting.');
    const value=type==='online_url'?$('#submissionUrl').value:$('#assignmentDraft').value;
    let data=type==='online_upload'?null:window.NorthstarSubmissions.payload(type,value);
    const preview=type==='online_upload'?(file.name+' · '+Math.round(file.size/1024)+' KB'):type==='online_url'?data.submission.url:value;
    if(!confirm(`Submit to Canvas?\nCourse: ${c.name}\nAssignment: ${a.title}\nType: ${type}\n\n${preview.slice(0,1500)}${preview.length>1500?'\n… (preview truncated; your entire draft will be sent)':''}\n\nThis may create a new attempt and will not erase earlier submissions. Send now?`)) return;
    submissionBusy=true;button.disabled=true;
    if(type==='online_upload'){
      status.textContent='Uploading file to Canvas… do not close this workspace.';
      const uploaded=await window.NorthstarWorkspace.uploadAssignmentFile({credentials:creds,courseId:c.canvasId,assignmentId:a.canvasId,file});
      data=window.NorthstarSubmissions.payload('online_upload',String(uploaded.id));
      status.textContent='File uploaded. Sending assignment submission to Canvas…';
    }else status.textContent='Sending once… do not close this workspace.';
    const result=await window.NorthstarSubmissions.send({credentials:creds,courseId:c.canvasId,assignmentId:a.canvasId,data});
    const normalized=CANVAS_SYNC.submission(result);
    Object.assign(a,{
      status:normalized.status, subState:normalized.workflowState,
      progress:normalized.submitted?100:a.progress,
      score:normalized.score, grade:normalized.grade,
      excused:normalized.excused, missing:normalized.missing, late:normalized.late,
      latePolicyStatus:normalized.latePolicyStatus,
      submittedAt:normalized.submittedAt, gradedAt:normalized.gradedAt,
      attempt:normalized.attempt,
      gradeMatchesCurrentSubmission:normalized.gradeMatchesCurrentSubmission
    });
    const snapshotSaved=await persistCurrentSnapshot();
    status.textContent='Canvas confirmed your submission'+(result.attempt?' · attempt '+result.attempt:'')+'. Your local draft was kept.'+(snapshotSaved?' Offline coursework snapshot updated.':' Offline snapshot could not be updated; sync Canvas before relying on cached status.');
    refreshAll();
  }catch(e){status.textContent=e.message;}
  finally{submissionBusy=false;if(button) button.disabled=false;}
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
  else if(action==='feedback'){ const draft=($('#assignmentDraft')?.value||'').trim(); prompt=`Give me feedback on my draft for this assignment. Focus on structure, clarity, and rubric alignment. Do not rewrite it for me.\n\nAssignment: ${a.title}\nRubric: ${(a.rubric||[]).join('; ')}\n\nMy draft:\n${draft||'(no draft yet)'}`; }
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
function openInDashboard(url){
  let target;try{target=new URL(url);}catch{toast('This assignment does not have a valid external link.');return;}
  if(target.protocol!=='https:'){toast('Only secure HTTPS assignment links can be opened.');return;}
  // Google Drive/Docs and many Canvas resources deliberately reject iframe embedding.
  // Open the authenticated destination directly instead of showing a misleading 403 panel.
  const opened=window.open(target.href,'_blank','noopener,noreferrer');
  if(!opened) toast('Your browser blocked the new tab. Use the Canvas link in the assignment details.');
}
function closeViewer(){ const m=$('#viewerOverlay'); if(m) m.classList.remove('open'); const f=$('#viewerFrame'); if(f) f.src=''; }
// Expose handlers that index.html calls via onclick (premium.js is an IIFE).
window.addPeriod = addPeriod;
window.deletePeriod = deletePeriod;
window.saveAiSettings = saveAiSettings;
window.testAiKey = testAiKey;
window.askAiAboutAssignment = askAiAboutAssignment;
window.openInDashboard = openInDashboard;
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
const NORTHSTAR_RELEASE = 'NORTHSTAR / .4.3';
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
  const version=$('#versionPill');if(version)version.textContent=NORTHSTAR_RELEASE;
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
$('#view-settings .head-actions .pill')?.replaceChildren(document.createTextNode(NORTHSTAR_RELEASE));
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

})();
