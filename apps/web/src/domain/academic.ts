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
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  graded: "Graded",
  missing: "Missing",
};
