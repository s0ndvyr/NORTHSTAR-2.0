import type { AcademicAssignment, AcademicCourse, AcademicEvent, AssignmentArtifact, AcademicResource, AcademicSnapshot, AssignmentStatus, GradeItem, PracticeAttempt, PracticeQuestion, StudyCard, StudyRating, WritingDraft } from "./academic";
import { demoAssignments, demoCourses, demoEvents, demoGradeItems, demoResources, demoStudyCards, demoTerm } from "./demo-data";

export const ACADEMIC_STORAGE_KEY = "northstar-5-academic-demo-v1";
export const ACADEMIC_CONFLICTS_KEY = "northstar-5-academic-conflicts-v1";
const VALID_STATUSES: AssignmentStatus[] = ["not_started", "in_progress", "submitted", "graded", "missing"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type CourseInput = Pick<AcademicCourse, "code" | "name" | "instructor" | "color" | "progress">;
export type AssignmentArtifactInput = Pick<AssignmentArtifact, "id" | "assignmentId" | "fileName" | "mimeType" | "sizeBytes">;
export type AssignmentInput = Pick<AcademicAssignment, "courseId" | "title" | "description" | "dueAt" | "pointsPossible" | "priority" | "estimatedMinutes" | "personalNotes">;
export type AssignmentPatch = Partial<AssignmentInput> & { status?: AssignmentStatus };
export type ResourceInput = Pick<AcademicResource, "courseId" | "title" | "kind" | "description" | "url" | "content">;
export type StudyCardInput = Pick<StudyCard, "courseId" | "prompt" | "answer">;
export type WritingDraftInput = Pick<WritingDraft, "title" | "body"> & { id?: string; assignmentId?: string };
export type AcademicEventInput = Pick<AcademicEvent, "title" | "kind" | "startsAt" | "endsAt" | "notes"> & { courseId?: string; assignmentId?: string };
export type GradeItemInput = Pick<GradeItem, "courseId" | "title" | "score" | "pointsPossible" | "status"> & { assignmentId?: string; feedback?: string };

function isValidAssignmentInput(input: AssignmentInput, courseIds: Set<string>): boolean {
  return courseIds.has(input.courseId)
    && typeof input.title === "string" && input.title.trim().length > 0
    && typeof input.description === "string"
    && typeof input.dueAt === "string" && Number.isFinite(Date.parse(input.dueAt))
    && typeof input.pointsPossible === "number" && Number.isFinite(input.pointsPossible) && input.pointsPossible >= 0
    && VALID_PRIORITIES.includes(input.priority)
    && typeof input.estimatedMinutes === "number" && Number.isFinite(input.estimatedMinutes) && input.estimatedMinutes >= 0
    && typeof input.personalNotes === "string";
}


function initialSnapshot(): AcademicSnapshot {
  return {
    schemaVersion: 1,
    revision: 1,
    term: { ...demoTerm },
    courses: demoCourses.map(course => ({ ...course })),
    assignments: demoAssignments.map(assignment => ({ ...assignment })),
    resources: demoResources.map(resource => ({ ...resource })),
    studyCards: demoStudyCards.map(card => ({ ...card })),
    writingDrafts: [],
    events: demoEvents.map(event => ({ ...event })),
    gradeItems: demoGradeItems.map(item => ({ ...item })),
    artifacts: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidAssignment(value: unknown, courseIds: Set<string>): value is AcademicAssignment {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.courseId === "string" && courseIds.has(value.courseId)
    && typeof value.title === "string" && value.title.trim().length > 0
    && typeof value.description === "string"
    && typeof value.dueAt === "string" && Number.isFinite(Date.parse(value.dueAt))
    && typeof value.pointsPossible === "number" && Number.isFinite(value.pointsPossible) && value.pointsPossible >= 0
    && typeof value.status === "string" && VALID_STATUSES.includes(value.status as AssignmentStatus)
    && typeof value.priority === "string" && VALID_PRIORITIES.includes(value.priority as typeof VALID_PRIORITIES[number])
    && typeof value.estimatedMinutes === "number" && Number.isFinite(value.estimatedMinutes) && value.estimatedMinutes >= 0
    && typeof value.personalNotes === "string"
    && (value.source === "demo" || value.source === "northstar")
    && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt));
}

function isValidResource(value: unknown, courseIds: Set<string>): value is AcademicResource {
  if (!isRecord(value)) return false;
  const validKind = value.kind === "note" || value.kind === "link" || value.kind === "reference";
  let validUrl = typeof value.url === "string";
  if (typeof value.url === "string" && value.url) { try { validUrl = new URL(value.url).protocol === "https:"; } catch { validUrl = false; } }
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.courseId === "string" && courseIds.has(value.courseId)
    && typeof value.title === "string" && value.title.trim().length > 0
    && validKind && typeof value.description === "string" && validUrl
    && typeof value.content === "string"
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
    && (value.source === "demo" || value.source === "northstar");
}

function isValidEvent(value: unknown, courseIds: Set<string>, assignmentIds: Set<string>): value is AcademicEvent {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.title === "string" && value.title.trim().length > 0
    && ["class", "study", "reminder", "personal"].includes(String(value.kind))
    && typeof value.startsAt === "string" && Number.isFinite(Date.parse(value.startsAt))
    && typeof value.endsAt === "string" && Number.isFinite(Date.parse(value.endsAt))
    && Date.parse(value.endsAt) > Date.parse(value.startsAt)
    && (value.courseId === undefined || (typeof value.courseId === "string" && courseIds.has(value.courseId)))
    && (value.assignmentId === undefined || (typeof value.assignmentId === "string" && assignmentIds.has(value.assignmentId)))
    && typeof value.notes === "string"
    && (value.source === "demo" || value.source === "northstar")
    && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt));
}

