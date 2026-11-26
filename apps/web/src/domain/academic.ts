export type AssignmentStatus = "not_started" | "in_progress" | "submitted" | "graded" | "missing";
export type AssignmentPriority = "low" | "normal" | "high" | "urgent";

export interface AcademicCourse {
  id: string;
  code: string;
  name: string;
  instructor: string;
  termId: string;
  color: string;
  progress: number;
  /** Origin of this course record; absent only in early version-1 browser snapshots. */
  source?: "demo" | "northstar";
  updatedAt?: string;
}

export interface AcademicAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueAt: string;
  pointsPossible: number;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  estimatedMinutes: number;
  personalNotes: string;
  source: "demo" | "northstar";
  updatedAt: string;
}

export interface AcademicTerm {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export type AcademicResourceKind = "note" | "link" | "reference";

export interface AcademicResource {
  id: string;
  courseId: string;
  title: string;
  kind: AcademicResourceKind;
  description: string;
  url: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source: "demo" | "northstar";
}

export interface StudyCard {
  id: string;
  courseId: string;
  prompt: string;
  answer: string;
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  createdAt: string;
  updatedAt: string;
  source: "demo" | "northstar";
}

export type StudyRating = "again" | "hard" | "good" | "easy";

export interface WritingDraft {
  id: string;
  title: string;
  body: string;
  assignmentId?: string;
  revision: number;
  savedAt: string;
  source: "northstar";
}

export type AcademicEventKind = "class" | "study" | "reminder" | "personal";

export interface AcademicEvent {
  id: string;
  title: string;
  kind: AcademicEventKind;
  startsAt: string;
  endsAt: string;
  courseId?: string;
  assignmentId?: string;
  notes: string;
  source: "demo" | "northstar";
  updatedAt: string;
}

export interface AssignmentArtifact {
  id: string;
  assignmentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: string;
  source: "northstar";
}

export type GradeItemStatus = "graded" | "pending" | "missing" | "excused";

export interface GradeItem {
  id: string;
  courseId: string;
  assignmentId?: string;
  title: string;
  score: number | null;
  pointsPossible: number;
  status: GradeItemStatus;
  feedback?: string;
  gradedAt?: string;
  source: "demo" | "northstar";
  updatedAt: string;
}

/** @deprecated Legacy local quiz data retained only so older browser backups remain readable. */
export interface PracticeOption {
  id: string;
  text: string;
}

/** @deprecated Legacy local quiz data retained only so older browser backups remain readable. */
export interface PracticeQuestion {
  id: string;
  courseId: string;
  prompt: string;
  options: PracticeOption[];
  correctOptionId: string;
  explanation: string;
  concept: string;
  source: "demo";
}

/** @deprecated Legacy local quiz attempts are preserved for backup compatibility and are not exposed by the 5.0 UI. */
export interface PracticeAttempt {
  id: string;
  courseId: string;
  questionIds: string[];
  answers: Record<string, string>;
  flaggedIds: string[];
  startedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  durationSeconds?: number;
  score?: number;
  status: "in_progress" | "completed";
}


export interface AcademicSnapshot {
  schemaVersion: 1;
  revision: number;
  term: AcademicTerm;
  courses: AcademicCourse[];
  assignments: AcademicAssignment[];
  /** Optional during the version-1 transition so existing browser snapshots remain readable. */
  resources?: AcademicResource[];
  /** Optional during the version-1 transition for existing browser snapshots. */
  studyCards?: StudyCard[];
  /** Local writing drafts remain on this device and can optionally link to coursework. */
  writingDrafts?: WritingDraft[];
  /** Agenda items are separate from assignment due dates. */
  events?: AcademicEvent[];
  /** Scores are explicit records; assignment status alone never implies a numeric grade. */
  gradeItems?: GradeItem[];
  /** File metadata is stored in the snapshot; binary bytes live in a separate IndexedDB object store. */
  artifacts?: AssignmentArtifact[];
  /** @deprecated Read-only compatibility fields for legacy local quiz data; new 5.0 snapshots do not seed or create them. */
  practiceQuestions?: PracticeQuestion[];
  /** @deprecated Preserved in existing snapshots/backups; no 5.0 UI or command creates new attempts. */
  practiceAttempts?: PracticeAttempt[];
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  graded: "Graded",
  missing: "Missing",
};
