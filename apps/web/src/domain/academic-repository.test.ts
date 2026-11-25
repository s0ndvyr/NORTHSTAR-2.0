import { describe, expect, it } from "vitest";
import { searchWorkspaceResults, selectAcademicNotifications } from "./workspace-intelligence";
import {
  createAcademicBackup,
  createPracticeAttempt,
  completePracticeAttempt,
  createAssignment,
  createAcademicEvent,
  createGradeItem,
  deleteAcademicEvent,
  deleteGradeItem,
  selectGradeSummary,
  createResource,
  createStudyCard,
  deleteAssignment,
  deleteResource,
  deleteStudyCard,
  isAcademicSnapshot,
  loadAcademicSnapshot,
  parseAcademicBackup,
  updatePracticeAttempt,
  updateAssignment,
  updateAssignmentStatus,
  updateResource,
  rateStudyCard,
  deleteWritingDraft,
  saveWritingDraft,
  type AssignmentInput,
  type ResourceInput,
  type StudyCardInput,
  type AcademicEventInput,
  type GradeItemInput,
  type WritingDraftInput,
} from "./academic-repository";

const input: AssignmentInput = {
  courseId: "eng-204",
  title: "New writing exercise",
  description: "A short practice task.",
  dueAt: "2026-12-01T18:00:00.000Z",
  pointsPossible: 20,
  priority: "high",
  estimatedMinutes: 35,
  personalNotes: "Draft the outline first.",
};

describe("academic repository", () => {
  it("loads a valid versioned demo snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    expect(isAcademicSnapshot(snapshot)).toBe(true);
    expect(snapshot.courses.length).toBeGreaterThan(0);
    expect(snapshot.assignments.length).toBeGreaterThan(0);
  });

  it("creates an assignment and increments the snapshot revision", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createAssignment(snapshot, input);
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.assignments).toHaveLength(snapshot.assignments.length + 1);
    expect(next.assignments.at(-1)).toMatchObject({
      title: input.title,
      courseId: input.courseId,
      status: "not_started",
      source: "northstar",
    });
    expect(isAcademicSnapshot(next)).toBe(true);
  });

  it("rejects an assignment linked to an unknown course", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createAssignment(snapshot, { ...input, courseId: "missing-course" });
    expect(next).toBe(snapshot);
  });

  it("rejects non-finite and invalid numeric assignment inputs without corrupting the snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    expect(createAssignment(snapshot, { ...input, pointsPossible: Number.NaN })).toBe(snapshot);
    expect(createAssignment(snapshot, { ...input, estimatedMinutes: Number.POSITIVE_INFINITY })).toBe(snapshot);
    expect(createAssignment(snapshot, { ...input, pointsPossible: -1 })).toBe(snapshot);
    expect(isAcademicSnapshot(snapshot)).toBe(true);
  });

  it("rejects invalid assignment updates and status values without changing the snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments[0];
    expect(updateAssignment(snapshot, assignment.id, { pointsPossible: Number.NaN })).toBe(snapshot);
    expect(updateAssignment(snapshot, assignment.id, { estimatedMinutes: -5 })).toBe(snapshot);
    expect(updateAssignment(snapshot, assignment.id, { priority: "critical" as AssignmentInput["priority"] })).toBe(snapshot);
    expect(updateAssignment(snapshot, assignment.id, { status: "unknown" as never })).toBe(snapshot);
    expect(isAcademicSnapshot(snapshot)).toBe(true);
  });

  it("updates assignment fields without replacing its identity", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments[0];
    const next = updateAssignment(snapshot, assignment.id, { title: "Revised title", personalNotes: "Updated note" });
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.assignments.find(item => item.id === assignment.id)).toMatchObject({
      id: assignment.id,
      title: "Revised title",
      personalNotes: "Updated note",
    });
  });

  it("changes status through the shared assignment record", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments[0];
    const next = updateAssignmentStatus(snapshot, assignment.id, "submitted");
    expect(next.assignments.find(item => item.id === assignment.id)?.status).toBe("submitted");
    expect(next.revision).toBe(snapshot.revision + 1);
  });

  it("deletes an assignment and increments the revision", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments[0];
    const next = deleteAssignment(snapshot, assignment.id);
    expect(next.assignments.some(item => item.id === assignment.id)).toBe(false);
    expect(next.revision).toBe(snapshot.revision + 1);
  });

  it("rejects malformed snapshots and duplicate assignment identities", () => {
    const snapshot = loadAcademicSnapshot();
    expect(isAcademicSnapshot({ ...snapshot, schemaVersion: 99 })).toBe(false);
    expect(isAcademicSnapshot({ ...snapshot, assignments: [...snapshot.assignments, snapshot.assignments[0]] })).toBe(false);
  });
});