function isValidGradeItem(value: unknown, courseIds: Set<string>, assignmentIds: Set<string>): value is GradeItem {
  if (!isRecord(value)) return false;
  const validStatus = ["graded", "pending", "missing", "excused"].includes(String(value.status));
  const validScore = value.score === null || (typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0);
  const validScoredState = value.status === "graded" ? typeof value.score === "number" : value.score === null;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.courseId === "string" && courseIds.has(value.courseId)
    && (value.assignmentId === undefined || (typeof value.assignmentId === "string" && assignmentIds.has(value.assignmentId)))
    && typeof value.title === "string" && value.title.trim().length > 0
    && validScore && validScoredState && typeof value.pointsPossible === "number"
    && Number.isFinite(value.pointsPossible) && value.pointsPossible > 0
    && validStatus && (value.feedback === undefined || typeof value.feedback === "string")
    && (value.gradedAt === undefined || (typeof value.gradedAt === "string" && Number.isFinite(Date.parse(value.gradedAt))))
    && (value.source === "demo" || value.source === "northstar")
    && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt));
}

function isValidAssignmentArtifact(value: unknown, assignmentIds: Set<string>): value is AssignmentArtifact {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.assignmentId === "string" && assignmentIds.has(value.assignmentId)
    && typeof value.fileName === "string" && value.fileName.trim().length > 0
    && typeof value.mimeType === "string"
    && typeof value.sizeBytes === "number" && Number.isFinite(value.sizeBytes) && value.sizeBytes >= 0
    && typeof value.addedAt === "string" && Number.isFinite(Date.parse(value.addedAt))
    && value.source === "northstar";
}

function isValidWritingDraft(value: unknown, assignmentIds: Set<string>): value is WritingDraft {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.title === "string" && value.title.trim().length > 0
    && typeof value.body === "string"
    && (value.assignmentId === undefined || (typeof value.assignmentId === "string" && assignmentIds.has(value.assignmentId)))
    && typeof value.revision === "number" && Number.isInteger(value.revision) && value.revision >= 1
    && typeof value.savedAt === "string" && Number.isFinite(Date.parse(value.savedAt))
    && value.source === "northstar";
}

function isValidStudyCard(value: unknown, courseIds: Set<string>): value is StudyCard {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.courseId === "string" && courseIds.has(value.courseId)
    && typeof value.prompt === "string" && value.prompt.trim().length > 0
    && typeof value.answer === "string" && value.answer.trim().length > 0
    && typeof value.nextReviewAt === "string" && Number.isFinite(Date.parse(value.nextReviewAt))
    && typeof value.intervalDays === "number" && Number.isFinite(value.intervalDays) && value.intervalDays >= 0
    && typeof value.easeFactor === "number" && Number.isFinite(value.easeFactor) && value.easeFactor >= 1.3
    && typeof value.repetitions === "number" && Number.isInteger(value.repetitions) && value.repetitions >= 0
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
    && (value.source === "demo" || value.source === "northstar");
}

function isValidPracticeQuestion(value: unknown, courseIds: Set<string>): value is PracticeQuestion {
  if (!isRecord(value) || !Array.isArray(value.options)) return false;
  const optionIds = new Set<string>();
  for (const option of value.options) {
    if (!isRecord(option) || typeof option.id !== "string" || !option.id || typeof option.text !== "string" || !option.text.trim() || optionIds.has(option.id)) return false;
    optionIds.add(option.id);
  }
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.courseId === "string" && courseIds.has(value.courseId)
    && typeof value.prompt === "string" && value.prompt.trim().length > 0
    && value.options.length >= 2 && typeof value.correctOptionId === "string" && optionIds.has(value.correctOptionId)
    && typeof value.explanation === "string" && value.explanation.trim().length > 0
    && typeof value.concept === "string" && value.concept.trim().length > 0
    && value.source === "demo";
}

