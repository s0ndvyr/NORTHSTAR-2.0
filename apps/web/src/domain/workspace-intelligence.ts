import type { AcademicSnapshot } from "./academic";

export type WorkspaceResultKind = "WORKSPACE" | "COURSE" | "ASSIGNMENT" | "EVENT" | "RESOURCE" | "DRAFT";
export interface WorkspaceSearchResult {
  id: string;
  title: string;
  detail: string;
  type: WorkspaceResultKind;
  to: string;
}
export type NotificationTone = "urgent" | "today" | "info";
export interface AcademicNotification {
  id: string;
  title: string;
  detail: string;
  to: string;
  tone: NotificationTone;
}

const workspaces = [
  { id: "overview", title: "Overview", detail: "Open workspace", type: "WORKSPACE" as const, to: "/" },
  { id: "assignments", title: "Assignments", detail: "Open workspace", type: "WORKSPACE" as const, to: "/assignments" },
  { id: "courses", title: "Courses", detail: "Open workspace", type: "WORKSPACE" as const, to: "/courses" },
  { id: "calendar", title: "Calendar", detail: "Open workspace", type: "WORKSPACE" as const, to: "/calendar" },
  { id: "study", title: "Study Lab", detail: "Open workspace", type: "WORKSPACE" as const, to: "/study" },
  { id: "gradebook", title: "Gradebook", detail: "Open workspace", type: "WORKSPACE" as const, to: "/gradebook" },
  { id: "review", title: "Review Center", detail: "Open workspace", type: "WORKSPACE" as const, to: "/review" },
  { id: "resources", title: "Resources", detail: "Open workspace", type: "WORKSPACE" as const, to: "/resources" },
  { id: "ai", title: "AI Workspace", detail: "Open workspace", type: "WORKSPACE" as const, to: "/ai" },
  { id: "settings", title: "Settings", detail: "Open workspace", type: "WORKSPACE" as const, to: "/settings" },
];

export function searchWorkspaceResults(snapshot: AcademicSnapshot, query: string, limit = 14): WorkspaceSearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  const rows: WorkspaceSearchResult[] = [
    ...workspaces,
    ...snapshot.courses.map(item => ({
      id: "course-" + item.id, title: item.name, detail: item.code + " · " + item.instructor,
      type: "COURSE" as const, to: "/courses/" + item.id,
    })),
    ...snapshot.assignments.map(item => ({
      id: "assignment-" + item.id, title: item.title,
      detail: (snapshot.courses.find(course => course.id === item.courseId)?.code ?? "COURSE") + " · " + item.status.replaceAll("_", " "),
      type: "ASSIGNMENT" as const, to: "/assignments/" + item.id,
    })),
    ...(snapshot.events ?? []).map(item => ({
      id: "event-" + item.id, title: item.title,
      detail: "Calendar · " + new Date(item.startsAt).toLocaleDateString(),
      type: "EVENT" as const, to: "/calendar",
    })),
    ...(snapshot.resources ?? []).map(item => ({
      id: "resource-" + item.id, title: item.title,
      detail: "Resource · " + (snapshot.courses.find(course => course.id === item.courseId)?.code ?? "General"),
      type: "RESOURCE" as const, to: "/resources",
    })),
    ...(snapshot.writingDrafts ?? []).map(item => ({
      id: "draft-" + item.id, title: item.title,
      detail: "Saved writing · " + new Date(item.savedAt).toLocaleDateString(),
      type: "DRAFT" as const, to: "/review",
    })),
  ];
  const filtered = normalized
    ? rows.filter(row => (row.title + " " + row.detail + " " + row.type).toLocaleLowerCase().includes(normalized))
    : rows;
  return filtered.slice(0, Math.max(0, limit));
}

export function selectAcademicNotifications(snapshot: AcademicSnapshot, now = new Date(), limit = 12): AcademicNotification[] {
  const time = now.getTime();
  const today = now.toDateString();
  const horizon = time + 7 * 24 * 60 * 60 * 1000;
  const notifications: AcademicNotification[] = [
    ...snapshot.assignments
      .filter(item => item.status === "missing" || (!["graded", "submitted"].includes(item.status) && Date.parse(item.dueAt) < time))
      .map(item => ({
        id: "assignment-" + item.id, title: item.title,
        detail: (snapshot.courses.find(course => course.id === item.courseId)?.code ?? "COURSE") + " · " + (item.status === "missing" ? "Marked missing" : "Past due"),
        to: "/assignments", tone: "urgent" as const,
      })),
    ...snapshot.assignments
      .filter(item => !["graded", "submitted", "missing"].includes(item.status) && new Date(item.dueAt).toDateString() === today)
      .map(item => ({
        id: "today-" + item.id, title: item.title,
        detail: (snapshot.courses.find(course => course.id === item.courseId)?.code ?? "COURSE") + " · Due today",
        to: "/assignments", tone: "today" as const,
      })),
    ...(snapshot.events ?? [])
      .filter(item => Date.parse(item.startsAt) >= time && Date.parse(item.startsAt) <= horizon)
      .map(item => ({
        id: "event-" + item.id, title: item.title,
        detail: "Upcoming · " + new Date(item.startsAt).toLocaleString(),
        to: "/calendar", tone: "info" as const,
      })),
    ...(snapshot.studyCards ?? [])
      .filter(item => Date.parse(item.nextReviewAt) <= time)
      .map(item => ({
        id: "study-" + item.id, title: "Flashcard due: " + item.prompt,
        detail: snapshot.courses.find(course => course.id === item.courseId)?.code ?? "Study Lab",
        to: "/study", tone: "info" as const,
      })),
    ...(snapshot.gradeItems ?? [])
      .filter(item => item.status === "pending")
      .map(item => ({
        id: "grade-" + item.id, title: "Grade pending: " + item.title,
        detail: snapshot.courses.find(course => course.id === item.courseId)?.code ?? "Gradebook",
        to: "/gradebook", tone: "info" as const,
      })),
  ];
  return notifications.slice(0, Math.max(0, limit));
}
