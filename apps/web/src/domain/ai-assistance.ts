import type { AcademicSnapshot } from "./academic";

export type AssistanceAction = "study-plan" | "priority-review" | "course-summary";

export interface AcademicContextSummary {
  courses: number;
  assignments: number;
  openAssignments: number;
  overdueAssignments: number;
  resources: number;
  studyCards: number;
}

export interface PreparedAssistance {
  action: AssistanceAction;
  label: string;
  mode: "simulation";
  providerConnected: false;
  context: AcademicContextSummary;
  message: string;
}

export interface AcademicAssistantService {
  readonly mode: "simulation";
  readonly providerConnected: false;
  prepare(action: AssistanceAction, snapshot: AcademicSnapshot, now?: Date): PreparedAssistance;
}

export function summarizeAcademicContext(snapshot: AcademicSnapshot, now = new Date()): AcademicContextSummary {
  const open = snapshot.assignments.filter(item => !["submitted", "graded"].includes(item.status));
  return {
    courses: snapshot.courses.length,
    assignments: snapshot.assignments.length,
    openAssignments: open.length,
    overdueAssignments: open.filter(item => item.status === "missing" || Date.parse(item.dueAt) < now.getTime()).length,
    resources: (snapshot.resources ?? []).length,
    studyCards: (snapshot.studyCards ?? []).length,
  };
}

export function createSimulationAssistant(): AcademicAssistantService {
  return {
    mode: "simulation",
    providerConnected: false,
    prepare(action, snapshot, now = new Date()) {
      const labels: Record<AssistanceAction, string> = {
        "study-plan": "Study plan outline",
        "priority-review": "Priority review",
        "course-summary": "Course context summary",
      };
      const label = labels[action];
      return {
        action, label, mode: "simulation", providerConnected: false,
        context: summarizeAcademicContext(snapshot, now),
        message: "Simulated request prepared: " + label + " · no model call or external data transfer occurred.",
      };
    },
  };
}
