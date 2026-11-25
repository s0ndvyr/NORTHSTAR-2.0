import { describe, expect, it } from "vitest";
import {
  createAcademicBackup,
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