function isValidPracticeAttempt(value: unknown, questions: unknown[], courseIds: Set<string>): value is PracticeAttempt {
  if (!isRecord(value) || !Array.isArray(value.questionIds) || !Array.isArray(value.flaggedIds) || !isRecord(value.answers)) return false;
  const questionMap = new Map<string, PracticeQuestion>();
  for (const question of questions) if (isRecord(question) && typeof question.id === "string") questionMap.set(question.id, question as unknown as PracticeQuestion);
  const questionIds = new Set<string>();
  for (const id of value.questionIds) { if (typeof id !== "string" || !questionMap.has(id) || questionIds.has(id)) return false; questionIds.add(id); }
  for (const id of value.flaggedIds) if (typeof id !== "string" || !questionIds.has(id)) return false;
  for (const [questionId, optionId] of Object.entries(value.answers)) { const question = questionMap.get(questionId); if (!question || !question.options.some(option => option.id === optionId)) return false; }
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.courseId === "string" && courseIds.has(value.courseId) && value.questionIds.length > 0 && value.questionIds.every((id: string) => questionMap.get(id)?.courseId === value.courseId)
    && typeof value.startedAt === "string" && Number.isFinite(Date.parse(value.startedAt))
    && (value.completedAt === undefined || (typeof value.completedAt === "string" && Number.isFinite(Date.parse(value.completedAt))))
    && typeof value.elapsedSeconds === "number" && Number.isFinite(value.elapsedSeconds) && value.elapsedSeconds >= 0
    && (value.durationSeconds === undefined || (typeof value.durationSeconds === "number" && Number.isInteger(value.durationSeconds) && value.durationSeconds >= 60 && value.durationSeconds <= 7200))
    && (value.score === undefined || (typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100))
    && (value.status === "in_progress" || value.status === "completed")
    && (value.status !== "completed" || (typeof value.completedAt === "string" && typeof value.score === "number"))
    && (value.status !== "in_progress" || (value.completedAt === undefined && value.score === undefined));
}
export function isAcademicSnapshot(value: unknown): value is AcademicSnapshot {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Number.isInteger(value.revision) || (value.revision as number) < 0) return false;
  if (!isRecord(value.term) || typeof value.term.id !== "string" || typeof value.term.name !== "string"
    || typeof value.term.startsAt !== "string" || !Number.isFinite(Date.parse(value.term.startsAt))
    || typeof value.term.endsAt !== "string" || !Number.isFinite(Date.parse(value.term.endsAt)) || Date.parse(value.term.endsAt) <= Date.parse(value.term.startsAt)) return false;
  if (!Array.isArray(value.courses) || !Array.isArray(value.assignments)) return false;
  if (value.resources !== undefined && !Array.isArray(value.resources)) return false;
  if (value.studyCards !== undefined && !Array.isArray(value.studyCards)) return false;
  if (value.writingDrafts !== undefined && !Array.isArray(value.writingDrafts)) return false;
  if (value.events !== undefined && !Array.isArray(value.events)) return false;
  if (value.gradeItems !== undefined && !Array.isArray(value.gradeItems)) return false;
  if (value.artifacts !== undefined && !Array.isArray(value.artifacts)) return false;
  if (value.practiceQuestions !== undefined && !Array.isArray(value.practiceQuestions)) return false;
  if (value.practiceAttempts !== undefined && !Array.isArray(value.practiceAttempts)) return false;
  const courseIds = new Set<string>();
  for (const course of value.courses) {
    if (!isRecord(course) || typeof course.id !== "string" || !course.id
      || typeof course.code !== "string" || typeof course.name !== "string"
      || typeof course.instructor !== "string" || course.termId !== value.term.id
      || typeof course.color !== "string" || typeof course.progress !== "number"
      || !Number.isFinite(course.progress) || course.progress < 0 || course.progress > 100
      || (course.source !== undefined && course.source !== "demo" && course.source !== "northstar")
      || (course.updatedAt !== undefined && (typeof course.updatedAt !== "string" || !Number.isFinite(Date.parse(course.updatedAt))))) return false;
    if (courseIds.has(course.id)) return false;
    courseIds.add(course.id);
  }
  const assignmentIds = new Set<string>();
  for (const assignment of value.assignments) {
    if (!isValidAssignment(assignment, courseIds) || assignmentIds.has(assignment.id)) return false;
    assignmentIds.add(assignment.id);
  }
  const resourceIds = new Set<string>();
  for (const resource of (value.resources ?? [])) {
    if (!isValidResource(resource, courseIds) || resourceIds.has(resource.id)) return false;
    resourceIds.add(resource.id);
  }
  const studyCardIds = new Set<string>();
  for (const card of (value.studyCards ?? [])) {
    if (!isValidStudyCard(card, courseIds) || studyCardIds.has(card.id)) return false;
    studyCardIds.add(card.id);
  }
  const practiceQuestionIds = new Set<string>();
  for (const question of (value.practiceQuestions ?? [])) { if (!isValidPracticeQuestion(question, courseIds) || practiceQuestionIds.has(question.id)) return false; practiceQuestionIds.add(question.id); }
  const practiceAttemptIds = new Set<string>();
  for (const attempt of (value.practiceAttempts ?? [])) { if (!isValidPracticeAttempt(attempt, value.practiceQuestions ?? [], courseIds) || practiceAttemptIds.has(attempt.id)) return false; practiceAttemptIds.add(attempt.id); }
  const eventIds = new Set<string>();
  for (const event of (value.events ?? [])) {
    if (!isValidEvent(event, courseIds, assignmentIds) || eventIds.has(event.id)) return false;
    if (event.assignmentId) {
      const linkedAssignment = value.assignments.find((entry: unknown) => isRecord(entry) && entry.id === event.assignmentId);
      if (!isRecord(linkedAssignment) || linkedAssignment.courseId !== event.courseId) return false;
    }
    eventIds.add(event.id);
  }
  const gradeItemIds = new Set<string>();
  for (const item of (value.gradeItems ?? [])) {
    if (!isValidGradeItem(item, courseIds, assignmentIds) || gradeItemIds.has(item.id)) return false;
    const linkedAssignment = item.assignmentId ? value.assignments.find((entry: unknown) => isRecord(entry) && entry.id === item.assignmentId) : undefined;
    if (linkedAssignment && isRecord(linkedAssignment) && linkedAssignment.courseId !== item.courseId) return false;
    gradeItemIds.add(item.id);
  }
  const artifactIds = new Set<string>();
  for (const artifact of (value.artifacts ?? [])) {
    if (!isValidAssignmentArtifact(artifact, assignmentIds) || artifactIds.has(artifact.id)) return false;
    artifactIds.add(artifact.id);
  }
  const draftIds = new Set<string>();
  for (const draft of (value.writingDrafts ?? [])) {
    if (!isValidWritingDraft(draft, assignmentIds) || draftIds.has(draft.id)) return false;
    draftIds.add(draft.id);
  }
  return true;
}

