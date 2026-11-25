import type { AcademicAssignment, AcademicSnapshot, AssignmentStatus } from "./academic";
import { demoAssignments, demoCourses, demoTerm } from "./demo-data";

const STORAGE_KEY = "northstar-5-academic-demo-v1";
function initialSnapshot(): AcademicSnapshot {
  return { schemaVersion: 1, revision: 1, term: demoTerm, courses: demoCourses, assignments: demoAssignments };
}
function isSnapshot(value: unknown): value is AcademicSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AcademicSnapshot>;
  return candidate.schemaVersion === 1 && Array.isArray(candidate.courses) && Array.isArray(candidate.assignments) && !!candidate.term;
}
export function loadAcademicSnapshot(): AcademicSnapshot {
  if (typeof window === "undefined") return initialSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSnapshot(parsed)) return parsed;
    }
  } catch {
    // Storage can be unavailable in private browsing; keep the session usable.
  }
  return initialSnapshot();
}
export function saveAcademicSnapshot(snapshot: AcademicSnapshot): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); }
  catch { /* In-memory state remains available for this session. */ }
}
export function updateAssignmentStatus(snapshot: AcademicSnapshot, id: string, status: AssignmentStatus): AcademicSnapshot {
  return {
    ...snapshot,
    revision: snapshot.revision + 1,
    assignments: snapshot.assignments.map((assignment): AcademicAssignment =>
      assignment.id === id ? { ...assignment, status, updatedAt: new Date().toISOString() } : assignment,
    ),
  };
}
export function resetAcademicSnapshot(): AcademicSnapshot {
  const fresh = initialSnapshot();
  saveAcademicSnapshot(fresh);
  return fresh;
}