describe("academic resource repository", () => {
  const resource: ResourceInput = {
    courseId: "eng-204",
    title: "Thesis planning note",
    kind: "note",
    description: "A short planning reference.",
    url: "",
    content: "Narrow the claim before drafting.",
  };

  it("creates a course-linked resource in the canonical snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createResource(snapshot, resource);
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.resources).toHaveLength((snapshot.resources ?? []).length + 1);
    expect(next.resources?.at(-1)).toMatchObject({ ...resource, source: "northstar" });
    expect(isAcademicSnapshot(next)).toBe(true);
  });

  it("rejects non-HTTPS external resource URLs", () => {
    const snapshot = loadAcademicSnapshot();
    expect(createResource(snapshot, { ...resource, kind: "link", url: "javascript:alert(1)" })).toBe(snapshot);
  });

  it("updates and deletes resources through the same revisioned snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    const resourceId = snapshot.resources?.[0]?.id;
    expect(resourceId).toBeTruthy();
    const updated = updateResource(snapshot, resourceId!, { title: "Updated library title" });
    expect(updated.resources?.find(item => item.id === resourceId)?.title).toBe("Updated library title");
    const removed = deleteResource(updated, resourceId!);
    expect(removed.resources?.some(item => item.id === resourceId)).toBe(false);
    expect(removed.revision).toBe(snapshot.revision + 2);
  });
});

describe("Study Lab spaced repetition", () => {
  const cardInput: StudyCardInput = {
    courseId: "bio-112",
    prompt: "Define osmosis.",
    answer: "The net movement of water across a selectively permeable membrane.",
  };

  it("creates a validated study card in the shared snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createStudyCard(snapshot, cardInput);
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.studyCards?.at(-1)).toMatchObject({ ...cardInput, source: "northstar", repetitions: 0 });
    expect(isAcademicSnapshot(next)).toBe(true);
  });

  it("schedules review intervals from recall ratings", () => {
    const snapshot = loadAcademicSnapshot();
    const card = snapshot.studyCards?.[0];
    expect(card).toBeTruthy();
    const again = rateStudyCard(snapshot, card!.id, "again");
    expect(again.studyCards?.find(item => item.id === card!.id)?.intervalDays).toBeCloseTo(1 / 24);
    const good = rateStudyCard(snapshot, card!.id, "good");
    expect(good.studyCards?.find(item => item.id === card!.id)?.intervalDays).toBe(1);
    expect(good.studyCards?.find(item => item.id === card!.id)?.repetitions).toBe(1);
  });

  it("deletes a study card through the canonical snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    const cardId = snapshot.studyCards?.[0]?.id;
    expect(cardId).toBeTruthy();
    const next = deleteStudyCard(snapshot, cardId!);
    expect(next.studyCards?.some(card => card.id === cardId)).toBe(false);
    expect(next.revision).toBe(snapshot.revision + 1);
  });
});


describe("persistent writing drafts", () => {
  const draft: WritingDraftInput = {
    title: "Research response draft",
    body: "A focused claim supported by evidence and careful analysis.",
  };

  it("saves and revises a draft in the shared academic snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    const first = saveWritingDraft(snapshot, draft);
    expect(first.revision).toBe(snapshot.revision + 1);
    expect(first.writingDrafts).toHaveLength(1);
    const saved = first.writingDrafts?.[0];
    expect(saved).toMatchObject({ title: draft.title, body: draft.body, revision: 1, source: "northstar" });
    const second = saveWritingDraft(first, { ...draft, id: saved?.id, body: draft.body + " Revised." });
    expect(second.writingDrafts).toHaveLength(1);
    expect(second.writingDrafts?.[0]).toMatchObject({ id: saved?.id, revision: 2, body: draft.body + " Revised." });
    expect(isAcademicSnapshot(second)).toBe(true);
  });

  it("keeps a draft when its linked assignment is deleted", () => {
    const snapshot = loadAcademicSnapshot();
    const assignmentId = snapshot.assignments[0].id;
    const saved = saveWritingDraft(snapshot, { ...draft, assignmentId });
    const draftId = saved.writingDrafts?.[0]?.id;
    const deleted = deleteAssignment(saved, assignmentId);
    expect(deleted.writingDrafts?.find(item => item.id === draftId)?.assignmentId).toBeUndefined();
    expect(isAcademicSnapshot(deleted)).toBe(true);
  });

  it("deletes a draft through the shared revisioned snapshot", () => {
    const snapshot = saveWritingDraft(loadAcademicSnapshot(), draft);
    const draftId = snapshot.writingDrafts?.[0]?.id;
    const deleted = deleteWritingDraft(snapshot, draftId ?? "missing");
    expect(deleted.writingDrafts).toHaveLength(0);
    expect(deleted.revision).toBe(snapshot.revision + 1);
  });
});

