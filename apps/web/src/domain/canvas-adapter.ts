export type CanvasOperation = "read-courses" | "read-assignments" | "read-grades";

export interface CanvasConnectionStatus {
  provider: "canvas";
  state: "not_configured";
  canRead: false;
  canWrite: false;
  message: string;
}

export type CanvasAdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured"; message: string };

export interface CanvasAdapter {
  getStatus(): Promise<CanvasConnectionStatus>;
  listCourses(): Promise<CanvasAdapterResult<never[]>>;
  listAssignments(courseId: string): Promise<CanvasAdapterResult<never[]>>;
  listGrades(courseId: string): Promise<CanvasAdapterResult<never[]>>;
}

const unavailableMessage = "Canvas is not configured. No institution data was requested or changed.";

export function createUnconfiguredCanvasAdapter(): CanvasAdapter {
  const unavailable = <T,>(): CanvasAdapterResult<T> => ({
    ok: false,
    reason: "not_configured",
    message: unavailableMessage,
  });
  return {
    async getStatus() {
      return {
        provider: "canvas",
        state: "not_configured",
        canRead: false,
        canWrite: false,
        message: unavailableMessage,
      };
    },
    async listCourses() { return unavailable<never[]>(); },
    async listAssignments(_courseId: string) { return unavailable<never[]>(); },
    async listGrades(_courseId: string) { return unavailable<never[]>(); },
  };
}
