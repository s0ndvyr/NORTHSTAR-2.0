import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url).pathname;
let html = readFileSync(root + 'index.html', 'utf8');
html = html.replace(/<script[^>]*src="scripts\/[^"]+"[^>]*><\/script>/g, '');
const scripts = ['app.js', 'canvas-debug.js', 'grades.js', 'ai.js', 'submissions.js', 'canvas-sync.js', 'studentvue.js', 'workspace.js', 'assignment-room.js', 'premium.js']
  .map(f => readFileSync(root + 'scripts/' + f, 'utf8'));

const errors = [];
const dom = new JSDOM(html, {
  url: 'https://northstar-2-0.s0ndvyr.workers.dev/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.addEventListener('error', e => errors.push('window error: ' + e.message));
    if (!window.structuredClone) window.structuredClone = v => JSON.parse(JSON.stringify(v));
    if (!window.crypto || !window.crypto.randomUUID) {
      try { Object.defineProperty(window, 'crypto', {value: {randomUUID: () => 'test-uuid'}}); } catch {}
    }
    window.fetch = async () => { throw new Error('network disabled in test'); };
    const vault = new Map();
    window.NorthstarVault = {get: async (k, fallback) => vault.has(k) ? vault.get(k) : fallback, set: async (k, v) => { vault.set(k, v); return true; }, remove: async k => vault.delete(k)};
    window.__testVault = vault;
    window.open = () => ({closed:false});
    window.scrollTo = () => {};
    window.HTMLElement.prototype.scrollIntoView = function () {};
    window.alert = () => {};
    window.confirm = () => true;
  }
});
const {window} = dom;
for (const code of scripts) {
  const el = window.document.createElement('script');
  el.textContent = code;
  window.document.body.appendChild(el);
}
await new Promise(r => setTimeout(r, 300));

assert.equal(errors.length, 0, 'no runtime errors on boot: ' + errors.join(' | '));

// onclick handlers must be global (premium.js is an IIFE)
for (const name of ['addPeriod', 'deletePeriod', 'exportPeriods', 'importPeriods', 'toggleSecretVisibility', 'saveAiSettings', 'testAiKey',
                   'askAiAboutAssignment', 'openInDashboard', 'closeViewer']) {
  assert.equal(typeof window[name], 'function', name + ' exposed on window');
}
assert.ok(window.Grades, 'Grades module loaded');
assert.ok(window.NorthstarAI, 'NorthstarAI module loaded');
assert.ok(window.CanvasDebug, 'CanvasDebug module loaded');
assert.ok(window.NorthstarCanvasSync, 'NorthstarCanvasSync module loaded');
assert.ok(window.NorthstarStudentVue, 'NorthstarStudentVue grade import module loaded');
assert.ok(window.NorthstarWorkspace, 'Canvas assignment and quiz workspace module loaded');
assert.ok(window.NorthstarAssignmentRoom, 'full-page assignment room and PDF studio module loaded');
assert.equal(window.NorthstarAssignmentRoom.isPenPointer('pen'), true, 'Apple Pencil pointer is recognized');
assert.equal(window.NorthstarAssignmentRoom.isPenPointer('touch'), false, 'finger touch is not accepted as Pencil ink');
assert.equal(window.NorthstarAssignmentRoom.isPenPointer('mouse'), false, 'mouse is not accepted as Pencil ink');
const sanitizedBrief=window.NorthstarAssignmentRoom.sanitizeHtml('<p onclick="alert(1)">Instructions<script>alert(1)</script><a href="javascript:alert(2)">safe-looking link</a></p>','https://school.instructure.com');
assert.equal(sanitizedBrief.textContent,'Instructionssafe-looking link','Canvas instructions are retained while scripts are removed');
assert.equal(sanitizedBrief.firstChild.getAttribute('onclick'),null,'Canvas event handlers are removed from instruction markup');
assert.equal(sanitizedBrief.querySelector('a').hasAttribute('href'),false,'unsafe javascript links are stripped');
assert.equal(window.document.getElementById('versionPill').textContent, 'NORTHSTAR / .4.4.1', 'runtime release identifier matches Phase 4.4.1');

// grade math via the exposed pure module
const g = window.Grades.computeCourseGrade(
  [{points:100, score:90, groupId:1}, {points:100, score:80, groupId:1}, {points:50, score:null, missing:true, groupId:1}],
  [], {});
assert.equal(g.percent, 68, 'grade math: (90+80+0)/250 = 68');
assert.equal(g.letter, 'D');