export function loadAcademicSnapshot(): AcademicSnapshot {
  if (typeof window === "undefined") return initialSnapshot();
  try {
    const raw = window.localStorage.getItem(ACADEMIC_STORAGE_KEY);
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isAcademicSnapshot(parsed)) return parsed;
      } catch {
        // Preserve malformed/incompatible bytes for recovery; never replace them with demo data.
      }
      return initialSnapshot();
    }
    // Seed synchronously before React mounts so a second tab reads the same persisted
    // initial snapshot instead of creating a competing, time-varying demo snapshot.
    const initial = initialSnapshot();
    try { window.localStorage.setItem(ACADEMIC_STORAGE_KEY, JSON.stringify(initial)); } catch { /* The UI reports unavailable persistence on its first save. */ }
    return initial;
  } catch {
    // A blocked browser store must not prevent the app from opening.
    return initialSnapshot();
  }
}

export interface AcademicSnapshotConflict {
  id: string;
  detectedAt: string;
  localSnapshot: AcademicSnapshot;
  persistedSnapshot: AcademicSnapshot;
}

function isAcademicSnapshotConflict(value: unknown): value is AcademicSnapshotConflict {
  return isRecord(value) && typeof value.id === "string" && typeof value.detectedAt === "string"
    && Number.isFinite(Date.parse(value.detectedAt))
    && isAcademicSnapshot(value.localSnapshot) && isAcademicSnapshot(value.persistedSnapshot);
}

export function loadAcademicConflicts(): AcademicSnapshotConflict[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACADEMIC_CONFLICTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAcademicSnapshotConflict) : [];
  } catch {
    return [];
  }
}

export function clearAcademicConflict(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const remaining = loadAcademicConflicts().filter(conflict => conflict.id !== id);
    if (remaining.length) window.localStorage.setItem(ACADEMIC_CONFLICTS_KEY, JSON.stringify(remaining));
    else window.localStorage.removeItem(ACADEMIC_CONFLICTS_KEY);
    return true;
  } catch {
    return false;
  }
}

