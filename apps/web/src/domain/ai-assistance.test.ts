import { describe, expect, it } from "vitest";
import { loadAcademicSnapshot } from "./academic-repository";
import { createSimulationAssistant, summarizeAcademicContext } from "./ai-assistance";

describe("provider-free academic assistant boundary", () => {
  it("summarizes only the local academic snapshot", () => {
    const snapshot = loadAcademicSnapshot();
    const context = summarizeAcademicContext(snapshot, new Date("2026-11-25T12:00:00.000Z"));
    expect(context.courses).toBe(snapshot.courses.length);
    expect(context.assignments).toBe(snapshot.assignments.length);
    expect(context.resources).toBe(snapshot.resources?.length ?? 0);
    expect(context.studyCards).toBe(snapshot.studyCards?.length ?? 0);
    expect(context.openAssignments).toBe(snapshot.assignments.filter(item => !["submitted", "graded"].includes(item.status)).length);
  });

  it("prepares clearly labeled simulations without claiming a provider connection", () => {
    const snapshot = loadAcademicSnapshot();
    const service = createSimulationAssistant();
    const prepared = service.prepare("priority-review", snapshot, new Date("2026-11-25T12:00:00.000Z"));
    expect(service.mode).toBe("simulation");
    expect(service.providerConnected).toBe(false);
    expect(prepared).toMatchObject({
      action: "priority-review",
      label: "Priority review",
      mode: "simulation",
      providerConnected: false,
      message: expect.stringContaining("no model call or external data transfer occurred"),
    });
    expect(prepared.context).toEqual(summarizeAcademicContext(snapshot, new Date("2026-11-25T12:00:00.000Z")));
  });
});