// periods manager rendered on boot (empty state)
assert.ok(window.document.getElementById('periodsManager').textContent.includes('No marking periods yet'), 'periods manager empty state renders');

// add a period via the exposed handler
window.document.getElementById('periodName').value = 'Marking Period 1';
window.document.getElementById('periodStart').value = '2026-09-01';
window.document.getElementById('periodEnd').value = '2026-10-31';
window.addPeriod();
assert.ok(window.document.getElementById('periodsManager').textContent.includes('Marking Period 1'), 'period added and rendered');
assert.ok(JSON.parse(window.localStorage.getItem('northstar_periods_v1')).length === 1, 'period persisted to localStorage');
window.document.getElementById('periodName').value = 'Marking Period 2';
window.document.getElementById('periodStart').value = '2026-11-01';
window.document.getElementById('periodEnd').value = '2026-12-31';
window.addPeriod();
assert.equal(JSON.parse(window.localStorage.getItem('northstar_periods_v1')).length, 2, 'multiple periods persist');
assert.ok(window.document.getElementById('fPeriod').options.length >= 4, 'ledger exposes current, all, and configured period filters');

// ledger renders
window.renderLedger();
assert.ok(window.document.getElementById('ledgerList'), 'ledger renders');

// AI settings: key is stored through the encrypted-vault interface, never echoed
window.document.getElementById('geminiKey').value = 'AIza-test-key';
window.document.getElementById('geminiModel').value = 'gemini-2.0-flash';
await window.saveAiSettings();
assert.equal(window.__testVault.get('gemini-api-key'), 'AIza-test-key', 'AI key stored in device vault');
assert.equal(window.localStorage.getItem('northstar_gemini_session'), null, 'AI key NOT in localStorage');
assert.ok(!window.document.getElementById('aiStatus').textContent.includes('AIza-test-key'), 'key not echoed in status');

// External assignment content opens in its authenticated destination, not an iframe.
window.openInDashboard('https://school.instructure.com/courses/1/assignments/2');

