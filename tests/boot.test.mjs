import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url).pathname;
let html = readFileSync(root + 'index.html', 'utf8');
html = html.replace(/<script[^>]*src="scripts\/[^"]+"[^>]*><\/script>/g, '');
const scripts = ['app.js', 'canvas-debug.js', 'grades.js', 'ai.js', 'submissions.js', 'premium.js']
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
for (const name of ['addPeriod', 'deletePeriod', 'saveAiSettings', 'testAiKey',
                   'askAiAboutAssignment', 'openInDashboard', 'closeViewer']) {
  assert.equal(typeof window[name], 'function', name + ' exposed on window');
}
assert.ok(window.Grades, 'Grades module loaded');
assert.ok(window.NorthstarAI, 'NorthstarAI module loaded');
assert.ok(window.CanvasDebug, 'CanvasDebug module loaded');

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

// ledger renders
window.renderLedger();
assert.ok(window.document.getElementById('ledgerList'), 'ledger renders');

// AI settings: key goes to sessionStorage only, never echoed
window.document.getElementById('geminiKey').value = 'AIza-test-key';
window.document.getElementById('geminiModel').value = 'gemini-2.0-flash';
window.saveAiSettings();
assert.equal(window.sessionStorage.getItem('northstar_gemini_session'), 'AIza-test-key', 'AI key in sessionStorage');
assert.equal(window.localStorage.getItem('northstar_gemini_session'), null, 'AI key NOT in localStorage');
assert.ok(!window.document.getElementById('aiStatus').textContent.includes('AIza-test-key'), 'key not echoed in status');

// viewer opens/closes
window.openInDashboard('https://school.instructure.com/courses/1/assignments/2');
assert.ok(window.document.getElementById('viewerOverlay').classList.contains('open'), 'viewer opens');
window.closeViewer();
assert.ok(!window.document.getElementById('viewerOverlay').classList.contains('open'), 'viewer closes');

// Exercise real sync wiring with deterministic Canvas-shaped responses.
window.fetch = async url => {
  const u = new URL(url);
  let data;
  if (u.pathname === '/api/v1/courses') data=[{id:1,name:'Math',course_code:'MATH'}];
  else if (u.pathname.endsWith('/assignments')) data=[{id:10,name:'Test work',points_possible:100,assignment_group_id:5,submission_types:['online_text_entry','online_url'],due_at:'2026-10-31T19:00:00Z',submission:{workflow_state:'graded',score:90}}];
  else if (u.pathname.endsWith('/assignment_groups')) data=[{id:5,name:'Tests',group_weight:100,rules:{}}];
  else data={weighted_assignment_groups:true};
  return {ok:true,status:200,headers:{get:n=>n.toLowerCase()==='content-type'?'application/json':null},json:async()=>data,text:async()=>JSON.stringify(data)};
};
window.document.getElementById('canvasUrl').value='https://school.instructure.com';
window.document.getElementById('canvasProxy').value='';
window.document.getElementById('canvasToken').value='test-token';
await window.connectCanvas();
window.renderCourses();
window.renderWhatIf();
assert.ok(window.document.getElementById('courseGrid').textContent.includes('90.0%'), 'synced score reaches computed course grade');
assert.ok(window.document.getElementById('whatifList').textContent.includes('90.0%'), 'live what-if renders');
window.openWorkspace('canvas_10_1');
window.document.getElementById('assignmentDraft').value='My own work';
let writes=0;
window.fetch=async(url,opts)=>{writes++;return {ok:true,json:async()=>({workflow_state:'submitted',attempt:2})};};
window.sessionStorage.setItem('northstar_canvas_session',JSON.stringify({base:'https://school.instructure.com',proxy:'https://bridge.example',token:'secret'}));
window.confirm=()=>false;
await window.submitAssignment();
assert.equal(writes,0,'cancel must not write');
let confirmation='';
window.confirm=msg=>{confirmation=msg;return true;};
await window.submitAssignment();
assert.equal(writes,1,'one confirmed write');
assert.ok(confirmation.includes('My own work')&&confirmation.includes('Math')&&confirmation.includes('Test work'));
assert.ok(window.document.getElementById('submissionStatus').textContent.includes('Canvas confirmed'));
assert.equal(errors.length,0,errors.join(' | '));
console.log('PASS: mocked live sync and app boots clean, grades compute, periods manage, AI key is session-only, viewer works');
process.exit(0);
