/* NORTHSTAR: truthful, read-only Canvas integration and local-first workspace. */
(() => {
'use strict';
const DEMO_COURSES = structuredClone(COURSES);
const DEMO_ASSIGNMENTS = structuredClone(ASSIGNMENTS);
let mode = 'demo', activeAssignment = null;
let GROUPS = {}, COURSE_META = {};
const GRADES = window.Grades, AI = window.NorthstarAI;
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
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
function getCredentials() { try { return JSON.parse(sessionStorage.getItem('northstar_canvas_session') || 'null'); } catch { return null; } }
function setCredentials(c) { sessionStorage.setItem('northstar_canvas_session', JSON.stringify(c)); }
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
const typeOf = a => a.submission_types?.includes('discussion_topic') ? 'Discussion' : a.submission_types?.includes('online_quiz') ? 'Quiz' : a.submission_types?.includes('online_text_entry') ? 'Writing' : 'Homework';
function convertCourses(rows) {
  const palette=['#c4e87b','#9cd9bd','#c6bded','#eac988','#efa99c','#a7cce1'];
  return rows.filter(c => Number.isInteger(c.id)).map((c,i)=>({id:'canvas_'+c.id, code:safe(c.course_code || 'COURSE'), name:safe(c.name || 'Untitled course'), prof:'Canvas course', office:'Not available', color:palette[i%palette.length], grade:0, credits:0, modules:[], canvasId:c.id, canvasUrl: c.html_url}));
}
function convertAssignments(rows,c,base) {
  return rows.filter(a => Number.isInteger(a.id)).map(a=>{
    const sub=a.submission || {}, isDone = ['submitted','graded','pending_review'].includes(sub.workflow_state), parsed = a.due_at ? new Date(a.due_at) : null, hasDue = parsed && Number.isFinite(parsed.getTime());
    let href=''; try { const u=new URL(a.html_url); if(u.protocol==='https:' && u.origin===base) href=u.href; } catch {}
    return {id:'canvas_'+a.id+'_'+c.canvasId, canvasId:a.id, title:safe(a.name || 'Untitled assignment'), course:c.id, type:typeOf(a), due:hasDue?parsed:new Date('2999-01-01T00:00:00Z'), noDue:!hasDue, points:Number(a.points_possible)||0, priority:'Normal', status:sub.workflow_state==='graded'?'Completed':isDone?'Submitted':sub.missing?'Missing':'Not Started', progress:isDone?100:0, desc:asText(a.description).slice(0,1000) || 'Open this assignment in Canvas for its full instructions.', rubric:[], score:sub.score==null?null:Number(sub.score), excused:!!sub.excused, missing:!!sub.missing, late:!!sub.late, groupId:a.assignment_group_id, subState:sub.workflow_state, submissionTypes:a.submission_types||[], gradedAt:sub.graded_at, canvasUrl:href};
  });
}
const originalRenderDashboard=renderDashboard, originalRenderLab=renderLab;
const oldMomentum=renderMomentum; renderMomentum=function(){if(mode==='demo'){oldMomentum();return;}$('#momentumList').innerHTML=COURSES.map(c=>{const as=ASSIGNMENTS.filter(a=>a.course===c.id);const done=as.filter(a=>['Submitted','Completed'].includes(a.status)).length;const g=gradeForCourse(c.id);return `<div class="mom-row" onclick="openCourse('${c.id}')"><div class="flex" style="justify-content:space-between"><b class="small">${c.code}</b><span class="small muted">${done}/${as.length} submitted</span></div><div class="flex" style="justify-content:space-between;align-items:center;margin-top:4px"><span class="small" style="color:${c.color};font-weight:700">${fmtPct(g.percent)}${g.letter?' · '+g.letter:''}</span><span class="tiny muted">computed grade</span></div><div class="progress mt"><i style="width:${as.length?Math.round(done/as.length*100):0}%;background:${c.color}"></i></div></div>`;}).join('') || '<p class="small muted">No courses found.</p>';};
const originalRelDue=relDue;
relDue = d => new Date(d).getFullYear() >= 2999 ? 'No due date' : originalRelDue(d);
statusOf = a => { if(a.status==='Completed'||a.status==='Submitted') return a.status; if(a.status==='Missing') return 'Missing'; if(a.noDue)return a.status; const now=new Date(), d=new Date(a.due); if(d<now)return 'Overdue'; if(d.toDateString()===now.toDateString())return 'Due Today'; return a.status; };
function dynamicOverview() {
  const pending=ASSIGNMENTS.filter(a=>!['Completed','Submitted'].includes(a.status));
  const today=pending.filter(a=>statusOf(a)==='Due Today'), late=pending.filter(a=>['Overdue','Missing'].includes(statusOf(a)));
  const current=GRADES?GRADES.currentPeriod(PERIODS,new Date()):null;
  $('#heroSub').textContent=(current?current.name+' · ':'')+`${today.length} due today  ·  ${late.length} need attention  ·  ${pending.length} open`;
  $('#syncLabel').textContent=mode==='live'?'Canvas connected · live data':'Demo workspace · not synced';
  $('#dataState').textContent=mode==='live'?'CANVAS CONNECTED · Your synced coursework':'SAMPLE DATA · Connect Canvas to see your real coursework';$('#dataState').classList.toggle('live',mode==='live');
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
matchesStatus = function(a){if(statusFilter==='All')return true;const st=statusOf(a);if(statusFilter==='Upcoming')return !['Completed','Submitted'].includes(a.status)&&!a.noDue&&new Date(a.due)>new Date();if(statusFilter==='Missing')return a.status==='Missing'||st==='Overdue';if(statusFilter==='Completed')return a.status==='Completed'||a.status==='Submitted';return st===statusFilter||a.status===statusFilter;};
filterAndGo = function(f){statusFilter=f;showView('ledger');initLedger();};
const oldRenderLedger=renderLedger;
function ledgerRow(a){
  const c=courseById(a.course); const st=statusOf(a);
  const stColor = st==="Overdue"||st==="Missing"?"badge-rose":st==="Due Today"?"badge-amber":st==="Completed"||st==="Submitted"?"badge-green":st==="In Progress"?"badge-cyan":"badge-violet";
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
renderCourses = function(){ if(mode==='demo') {oldRenderCourses();return;} $('#courseGrid').innerHTML=COURSES.map(c=>{const work=ASSIGNMENTS.filter(a=>a.course===c.id); const done=work.filter(a=>['Completed','Submitted'].includes(a.status)).length; const g=gradeForCourse(c.id); return `<button class="card course-card" style="--cc:${c.color};text-align:left" onclick="openCourse('${c.id}')"><span class="course-code">${c.code}</span><h3>${c.name}</h3><p class="muted small">Canvas course</p><div class="mini-stats"><div><b>${work.length}</b><span>Assignments</span></div><div><b>${done}</b><span>Submitted</span></div><div><b>${fmtPct(g.percent)}</b><span>Computed grade${g.letter?" · "+g.letter:""}</span></div></div></button>`;}).join('') || '<p class="muted">No active Canvas courses were returned.</p>'; };
openCourse = function(id){ const c=courseById(id);if(!c)return;showView('courses');const list=ASSIGNMENTS.filter(a=>a.course===id).sort((a,b)=>a.due-b.due); $('#courseDetail').innerHTML=`<div class="card"><div class="card-head"><div><span class="eyebrow">${c.code}</span><h3 style="font:500 28px var(--serif);margin-top:8px">${c.name}</h3><p>${mode==='live'?'Canvas coursework':'Example course'}</p></div></div><h4 class="small">COURSEWORK</h4>${list.map(a=>`<button class="prio" style="width:100%;text-align:left" onclick="openWorkspace('${a.id}')"><div class="prio-info"><b>${esc(a.title)}</b><span>${a.type} · ${a.points} points</span></div><span class="small">${relDue(a.due)}</span></button>`).join('')||'<p class="small muted mt">No assignments found.</p>'}</div>`; $('#courseDetail').scrollIntoView({behavior:'smooth'}); };
openWorkspace = function(id){
  const a=ASSIGNMENTS.find(x=>x.id===id);if(!a)return;activeAssignment=a;const c=courseById(a.course);const key='northstar_draft_'+a.id;
  const period=(GRADES&&PERIODS.length)?GRADES.periodForDate(a.due,PERIODS):null;
  $('#workspace').innerHTML=`<div class="ws-head"><div><span class="eyebrow">${c.code} / ${a.type}${period?' · '+esc(period.name):''}</span><h2>${esc(a.title)}</h2><p class="small muted mt">${a.noDue?'No due date':fmtDate(a.due)+' · '+fmtTime(a.due)} · ${a.points} points · ${statusOf(a)}${a.score!=null?' · scored '+a.score+'/'+a.points:''}</p></div><button class="ws-close" aria-label="Close" onclick="closeOverlay('wsOverlay')">✕</button></div><div class="ws-body"><div class="grid2"><div><div class="card"><div class="card-head"><div><h3>Your workspace</h3><p>Private draft saved in this browser</p></div></div><textarea class="editor" id="assignmentDraft" placeholder="Plan your work, collect notes, or write a first draft…"></textarea><p id="draftStatus" class="small muted mt">Saved locally, not submitted.</p></div><div class="card mt"><div class="card-head"><div><h3>✧ AI study tools</h3><p>Gemini explains and quizzes — it never does the work for you</p></div><span class="badge badge-violet">AI</span></div><div class="flex" style="flex-wrap:wrap;gap:8px"><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('explain')">Explain brief</button><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('summarize')">Summarize</button><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('practice')">Practice questions</button><button class="btn btn-ghost btn-sm" onclick="askAiAboutAssignment('feedback')">Feedback on my draft</button></div><div id="aiOut" class="mt"><p class="small muted">Add a free Gemini key in Settings to enable these.</p></div></div></div><div><div class="card"><span class="eyebrow">THE BRIEF</span><p class="small mt" style="line-height:1.75">${esc(a.desc)}</p><div class="divider"></div>${a.canvasUrl?`<div class="flex" style="gap:8px;flex-wrap:wrap"><button class="btn btn-primary" onclick="openInDashboard('${a.canvasUrl}')">View in dashboard</button><a class="btn btn-ghost" href="${a.canvasUrl}" target="_blank" rel="noopener noreferrer">Open in Canvas ↗</a></div>`:'<p class="small muted">This is sample coursework. Connect Canvas to see your assignments.</p>'}<p class="small muted mt">Complete or submit coursework in Canvas. Northstar does not submit on your behalf.</p></div></div></div></div>`;
  const input=$('#assignmentDraft');input.value=localStorage.getItem(key)||'';input.oninput=()=>{try{localStorage.setItem(key,input.value);$('#draftStatus').textContent='Saved locally, not submitted.';}catch{$('#draftStatus').textContent='Could not save on this device.';}};$('#wsOverlay').classList.add('open');
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
copilotReply = function(raw){const q=raw.toLowerCase();const pending=ASSIGNMENTS.filter(a=>!['Completed','Submitted'].includes(a.status)).sort((a,b)=>a.due-b.due);if(/due|deadline|today/.test(q))return pending.length?'<b>Up next:</b><br>'+pending.slice(0,5).map(a=>'• '+esc(a.title)+' · '+relDue(a.due)).join('<br>'):'No pending assignments in this view.';if(/plan|week|study/.test(q))return pending.length?'<b>Try a focus sprint for:</b><br>'+pending.slice(0,3).map((a,i)=>(i+1)+'. '+esc(a.title)).join('<br>'):'Your queue is clear. Try a focus sprint in Study Lab.';return 'I’m a simple, rule-based study guide, not an AI model. Ask “what is due?” or “plan my week” for suggestions based on your current assignments.';};
connectCanvas = async function(){
  let creds; try{const base=urlFrom($('#canvasUrl').value);const token=$('#canvasToken').value.trim();const proxy=$('#canvasProxy').value.trim()?urlFrom($('#canvasProxy').value):'';if(!token)throw Error('Enter your Canvas access token.');creds={base,token,proxy};}
  catch(e){resetDebug('');pushEntry('err','Validation failed — nothing was sent: '+e.message);summarizeConnect({kind:'invalid-input',message:e.message});$('#canvasStatus').textContent=e.message;return;}
  const mode=creds.proxy?'bridge':'direct';
  resetDebug(mode);
  pushEntry('info','Attempt #'+debugState.attemptId+' · '+(mode==='bridge'?'bridge mode':'direct mode'));
  pushEntry('info',mode==='bridge'?('Bridge: '+creds.proxy+' — path forwarded as ?path=…; token sent only in the Authorization header'):('Canvas: '+creds.base));
  pushEntry('info','Token: '+creds.token.length+' characters · never displayed, logged, or copied');
  $('#canvasStatus').textContent='Connecting and loading courses…';$('#connectAction').disabled=true;
  try{await pullCanvas(creds);setCredentials(creds);$('#canvasToken').value='';pushEntry('ok','Connected — '+COURSES.length+' courses and '+ASSIGNMENTS.length+' assignments loaded');summarizeConnect(null);$('#canvasStatus').textContent=`Connected: ${COURSES.length} courses and ${ASSIGNMENTS.length} assignments loaded. Token retained only for this browser session.`;toast('Canvas connected and coursework synced');}
  catch(e){pushEntry('err','Connection failed: '+DBG.redact(String((e&&e.message)||e)));summarizeConnect(e);$('#canvasStatus').textContent=e.message;$('#canvasTroubleshoot').open=true;toast('Canvas connection failed. See the debug console in this menu.');}finally{$('#connectAction').disabled=false;}
};
async function pullCanvas(creds){
  const rawCourses=await allPages(creds,'/api/v1/courses?enrollment_state=active');const courses=convertCourses(rawCourses);let assignments=[];
  GROUPS={}; COURSE_META={};
  for(const c of courses){
    const rows=await allPages(creds,`/api/v1/courses/${c.canvasId}/assignments?include%5B%5D=submission`);assignments.push(...convertAssignments(rows,c,creds.base));
    try{
      const grows=await allPages(creds,`/api/v1/courses/${c.canvasId}/assignment_groups`);
      GROUPS[c.id]=grows.filter(g=>Number.isInteger(g.id)).map(g=>({id:g.id,name:safe(g.name||'Group'),weight:Number(g.group_weight)||0,dropLowest:Number(g.rules?.drop_lowest)||0,dropHighest:Number(g.rules?.drop_highest)||0}));
    }catch(e){ pushEntry('err','Assignment groups unavailable for '+c.code+' — grades will be unweighted. Redeploy the bridge with the latest worker.js.'); GROUPS[c.id]=[]; }
    try{
      const det=await canvasPage(creds,`/api/v1/courses/${c.canvasId}`);
      COURSE_META[c.id]={weighted:!!det.weighted_assignment_groups, scheme:Array.isArray(det.grading_standard)?det.grading_standard:null, dropLowest:Number(det.drop_lowest)||0, dropHighest:Number(det.drop_highest)||0};
    }catch(e){ COURSE_META[c.id]={weighted:false,scheme:null,dropLowest:0,dropHighest:0}; }
  }
  COURSES.splice(0,COURSES.length,...courses);ASSIGNMENTS=assignments;mode='live';ACTIVITY.splice(0,ACTIVITY.length,{icon:'↻',color:'#a7d9bd',title:'Canvas synced',sub:`${assignments.length} assignments · ${courses.length} courses`,time:'Just now'}); refreshAll();
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
function renderPeriodsManager(){
  const box=$('#periodsManager'); if(!box) return;
  const now=new Date(), cur=GRADES?GRADES.currentPeriod(PERIODS,now):null;
  box.innerHTML = PERIODS.length ? PERIODS.map(p=>{
    const isCur = cur && cur.id===p.id, past = new Date(p.end+'T23:59:59.999') < now;
    return `<div class="period-row"><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="tiny muted">${fmtDate(p.start)} – ${fmtDate(p.end)}</div></div>${isCur?'<span class="badge badge-green">CURRENT</span>':past?'<span class="badge badge-violet">ARCHIVED</span>':''}<button class="btn btn-ghost btn-sm" onclick="deletePeriod('${p.id}')">Delete</button></div>`;
  }).join('') : '<p class="small muted">No marking periods yet. Add your school’s periods above — assignments will be organized by them, and old periods archive automatically.</p>';
}

/* ---------- AI study tools (Gemini free tier, session-only key) ---------- */
function getAiKey(){ try{ return sessionStorage.getItem('northstar_gemini_session')||''; }catch{ return ''; } }
function setAiKey(k){ try{ sessionStorage.setItem('northstar_gemini_session', k||''); }catch{} }
function getAiModel(){ try{ return sessionStorage.getItem('northstar_gemini_model')||(AI?AI.DEFAULT_MODEL:'gemini-2.0-flash'); }catch{ return AI?AI.DEFAULT_MODEL:'gemini-2.0-flash'; } }
function setAiModel(m){ try{ sessionStorage.setItem('northstar_gemini_model', m||''); }catch{} }
function aiContext(){
  const lines=COURSES.map(c=>{ const g=gradeForCourse(c.id); return `${c.code} ${c.name}: ${g.percent==null?'no grade yet':g.percent.toFixed(1)+'%'+(g.letter?' ('+g.letter+')':'')} · ${g.counts.pending} pending`; });
  const pend=ASSIGNMENTS.filter(a=>!['Completed','Submitted'].includes(a.status)).sort((a,b)=>a.due-b.due).slice(0,12)
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
function saveAiSettings(){
  const k=($('#geminiKey')?.value||'').trim(), m=($('#geminiModel')?.value||'').trim();
  setAiKey(k); if(m) setAiModel(m);
  const st=$('#aiStatus'); if(st) st.textContent = k ? 'Gemini key saved for this session ('+k.length+' chars, session storage only).' : 'No Gemini key set — the built-in guide is active.';
  toast(k?'Gemini key saved for this session':'Gemini key cleared');
}
async function testAiKey(){
  const st=$('#aiStatus'); if(st) st.textContent='Testing key…';
  try{ await aiAsk('Reply with exactly: ok'); if(st) st.textContent='✓ Key works — Gemini is connected.'; toast('Gemini connected'); }
  catch(e){ if(st) st.textContent='✗ '+e.message; }
}
function openInDashboard(url){
  const m=$('#viewerOverlay'), f=$('#viewerFrame'), note=$('#viewerNote');
  if(!m||!f) return;
  f.src=url; m.classList.add('open');
  if(note) note.textContent='If the page stays blank, Canvas blocks embedding — use “Open in new tab”.';
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

syncCanvas = async function(){const c=getCredentials();if(!c){openConnect();toast('Connect Canvas first.');return;}
  const mode=c.proxy?'bridge':'direct';resetDebug(mode);
  pushEntry('info','Sync · '+(mode==='bridge'?'bridge mode':'direct mode'));
  pushEntry('info',mode==='bridge'?('Bridge: '+c.proxy):('Canvas: '+c.base));
  pushEntry('info','Token: '+c.token.length+' characters · never displayed, logged, or copied');
  toast('Syncing Canvas…');
  try{await pullCanvas(c);pushEntry('ok','Sync complete — '+COURSES.length+' courses, '+ASSIGNMENTS.length+' assignments');summarizeConnect(null);toast('Canvas sync complete');}
  catch(e){pushEntry('err','Sync failed: '+DBG.redact(String((e&&e.message)||e)));summarizeConnect(e);$('#canvasStatus').textContent=e.message;$('#canvasTroubleshoot').open=true;openConnect();toast('Canvas sync failed. See the debug console.');}};
window.disconnectCanvas = function(){sessionStorage.removeItem('northstar_canvas_session');$('#canvasToken').value='';if(debugState.attemptId)pushEntry('info','Disconnected — session token cleared from this tab');dbgSetDot('idle');dbgHeader('disconnected');COURSES.splice(0,COURSES.length,...structuredClone(DEMO_COURSES));ASSIGNMENTS=structuredClone(DEMO_ASSIGNMENTS);mode='demo';ACTIVITY.splice(0);refreshAll();$('#canvasStatus').textContent='Disconnected. Sample data is shown. Your local notes remain on this device.';};
function refreshAll(){statusFilter='All';renderDashboard();initLedger();renderCourses();renderNotes();renderLab();renderAutopilot();}
// Do not claim unimplemented AI, analytics, submission, or encrypted storage.
$('#syncLabel').textContent='Demo workspace · not synced';
$('.side-user-meta .tiny').textContent='Your academic space';
$('#view-lab .grid3').insertAdjacentHTML('beforebegin','<p class="small muted mt">The charts and flashcards below are examples, not analytics from your school.</p>');
$('#view-copilot .section-title p').textContent='Powered by Google Gemini when a key is set (Settings); otherwise a built-in guide.';
$('#view-copilot .chat-box').innerHTML='';addMsg('ai','<b>Welcome to your study guide.</b><br>Ask what is due or request a simple study plan. This guide uses templates, not an AI model.');
$('#view-ledger .card-head p').textContent='Computed from synced scores and category weights; missing work counts as zero. Projections assume the selected average on pending work. GPA is an unweighted estimate, not an official transcript.';
$('#projGpa').parentElement.nextElementSibling.querySelector('.mono').textContent='Estimate';
$('#hsGpa').title='Illustrative demo projection only';
$('#canvasStatus').textContent=hadOldToken?'An earlier version stored your token in plain text and may have sent it to a third-party proxy. Consider revoking it in Canvas and creating a new token.':'Demo mode: sample coursework is shown until you connect.';
const existing=getCredentials();if(existing){$('#canvasUrl').value=existing.base;$('#canvasProxy').value=existing.proxy||'';$('#canvasStatus').textContent='Session found. Tap Sync Canvas to load your coursework.';}
bootstrapDebug();
renderPeriodsManager();
if($('#geminiKey')) $('#geminiKey').value=getAiKey();
if($('#geminiModel')) $('#geminiModel').value=getAiModel();
if($('#aiStatus')) $('#aiStatus').textContent=getAiKey()?'Gemini key available for this session.':'No Gemini key set — the built-in guide is active.';
refreshAll();
if(existing) syncCanvas();
})();