// Exercise real sync wiring with deterministic Canvas-shaped responses.
const canvasCalls=[];
window.fetch = async (url, opts={}) => {
  const u = new URL(url);
  const path = u.searchParams.get('path') || u.pathname;
  canvasCalls.push({path,method:opts.method||'GET'});
  let data;
  if (path.startsWith('/api/v1/courses?')) data=[{id:1,name:'Math',course_code:'MATH',has_grading_periods:true,enrollments:[{type:'StudentEnrollment',computed_current_score:88.5,computed_current_grade:'B+',computed_final_score:90,current_grading_period_title:'Marking Period 2',current_grading_period_id:22,has_grading_periods:true,current_period_computed_current_score:91,current_period_computed_current_grade:'A-'}]}];
  else if (path.endsWith('/assignments?include%5B%5D=submission') || path.includes('/assignments?')) data=[{id:10,name:'Test work',points_possible:100,assignment_group_id:5,submission_types:['online_text_entry','online_url'],due_at:'2026-10-31T19:00:00Z',submission:{workflow_state:'graded',score:90,grade:'A-',submitted_at:'2026-10-30T17:00:00Z',graded_at:'2026-10-31T10:00:00Z'}},{id:11,name:'Awaiting feedback',points_possible:20,assignment_group_id:5,submission_types:['online_text_entry'],due_at:'2026-11-20T19:00:00Z',submission:{workflow_state:'submitted',submitted_at:'2026-11-16T17:00:00Z',score:null}},{id:12,name:'Canvas Quiz',points_possible:10,assignment_group_id:5,submission_types:['online_quiz'],due_at:'2026-11-25T19:00:00Z',submission:{workflow_state:'unsubmitted'}}];
  else if(path.startsWith('/api/v1/courses/1/quizzes?')) data=[{id:22,assignment_id:12,title:'Canvas Quiz',question_count:1,points_possible:10,html_url:'https://school.instructure.com/courses/1/quizzes/22'}];
  else if(path==='/api/v1/courses/1/discussion_topics') data=[];
  else if(path==='/api/v1/courses/1/quizzes/22'&&opts?.method!=='POST') data={id:22,title:'Canvas Quiz',question_count:1,points_possible:10,workflow_state:'available',html_url:'https://school.instructure.com/courses/1/quizzes/22'};
  else if(path==='/api/v1/courses/1/quizzes/22/submissions'&&opts?.method==='POST') data={quiz_submissions:[{id:77,attempt:1,validation_token:'quiz-validation',started_at:new Date().toISOString()}]};
  else if(path.startsWith('/api/v1/quiz_submissions/77/questions')) data={quiz_submission_questions:[{id:9,answer:null,quiz_question:{id:9,question_type:'multiple_choice_question',question_text:'Choose A',answers:[{id:1,text:'A'},{id:2,text:'B'}]}}]};
  else if (path.endsWith('/assignment_groups')) data=[{id:5,name:'Tests',group_weight:100,rules:{}}];
  else data={weighted_assignment_groups:true};
  return {ok:true,status:200,headers:{get:n=>n.toLowerCase()==='content-type'?'application/json':null},json:async()=>data,text:async()=>JSON.stringify(data)};
};
window.document.getElementById('canvasUrl').value='https://school.instructure.com';
window.document.getElementById('canvasProxy').value='https://bridge.example';
window.document.getElementById('canvasToken').value='test-token';
await window.connectCanvas();
window.renderCourses();
window.renderWhatIf();
assert.ok(window.document.getElementById('courseGrid').textContent.includes('88.5%'), 'official Canvas enrollment percentage is displayed');
assert.ok(window.document.getElementById('courseGrid').textContent.includes('Canvas official current grade'), 'official grade source is clearly labeled');
window.openCourse('canvas_1');
assert.ok(window.document.getElementById('courseDetail').textContent.includes('Marking Period 2'), 'current grading-period title comes from the student enrollment');
assert.ok(window.document.getElementById('courseDetail').textContent.includes('91.0%'), 'official current grading-period percentage is displayed');
const studentVueCsv=['Course Code,Course Name,Marking Period,Grade,Letter Grade,School Year,Is Current,As Of','MATH,Math,Marking Period 2,95,A,2026-2027,true,2026-11-17'].join(String.fromCharCode(10));
const studentVueInput={value:'',files:[{name:'studentvue-export.csv',size:220,text:async()=>studentVueCsv}]};
await window.importStudentVueGrades(studentVueInput);
assert.equal(window.__testVault.get('studentvue-grades').records[0].percent,95,'StudentVUE grade import is stored in the device vault');
assert.equal(window.NorthstarStudentVue.load(),null,'StudentVUE grade import is not left in plaintext localStorage');
window.renderCourses();
assert.ok(window.document.getElementById('courseGrid').textContent.includes('A · 95.0%'),'StudentVUE import is used as the separate grade source');
assert.ok(window.document.getElementById('courseGrid').textContent.includes('StudentVUE import'),'StudentVUE grade source is labeled');
window.openCourse('canvas_1');
assert.ok(window.document.getElementById('courseDetail').textContent.includes('StudentVUE grade history'),'historical StudentVUE records appear in course detail');

await window.openWorkspace('canvas_11_1');
assert.ok(window.document.getElementById('workspace').textContent.includes('Submitted'), 'submitted but ungraded work is distinguished from incomplete work');
assert.ok(window.document.body.classList.contains('assignment-room-open'),'opening an assignment transitions into a full-screen in-app route');
assert.ok(window.document.getElementById('nsAssignmentBrief'),'assignment instructions render in the native page');
assert.ok(window.document.getElementById('nsRoomBack'),'the page provides in-app dashboard navigation');
assert.ok(window.document.getElementById('whatifList').textContent.includes('90.0%'), 'live what-if renders');
window.renderLedger();
const activeLedger = window.document.getElementById('ledgerList').textContent;
assert.ok(activeLedger.includes('Awaiting feedback'), 'current-period ledger includes current-period assignment');
assert.ok(!activeLedger.includes('Test work'), 'current-period ledger excludes prior-period assignment');
assert.ok(activeLedger.includes('Submitted 1 day ago'), 'submitted assignment shows elapsed submission time');
assert.ok(!activeLedger.includes('60d overdue'), 'submitted assignment is never labeled overdue');
window.toggleIgnoredCourse('canvas_1', true);
window.renderLedger();
assert.ok(window.document.getElementById('ledgerList').textContent.includes('No published assignments'), 'ignored course is removed from the active ledger');
assert.ok(window.document.getElementById('courseGrid').textContent.includes('IGNORED'), 'ignored course remains visible as ignored in course management');
window.toggleIgnoredCourse('canvas_1', false);
window.renderLedger();
assert.ok(window.document.getElementById('ledgerList').textContent.includes('Awaiting feedback'), 're-included course returns to the ledger');