describe("academic backup and restore", () => {
  it("round-trips the complete academic snapshot through a validated backup", () => {
    const snapshot = loadAcademicSnapshot();
    const raw = createAcademicBackup(snapshot);
    const restored = parseAcademicBackup(raw);
    expect(restored).not.toBeNull();
    expect(restored?.courses).toEqual(snapshot.courses);
    expect(restored?.assignments).toEqual(snapshot.assignments);
    expect(restored?.resources).toEqual(snapshot.resources);
    expect(restored?.studyCards).toEqual(snapshot.studyCards);
    expect(restored?.writingDrafts).toEqual(snapshot.writingDrafts);
    expect(restored?.events).toEqual(snapshot.events);
    expect(restored?.gradeItems).toEqual(snapshot.gradeItems);
  });

  it("rejects malformed, unknown-version, and invalid academic backups", () => {
    expect(parseAcademicBackup("not json")).toBeNull();
    expect(parseAcademicBackup(JSON.stringify({ format: "northstar-academic-backup", version: 99, snapshot: {} }))).toBeNull();
    const snapshot = loadAcademicSnapshot();
    expect(parseAcademicBackup(JSON.stringify({ format: "northstar-academic-backup", version: 1, snapshot: { ...snapshot, assignments: [{ id: "broken" }] } }))).toBeNull();
  });
});


describe("Calendar event records", () => {
  const event: AcademicEventInput = {
    title: "Focused biology study block",
    kind: "study",
    startsAt: "2026-12-02T15:00:00.000Z",
    endsAt: "2026-12-02T16:00:00.000Z",
    courseId: "bio-112",
    notes: "Review cell transport.",
  };

  it("creates a validated standalone event and increments the revision", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createAcademicEvent(snapshot, event);
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.events?.at(-1)).toMatchObject({ ...event, source: "northstar" });
    expect(isAcademicSnapshot(next)).toBe(true);
  });

  it("rejects invalid event time ranges and unknown courses", () => {
    const snapshot = loadAcademicSnapshot();
    expect(createAcademicEvent(snapshot, { ...event, endsAt: event.startsAt })).toBe(snapshot);
    expect(createAcademicEvent(snapshot, { ...event, courseId: "unknown" })).toBe(snapshot);
  });

  it("deletes a personal event but keeps seeded demo events protected", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createAcademicEvent(snapshot, event);
    const personalId = next.events?.find(item => item.source === "northstar")?.id;
    const removed = deleteAcademicEvent(next, personalId ?? "");
    expect(removed.events?.some(item => item.id === personalId)).toBe(false);
    const demoId = snapshot.events?.[0]?.id;
    expect(deleteAcademicEvent(snapshot, demoId ?? "")).toBe(snapshot);
  });
});

describe("Gradebook score records", () => {
  const grade: GradeItemInput = {
    courseId: "eng-204",
    title: "Research response rubric",
    score: 42,
    pointsPossible: 50,
    status: "graded",
    feedback: "Clear line of reasoning.",
  };

  it("creates a personal score record without changing official assignment status", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createGradeItem(snapshot, grade);
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.gradeItems?.at(-1)).toMatchObject({ ...grade, source: "northstar" });
    expect(next.assignments.find(item => item.id === "a-eng-01")?.status).toBe("in_progress");
    expect(isAcademicSnapshot(next)).toBe(true);
  });

  it("rejects scores with invalid status/value combinations", () => {
    const snapshot = loadAcademicSnapshot();
    expect(createGradeItem(snapshot, { ...grade, status: "pending", score: 10 })).toBe(snapshot);
    expect(createGradeItem(snapshot, { ...grade, pointsPossible: 0 })).toBe(snapshot);
  });

  it("summarizes graded points only and excludes pending or missing items", () => {
    const snapshot = loadAcademicSnapshot();
    const summary = selectGradeSummary(snapshot, "eng-204");
    expect(summary.items).toBe(2);
    expect(summary.earned).toBe(32);
    expect(summary.possible).toBe(35);
    expect(summary.percentage).toBe(91.4);
    expect(selectGradeSummary(snapshot, "missing-course").percentage).toBeNull();
  });

  it("deletes a personal grade record without allowing demo records to be removed", () => {
    const snapshot = loadAcademicSnapshot();
    const next = createGradeItem(snapshot, grade);
    const personalId = next.gradeItems?.find(item => item.source === "northstar")?.id;
    const removed = deleteGradeItem(next, personalId ?? "");
    expect(removed.gradeItems?.some(item => item.id === personalId)).toBe(false);
    const demoId = snapshot.gradeItems?.[0]?.id;
    expect(deleteGradeItem(snapshot, demoId ?? "")).toBe(snapshot);
  });
});

