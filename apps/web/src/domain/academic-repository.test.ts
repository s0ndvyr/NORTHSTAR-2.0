import { describe, expect, it } from "vitest";
import {
  createAssignment,
  createResource,
  createStudyCard,
  deleteAssignment,
  deleteResource,
  deleteStudyCard,
  isAcademicSnapshot,
  loadAcademicSnapshot,
  updateAssignment,
  updateAssignmentStatus,
  updateResource,
  rateStudyCard,
  type AssignmentInput,
  type ResourceInput,
  type StudyCardInput,
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