function preserveSnapshotConflict(localSnapshot: AcademicSnapshot, persistedSnapshot: AcademicSnapshot): boolean {
  try {
    const conflicts = loadAcademicConflicts();
    const localJson = JSON.stringify(localSnapshot);
    const persistedJson = JSON.stringify(persistedSnapshot);
    if (conflicts.some(conflict => JSON.stringify(conflict.localSnapshot) === localJson && JSON.stringify(conflict.persistedSnapshot) === persistedJson)) return true;
    if (conflicts.length >= 10) return false;
    const conflict: AcademicSnapshotConflict = {
      id: "conflict-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)),
      detectedAt: new Date().toISOString(),
      localSnapshot,
      persistedSnapshot,
    };
    window.localStorage.setItem(ACADEMIC_CONFLICTS_KEY, JSON.stringify([...conflicts, conflict]));
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves only when the candidate is newer than the persisted revision.
 * A competing same/newer revision is preserved as a two-sided conflict instead
 * of silently replacing the other tab's academic snapshot.
 */
export function saveAcademicSnapshot(snapshot: AcademicSnapshot, force = false): boolean {
  if (typeof window === "undefined" || !isAcademicSnapshot(snapshot)) return false;
  try {
    if (!force) {
      const raw = window.localStorage.getItem(ACADEMIC_STORAGE_KEY);
      if (raw) {
        const persisted: unknown = JSON.parse(raw);
        if (!isAcademicSnapshot(persisted)) return false;
        const localJson = JSON.stringify(snapshot);
        const persistedJson = JSON.stringify(persisted);
        if (localJson === persistedJson) return true;
        if (loadAcademicConflicts().length > 0 || persisted.revision >= snapshot.revision) {
          return preserveSnapshotConflict(snapshot, persisted);
        }
      }
    }
    window.localStorage.setItem(ACADEMIC_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    // The caller keeps the in-memory copy; persistence failure is not silent in the UI.
    return false;
  }
}

function revise(snapshot: AcademicSnapshot, assignments: AcademicAssignment[]): AcademicSnapshot {
  return { ...snapshot, revision: snapshot.revision + 1, assignments };
}

export function updateAssignmentStatus(snapshot: AcademicSnapshot, id: string, status: AssignmentStatus): AcademicSnapshot {
  if (!VALID_STATUSES.includes(status)) return snapshot;
  const exists = snapshot.assignments.some(assignment => assignment.id === id);
  if (!exists) return snapshot;
  return revise(snapshot, snapshot.assignments.map(assignment =>
    assignment.id === id ? { ...assignment, status, updatedAt: new Date().toISOString() } : assignment,
  ));
}

function isValidCourseInput(input: CourseInput): boolean {
  return typeof input.code === "string" && input.code.trim().length > 0
    && typeof input.name === "string" && input.name.trim().length > 0
    && typeof input.instructor === "string" && input.instructor.trim().length > 0
    && typeof input.color === "string" && input.color.trim().length > 0
    && typeof input.progress === "number" && Number.isFinite(input.progress) && input.progress >= 0 && input.progress <= 100;
}

export function createCourse(snapshot: AcademicSnapshot, input: CourseInput): AcademicSnapshot {
  if (!isValidCourseInput(input) || snapshot.courses.some(course => course.code.trim().toLocaleLowerCase() === input.code.trim().toLocaleLowerCase())) return snapshot;
  const course: AcademicCourse = {
    ...input, id: "course-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)),
    code: input.code.trim().toUpperCase(), name: input.name.trim(), instructor: input.instructor.trim(),
    color: input.color.trim(), termId: snapshot.term.id, source: "northstar", updatedAt: new Date().toISOString(),
  };
  return { ...snapshot, revision: snapshot.revision + 1, courses: [...snapshot.courses, course] };
}

export function updateCourse(snapshot: AcademicSnapshot, id: string, input: CourseInput): AcademicSnapshot {
  if (!snapshot.courses.some(course => course.id === id) || !isValidCourseInput(input)
    || snapshot.courses.some(course => course.id !== id && course.code.trim().toLocaleLowerCase() === input.code.trim().toLocaleLowerCase())) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, courses: snapshot.courses.map(course => course.id === id ? {
    ...course, ...input, code: input.code.trim().toUpperCase(), name: input.name.trim(), instructor: input.instructor.trim(), color: input.color.trim(), source: "northstar" as const, updatedAt: new Date().toISOString(),
  } : course) };
}

export function createAssignment(snapshot: AcademicSnapshot, input: AssignmentInput): AcademicSnapshot {
  if (!isValidAssignmentInput(input, new Set(snapshot.courses.map(course => course.id)))) return snapshot;
  const now = new Date().toISOString();
  const assignment: AcademicAssignment = {
    ...input,
    id: `local-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    title: input.title.trim(),
    description: input.description.trim(),
    personalNotes: input.personalNotes.trim(),
    status: "not_started",
    source: "northstar",
    updatedAt: now,
  };
  return revise(snapshot, [...snapshot.assignments, assignment]);
}

export function updateAssignment(snapshot: AcademicSnapshot, id: string, patch: AssignmentPatch): AcademicSnapshot {
  const current = snapshot.assignments.find(assignment => assignment.id === id);
  if (!current) return snapshot;
  const next = { ...current, ...patch, title: (patch.title ?? current.title).trim(), updatedAt: new Date().toISOString() };
  const input: AssignmentInput = {
    courseId: next.courseId, title: next.title, description: next.description, dueAt: next.dueAt,
    pointsPossible: next.pointsPossible, priority: next.priority, estimatedMinutes: next.estimatedMinutes,
    personalNotes: next.personalNotes,
  };
  if (!VALID_STATUSES.includes(next.status) || !isValidAssignmentInput(input, new Set(snapshot.courses.map(course => course.id)))) return snapshot;
  return revise(snapshot, snapshot.assignments.map(assignment => assignment.id === id ? next : assignment));
}

export function addAssignmentArtifact(snapshot: AcademicSnapshot, input: AssignmentArtifactInput): AcademicSnapshot {
  if (!snapshot.assignments.some(item => item.id === input.assignmentId)
    || !input.id.trim() || !input.fileName.trim()
    || !Number.isFinite(input.sizeBytes) || input.sizeBytes < 0
    || (snapshot.artifacts ?? []).some(item => item.id === input.id)) return snapshot;
  const artifact: AssignmentArtifact = {
    ...input, fileName: input.fileName.trim(), source: "northstar", addedAt: new Date().toISOString(),
  };
  return { ...snapshot, revision: snapshot.revision + 1, artifacts: [...(snapshot.artifacts ?? []), artifact] };
}

export function deleteAssignmentArtifact(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  if (!(snapshot.artifacts ?? []).some(item => item.id === id)) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, artifacts: (snapshot.artifacts ?? []).filter(item => item.id !== id) };
}

export function deleteAssignment(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  if (!snapshot.assignments.some(assignment => assignment.id === id)) return snapshot;
  const writingDrafts = (snapshot.writingDrafts ?? []).map(draft => draft.assignmentId === id ? { ...draft, assignmentId: undefined } : draft);
  const events = (snapshot.events ?? []).map(event => event.assignmentId === id ? { ...event, assignmentId: undefined } : event);
  const gradeItems = (snapshot.gradeItems ?? []).map(item => item.assignmentId === id ? { ...item, assignmentId: undefined } : item);
  const artifacts = (snapshot.artifacts ?? []).filter(item => item.assignmentId !== id);
  return { ...revise(snapshot, snapshot.assignments.filter(assignment => assignment.id !== id)), writingDrafts, events, gradeItems, artifacts };
}

export function resetAcademicSnapshot(): AcademicSnapshot {
  const fresh = initialSnapshot();
  saveAcademicSnapshot(fresh, true);
  return fresh;
}

export function createResource(snapshot: AcademicSnapshot, input: ResourceInput): AcademicSnapshot {
  if (!snapshot.courses.some(course => course.id === input.courseId) || !input.title.trim()) return snapshot;
  if (input.url) { try { if (new URL(input.url).protocol !== "https:") return snapshot; } catch { return snapshot; } }
  const now = new Date().toISOString();
  const resource: AcademicResource = {
    ...input,
    id: "resource-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2)),
    title: input.title.trim(), description: input.description.trim(), url: input.url.trim(), content: input.content.trim(),
    createdAt: now, updatedAt: now, source: "northstar",
  };
  return { ...snapshot, revision: snapshot.revision + 1, resources: [...(snapshot.resources ?? []), resource] };
}

export function updateResource(snapshot: AcademicSnapshot, id: string, patch: Partial<ResourceInput>): AcademicSnapshot {
  const resources = snapshot.resources ?? [];
  const current = resources.find(resource => resource.id === id);
  if (!current) return snapshot;
  const next = { ...current, ...patch, title: (patch.title ?? current.title).trim(), updatedAt: new Date().toISOString() };
  if (!next.title || !snapshot.courses.some(course => course.id === next.courseId)) return snapshot;
  if (next.url) { try { if (new URL(next.url).protocol !== "https:") return snapshot; } catch { return snapshot; } }
  return { ...snapshot, revision: snapshot.revision + 1, resources: resources.map(resource => resource.id === id ? next : resource) };
}

export function deleteResource(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  const resources = snapshot.resources ?? [];
  if (!resources.some(resource => resource.id === id)) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, resources: resources.filter(resource => resource.id !== id) };
}

export function createStudyCard(snapshot: AcademicSnapshot, input: StudyCardInput): AcademicSnapshot {
  if (!snapshot.courses.some(course => course.id === input.courseId) || !input.prompt.trim() || !input.answer.trim()) return snapshot;
  const now = new Date().toISOString();
  const card: StudyCard = { ...input, id: "study-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2)), prompt: input.prompt.trim(), answer: input.answer.trim(), nextReviewAt: now, intervalDays: 0, easeFactor: 2.5, repetitions: 0, createdAt: now, updatedAt: now, source: "northstar" };
  return { ...snapshot, revision: snapshot.revision + 1, studyCards: [...(snapshot.studyCards ?? []), card] };
}

export function updateStudyCard(snapshot: AcademicSnapshot, id: string, patch: Partial<StudyCardInput>): AcademicSnapshot {
  const cards = snapshot.studyCards ?? [];
  const current = cards.find(card => card.id === id);
  if (!current) return snapshot;
  const next = { ...current, ...patch, prompt: (patch.prompt ?? current.prompt).trim(), answer: (patch.answer ?? current.answer).trim(), updatedAt: new Date().toISOString() };
  if (!next.prompt || !next.answer || !snapshot.courses.some(course => course.id === next.courseId)) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, studyCards: cards.map(card => card.id === id ? next : card) };
}

export function deleteStudyCard(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  const cards = snapshot.studyCards ?? [];
  if (!cards.some(card => card.id === id)) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, studyCards: cards.filter(card => card.id !== id) };
}

export function rateStudyCard(snapshot: AcademicSnapshot, id: string, rating: StudyRating): AcademicSnapshot {
  const cards = snapshot.studyCards ?? [];
  const current = cards.find(card => card.id === id);
  if (!current || !["again", "hard", "good", "easy"].includes(rating)) return snapshot;
  let interval = current.intervalDays;
  let ease = current.easeFactor;
  let repetitions = current.repetitions;
  if (rating === "again") { interval = 1 / 24; repetitions = 0; ease = Math.max(1.3, ease - 0.2); }
  else if (rating === "hard") { interval = Math.max(1, Math.round(Math.max(1, interval) * 1.2)); repetitions += 1; ease = Math.max(1.3, ease - 0.15); }
  else if (rating === "good") { interval = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.max(1, Math.round(interval * ease)); repetitions += 1; }
  else { interval = repetitions === 0 ? 3 : repetitions === 1 ? 5 : Math.max(1, Math.round(interval * (ease + 0.3))); repetitions += 1; ease += 0.15; }
  const now = new Date();
  const nextReviewAt = new Date(now.getTime() + interval * 86400000).toISOString();
  const updated = { ...current, intervalDays: interval, easeFactor: ease, repetitions, nextReviewAt, updatedAt: now.toISOString() };
  return { ...snapshot, revision: snapshot.revision + 1, studyCards: cards.map(card => card.id === id ? updated : card) };
}


export function saveWritingDraft(snapshot: AcademicSnapshot, input: WritingDraftInput): AcademicSnapshot {
  const title = input.title.trim();
  if (!title || !input.body.trim()) return snapshot;
  if (input.assignmentId && !snapshot.assignments.some(item => item.id === input.assignmentId)) return snapshot;
  const drafts = snapshot.writingDrafts ?? [];
  const existing = input.id ? drafts.find(draft => draft.id === input.id) : undefined;
  const id = input.id?.trim() || `draft-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const now = new Date().toISOString();
  const draft: WritingDraft = {
    id, title, body: input.body, assignmentId: input.assignmentId,
    revision: (existing?.revision ?? 0) + 1, savedAt: now, source: "northstar",
  };
  const nextDrafts = existing
    ? drafts.map(item => item.id === existing.id ? draft : item)
    : [...drafts, draft];
  return { ...snapshot, revision: snapshot.revision + 1, writingDrafts: nextDrafts };
}

export function deleteWritingDraft(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  const drafts = snapshot.writingDrafts ?? [];
  if (!drafts.some(draft => draft.id === id)) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, writingDrafts: drafts.filter(draft => draft.id !== id) };
}

export function createAcademicBackup(snapshot: AcademicSnapshot): string {
  if (!isAcademicSnapshot(snapshot)) throw new Error("Cannot export an invalid academic snapshot.");
  // Binary files live in IndexedDB and are not embedded in JSON backups.
  return JSON.stringify({
    format: "northstar-academic-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshot: { ...snapshot, artifacts: [] },
  }, null, 2);
}

export function parseAcademicBackup(raw: string): AcademicSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.format !== "northstar-academic-backup" || parsed.version !== 1) return null;
    if (!isAcademicSnapshot(parsed.snapshot)) return null;
    return {
      ...parsed.snapshot,
      resources: parsed.snapshot.resources ?? [],
      studyCards: parsed.snapshot.studyCards ?? [],
      writingDrafts: parsed.snapshot.writingDrafts ?? [],
      events: parsed.snapshot.events ?? [],
      gradeItems: parsed.snapshot.gradeItems ?? [],
      practiceQuestions: parsed.snapshot.practiceQuestions ?? [],
      practiceAttempts: parsed.snapshot.practiceAttempts ?? [],
      // The portable JSON envelope never contains IndexedDB file bytes.
      artifacts: [],
    };
  } catch {
    return null;
  }
}