it("detaches calendar and grade links when a linked assignment is removed", () => {
  const snapshot = loadAcademicSnapshot();
  const assignmentId = snapshot.assignments[0].id;
  const next = createAcademicEvent(snapshot, {
    title: "Assignment review",
    kind: "reminder",
    startsAt: "2026-12-01T15:00:00.000Z",
    endsAt: "2026-12-01T15:30:00.000Z",
    courseId: snapshot.assignments[0].courseId,
    assignmentId,
    notes: "Review feedback.",
  });
  const deleted = deleteAssignment(next, assignmentId);
  expect(deleted.events?.find(item => item.title === "Assignment review")?.assignmentId).toBeUndefined();
  expect(isAcademicSnapshot(deleted)).toBe(true);
});

describe("Study Lab question bank", () => {
  it("provides three validated practice questions for each demo course", () => {
    const snapshot = loadAcademicSnapshot();
    expect(snapshot.practiceQuestions).toHaveLength(12);
    for (const course of snapshot.courses) {
      const courseQuestions = snapshot.practiceQuestions?.filter(question => question.courseId === course.id) ?? [];
      expect(courseQuestions).toHaveLength(3);
      for (const question of courseQuestions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.options.some(option => option.id === question.correctOptionId)).toBe(true);
        expect(question.explanation.trim().length).toBeGreaterThan(10);
      }
    }
  });
});

describe("Study Lab practice attempts", () => {
  it("creates, autosaves, flags and completes a course practice attempt", () => {
    const initial = loadAcademicSnapshot();
    const started = createPracticeAttempt(initial, "bio-112");
    const attempt = started.practiceAttempts?.find(item => item.status === "in_progress");
    expect(attempt).toBeTruthy();
    expect(attempt?.questionIds).toContain("practice-bio-osmosis");
    expect(attempt?.durationSeconds).toBe(600);
    const correctAnswers = Object.fromEntries(attempt!.questionIds.map(id => [id, initial.practiceQuestions?.find(question => question.id === id)?.correctOptionId ?? ""]));
    const saved = updatePracticeAttempt(started, attempt!.id, correctAnswers, ["practice-bio-osmosis"], 42);
    expect(saved.practiceAttempts?.find(item => item.id === attempt!.id)).toMatchObject({
      answers: correctAnswers,
      flaggedIds: ["practice-bio-osmosis"],
      elapsedSeconds: 42,
    });
    const completed = completePracticeAttempt(saved, attempt!.id);
    expect(completed.practiceAttempts?.find(item => item.id === attempt!.id)).toMatchObject({
      status: "completed",
      score: 100,
    });
    expect(completed.revision).toBe(saved.revision + 1);
    expect(isAcademicSnapshot(completed)).toBe(true);
  });

  it("persists a selected time limit and rejects unsafe duration values", () => {
    const initial = loadAcademicSnapshot();
    const started = createPracticeAttempt(initial, "bio-112", 300);
    const attempt = started.practiceAttempts?.find(item => item.status === "in_progress");
    expect(attempt?.durationSeconds).toBe(300);
    expect(createPracticeAttempt(initial, "bio-112", 30)).toBe(initial);
    expect(isAcademicSnapshot(started)).toBe(true);
  });

  it("resumes an existing in-progress attempt instead of creating a duplicate", () => {
    const started = createPracticeAttempt(loadAcademicSnapshot(), "eng-204");
    const resumed = createPracticeAttempt(started, "eng-204");
    expect(resumed).toBe(started);
    expect(resumed.practiceAttempts?.filter(item => item.courseId === "eng-204" && item.status === "in_progress")).toHaveLength(1);
  });

  it("rejects answers that do not belong to the question", () => {
    const started = createPracticeAttempt(loadAcademicSnapshot(), "his-210");
    const attempt = started.practiceAttempts?.find(item => item.status === "in_progress")!;
    const rejected = updatePracticeAttempt(started, attempt.id, { "practice-his-source": "unknown-option" }, [], 10);
    const foreignQuestion = updatePracticeAttempt(started, attempt.id, { "practice-eng-thesis": "b" }, [], 10);
    expect(rejected).toBe(started);
    expect(foreignQuestion).toBe(started);
  });
});

