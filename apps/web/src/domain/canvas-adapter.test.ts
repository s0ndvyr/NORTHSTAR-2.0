import { describe, expect, it } from "vitest";
import { createUnconfiguredCanvasAdapter } from "./canvas-adapter";

describe("unconfigured Canvas adapter boundary", () => {
  it("reports no connection and no read/write capability", async () => {
    const adapter = createUnconfiguredCanvasAdapter();
    await expect(adapter.getStatus()).resolves.toMatchObject({
      provider: "canvas",
      state: "not_configured",
      canRead: false,
      canWrite: false,
    });
  });

  it("does not return institution data or submit work while unconfigured", async () => {
    const adapter = createUnconfiguredCanvasAdapter();
    const results = await Promise.all([
      adapter.listCourses(),
      adapter.listAssignments("course-1"),
      adapter.listGrades("course-1"),
      adapter.submitAssignment({ courseId: "course-1", assignmentId: "assignment-1", artifactIds: [] }),
    ]);
    expect(results.every(result => !result.ok && result.reason === "not_configured")).toBe(true);
    expect(results.every(result => !result.ok && result.message.includes("No institution data was requested or changed"))).toBe(true);
  });
});
