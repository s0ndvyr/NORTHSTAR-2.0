import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const C=require('../scripts/canvas-sync.js');

const grade=C.courseGrade({
  has_grading_periods:true,
  enrollments:[
    {type:'TeacherEnrollment',computed_current_score:100,computed_current_grade:'A'},
    {type:'StudentEnrollment',computed_current_score:88.5,computed_current_grade:'B+',computed_final_score:90,computed_final_grade:'A-',current_grading_period_title:'Marking Period 2',current_grading_period_id:22,has_grading_periods:true,current_period_computed_current_score:91,current_period_computed_current_grade:'A-'}
  ]
});
assert.equal(grade.currentPercent,88.5,'use the student enrollment current percentage');
assert.equal(grade.currentLetter,'B+');
assert.equal(grade.finalPercent,90);
assert.equal(grade.currentPeriodPercent,91);
assert.equal(grade.currentPeriodTitle,'Marking Period 2');
assert.equal(grade.currentPeriodId,22);
assert.equal(grade.hasGradingPeriods,true);
assert.equal(grade.source,'Canvas enrollment totals');
assert.equal(C.courseGrade({id:2}).currentPercent,null,'missing or hidden grade totals remain unknown, never fabricated');

let state=C.submission({workflow_state:'submitted',submitted_at:'2026-11-16T17:00:00Z',score:null});
assert.equal(state.status,'Submitted');
assert.equal(state.submitted,true);
assert.equal(state.missing,false);
assert.equal(C.isResolved(state.status),true,'submitted work is not unfinished work');

state=C.submission({workflow_state:'pending_review',submitted_at:'2026-11-16T17:00:00Z'});
assert.equal(state.status,'Awaiting Grading','pending review is distinct from a normal submitted state');
assert.equal(C.isResolved(state.status),true);

state=C.submission({workflow_state:'graded',submitted_at:'2026-11-15T12:00:00Z',graded_at:'2026-11-16T12:00:00Z',score:18,grade:'A-',attempt:2,late:true});
assert.equal(state.status,'Completed');
assert.equal(state.score,18);
assert.equal(state.grade,'A-');
assert.equal(state.attempt,2);
assert.equal(state.late,true);

state=C.submission({workflow_state:'unsubmitted',missing:true});
assert.equal(state.status,'Missing');
assert.equal(state.missing,true);
assert.equal(C.isResolved(state.status),false);

state=C.submission({workflow_state:'graded',excused:true,score:null});
assert.equal(state.status,'Excused');
assert.equal(C.isResolved(state.status),true);

state=C.submission({workflow_state:'graded',graded_at:'2026-11-15T12:00:00Z',grade_matches_current_submission:false,score:10});
assert.equal(state.status,'Awaiting Grading','a newer ungraded attempt is not shown as graded');
assert.equal(state.gradeMatchesCurrentSubmission,false);
assert.equal(state.score,null,'stale score from the prior attempt is not presented as the current score');

state=C.submission({workflow_state:'submitted',submitted_at:'2026-11-16T17:00:00Z',graded_at:'2026-11-15T12:00:00Z',score:10});
assert.equal(state.status,'Submitted','a stale graded_at timestamp alone cannot complete a new submission');
assert.equal(state.score,10,'score is retained only when Canvas says it matches the current submission');
console.log('PASS: Canvas official grade normalization and assignment submission-state classification');