describe("global workspace intelligence", () => {
  it("searches across workspaces and academic records without case sensitivity", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments[0];
    const byTitle = searchWorkspaceResults(snapshot, assignment.title.toUpperCase());
    expect(byTitle.some(result => result.id === "assignment-" + assignment.id && result.type === "ASSIGNMENT" && result.to === "/assignments/" + assignment.id)).toBe(true);
    const byCode = searchWorkspaceResults(snapshot, snapshot.courses[0].code.toLowerCase());
    expect(byCode.some(result => result.to === "/courses/" + snapshot.courses[0].id)).toBe(true);
    expect(searchWorkspaceResults(snapshot, "does-not-exist")).toHaveLength(0);
  });

  it("respects search result limits and includes saved writing and resources", () => {
    const snapshot = loadAcademicSnapshot();
    const draft = {
      id: "draft-search-test", title: "Searchable composition notes", body: "A saved writing draft.",
      revision: 1, savedAt: "2026-11-20T12:00:00.000Z", source: "northstar" as const,
    };
    const withDraft = { ...snapshot, writingDrafts: [...(snapshot.writingDrafts ?? []), draft] };
    expect(searchWorkspaceResults(withDraft, "composition").map(item => item.type)).toEqual(["DRAFT"]);
    expect(searchWorkspaceResults(withDraft, "", 3)).toHaveLength(3);
    expect(searchWorkspaceResults(snapshot, snapshot.resources?.[0]?.title ?? "missing").some(item => item.type === "RESOURCE")).toBe(true);
  });

  it("derives urgent, due-today, event, study-review and pending-grade notifications from the snapshot", () => {
    const now = new Date("2026-11-25T12:00:00.000Z");
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    const todayLater = new Date(now.getTime() + 3600000).toISOString();
    const inTwoDays = new Date(now.getTime() + 2 * 86400000).toISOString();
    const base = loadAcademicSnapshot();
    const overdue = { ...base.assignments[0], id: "test-overdue", title: "Overdue test item", status: "in_progress" as const, dueAt: yesterday };
    const dueToday = { ...base.assignments[1], id: "test-due-today", title: "Due today test item", status: "not_started" as const, dueAt: todayLater };
    const completed = { ...base.assignments[2], id: "test-completed", title: "Already completed", status: "submitted" as const, dueAt: yesterday };
    const nextEvent = {
      id: "test-event", title: "Upcoming review session", kind: "study" as const,
      startsAt: inTwoDays, endsAt: new Date(new Date(inTwoDays).getTime() + 3600000).toISOString(),
      notes: "", source: "northstar" as const, updatedAt: now.toISOString(),
    };
    const snapshot = {
      ...base,
      assignments: [overdue, dueToday, completed],
      events: [nextEvent],
      studyCards: (base.studyCards ?? []).map(card => ({ ...card, nextReviewAt: yesterday })),
      gradeItems: (base.gradeItems ?? []).map(item => item.status === "pending" ? item : { ...item, status: "graded" as const, score: 1 }),
    };
    const notifications = selectAcademicNotifications(snapshot, now);
    expect(notifications.some(item => item.id === "assignment-test-overdue" && item.tone === "urgent")).toBe(true);
    expect(notifications.some(item => item.id === "today-test-due-today" && item.tone === "today")).toBe(true);
    expect(notifications.some(item => item.id === "event-test-event" && item.to === "/calendar")).toBe(true);
    expect(notifications.some(item => item.id.startsWith("study-") && item.to === "/study")).toBe(true);
    expect(notifications.some(item => item.id.startsWith("grade-") && item.to === "/gradebook")).toBe(true);
    expect(notifications.some(item => item.id === "assignment-test-completed")).toBe(false);
  });

  it("caps notification lists and returns an empty state when no records qualify", () => {
    const now = new Date("2026-11-25T12:00:00.000Z");
    const base = loadAcademicSnapshot();
    const calm = {
      ...base,
      assignments: base.assignments.map(item => ({ ...item, status: "graded" as const })),
      events: [],
      studyCards: (base.studyCards ?? []).map(item => ({ ...item, nextReviewAt: "2027-12-01T00:00:00.000Z" })),
      gradeItems: (base.gradeItems ?? []).map(item => ({ ...item, status: "graded" as const, score: 1 })),
    };
    expect(selectAcademicNotifications(calm, now)).toHaveLength(0);
    expect(selectAcademicNotifications({ ...base, assignments: base.assignments.map(item => ({ ...item, status: "missing" as const })) }, now, 2)).toHaveLength(2);
  });
});

