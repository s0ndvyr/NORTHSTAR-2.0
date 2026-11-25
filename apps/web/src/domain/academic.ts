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
  source: "demo";
  updatedAt: string;
}

export interface AcademicTerm {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface AcademicSnapshot {
  schemaVersion: 1;
  revision: number;
  term: AcademicTerm;
  courses: AcademicCourse[];
  assignments: AcademicAssignment[];
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  graded: "Graded",
  missing: "Missing",
};
