import { afterEach, describe, expect, it, vi } from "vitest";
import type { AcademicSnapshot } from "./academic";
import { buildCourseStudyGuide, searchWorkspaceResults, selectAcademicNotifications, selectCourseProgress, sortAssignments } from "./workspace-intelligence";
import {
  initialSnapshot,
  createAcademicBackup,
  createAssignment,
  addAssignmentArtifact,
  deleteAssignmentArtifact,
  createCourse,
  updateCourse,
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
  loadAcademicConflicts,
  clearAcademicConflict,
  clearAllAcademicConflicts,
  saveAcademicSnapshot,
  parseAcademicBackup,
  updateAcademicEvent,
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


function stubAcademicStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  } as Storage;
  vi.stubGlobal("window", { localStorage: storage });
  return storage;
}

afterEach(() => vi.unstubAllGlobals());

describe("academic repository", () => {
  it("preserves a competing same-revision snapshot instead of overwriting it", () => {
    stubAcademicStorage();
    const base = loadAcademicSnapshot();
    expect(saveAcademicSnapshot(base, true)).toBe(true);
    const assignment = base.assignments[0];
    const persistedBase = updateAssignmentStatus(base, assignment.id, "in_progress");
    const persisted: AcademicSnapshot = {
      ...persistedBase,
      assignments: persistedBase.assignments.map(item => item.id === assignment.id ? { ...item, status: "submitted" } : item),
    };
    const local = updateAssignment(base, assignment.id, {
      courseId: assignment.courseId,
      title: "Concurrent local edit",
      description: assignment.description,
      dueAt: assignment.dueAt,
      pointsPossible: assignment.pointsPossible,
      priority: assignment.priority,
      estimatedMinutes: assignment.estimatedMinutes,
      personalNotes: assignment.personalNotes,
    });
    expect(persisted.revision).toBe(local.revision);
    expect(saveAcademicSnapshot(persisted)).toBe(true);
    expect(saveAcademicSnapshot(local)).toBe(true);

    const saved = loadAcademicSnapshot().assignments.find(item => item.id === assignment.id)!;
    expect(saved.status).toBe("submitted");
    expect(saved.title).toBe(assignment.title);
    const conflicts = loadAcademicConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].localSnapshot.assignments.find(item => item.id === assignment.id)?.title).toBe("Concurrent local edit");
    expect(conflicts[0].persistedSnapshot.assignments.find(item => item.id === assignment.id)?.status).toBe("submitted");
    const continuedLocal = updateAssignment(local, assignment.id, {
      courseId: assignment.courseId,
      title: "Continued local edit",
      description: assignment.description,
      dueAt: assignment.dueAt,
      pointsPossible: assignment.pointsPossible,
      priority: assignment.priority,
      estimatedMinutes: assignment.estimatedMinutes,
      personalNotes: assignment.personalNotes,
    });
    expect(saveAcademicSnapshot(continuedLocal)).toBe(true);
    expect(loadAcademicSnapshot().assignments.find(item => item.id === assignment.id)?.status).toBe("submitted");
    expect(loadAcademicConflicts()).toHaveLength(2);
    expect(clearAllAcademicConflicts()).toBe(true);
    expect(loadAcademicConflicts()).toHaveLength(0);
  });

  it("allows an explicit restore to replace a newer saved revision", () => {
    stubAcademicStorage();
    const original = loadAcademicSnapshot();
    expect(saveAcademicSnapshot(original, true)).toBe(true);
    const newer = updateAssignmentStatus(original, original.assignments[0].id, "in_progress");
    expect(saveAcademicSnapshot(newer)).toBe(true);
    expect(saveAcademicSnapshot(original, true)).toBe(true);
    expect(loadAcademicSnapshot().revision).toBe(original.revision);
    expect(loadAcademicSnapshot().assignments[0].status).toBe(original.assignments[0].status);
  });


  it("loads a valid versioned demo snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    expect(isAcademicSnapshot(snapshot)).toBe(true);
    expect(snapshot.courses.length).toBeGreaterThan(0);
    expect(snapshot.assignments.length).toBeGreaterThan(0);
  });

  it("attaches and removes validated local file metadata", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments[0];
    const input = { id: "artifact-test-1", assignmentId: assignment.id, fileName: "research-draft.pdf", mimeType: "application/pdf", sizeBytes: 1024 };
    const attached = addAssignmentArtifact(snapshot, input);
    expect(attached.revision).toBe(snapshot.revision + 1);
    expect(attached.artifacts?.[0]).toMatchObject({ ...input, source: "northstar" });
    expect(isAcademicSnapshot(attached)).toBe(true);
    expect(addAssignmentArtifact(snapshot, { ...input, assignmentId: "missing-assignment" })).toBe(snapshot);
    expect(addAssignmentArtifact(snapshot, { ...input, sizeBytes: -1 })).toBe(snapshot);
    const removed = deleteAssignmentArtifact(attached, input.id);
    expect(removed.artifacts).toHaveLength(0);
    expect(removed.revision).toBe(attached.revision + 1);
  });

  it("creates a course in the active term and rejects duplicate or invalid course data", () => {
    const snapshot = loadAcademicSnapshot();
    const input = { code: "PSY 201", name: "Introduction to Psychology", instructor: "Dr. Ellis", color: "rose", progress: 0 };
    const next = createCourse(snapshot, input);
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.courses.at(-1)).toMatchObject({ ...input, code: "PSY 201", termId: snapshot.term.id, source: "northstar" });
    expect(Number.isFinite(Date.parse(next.courses.at(-1)?.updatedAt ?? ""))).toBe(true);
    expect(isAcademicSnapshot(next)).toBe(true);
    expect(createCourse(snapshot, { ...input, code: snapshot.courses[0].code.toLowerCase() })).toBe(snapshot);
    expect(createCourse(snapshot, { ...input, progress: 101 })).toBe(snapshot);
  });

  it("updates course metadata without breaking its linked academic records", () => {
    const snapshot = loadAcademicSnapshot();
    const course = snapshot.courses[0];
    const linkedAssignmentIds = snapshot.assignments.filter(item => item.courseId === course.id).map(item => item.id);
    const next = updateCourse(snapshot, course.id, { code: "ENG 205", name: "Advanced Academic Writing", instructor: "Dr. Morgan", color: "blue", progress: 84 });
    expect(next.revision).toBe(snapshot.revision + 1);
    expect(next.courses.find(item => item.id === course.id)).toMatchObject({ name: "Advanced Academic Writing", source: "northstar" });
    expect(next.assignments.filter(item => item.courseId === course.id).map(item => item.id)).toEqual(linkedAssignmentIds);
    expect(isAcademicSnapshot(next)).toBe(true);
    expect(updateCourse(next, course.id, { code: next.courses[1].code, name: "Duplicate", instructor: "Dr. X", color: "blue", progress: 50 })).toBe(next);
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

  it("changes personal status through the shared assignment record", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments.find(item => item.status === "not_started")!;
    const next = updateAssignmentStatus(snapshot, assignment.id, "in_progress");
    expect(next.assignments.find(item => item.id === assignment.id)?.status).toBe("in_progress");
    expect(next.revision).toBe(snapshot.revision + 1);
  });

  it("deletes an assignment but preserves and detaches independent linked work", () => {
    const base = loadAcademicSnapshot();
    const assignment = base.assignments[0];
    const now = "2026-11-25T12:00:00.000Z";
    const snapshot = {
      ...base,
      writingDrafts: [{ id: "linked-draft", title: "Saved essay", body: "Keep this draft.", assignmentId: assignment.id, revision: 1, savedAt: now, source: "northstar" as const }],
      events: [{ id: "linked-event", title: "Work session", kind: "study" as const, startsAt: now, endsAt: "2026-11-25T13:00:00.000Z", assignmentId: assignment.id, courseId: assignment.courseId, notes: "", source: "northstar" as const, updatedAt: now }],
      gradeItems: [{ id: "linked-grade", courseId: assignment.courseId, assignmentId: assignment.id, title: assignment.title, score: null, pointsPossible: Math.max(1, assignment.pointsPossible), status: "pending" as const, source: "northstar" as const, updatedAt: now }],
      artifacts: [{ id: "linked-artifact", assignmentId: assignment.id, fileName: "essay.pdf", mimeType: "application/pdf", sizeBytes: 100, addedAt: now, source: "northstar" as const }],
    };
    const next = deleteAssignment(snapshot, assignment.id);
    expect(next.assignments.some(item => item.id === assignment.id)).toBe(false);
    expect(next.writingDrafts?.[0]).toMatchObject({ id: "linked-draft", title: "Saved essay" });
    expect(next.writingDrafts?.[0].assignmentId).toBeUndefined();
    expect(next.events?.[0]).toMatchObject({ id: "linked-event", title: "Work session" });
    expect(next.events?.[0].assignmentId).toBeUndefined();
    expect(next.gradeItems?.[0]).toMatchObject({ id: "linked-grade", status: "pending" });
    expect(next.gradeItems?.[0].assignmentId).toBeUndefined();
    expect(next.artifacts).toHaveLength(0);
    expect(next.revision).toBe(base.revision + 1);
    expect(isAcademicSnapshot(next)).toBe(true);
  });

  it("rejects malformed snapshots and broken cross-record relationships", () => {
    const snapshot = loadAcademicSnapshot();
    expect(isAcademicSnapshot({ ...snapshot, schemaVersion: 99 })).toBe(false);
    expect(isAcademicSnapshot({ ...snapshot, assignments: [...snapshot.assignments, snapshot.assignments[0]] })).toBe(false);
    expect(isAcademicSnapshot({ ...snapshot, courses: snapshot.courses.map((course,index) => index===0 ? { ...course, termId: "foreign-term" } : course) })).toBe(false);
    const assignment = snapshot.assignments[0];
    const otherCourse = snapshot.courses.find(course => course.id !== assignment.courseId)!;
    const event = { id: "mismatched-event", title: "Invalid relation", kind: "study" as const, startsAt: "2026-11-25T12:00:00.000Z", endsAt: "2026-11-25T13:00:00.000Z", courseId: otherCourse.id, assignmentId: assignment.id, notes: "", source: "northstar" as const, updatedAt: "2026-11-25T12:00:00.000Z" };
    expect(isAcademicSnapshot({ ...snapshot, events: [...(snapshot.events ?? []), event] })).toBe(false);
    const emptyAttempt = { id: "empty-attempt", courseId: snapshot.courses[0].id, questionIds: [], answers: {}, flaggedIds: [], startedAt: "2026-11-25T12:00:00.000Z", elapsedSeconds: 0, status: "in_progress" as const };
    expect(isAcademicSnapshot({ ...snapshot, practiceAttempts: [...(snapshot.practiceAttempts ?? []), emptyAttempt] })).toBe(false);
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
    expect(restored?.artifacts).toEqual(snapshot.artifacts);
  });

  it("excludes IndexedDB binary attachment metadata from portable JSON backups", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments[0];
    const withAttachment = addAssignmentArtifact(snapshot, { id: "backup-artifact", assignmentId: assignment.id, fileName: "private-draft.pdf", mimeType: "application/pdf", sizeBytes: 2048 });
    const raw = createAcademicBackup(withAttachment);
    const envelope = JSON.parse(raw) as { snapshot: { artifacts?: unknown[] } };
    expect(envelope.snapshot.artifacts).toEqual([]);
    expect(raw).not.toContain("private-draft.pdf");
    expect(parseAcademicBackup(raw)?.artifacts).toEqual([]);
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

  it("updates a personal event while preserving its identity and rejecting broken links", () => {
    const snapshot = loadAcademicSnapshot();
    const created = createAcademicEvent(snapshot, event);
    const personal = created.events?.find(item => item.source === "northstar");
    expect(personal).toBeDefined();
    const updated = updateAcademicEvent(created, personal!.id, { title: "Revised study block", notes: "Focus on active recall." });
    expect(updated.revision).toBe(created.revision + 1);
    expect(updated.events?.find(item => item.id === personal!.id)).toMatchObject({ title: "Revised study block", notes: "Focus on active recall." });
    expect(updateAcademicEvent(updated, personal!.id, { endsAt: personal!.startsAt })).toBe(updated);
    const foreignAssignment = snapshot.assignments.find(item => item.courseId !== event.courseId)!;
    expect(updateAcademicEvent(updated, personal!.id, { assignmentId: foreignAssignment.id })).toBe(updated);
    expect(isAcademicSnapshot(updated)).toBe(true);
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

describe("personal assignment status boundary", () => {
  it("does not permit local updates to Submitted/Graded values or mutate existing provider-owned states", () => {
    const snapshot = loadAcademicSnapshot();
    const assignment = snapshot.assignments.find(item => item.status === "not_started")!;
    // @ts-expect-error Submitted is provider-owned/read-only, not a personal workflow status.
    expect(updateAssignmentStatus(snapshot, assignment.id, "submitted")).toEqual(snapshot);
    // @ts-expect-error Graded is provider-owned/read-only, not a personal workflow status.
    expect(updateAssignmentStatus(snapshot, assignment.id, "graded")).toEqual(snapshot);

    const submittedSnapshot: AcademicSnapshot = {
      ...snapshot,
      assignments: snapshot.assignments.map(item => item.id === assignment.id ? { ...item, status: "submitted" } : item),
    };
    expect(updateAssignmentStatus(submittedSnapshot, assignment.id, "in_progress")).toEqual(submittedSnapshot);
    const gradedSnapshot: AcademicSnapshot = {
      ...snapshot,
      assignments: snapshot.assignments.map(item => item.id === assignment.id ? { ...item, status: "graded" } : item),
    };
    expect(updateAssignmentStatus(gradedSnapshot, assignment.id, "missing")).toEqual(gradedSnapshot);
  });
});

describe("initial snapshot stability", () => {
  it("produces identical demo seed data for tabs opened on the same local day", () => {
    expect(JSON.stringify(initialSnapshot())).toBe(JSON.stringify(initialSnapshot()));
  });
});

describe("Study Lab non-assessment scope", () => {
  it("seeds flashcards without a quiz question bank or timed attempts", () => {
    const snapshot = loadAcademicSnapshot();
    expect(snapshot.studyCards?.length).toBeGreaterThan(0);
    expect(snapshot.practiceQuestions).toBeUndefined();
    expect(snapshot.practiceAttempts).toBeUndefined();
  });

  it("preserves legacy local practice history when validating and restoring old backups", () => {
    const snapshot = loadAcademicSnapshot();
    const courseId = snapshot.courses[0].id;
    const legacyQuestion = {
      id: "legacy-practice-question",
      courseId,
      concept: "Legacy compatibility",
      prompt: "Legacy prompt",
      options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }],
      correctOptionId: "a",
      explanation: "Legacy explanation retained for backup compatibility.",
      source: "demo" as const,
    };
    const legacyAttempt = {
      id: "legacy-practice-attempt",
      courseId,
      questionIds: [legacyQuestion.id],
      answers: { [legacyQuestion.id]: "a" },
      flaggedIds: [],
      startedAt: "2026-11-25T12:00:00.000Z",
      completedAt: "2026-11-25T12:01:00.000Z",
      elapsedSeconds: 60,
      durationSeconds: 600,
      score: 100,
      status: "completed" as const,
    };
    const legacySnapshot = { ...snapshot, practiceQuestions: [legacyQuestion], practiceAttempts: [legacyAttempt] };
    expect(isAcademicSnapshot(legacySnapshot)).toBe(true);
    const restored = parseAcademicBackup(createAcademicBackup(legacySnapshot));
    expect(restored?.practiceQuestions).toEqual([legacyQuestion]);
    expect(restored?.practiceAttempts).toEqual([legacyAttempt]);
  });
});

describe("shared course projections", () => {
  it("derives the same course progress from canonical assignment statuses", () => {
    const snapshot = loadAcademicSnapshot();
    const course = snapshot.courses[0];
    const courseAssignments = snapshot.assignments.filter(item => item.courseId === course.id);
    expect(selectCourseProgress(snapshot, course.id)).toBe(Math.round(courseAssignments.filter(item => item.status === "submitted" || item.status === "graded").length / courseAssignments.length * 100));
    const completed = { ...snapshot, assignments: snapshot.assignments.map(item => item.courseId === course.id ? { ...item, status: "submitted" as const } : item) };
    expect(selectCourseProgress(completed, course.id)).toBe(100);
    const noAssignments = { ...snapshot, assignments: snapshot.assignments.filter(item => item.courseId !== course.id) };
    expect(selectCourseProgress(noAssignments, course.id)).toBe(course.progress);
    expect(selectCourseProgress(snapshot, "unknown-course")).toBe(0);
  });
});

describe("assignment queue sorting", () => {
  it("sorts by due date, priority and most recently updated without mutating source data", () => {
    const base = loadAcademicSnapshot().assignments.slice(0, 3);
    const records = [
      { ...base[0], id: "sort-low", priority: "low" as const, dueAt: "2026-12-05T12:00:00.000Z", updatedAt: "2026-11-20T12:00:00.000Z" },
      { ...base[1], id: "sort-urgent", priority: "urgent" as const, dueAt: "2026-12-10T12:00:00.000Z", updatedAt: "2026-11-22T12:00:00.000Z" },
      { ...base[2], id: "sort-high", priority: "high" as const, dueAt: "2026-12-01T12:00:00.000Z", updatedAt: "2026-11-24T12:00:00.000Z" },
    ];
    const original = records.map(item => item.id);
    expect(sortAssignments(records, "priority").map(item => item.id)).toEqual(["sort-urgent", "sort-high", "sort-low"]);
    expect(sortAssignments(records, "due").map(item => item.id)).toEqual(["sort-high", "sort-low", "sort-urgent"]);
    expect(sortAssignments(records, "updated").map(item => item.id)).toEqual(["sort-high", "sort-urgent", "sort-low"]);
    expect(records.map(item => item.id)).toEqual(original);
  });
});

describe("course study guide projection", () => {
  it("builds a guide only from the selected course's canonical records", () => {
    const snapshot = loadAcademicSnapshot();
    const course = snapshot.courses[0];
    const guide = buildCourseStudyGuide(snapshot, course.id);
    expect(guide).toMatchObject({ courseId: course.id, courseCode: course.code, courseName: course.name, progress: selectCourseProgress(snapshot, course.id) });
    expect(guide?.sections.some(section => section.title === "Concepts to understand" && section.items.length > 0)).toBe(true);
    expect(guide?.sections.some(section => section.title === "Flashcard recall")).toBe(true);
    expect(guide?.sections.every(section => section.items.length > 0)).toBe(true);
    expect(buildCourseStudyGuide(snapshot, "unknown-course")).toBeNull();
    const otherCourse = snapshot.courses[1];
    const otherGuide = buildCourseStudyGuide(snapshot, otherCourse.id);
    expect(otherGuide?.sections.flatMap(section => section.items).join(" ")).not.toContain(course.name);
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
    expect(searchWorkspaceResults(snapshot, "canvas integration").some(result => result.to === "/integrations/canvas")).toBe(true);
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

