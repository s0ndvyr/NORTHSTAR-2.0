import type { AcademicAssignment, AcademicResource, AcademicSnapshot, AssignmentStatus, AcademicResourceKind } from "./academic";
import { demoAssignments, demoCourses, demoResources, demoTerm } from "./demo-data";

const STORAGE_KEY = "northstar-5-academic-demo-v1";
const VALID_STATUSES: AssignmentStatus[] = ["not_started", "in_progress", "submitted", "graded", "missing"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type AssignmentInput = Pick<AcademicAssignment, "courseId" | "title" | "description" | "dueAt" | "pointsPossible" | "priority" | "estimatedMinutes" | "personalNotes">;
export type AssignmentPatch = Partial<AssignmentInput> & { status?: AssignmentStatus };
export type ResourceInput = Pick<AcademicResource, "courseId" | "title" | "kind" | "description" | "url" | "content">;

function initialSnapshot(): AcademicSnapshot {
  return {
    schemaVersion: 1,
    revision: 1,
    term: { ...demoTerm },
    courses: demoCourses.map(course => ({ ...course })),
    assignments: demoAssignments.map(assignment => ({ ...assignment })),
    resources: demoResources.map(resource => ({ ...resource })),
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
  if (validUrl && value.url) { try { validUrl = new URL(value.url).protocol === "https:"; } catch { validUrl = false; } }
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.courseId === "string" && courseIds.has(value.courseId)
    && typeof value.title === "string" && value.title.trim().length > 0
    && validKind && typeof value.description === "string" && validUrl
    && typeof value.content === "string"
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
    && (value.source === "demo" || value.source === "northstar");
}

export function isAcademicSnapshot(value: unknown): value is AcademicSnapshot {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Number.isInteger(value.revision) || (value.revision as number) < 0) return false;
  if (!isRecord(value.term) || typeof value.term.id !== "string" || typeof value.term.name !== "string"
    || typeof value.term.startsAt !== "string" || !Number.isFinite(Date.parse(value.term.startsAt))
    || typeof value.term.endsAt !== "string" || !Number.isFinite(Date.parse(value.term.endsAt))) return false;
  if (!Array.isArray(value.courses) || !Array.isArray(value.assignments)) return false;
  if (value.resources !== undefined && !Array.isArray(value.resources)) return false;
  const courseIds = new Set<string>();
  for (const course of value.courses) {
    if (!isRecord(course) || typeof course.id !== "string" || !course.id
      || typeof course.code !== "string" || typeof course.name !== "string"
      || typeof course.instructor !== "string" || typeof course.termId !== "string"
      || typeof course.color !== "string" || typeof course.progress !== "number"
      || !Number.isFinite(course.progress) || course.progress < 0 || course.progress > 100) return false;
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
  return true;
}

export function loadAcademicSnapshot(): AcademicSnapshot {
  if (typeof window === "undefined") return initialSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isAcademicSnapshot(parsed)) return { ...parsed, resources: parsed.resources ?? [] };
    }
  } catch {
    // A malformed or unavailable browser store must not prevent the app from opening.
  }
  return initialSnapshot();
}

export function saveAcademicSnapshot(snapshot: AcademicSnapshot): boolean {
  if (typeof window === "undefined" || !isAcademicSnapshot(snapshot)) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
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

export function createAssignment(snapshot: AcademicSnapshot, input: AssignmentInput): AcademicSnapshot {
  if (!snapshot.courses.some(course => course.id === input.courseId)) return snapshot;
  if (!input.title.trim() || !Number.isFinite(Date.parse(input.dueAt))) return snapshot;
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
  if (!next.title || !snapshot.courses.some(course => course.id === next.courseId)
    || !Number.isFinite(Date.parse(next.dueAt)) || next.pointsPossible < 0 || next.estimatedMinutes < 0) return snapshot;
  return revise(snapshot, snapshot.assignments.map(assignment => assignment.id === id ? next : assignment));
}

export function deleteAssignment(snapshot: AcademicSnapshot, id: string): AcademicSnapshot {
  if (!snapshot.assignments.some(assignment => assignment.id === id)) return snapshot;
  return revise(snapshot, snapshot.assignments.filter(assignment => assignment.id !== id));
}

export function resetAcademicSnapshot(): AcademicSnapshot {
  const fresh = initialSnapshot();
  saveAcademicSnapshot(fresh);
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
