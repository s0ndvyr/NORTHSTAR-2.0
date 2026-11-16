/* NORTHSTAR: truthful, read-only Canvas integration and local-first workspace. */
(() => {
'use strict';
const DEMO_COURSES = structuredClone(COURSES);
const DEMO_ASSIGNMENTS = structuredClone(ASSIGNMENTS);
let mode = 'demo', activeAssignment = null;
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
const safe = value => String(value ?? '').replace(/[&<>"'`]/g, '');
const asText = html => { const node = document.createElement('div'); node.innerHTML = html || ''; return safe(node.textContent.trim()); };
const urlFrom = value => {
  const u = new URL(value.trim());
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) throw Error('Use an HTTPS origin only, without a path, username, or query string.');
  return u.origin;
};
function getCredentials() { try { return JSON.parse(sessionStorage.getItem('northstar_canvas_session') || 'null'); } catch { return null; } }
function setCredentials(c) { sessionStorage.setItem('northstar_canvas_session', JSON.stringify(c)); }
async function canvasPage(creds, path) {
  const api = new URL(path, creds.base);
  if (api.origin !== creds.base || !api.pathname.startsWith('/api/v1/')) throw Error('Invalid Canvas API path.');
  let target = api.href;
  if (creds.proxy) { const bridge = new URL(creds.proxy); bridge.searchParams.set('path', api.pathname + api.search); target = bridge.href; }
  let response;
  try { response = await fetch(target, {headers:{Authorization:'Bearer '+creds.token, Accept:'application/json'}, redirect:'error', cache:'no-store'}); }
  catch { throw Error('Browser could not reach Canvas. Your school may block cross-origin requests; deploy the included private bridge, then enter its URL. Also check the school URL and connection.'); }
  if (response.status === 401) throw Error('Canvas rejected the token (401). Check that it belongs to this school and has not expired.');
  if (response.status === 403) throw Error('Canvas denied access (403). Check the token permissions, school policy, and bridge settings.');
  if (!response.ok) throw Error('Canvas returned HTTP '+response.status+'. Check the school URL and bridge settings.');
  try { return await response.json(); } catch { throw Error('Canvas did not return valid JSON. Check the school URL and bridge.'); }
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
    return {id:'canvas_'+a.id+'_'+c.canvasId, canvasId:a.id, title:safe(a.name || 'Untitled assignment'), course:c.id, type:typeOf(a), due:hasDue?parsed:new Date('2999-01-01T00:00:00Z'), noDue:!hasDue, points:Number(a.points_possible)||0, priority:'Normal', status:sub.workflow_state==='graded'?'Completed':isDone?'Submitted':sub.missing?'Missing':'Not Started', progress:isDone?100:0, desc:asText(a.description).slice(0,1000) || 'Open this assignment in Canvas for its full instructions.', rubric:[], canvasUrl:href};
  });
}
const originalRenderDashboard=renderDashboard, originalRenderLab=renderLab;
const oldMomentum=renderMomentum; renderMomentum=function(){if(mode==='demo'){oldMomentum();return;}$('#momentumList').innerHTML=COURSES.map(c=>{const as=ASSIGNMENTS.filter(a=>a.course===c.id);const done=as.filter(a=>['Submitted','Completed'].includes(a.status)).length;return `<div class="mom-row" onclick="openCourse('${c.id}')"><div class="flex" style="justify-content:space-between"><b class="small">${c.code}</b><span class="small muted">${done}/${as.length} submitted</span></div><div class="progress mt"><i style="width:${as.length?Math.round(done/as.length*100):0}%"></i></div></div>`;}).join('') || '<p class="small muted">No courses found.</p>';};
const originalRelDue=relDue;
relDue = d => new Date(d).getFullYear() >= 2999 ? 'No due date' : originalRelDue(d);
statusOf = a => { if(a.status==='Completed'||a.status==='Submitted') return a.status; if(a.status==='Missing') return 'Missing'; if(a.noDue)return a.status; const now=new Date(), d=new Date(a.due); if(d<now)return 'Overdue'; if(d.toDateString()===now.toDateString())return 'Due Today'; return a.status; };
function dynamicOverview() {
  const pending=ASSIGNMENTS.filter(a=>!['Completed','Submitted'].includes(a.status));
  const today=pending.filter(a=>statusOf(a)==='Due Today'), late=pending.filter(a=>['Overdue','Missing'].includes(statusOf(a)));
  $('#heroSub').textContent=`${today.length} due today  ·  ${late.length} need attention  ·  ${pending.length} open`; 
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
renderLedger = function(){ oldRenderLedger(); $('#ledgerCount').textContent=`${$('#ledgerList').children.length} shown · ${ASSIGNMENTS.length} assignments · ${mode==='live'?'Canvas':'sample data'}`; };
const oldRenderWhatIf=renderWhatIf;
renderWhatIf = function(){ if(mode==='live' || !COURSES.length) { $('#whatifList').innerHTML='<p class="small muted">A reliable projection needs your school’s grading weights and credit values. Not available from this sync.</p>'; $('#projGpa').textContent='—'; $('#projDelta').textContent='—'; $('#hsGpa').textContent='—'; return; } oldRenderWhatIf(); };
const oldRenderCourses=renderCourses;
renderCourses = function(){ if(mode==='demo') {oldRenderCourses();return;} $('#courseGrid').innerHTML=COURSES.map(c=>{const work=ASSIGNMENTS.filter(a=>a.course===c.id); const done=work.filter(a=>['Completed','Submitted'].includes(a.status)).length; return `<button class="card course-card" style="--cc:${c.color};text-align:left" onclick="openCourse('${c.id}')"><span class="course-code">${c.code}</span><h3>${c.name}</h3><p class="muted small">Canvas course</p><div class="mini-stats"><div><b>${work.length}</b><span>Assignments</span></div><div><b>${done}</b><span>Submitted</span></div><div><b>—</b><span>Grade</span></div></div></button>`;}).join('') || '<p class="muted">No active Canvas courses were returned.</p>'; };
openCourse = function(id){ const c=courseById(id);if(!c)return;showView('courses');const list=ASSIGNMENTS.filter(a=>a.course===id).sort((a,b)=>a.due-b.due); $('#courseDetail').innerHTML=`<div class="card"><div class="card-head"><div><span class="eyebrow">${c.code}</span><h3 style="font:500 28px var(--serif);margin-top:8px">${c.name}</h3><p>${mode==='live'?'Canvas coursework':'Example course'}</p></div></div><h4 class="small">COURSEWORK</h4>${list.map(a=>`<button class="prio" style="width:100%;text-align:left" onclick="openWorkspace('${a.id}')"><div class="prio-info"><b>${esc(a.title)}</b><span>${a.type} · ${a.points} points</span></div><span class="small">${relDue(a.due)}</span></button>`).join('')||'<p class="small muted mt">No assignments found.</p>'}</div>`; $('#courseDetail').scrollIntoView({behavior:'smooth'}); };
openWorkspace = function(id){
  const a=ASSIGNMENTS.find(x=>x.id===id);if(!a)return;activeAssignment=a;const c=courseById(a.course);const key='northstar_draft_'+a.id;
  $('#workspace').innerHTML=`<div class="ws-head"><div><span class="eyebrow">${c.code} / ${a.type}</span><h2>${esc(a.title)}</h2><p class="small muted mt">${a.noDue?'No due date':fmtDate(a.due)+' · '+fmtTime(a.due)} · ${a.points} points · ${statusOf(a)}</p></div><button class="ws-close" aria-label="Close" onclick="closeOverlay('wsOverlay')">✕</button></div><div class="ws-body"><div class="grid2"><div><div class="card"><div class="card-head"><div><h3>Your workspace</h3><p>Private draft saved in this browser</p></div></div><textarea class="editor" id="assignmentDraft" placeholder="Plan your work, collect notes, or write a first draft…"></textarea><p id="draftStatus" class="small muted mt">Saved locally, not submitted.</p></div></div><div><div class="card"><span class="eyebrow">THE BRIEF</span><p class="small mt" style="line-height:1.75">${esc(a.desc)}</p><div class="divider"></div>${a.canvasUrl?`<a class="btn btn-primary" href="${a.canvasUrl}" target="_blank" rel="noopener noreferrer">Open in Canvas ↗</a>`:'<p class="small muted">This is sample coursework. Connect Canvas to see your assignments.</p>'}<p class="small muted mt">Complete or submit coursework in Canvas. Northstar does not submit on your behalf.</p></div></div></div></div>`;
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
  let creds; try{const base=urlFrom($('#canvasUrl').value);const token=$('#canvasToken').value.trim();const proxy=$('#canvasProxy').value.trim()?urlFrom($('#canvasProxy').value):'';if(!token)throw Error('Enter your Canvas access token.');creds={base,token,proxy};}catch(e){$('#canvasStatus').textContent=e.message;return;}
  $('#canvasStatus').textContent='Connecting and loading courses…';$('#connectAction').disabled=true;
  try{await pullCanvas(creds);setCredentials(creds);$('#canvasToken').value='';$('#canvasStatus').textContent=`Connected: ${COURSES.length} courses and ${ASSIGNMENTS.length} assignments loaded. Token retained only for this browser session.`;toast('Canvas connected and coursework synced');}
  catch(e){$('#canvasStatus').textContent=e.message;$('#canvasTroubleshoot').open=true;toast('Canvas connection failed. See the troubleshooting checklist.');}finally{$('#connectAction').disabled=false;}
};
async function pullCanvas(creds){
  const rawCourses=await allPages(creds,'/api/v1/courses?enrollment_state=active');const courses=convertCourses(rawCourses);let assignments=[];
  for(const c of courses){const rows=await allPages(creds,`/api/v1/courses/${c.canvasId}/assignments?include%5B%5D=submission`);assignments.push(...convertAssignments(rows,c,creds.base));}
  COURSES.splice(0,COURSES.length,...courses);ASSIGNMENTS=assignments;mode='live';ACTIVITY.splice(0,ACTIVITY.length,{icon:'↻',color:'#a7d9bd',title:'Canvas synced',sub:`${assignments.length} assignments · ${courses.length} courses`,time:'Just now'}); refreshAll();
}
syncCanvas = async function(){const c=getCredentials();if(!c){openConnect();toast('Connect Canvas first.');return;}toast('Syncing Canvas…');try{await pullCanvas(c);toast('Canvas sync complete');}catch(e){$('#canvasStatus').textContent=e.message;$('#canvasTroubleshoot').open=true;openConnect();toast('Canvas sync failed. See the troubleshooting checklist.');}};
window.disconnectCanvas = function(){sessionStorage.removeItem('northstar_canvas_session');$('#canvasToken').value='';COURSES.splice(0,COURSES.length,...structuredClone(DEMO_COURSES));ASSIGNMENTS=structuredClone(DEMO_ASSIGNMENTS);mode='demo';ACTIVITY.splice(0);refreshAll();$('#canvasStatus').textContent='Disconnected. Sample data is shown. Your local notes remain on this device.';};
function refreshAll(){statusFilter='All';renderDashboard();initLedger();renderCourses();renderNotes();renderLab();renderAutopilot();}
// Do not claim unimplemented AI, analytics, submission, or encrypted storage.
$('#syncLabel').textContent='Demo workspace · not synced';
$('.side-user-meta .tiny').textContent='Your academic space';
$('#view-lab .grid3').insertAdjacentHTML('beforebegin','<p class="small muted mt">The charts and flashcards below are examples, not analytics from your school.</p>');
$('#view-copilot .section-title p').textContent='A rule-based study guide. Suggestions stay in this browser.';
$('#view-copilot .chat-box').innerHTML='';addMsg('ai','<b>Welcome to your study guide.</b><br>Ask what is due or request a simple study plan. This guide uses templates, not an AI model.');
$('#view-ledger .card-head p').textContent='Sample calculator only. Your school may use different grading weights.';
$('#projGpa').parentElement.nextElementSibling.querySelector('.mono').textContent='Sample';
$('#hsGpa').title='Illustrative demo projection only';
$('#canvasStatus').textContent=hadOldToken?'An earlier version stored your token in plain text and may have sent it to a third-party proxy. Consider revoking it in Canvas and creating a new token.':'Demo mode: sample coursework is shown until you connect.';
const existing=getCredentials();if(existing){$('#canvasUrl').value=existing.base;$('#canvasProxy').value=existing.proxy||'';$('#canvasStatus').textContent='Session found. Tap Sync Canvas to load your coursework.';}
refreshAll();
if(existing) syncCanvas();
})();
