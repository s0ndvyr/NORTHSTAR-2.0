/* Canvas response normalization. Kept pure so sync rules can be tested without a browser. */
(function (root) {
  'use strict';
  function numberOrNull(value) {
    return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  }
  function courseGrade(course) {
    const enrollments = Array.isArray(course && course.enrollments) ? course.enrollments : [];
    const enrollment = enrollments.find(e => e && (!e.type || e.type === 'StudentEnrollment')) || {};
    const pick = (...keys) => {
      for (const key of keys) {
        const value = enrollment[key];
        if (value !== null && value !== undefined && value !== '') return value;
      }
      return null;
    };
    return {
      currentPercent: numberOrNull(pick('computed_current_score')),
      finalPercent: numberOrNull(pick('computed_final_score')),
      currentLetter: pick('computed_current_grade'),
      finalLetter: pick('computed_final_grade'),
      currentPeriodPercent: numberOrNull(pick('current_period_computed_current_score')),
      currentPeriodFinalPercent: numberOrNull(pick('current_period_computed_final_score')),
      currentPeriodLetter: pick('current_period_computed_current_grade'),
      currentPeriodFinalLetter: pick('current_period_computed_final_grade'),
      // Canvas places the current grading-period title/id on the student
      // enrollment object. Keep a course-level fallback for older/custom APIs.
      currentPeriodTitle: pick('current_grading_period_title') || course.current_grading_period_title || null,
      currentPeriodId: pick('current_grading_period_id') || course.current_grading_period_id || null,
      hasGradingPeriods: !!(course.has_grading_periods || pick('has_grading_periods')),
      source: 'Canvas enrollment totals'
    };
  }
  function submission(submission) {
    const value = submission || {};
    const workflow = String(value.workflow_state || '').toLowerCase();
    const submitted = ['submitted', 'graded', 'pending_review'].includes(workflow) || !!value.submitted_at;
    const gradeMatchesCurrentSubmission = value.grade_matches_current_submission !== false;
    // Trust Canvas' workflow_state for completion. A stale graded_at timestamp
    // alone must not turn a newly submitted attempt into a completed assignment.
    const graded = workflow === 'graded' && gradeMatchesCurrentSubmission;
    const awaitingGrading = workflow === 'pending_review' || (workflow === 'graded' && !gradeMatchesCurrentSubmission);
    const status = value.excused ? 'Excused' : graded ? 'Completed' : awaitingGrading ? 'Awaiting Grading' : submitted ? 'Submitted' : value.missing ? 'Missing' : 'Not Started';
    return {
      status,
      submitted,
      graded,
      awaitingGrading,
      score: gradeMatchesCurrentSubmission ? numberOrNull(value.score) : null,
      grade: gradeMatchesCurrentSubmission && value.grade != null ? value.grade : null,
      excused: !!value.excused,
      missing: !!value.missing && !submitted,
      late: !!value.late,
      latePolicyStatus: value.late_policy_status || null,
      workflowState: workflow || 'unsubmitted',
      submittedAt: value.submitted_at || null,
      gradedAt: value.graded_at || null,
      attempt: numberOrNull(value.attempt),
      gradeMatchesCurrentSubmission
    };
  }
  function isResolved(status) {
    return ['Completed', 'Submitted', 'Awaiting Grading', 'Excused'].includes(status);
  }
  const api = { numberOrNull, courseGrade, submission, isResolved };
  root.NorthstarCanvasSync = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
