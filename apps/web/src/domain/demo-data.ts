import type { AcademicAssignment, AcademicCourse, AcademicResource, AcademicTerm } from "./academic";

export const demoTerm: AcademicTerm = {
  id: "term-fall-2026", name: "Fall 2026",
  startsAt: "2026-08-24T00:00:00", endsAt: "2026-12-18T23:59:59",
};
export const demoCourses: AcademicCourse[] = [
  { id: "eng-204", code: "ENG 204", name: "Academic Writing", instructor: "Dr. Morgan", termId: demoTerm.id, color: "blue", progress: 82 },
  { id: "bio-112", code: "BIO 112", name: "General Biology", instructor: "Prof. Chen", termId: demoTerm.id, color: "green", progress: 68 },
  { id: "his-210", code: "HIS 210", name: "World History", instructor: "Dr. Patel", termId: demoTerm.id, color: "amber", progress: 61 },
  { id: "mat-151", code: "MAT 151", name: "College Algebra", instructor: "Prof. Rivera", termId: demoTerm.id, color: "violet", progress: 74 },
];
const now = new Date();
const day = (offset: number) => {
  const value = new Date(now);
  value.setDate(value.getDate() + offset);
  value.setHours(23, 59, 0, 0);
  return value.toISOString();
};
export const demoAssignments: AcademicAssignment[] = [
  { id: "a-eng-01", courseId: "eng-204", title: "Research response — Draft 2", description: "Revise the research response using source-evaluation notes and instructor feedback.", dueAt: day(-1), pointsPossible: 50, status: "in_progress", priority: "urgent", estimatedMinutes: 75, personalNotes: "Revisit the thesis and strengthen the second source.", source: "demo", updatedAt: now.toISOString() },
  { id: "a-bio-06", courseId: "bio-112", title: "Module 6 knowledge check", description: "Review cell transport, membrane structure and homeostasis.", dueAt: day(0), pointsPossible: 20, status: "not_started", priority: "high", estimatedMinutes: 25, personalNotes: "", source: "demo", updatedAt: now.toISOString() },
  { id: "a-his-04", courseId: "his-210", title: "Comparative analysis outline", description: "Prepare an outline comparing two historical perspectives.", dueAt: day(2), pointsPossible: 40, status: "in_progress", priority: "normal", estimatedMinutes: 50, personalNotes: "Find one more primary source.", source: "demo", updatedAt: now.toISOString() },
  { id: "a-mat-08", courseId: "mat-151", title: "Problem set 08", description: "Complete the polynomial and rational expression practice set.", dueAt: day(3), pointsPossible: 30, status: "not_started", priority: "normal", estimatedMinutes: 45, personalNotes: "", source: "demo", updatedAt: now.toISOString() },
  { id: "a-eng-02", courseId: "eng-204", title: "Reading reflection", description: "Reflect on the week's assigned readings.", dueAt: day(-3), pointsPossible: 15, status: "graded", priority: "normal", estimatedMinutes: 20, personalNotes: "", source: "demo", updatedAt: now.toISOString() },
  { id: "a-bio-05", courseId: "bio-112", title: "Lab preparation worksheet", description: "Prepare lab observations and pre-lab questions.", dueAt: day(-2), pointsPossible: 25, status: "submitted", priority: "normal", estimatedMinutes: 35, personalNotes: "", source: "demo", updatedAt: now.toISOString() },
  { id: "a-his-03", courseId: "his-210", title: "Primary source discussion", description: "Discuss the context and reliability of a primary source.", dueAt: day(-5), pointsPossible: 20, status: "missing", priority: "high", estimatedMinutes: 30, personalNotes: "Check whether late submission is still available.", source: "demo", updatedAt: now.toISOString() },
  { id: "a-mat-07", courseId: "mat-151", title: "Chapter 7 quiz", description: "Practice functions and graph transformations.", dueAt: day(-6), pointsPossible: 25, status: "graded", priority: "normal", estimatedMinutes: 30, personalNotes: "", source: "demo", updatedAt: now.toISOString() },
];


const resourceNow = new Date().toISOString();
export const demoResources: AcademicResource[] = [
  {
    id: "resource-eng-writing-notes", courseId: "eng-204", title: "Research writing notes",
    kind: "note", description: "A personal reference for building a focused claim and evaluating sources.",
    url: "", content: "Start with a specific, arguable claim. Use each source to support a distinct part of the reasoning. Explain why the evidence is credible and relevant rather than dropping quotations into the draft.",
    createdAt: resourceNow, updatedAt: resourceNow, source: "demo",
  },
  {
    id: "resource-bio-cell-review", courseId: "bio-112", title: "Cell transport review",
    kind: "reference", description: "Quick reminders for the membrane and transport unit.",
    url: "", content: "Diffusion moves particles down a concentration gradient. Osmosis describes water movement across a selectively permeable membrane. Active transport requires energy to move substances against a gradient.",
    createdAt: resourceNow, updatedAt: resourceNow, source: "demo",
  },
  {
    id: "resource-his-primary-sources", courseId: "his-210", title: "Library of Congress collections",
    kind: "link", description: "A starting point for locating primary-source material.",
    url: "https://www.loc.gov/", content: "",
    createdAt: resourceNow, updatedAt: resourceNow, source: "demo",
  },
];