export function createAcademicEvent(snapshot: AcademicSnapshot, input: AcademicEventInput): AcademicSnapshot {
  if (!input.title.trim() || !Number.isFinite(Date.parse(input.startsAt)) || !Number.isFinite(Date.parse(input.endsAt))
    || Date.parse(input.endsAt) <= Date.parse(input.startsAt)
    || (input.courseId && !snapshot.courses.some(course => course.id === input.courseId))
    || (input.assignmentId && snapshot.assignments.find(item => item.id === input.assignmentId)?.courseId !== input.courseId)) return snapshot;
  const now = new Date().toISOString();
  const event: AcademicEvent = {
    ...input, id: "event-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)),
    title: input.title.trim(), notes: input.notes.trim(), source: "northstar", updatedAt: now,
  };
  return { ...snapshot, revision: snapshot.revision + 1, events: [...(snapshot.events ?? []), event] };
}

export function updateAcademicEvent(snapshot: AcademicSnapshot, id: string, patch: Partial<AcademicEventInput>): AcademicSnapshot {
  const events = snapshot.events ?? [];
  const current = events.find(event => event.id === id);
  if (!current || current.source !== "northstar") return snapshot;
  const next = { ...current, ...patch, title: (patch.title ?? current.title).trim(), notes: (patch.notes ?? current.notes).trim(), updatedAt: new Date().toISOString() };
  if (!next.title || !Number.isFinite(Date.parse(next.startsAt)) || !Number.isFinite(Date.parse(next.endsAt))
    || Date.parse(next.endsAt) <= Date.parse(next.startsAt)
    || (next.courseId && !snapshot.courses.some(course => course.id === next.courseId))
    || (next.assignmentId && snapshot.assignments.find(item => item.id === next.assignmentId)?.courseId !== next.courseId)) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, events: events.map(event => event.id === id ? next : event) };
}