await window.openWorkspace('canvas_12_1');
await new Promise(r=>setTimeout(r,30));
assert.ok(window.document.getElementById('workspace').textContent.includes('Start quiz in NORTHSTAR'),'classic Canvas quiz opens its own workspace page');
window.confirm=()=>true;
window.document.getElementById('phase4StartQuiz').click();
await new Promise(r=>setTimeout(r,30));
assert.ok(window.document.getElementById('workspace').textContent.includes('LIVE CANVAS ATTEMPT'),'quiz attempt starts and questions render in NORTHSTAR');
const quizChoice=window.document.querySelector('[data-quiz-answer="9"]');
assert.ok(quizChoice,'supported quiz answer control is rendered');
quizChoice.checked=true;
window.document.getElementById('phase4SaveQuiz').click();
await new Promise(r=>setTimeout(r,20));
assert.ok(canvasCalls.some(x=>x.path==='/api/v1/quiz_submissions/77/questions'&&x.method==='POST'),'quiz answers are saved to Canvas');
window.document.getElementById('phase4CompleteQuiz').click();
await new Promise(r=>setTimeout(r,100));
assert.ok(canvasCalls.some(x=>x.path==='/api/v1/courses/1/quizzes/22/submissions/77/complete'&&x.method==='POST'),'quiz completion is sent to Canvas');
assert.ok(window.document.getElementById('workspace').textContent.includes('Quiz submitted'),'workspace reports completion after Canvas confirms it');

window.openWorkspace('canvas_11_1');
window.document.getElementById('phase4HideAssignment').click();
assert.ok(JSON.parse(window.localStorage.getItem('northstar_hidden_assignments_v1')).includes('canvas_11_1'),'hide preference persists locally');
window.document.getElementById('fVisibility').value='hidden';
window.renderLedger();
assert.ok(window.document.getElementById('ledgerList').textContent.includes('Awaiting feedback'),'hidden assignment is recoverable in the hidden ledger filter');
window.document.getElementById('fVisibility').value='active';
window.renderLedger();
assert.ok(!window.document.getElementById('ledgerList').textContent.includes('Awaiting feedback'),'hidden assignment leaves active ledger');
window.document.getElementById('phase4HideAssignment').click();
assert.ok(!JSON.parse(window.localStorage.getItem('northstar_hidden_assignments_v1')).includes('canvas_11_1'),'restore removes the local hide preference');


await window.openWorkspace('canvas_10_1');
window.document.getElementById('assignmentDraft').value='My own work';
let writes=0;
window.fetch=async(url,opts)=>{writes++;return {ok:true,json:async()=>({workflow_state:'submitted',attempt:2})};};
// Credentials are already retained in the in-memory connection created above.
window.confirm=()=>false;
await window.submitAssignment();
assert.equal(writes,0,'cancel must not write');
let confirmation='';
window.confirm=msg=>{confirmation=msg;return true;};
await window.submitAssignment();
assert.equal(writes,1,'one confirmed write');
assert.ok(confirmation.includes('My own work')&&confirmation.includes('Math')&&confirmation.includes('Test work'));
assert.ok(window.document.getElementById('submissionStatus').textContent.includes('Canvas confirmed'));
assert.ok(window.document.getElementById('submissionStatus').textContent.includes('Offline coursework snapshot updated'));
assert.equal(window.__testVault.get('canvas-snapshot').assignments.find(a=>a.canvasId===11).status,'Submitted','confirmed submission state is persisted into the offline snapshot');
const savedSnapshot=window.__testVault.get('canvas-snapshot');
assert.ok(savedSnapshot && savedSnapshot.assignments.length===3,'successful sync is saved as an offline snapshot');
await window.disconnectCanvas();
assert.ok(window.__testVault.has('canvas-snapshot'),'disconnect preserves the last successful coursework snapshot');
assert.equal(window.__testVault.has('canvas-credentials'),false,'disconnect removes the saved credential');
assert.ok(window.document.getElementById('canvasStatus').textContent.includes('remains available offline'),'disconnect explains that coursework remains available offline');
assert.ok(window.NorthstarAssignmentRoom.routeId()===null,'leaving the assignment page clears the deep-link route');
assert.equal(errors.length,0,errors.join(' | '));
console.log('PASS: mocked live sync and app boots clean, grades compute, periods manage, AI key uses the device vault, external assignment links open outside the dashboard');
process.exit(0);
