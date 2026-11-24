import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';

const root = new URL('../', import.meta.url).pathname;
const releaseManifest = JSON.parse(readFileSync(root + 'release.json', 'utf8'));
let html = readFileSync(root + 'index.html', 'utf8');
html = html.replace(/<script[^>]*src="scripts\/[^"]+"[^>]*><\/script>/g, '');
const scripts = ['app.js', 'canvas-debug.js', 'grades.js', 'ai.js', 'submissions.js', 'document-export.js', 'canvas-sync.js', 'studentvue.js', 'workspace.js', 'assignment-execution.js', 'document-storage.js', 'assignment-room.js', 'document-editor.js', 'release.js', 'premium.js']
  .map(f => readFileSync(root + 'scripts/' + f, 'utf8'));

const errors = [];
const dom = new JSDOM(html, {
  url: 'https://northstar-2-0.s0ndvyr.workers.dev/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.addEventListener('error', e => errors.push('window error: ' + e.message));
    if (!window.structuredClone) window.structuredClone = v => JSON.parse(JSON.stringify(v));
    try {
      Object.defineProperty(window, 'crypto', {value: {
        subtle: webcrypto.subtle,
        randomUUID: () => 'test-uuid',
        getRandomValues: array => webcrypto.getRandomValues(array)
      }, configurable:true});
    } catch {}
    if (window.File && !window.File.prototype.arrayBuffer) {
      Object.defineProperty(window.File.prototype, 'arrayBuffer', {configurable:true, value:function(){
        return new Promise((resolve,reject)=>{
          const reader=new window.FileReader();
          reader.onload=()=>resolve(reader.result);
          reader.onerror=()=>reject(reader.error||new Error('File read failed'));
          reader.readAsArrayBuffer(this);
        });
      }});
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
assert.equal(typeof window.NorthstarDocumentExport?.createWordDocument, 'function', 'native Word response exporter is loaded before the assignment workspace');
assert.ok(window.NorthstarAssignmentRoom, 'full-page assignment room and PDF studio module loaded');
assert.ok(window.NorthstarDocumentEditor, 'editable Document Studio text-object module loaded');
assert.ok(window.NorthstarRelease, 'release manifest and changelog controls are registered');
assert.ok(window.document.getElementById('versionPill'), 'release history is reachable from the visible version indicator');
assert.equal(window.NorthstarAssignmentRoom.isPenPointer('pen'), true, 'Apple Pencil pointer is recognized');
assert.equal(window.NorthstarAssignmentRoom.isPenPointer('touch'), false, 'finger touch is not accepted as Pencil ink');
assert.equal(window.NorthstarAssignmentRoom.isPenPointer('mouse'), false, 'mouse is not accepted as Pencil ink');
assert.equal(window.NorthstarAssignmentRoom.canAnnotatePointer('pen','pencil'), true, 'Apple Pencil is the selected Pencil-mode input');
assert.equal(window.NorthstarAssignmentRoom.canAnnotatePointer('touch','hand'), true, 'finger input is enabled in Hand mode');
assert.equal(window.NorthstarAssignmentRoom.canAnnotatePointer('mouse','hand'), true, 'mouse input is enabled in Hand mode for desktop testing');
assert.equal(window.NorthstarAssignmentRoom.canAnnotatePointer('pen','hand'), false, 'Apple Pencil does not bypass Hand mode');
assert.equal(window.NorthstarAssignmentRoom.canAnnotatePointer('touch','pencil'), false, 'finger input does not bypass Pencil mode');
assert.equal(window.NorthstarAssignmentRoom.canAnnotatePointer('mouse','pencil'), false, 'mouse input does not bypass Pencil mode');
const pdfTools=['select','pen','highlight','text','line','arrow','rectangle','ellipse','eraser'];
for(const tool of pdfTools){
 assert.equal(window.NorthstarAssignmentRoom.canUseAnnotationTool(tool,'touch','hand'),true,tool+' works with finger in Hand mode');
 assert.equal(window.NorthstarAssignmentRoom.canUseAnnotationTool(tool,'mouse','hand'),true,tool+' works with mouse in Hand mode');
 assert.equal(window.NorthstarAssignmentRoom.canUseAnnotationTool(tool,'pen','pencil'),true,tool+' works with Apple Pencil in Pencil mode');
 assert.equal(window.NorthstarAssignmentRoom.canUseAnnotationTool(tool,'pen','hand'),false,tool+' respects Hand input selection');
 assert.equal(window.NorthstarAssignmentRoom.canUseAnnotationTool(tool,'touch','pencil'),false,tool+' respects Pencil input selection');
 assert.equal(window.NorthstarAssignmentRoom.canUseAnnotationTool(tool,'mouse','pencil'),false,tool+' rejects mouse in Pencil mode');
}
window.NorthstarAssignmentRoom.setInputMode('hand');
for(const tool of pdfTools){
 assert.equal(window.NorthstarAssignmentRoom.setActiveTool(tool),true,'tool '+tool+' can be selected');
 const handState=window.NorthstarAssignmentRoom.getInputState();
 assert.equal(handState.mode,'hand','selecting '+tool+' never switches Hand mode');
 assert.equal(handState.tool,tool,'the requested tool remains selected in Hand mode');
}
window.NorthstarAssignmentRoom.setInputMode('pencil');
for(const tool of pdfTools){
 assert.equal(window.NorthstarAssignmentRoom.setActiveTool(tool),true,'tool '+tool+' remains selectable in Pencil mode');
 const pencilState=window.NorthstarAssignmentRoom.getInputState();
 assert.equal(pencilState.mode,'pencil','selecting '+tool+' never switches Pencil mode');
 assert.equal(pencilState.tool,tool,'the requested tool remains selected in Pencil mode');
}
assert.equal(window.NorthstarAssignmentRoom.setActiveTool('invalid-tool'),false,'unknown tools cannot corrupt editor state');
window.NorthstarAssignmentRoom.setInputMode('hand');
const pdfDistance=window.NorthstarAssignmentRoom.distanceToSegment({x:.5,y:.54},{x:.1,y:.5},{x:.9,y:.5},100,100);
assert.equal(Math.round(pdfDistance),4,'stroke hit-testing measures distance in page pixels');
const pdfStroke={tool:'pen',points:[{x:.1,y:.5},{x:.9,y:.5}]};
assert.equal(window.NorthstarAssignmentRoom.pointHitsStroke({x:.5,y:.54},pdfStroke,100,100,5),true,'eraser and selection can hit a stroke between sampled points');
assert.equal(window.NorthstarAssignmentRoom.pointHitsStroke({x:.5,y:.7},pdfStroke,100,100,5),false,'stroke hit-testing rejects distant points');
assert.equal(window.NorthstarAssignmentRoom.wrapTextLines('alpha beta gamma',10,value=>value.length*5).join('|'),'alpha|beta|gamma','text boxes wrap content into readable lines');
assert.equal(window.NorthstarAssignmentRoom.wrapTextLines('first line\nsecond line',100,value=>value.length*5).join('|'),'first line|second line','text boxes preserve manual line breaks');
const tapTextBox=window.NorthstarAssignmentRoom.textBoxFromDrag({x:.4,y:.4},{x:.4,y:.4},24);
assert.ok(tapTextBox.width>=.28&&tapTextBox.height>=.09,'a text tap creates a usable default text box');
const dragTextBox=window.NorthstarAssignmentRoom.textBoxFromDrag({x:.2,y:.25},{x:.7,y:.55},80);
assert.ok(dragTextBox.width>.45&&dragTextBox.height>.25,'dragging sizes a text box to the selected region');
assert.ok(dragTextBox.x>=0&&dragTextBox.y>=0&&dragTextBox.x+dragTextBox.width<=1&&dragTextBox.y+dragTextBox.height<=1,'text boxes remain within the page bounds');
const richTextRuns = window.NorthstarAssignmentRoom.richTextRuns({
 text:'Overview',
 html:'<p>Overview</p><ul><li>Alpha</li><li>Beta</li></ul><ol><li>First</li><li>Second</li></ol>'
});
const richTextPlain = richTextRuns.map(run=>run.text).join('');
assert.ok(richTextPlain.includes('Overview\n• Alpha\n• Beta\n1. First\n2. Second'), 'rich-text list items preserve paragraph breaks, bullet markers, and ordered numbering');
const sanitizedBrief=window.NorthstarAssignmentRoom.sanitizeHtml('<p onclick="alert(1)">Instructions<script>alert(1)</script><a href="javascript:alert(2)">safe-looking link</a></p>','https://school.instructure.com');
assert.equal(sanitizedBrief.textContent,'Instructionssafe-looking link','Canvas instructions are retained while scripts are removed');
assert.equal(sanitizedBrief.firstChild.getAttribute('onclick'),null,'Canvas event handlers are removed from instruction markup');
assert.equal(sanitizedBrief.querySelector('a').hasAttribute('href'),false,'unsafe javascript links are stripped');
const cleanDraft=window.NorthstarSubmissions.sanitizeRichTextHtml('<p onclick="alert(1)">Safe<script>alert(1)</script><a href="javascript:alert(2)">link</a></p>');
assert.equal(cleanDraft,'<p>Safe<a>link</a></p>','rich text allowlist strips scripts, handlers and unsafe links');
assert.ok(window.document.getElementById('versionPill').textContent.includes(releaseManifest.northstarVersion), 'runtime release identifier matches the current NORTHSTAR manifest');

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
let pdfAssignmentSubmission=null;
const canvasCalls=[];
let currentQuizAttempt=null;
window.fetch = async (url, opts={}) => {
  const u = new URL(url);
  const path = u.searchParams.get('path') || u.pathname;
  canvasCalls.push({path,method:opts.method||'GET',body:opts.body?JSON.parse(opts.body):null});
  let data,status=200;
  if (path.startsWith('/api/v1/courses?')) data=[{id:1,name:'Math',course_code:'MATH',has_grading_periods:true,enrollments:[{type:'StudentEnrollment',computed_current_score:88.5,computed_current_grade:'B+',computed_final_score:90,current_grading_period_title:'Marking Period 2',current_grading_period_id:22,has_grading_periods:true,current_period_computed_current_score:91,current_period_computed_current_grade:'A-'}]}];
  else if (path.endsWith('/assignments?include%5B%5D=submission') || path.includes('/assignments?')) data=[{id:10,name:'Test work',points_possible:100,assignment_group_id:5,submission_types:['online_text_entry','online_url'],due_at:'2026-10-31T19:00:00Z',submission:{workflow_state:'graded',score:90,grade:'A-',submitted_at:'2026-10-30T17:00:00Z',graded_at:'2026-10-31T10:00:00Z'}},{id:11,name:'Awaiting feedback',points_possible:20,assignment_group_id:5,submission_types:['online_text_entry'],due_at:'2026-11-20T19:00:00Z',submission:{workflow_state:'submitted',submitted_at:new Date(Date.now()-36*60*60*1000).toISOString(),score:null}},{id:12,name:'Canvas Quiz',points_possible:10,assignment_group_id:5,submission_types:['online_quiz'],due_at:'2026-11-25T19:00:00Z',submission:{workflow_state:'unsubmitted'}},{id:13,name:'New Canvas Quiz',points_possible:5,assignment_group_id:5,submission_types:['online_quiz'],due_at:'2026-11-26T19:00:00Z',submission:{workflow_state:'unsubmitted'}},{id:14,name:'PDF Upload Test',points_possible:15,assignment_group_id:5,submission_types:['online_upload'],allowed_extensions:['pdf'],due_at:'2026-11-27T19:00:00Z',submission:{workflow_state:'unsubmitted'}}];
  else if(path.startsWith('/api/v1/courses/1/quizzes?')) data=[{id:22,assignment_id:12,title:'Canvas Quiz',question_count:1,points_possible:10,html_url:'https://school.instructure.com/courses/1/quizzes/22'}];
  else if(path==='/api/quiz/v1/courses/1/quizzes/12'){status=404;data={errors:['Not a New Quiz']};}
  else if(path==='/api/quiz/v1/courses/1/quizzes/13') data={id:13,title:'New Canvas Quiz',instructions:'<p>Read the passage before answering.</p>',points_possible:5,workflow_state:'published',has_time_limit:false};
  else if(path==='/api/quiz/v1/courses/1/quizzes/13/items') data=[{id:301,position:1,points_possible:5,entry_type:'Item',entry:{title:'Question One',item_body:'<p>What is the main idea?</p>',interaction_type_slug:'essay',interaction_data:{correct_answer:'DO NOT SHOW THIS'}}}];
  else if(path==='/api/v1/courses/1/discussion_topics') data=[];
  else if(path==='/api/v1/courses/1/quizzes/22'&&opts?.method!=='POST') data={id:22,title:'Canvas Quiz',question_count:1,points_possible:10,workflow_state:'available',html_url:'https://school.instructure.com/courses/1/quizzes/22'};
  else if(path==='/api/v1/courses/1/quizzes/22/submissions'&&opts?.method==='POST') { currentQuizAttempt={id:77,attempt:1,validation_token:'quiz-validation',started_at:new Date().toISOString(),workflow_state:'untaken',finished_at:null}; data={quiz_submissions:[currentQuizAttempt]}; }
  else if(path==='/api/v1/courses/1/quizzes/22/submissions/77/complete'&&opts?.method==='POST') { currentQuizAttempt={...currentQuizAttempt,workflow_state:'complete',finished_at:'2026-11-23T22:00:00.000Z'}; data={quiz_submission:{id:77,attempt:1,workflow_state:'complete'}}; }
  else if(path==='/api/v1/courses/1/quizzes/22/submission'&&opts?.method!=='POST') data={quiz_submissions:currentQuizAttempt?[currentQuizAttempt]:[]};
  else if(path.startsWith('/api/v1/quiz_submissions/77/questions')) data={quiz_submission_questions:[{id:9,answer:null,quiz_question:{id:9,question_type:'multiple_choice_question',question_text:'Choose A',answers:[{id:1,text:'A'},{id:2,text:'B'}]}}]};
  else if (path.startsWith('/login/session_token')) data={session_url:'https://school.instructure.com/login?session_token=boot-session-token'};
  else if (path==='/api/v1/users/self') data={id:7,name:'Test Student'};
  else if (path.startsWith('/api/v1/courses/1/assignments/10?')) data={id:10,name:'Test work',description:'Write your answer.',submission_types:['online_text_entry','online_url'],can_submit:true,locked_for_user:false,published:true,allowed_extensions:[]};
  else if (path.startsWith('/api/v1/courses/1/assignments/11?')) data={id:11,name:'Awaiting feedback',description:'Write a short response.',submission_types:['online_text_entry'],can_submit:true,locked_for_user:false,published:true,allowed_extensions:[],submission:{workflow_state:'submitted',attempt:1,submitted_at:new Date(Date.now()-36*60*60*1000).toISOString()}};
  else if (path.startsWith('/api/v1/courses/1/assignments/14?')) data={id:14,name:'PDF Upload Test',description:'Upload the annotated PDF.',submission_types:['online_upload'],can_submit:true,locked_for_user:false,published:true,allowed_extensions:['pdf'],submission:pdfAssignmentSubmission};
  else if (path.startsWith('/api/v1/courses/1/assignments/14/submissions/7?')) data={submission_history:[],submission_comments:[],rubric_assessment:{}};
  else if (path.startsWith('/api/v1/courses/1/assignments/11/submissions/7?')) data={submission_history:[{attempt:1,workflow_state:'submitted',submitted_at:'2026-11-16T17:00:00Z',score:null}],submission_comments:[{author_name:'Instructor',comment:'Good start. Add one more example.',created_at:'2026-11-17T12:00:00Z'}],rubric_assessment:{}};
  else if (path.endsWith('/assignment_groups')) data=[{id:5,name:'Tests',group_weight:100,rules:{}}];
  else data={weighted_assignment_groups:true};
  return {ok:status>=200&&status<300,status,headers:{get:n=>n.toLowerCase()==='content-type'?'application/json':null},json:async()=>data,text:async()=>JSON.stringify(data)};
};
const canvasFetch=window.fetch;
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

await await window.openWorkspace('canvas_11_1');
assert.ok(window.document.getElementById('workspace').textContent.includes('Submitted'), 'submitted but ungraded work is distinguished from incomplete work');
assert.ok(window.document.body.classList.contains('assignment-room-open'),'opening an assignment transitions into a full-screen in-app route');
assert.ok(window.document.getElementById('nsAssignmentBrief'),'assignment instructions render in the native page');
assert.ok(window.document.getElementById('nsRoomBack'),'the page provides in-app dashboard navigation');
assert.ok(window.document.getElementById('nsSubmissionHistory').textContent.includes('Attempt 1'),'submission attempt history is displayed in the assignment details');
assert.ok(window.document.getElementById('nsSubmissionHistory').textContent.includes('Good start.'),'instructor feedback comments are displayed');
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
assert.ok(window.document.querySelector('[data-quiz-jump="1"]'),'quiz question navigator renders');
assert.ok(window.document.getElementById('phase4QuizProgressText').textContent.includes('0 of 1'),'quiz progress begins unanswered');
window.document.querySelector('[data-quiz-flag="9"]').click();
assert.equal(window.document.querySelector('[data-quiz-flag="9"]').getAttribute('aria-pressed'),'true','question can be flagged for review');
quizChoice.checked=true;
quizChoice.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.ok(window.document.getElementById('phase4QuizProgressText').textContent.includes('1 of 1'),'answered quiz question updates progress immediately');
window.document.getElementById('phase4SaveQuiz').click();
await new Promise(r=>setTimeout(r,20));
assert.ok(canvasCalls.some(x=>x.path==='/api/v1/quiz_submissions/77/questions'&&x.method==='POST'),'quiz answers are saved to Canvas');
assert.ok(canvasCalls.some(x=>x.path==='/api/v1/quiz_submissions/77/questions/9/flag'&&x.method==='PUT'),'review flags use Canvas official PUT flag endpoint');
assert.ok(canvasCalls.find(x=>x.path==='/api/v1/quiz_submissions/77/questions/9/flag').body.validation_token==='quiz-validation','flag request includes the current Canvas validation token');
quizChoice.checked=false;
quizChoice.dispatchEvent(new window.Event('change',{bubbles:true}));
window.document.getElementById('phase4SaveQuiz').click();
await new Promise(r=>setTimeout(r,20));
assert.ok(canvasCalls.some(x=>x.path==='/api/v1/quiz_submissions/77/questions'&&x.method==='POST'&&x.body.quiz_questions.some(q=>q.id==='9'&&q.answer===null)),'clearing a previously answered question is saved as unanswered');

assert.ok(window.document.getElementById('phase4QuizProgressText').textContent.includes('0 of 1'),'clearing the response returns quiz progress to unanswered');
window.document.getElementById('phase4CompleteQuiz').click();
await new Promise(r=>setTimeout(r,100));
assert.ok(canvasCalls.some(x=>x.path==='/api/v1/courses/1/quizzes/22/submissions/77/complete'&&x.method==='POST'),'quiz completion is sent to Canvas');
assert.ok(window.document.getElementById('workspace').textContent.includes('Quiz submitted'),'workspace reports completion after Canvas confirms it');

await window.openWorkspace('canvas_13_1');
await new Promise(r=>setTimeout(r,30));
assert.ok(window.document.getElementById('workspace').textContent.includes('New Quizzes'),'New Quiz opens an in-dashboard preview');
assert.ok(window.document.getElementById('workspace').textContent.includes('What is the main idea?'),'New Quiz item prompts are previewed inside NORTHSTAR');
assert.ok(window.document.getElementById('workspace').textContent.includes('Open official New Quizzes player inside NORTHSTAR'),'New Quiz player is launched inside NORTHSTAR');
assert.ok(window.document.getElementById('nsLaunchNewQuiz'),'New Quiz preview provides an authenticated launch control');
window.document.getElementById('nsLaunchNewQuiz').click();
await new Promise(r=>setTimeout(r,30));
assert.ok(canvasCalls.some(x=>x.path.startsWith('/login/session_token?return_to=%2Fcourses%2F1%2Fassignments%2F13')),'New Quiz launch requests a short-lived Canvas browser session for the correct assignment');
assert.ok(window.document.getElementById('viewerOverlay').classList.contains('open'),'authenticated Canvas player opens inside the NORTHSTAR content view');
assert.ok(window.document.getElementById('viewerFrame').src.includes('boot-session-token'),'the Canvas-issued session URL is opened without exposing the API token in the URL');
window.closeViewer();

// Exercise the native iOS host path as well as the PWA iframe fallback.
const nativeMessages=[];
window.webkit={messageHandlers:{northstarSecureContent:{postMessage(message){nativeMessages.push(message);}}}};
window.document.getElementById('nsLaunchNewQuiz').click();
await new Promise(r=>setTimeout(r,30));
assert.equal(nativeMessages.length,1,'authenticated Canvas content uses the native message handler when the host is installed');
assert.equal(nativeMessages[0].action,'open');
assert.ok(nativeMessages[0].url.includes('boot-session-token'),'native handoff uses the Canvas-issued temporary session URL');
assert.equal(window.document.getElementById('viewerOverlay').classList.contains('open'),false,'native handoff does not also open the PWA iframe');
delete window.webkit;

// Ordinary HTTPS resources are previewed inside NORTHSTAR before an external escape.
let externalTabs=0;window.open=()=>{externalTabs++;return {};};
window.openInDashboard('https://docs.example.edu/document/123');
assert.equal(window.document.getElementById('viewerOverlay').classList.contains('open'),true,'ordinary resource links open inside NORTHSTAR first');
assert.equal(window.document.getElementById('viewerFrame').src,'https://docs.example.edu/document/123','resource preview receives the intended HTTPS destination');
assert.equal(window.document.getElementById('viewerExternalLink').href,'https://docs.example.edu/document/123','an explicit fallback exists when a provider blocks framing');
assert.equal(externalTabs,0,'resource handling does not immediately leave the dashboard');
window.closeViewer();
assert.equal(window.document.getElementById('viewerExternalLink').style.display,'none','closing the viewer hides the stale external fallback');
assert.equal(window.document.getElementById('viewerExternalLink').hasAttribute('href'),false,'closing the viewer clears the previous short-lived/resource URL');

assert.equal(window.document.getElementById('phase4StartQuiz'),null,'NORTHSTAR never invents a New Quiz attempt start');
assert.ok(!window.document.getElementById('workspace').textContent.includes('DO NOT SHOW THIS'),'New Quiz preview never renders answer/scoring payloads');

await window.openWorkspace('canvas_11_1');
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
window.document.getElementById('assignmentDraft').innerHTML='<p><strong>My own work</strong></p>';
let writes=0;
window.fetch=async(url,opts)=>{
  const target=new URL(url),path=target.searchParams.get('path')||target.pathname;
  if(opts.method==='POST'){
    writes++;
    return {ok:true,status:200,json:async()=>({workflow_state:'submitted',attempt:2})};
  }
  if(path==='/api/v1/courses/1/assignments/10?include%5B%5D=submission&include%5B%5D=can_submit&all_dates=true')
    return {ok:true,status:200,json:async()=>({id:10,name:'Test work',submission_types:['online_text_entry','online_url'],can_submit:true,locked_for_user:false,published:true,submission:{workflow_state:'submitted',submission_type:'online_text_entry',attempt:2,submitted_at:'2026-11-23T17:30:00Z'}})};
  if(path==='/api/v1/users/self')return {ok:true,status:200,json:async()=>({id:7})};
  if(path==='/api/v1/courses/1/assignments/10/submissions/7?include%5B%5D=submission_history&include%5B%5D=submission_comments&include%5B%5D=full_rubric_assessment')
    return {ok:true,status:200,json:async()=>({submission_history:[{attempt:2,workflow_state:'submitted'}],submission_comments:[],rubric_assessment:{}})};
  throw Error('Unexpected assignment receipt request: '+path);
};
// Credentials are already retained in the in-memory connection created above.
window.confirm=()=>false;
await window.submitAssignment();
assert.equal(writes,0,'cancel must not write');
let confirmation='';
window.confirm=msg=>{confirmation=msg;return true;};
await window.submitAssignment();
assert.equal(writes,1,'one confirmed write; status: '+window.document.getElementById('submissionStatus').textContent+'; type: '+window.document.getElementById('submissionType').value+'; confirmation: '+confirmation);
assert.ok(confirmation.includes('My own work')&&confirmation.includes('Math')&&confirmation.includes('Test work'));
assert.ok(window.document.getElementById('submissionStatus').textContent.includes('Canvas independently verified'),'assignment receipt is shown only after authoritative Canvas read-back');
assert.ok(window.document.getElementById('submissionStatus').textContent.includes('Offline coursework snapshot updated'));
assert.equal(window.__testVault.get('canvas-snapshot').assignments.find(a=>a.canvasId===11).status,'Submitted','confirmed submission state is persisted into the offline snapshot');
const savedSnapshot=window.__testVault.get('canvas-snapshot');
assert.ok(savedSnapshot && savedSnapshot.assignments.length===5,'successful sync is saved as an offline snapshot, including the New Quizzes assignment');
// Verify the actual Document Studio button stages its exported PDF and sends only that PDF.
window.fetch=canvasFetch;
await window.openWorkspace('canvas_14_1');
const extraSelectedFile=new window.File(['other file'],'other.pdf',{type:'application/pdf'});
Object.defineProperty(window.document.getElementById('submissionFile'),'files',{value:[extraSelectedFile],configurable:true});
const annotatedPdf=new window.File(['flattened annotated PDF'],'annotated-homework.pdf',{type:'application/pdf'});
window.NorthstarAssignmentRoom.getAnnotatedFile=async()=>annotatedPdf;
let uploadedFromStudio=[];
let sentFromStudio=null;
const originalUpload=window.NorthstarWorkspace.uploadAssignmentFile;
const originalSend=window.NorthstarSubmissions.send;
window.NorthstarWorkspace.uploadAssignmentFile=async args=>{uploadedFromStudio.push(args);return {id:777,display_name:args.file.name};};
window.NorthstarSubmissions.send=async args=>{sentFromStudio=args;pdfAssignmentSubmission={id:1401,workflow_state:'submitted',submission_type:'online_upload',attempt:1,submitted_at:'2026-11-22T12:30:00Z',attachments:[{id:777,display_name:'annotated-homework.pdf'}]};return {workflow_state:'submitted',attempt:1,submitted_at:'2026-11-22T12:30:00Z'};};
window.document.getElementById('nsUseAnnotatedPdf').click();
await new Promise(r=>setTimeout(r,10));
assert.ok(window.document.getElementById('nsAnnotatedPdfStatus').textContent.includes('Ready to submit'));
assert.equal(window.document.getElementById('submissionType').value,'online_upload');
window.confirm=()=>true;
await window.submitAssignment();
assert.equal(uploadedFromStudio.length,1,'one annotated PDF is uploaded for this assignment');
assert.equal(uploadedFromStudio[0].file.name,'annotated-homework.pdf','the file exported from Document Studio is the one sent to Canvas');
assert.equal(uploadedFromStudio[0].courseId,1);
assert.equal(uploadedFromStudio[0].assignmentId,14);
assert.deepEqual(Array.from(sentFromStudio.data.submission.file_ids),[777],'the finalized Canvas file ID is submitted to the assignment');
assert.equal(sentFromStudio.data.submission.submission_type,'online_upload');
assert.ok(window.document.getElementById('submissionStatus').textContent.includes('Canvas independently verified your submission'));
assert.equal(window.__testVault.get('canvas-snapshot').assignments.find(a=>a.canvasId===14).status,'Submitted');
window.NorthstarWorkspace.uploadAssignmentFile=originalUpload;
window.NorthstarSubmissions.send=originalSend;
await window.disconnectCanvas();
window.closeAssignmentRoom();
assert.ok(window.__testVault.has('canvas-snapshot'),'disconnect preserves the last successful coursework snapshot');
assert.equal(window.__testVault.has('canvas-credentials'),false,'disconnect removes the saved credential');
assert.ok(window.document.getElementById('canvasStatus').textContent.includes('remains available offline'),'disconnect explains that coursework remains available offline');
assert.ok(window.NorthstarAssignmentRoom.routeId()===null,'leaving the assignment page clears the deep-link route');
assert.equal(errors.length,0,errors.join(' | '));
console.log('PASS: mocked live sync and app boot, grades, periods, AI vault, native Canvas handoff and in-dashboard resource routing');
process.exit(0);