export function deleteAcademicEvent(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  const events = snapshot.events ?? [];
  if (!events.some(event => event.id === id && event.source === "northstar")) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, events: events.filter(event => event.id !== id) };
}

export function createGradeItem(snapshot: AcademicSnapshot, input: GradeItemInput): AcademicSnapshot {
  if (!snapshot.courses.some(course => course.id === input.courseId) || !input.title.trim()
    || !Number.isFinite(input.pointsPossible) || input.pointsPossible <= 0
    || (input.assignmentId && snapshot.assignments.find(item => item.id === input.assignmentId)?.courseId !== input.courseId)
    || (input.status === "graded" ? typeof input.score !== "number" || !Number.isFinite(input.score) || input.score < 0 : input.score !== null)) return snapshot;
  const now = new Date().toISOString();
  const item: GradeItem = {
    ...input, id: "grade-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)),
    title: input.title.trim(), feedback: input.feedback?.trim(), gradedAt: input.status === "graded" ? now : undefined,
    source: "northstar", updatedAt: now,
  };
  return { ...snapshot, revision: snapshot.revision + 1, gradeItems: [...(snapshot.gradeItems ?? []), item] };
}

export function updateGradeItem(snapshot: AcademicSnapshot, id: string, input: GradeItemInput): AcademicSnapshot {
  const items = snapshot.gradeItems ?? [];
  const current = items.find(item => item.id === id);
  if (!current || current.source !== "northstar") return snapshot;
  if (!snapshot.courses.some(course => course.id === input.courseId) || !input.title.trim()
    || !Number.isFinite(input.pointsPossible) || input.pointsPossible <= 0
    || (input.assignmentId && snapshot.assignments.find(item => item.id === input.assignmentId)?.courseId !== input.courseId)
    || (input.status === "graded" ? typeof input.score !== "number" || !Number.isFinite(input.score) || input.score < 0 : input.score !== null)) return snapshot;
  const now = new Date().toISOString();
  const next: GradeItem = { ...input, id, title: input.title.trim(), feedback: input.feedback?.trim(), gradedAt: input.status === "graded" ? current.gradedAt ?? now : undefined, source: "northstar", updatedAt: now };
  return { ...snapshot, revision: snapshot.revision + 1, gradeItems: items.map(item => item.id === id ? next : item) };
}

export function deleteGradeItem(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  const items = snapshot.gradeItems ?? [];
  if (!items.some(item => item.id === id && item.source === "northstar")) return snapshot;
  return { ...snapshot, revision: snapshot.revision + 1, gradeItems: items.filter(item => item.id !== id) };
}

export function selectGradeSummary(snapshot: AcademicSnapshot, courseId?: string) {
  const items = (snapshot.gradeItems ?? []).filter(item => item.status === "graded" && item.score !== null && (!courseId || item.courseId === courseId));
  const earned = items.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const possible = items.reduce((sum, item) => sum + item.pointsPossible, 0);
  return { items: items.length, earned, possible, percentage: possible > 0 ? Math.round((earned / possible) * 1000) / 10 : null };
}
