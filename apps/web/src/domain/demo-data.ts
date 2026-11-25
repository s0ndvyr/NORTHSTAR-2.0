import type { AcademicAssignment, AcademicCourse, AcademicEvent, AcademicResource, AcademicTerm, GradeItem, PracticeQuestion, StudyCard } from "./academic";

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


export const demoStudyCards: StudyCard[] = [
  { id: "study-eng-thesis", courseId: "eng-204", prompt: "What makes a thesis statement effective?", answer: "An effective thesis is specific, arguable, focused, and gives the reader a clear sense of the reasoning the paper will develop.", nextReviewAt: resourceNow, intervalDays: 0, easeFactor: 2.5, repetitions: 0, createdAt: resourceNow, updatedAt: resourceNow, source: "demo" },
  { id: "study-bio-osmosis", courseId: "bio-112", prompt: "What is osmosis?", answer: "Osmosis is the net movement of water across a selectively permeable membrane toward the side with the higher concentration of solutes.", nextReviewAt: resourceNow, intervalDays: 0, easeFactor: 2.5, repetitions: 0, createdAt: resourceNow, updatedAt: resourceNow, source: "demo" },
  { id: "study-his-primary", courseId: "his-210", prompt: "What questions help evaluate a primary source?", answer: "Ask who created it, when and where it was created, its intended audience, its purpose, what it reveals, and whose perspective may be missing.", nextReviewAt: resourceNow, intervalDays: 0, easeFactor: 2.5, repetitions: 0, createdAt: resourceNow, updatedAt: resourceNow, source: "demo" },
  { id: "study-mat-function", courseId: "mat-151", prompt: "What is a function in algebra?", answer: "A function is a relation that assigns exactly one output to each permitted input. A vertical-line test can help identify whether a graph represents a function.", nextReviewAt: resourceNow, intervalDays: 0, easeFactor: 2.5, repetitions: 0, createdAt: resourceNow, updatedAt: resourceNow, source: "demo" },
];

const at = (offset: number, hour: number, minute = 0) => {
  const value = new Date(now);
  value.setDate(value.getDate() + offset);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
};

export const demoEvents: AcademicEvent[] = [
  { id: "event-eng-seminar", title: "Academic Writing seminar", kind: "class", startsAt: at(1, 10), endsAt: at(1, 11, 15), courseId: "eng-204", notes: "Bring the latest research response draft.", source: "demo", updatedAt: now.toISOString() },
  { id: "event-bio-lecture", title: "Biology lecture", kind: "class", startsAt: at(2, 11, 30), endsAt: at(2, 12, 45), courseId: "bio-112", notes: "Cell transport and membrane function.", source: "demo", updatedAt: now.toISOString() },
  { id: "event-history-study", title: "Primary-source study block", kind: "study", startsAt: at(2, 16), endsAt: at(2, 17), courseId: "his-210", notes: "Compare authorship, context and purpose.", source: "demo", updatedAt: now.toISOString() },
  { id: "event-algebra-workshop", title: "Algebra workshop", kind: "class", startsAt: at(4, 14), endsAt: at(4, 15, 15), courseId: "mat-151", notes: "Bring questions about rational expressions.", source: "demo", updatedAt: now.toISOString() },
  { id: "event-personal-review", title: "Weekly planning review", kind: "personal", startsAt: at(5, 9), endsAt: at(5, 9, 30), notes: "Review priorities and adjust study blocks.", source: "demo", updatedAt: now.toISOString() },
];

export const demoGradeItems: GradeItem[] = [
  { id: "grade-eng-reflection", courseId: "eng-204", assignmentId: "a-eng-02", title: "Reading reflection", score: 14, pointsPossible: 15, status: "graded", feedback: "Clear reflection; add more direct evidence.", gradedAt: at(-1, 12), source: "demo", updatedAt: now.toISOString() },
  { id: "grade-eng-source", courseId: "eng-204", title: "Source evaluation", score: 18, pointsPossible: 20, status: "graded", feedback: "Strong source selection and relevance.", gradedAt: at(-6, 12), source: "demo", updatedAt: now.toISOString() },
  { id: "grade-eng-research", courseId: "eng-204", assignmentId: "a-eng-01", title: "Research response — Draft 2", score: null, pointsPossible: 50, status: "pending", source: "demo", updatedAt: now.toISOString() },
  { id: "grade-bio-safety", courseId: "bio-112", title: "Lab safety check", score: 9, pointsPossible: 10, status: "graded", feedback: "Complete.", gradedAt: at(-4, 12), source: "demo", updatedAt: now.toISOString() },
  { id: "grade-bio-cell", courseId: "bio-112", title: "Cell structure quiz", score: 17, pointsPossible: 20, status: "graded", gradedAt: at(-8, 12), source: "demo", updatedAt: now.toISOString() },
  { id: "grade-his-source", courseId: "his-210", title: "Primary source response", score: 16, pointsPossible: 20, status: "graded", feedback: "Make the historical context explicit.", gradedAt: at(-5, 12), source: "demo", updatedAt: now.toISOString() },
  { id: "grade-his-discussion", courseId: "his-210", assignmentId: "a-his-03", title: "Primary source discussion", score: null, pointsPossible: 20, status: "missing", source: "demo", updatedAt: now.toISOString() },
  { id: "grade-mat-quiz", courseId: "mat-151", assignmentId: "a-mat-07", title: "Chapter 7 quiz", score: 21, pointsPossible: 25, status: "graded", feedback: "Review transformations and intercepts.", gradedAt: at(-2, 12), source: "demo", updatedAt: now.toISOString() },
  { id: "grade-mat-problem", courseId: "mat-151", title: "Problem set 08", score: null, pointsPossible: 30, status: "pending", source: "demo", updatedAt: now.toISOString() },
];


export const demoPracticeQuestions: PracticeQuestion[] = [
  {
    id: "practice-eng-thesis", courseId: "eng-204", concept: "Argument and thesis",
    prompt: "Which thesis statement is the most effective starting point for an argumentative essay?",
    options: [
      { id: "a", text: "This essay is about public transportation." },
      { id: "b", text: "Cities should expand reliable bus service because it improves access to work and reduces traffic pressure." },
      { id: "c", text: "Public transportation has existed for a long time." },
      { id: "d", text: "There are many different opinions about buses." },
    ],
    correctOptionId: "b",
    explanation: "The strongest option makes a specific, arguable claim and previews reasons that can be developed with evidence.",
    source: "demo",
  },
  {
    id: "practice-bio-osmosis", courseId: "bio-112", concept: "Cell transport",
    prompt: "A selectively permeable membrane separates two solutions. Which way does net osmosis move water?",
    options: [
      { id: "a", text: "Toward the side with the higher solute concentration." },
      { id: "b", text: "Toward the side with the lower solute concentration." },
      { id: "c", text: "Only from inside a cell to outside a cell." },
      { id: "d", text: "Water cannot cross a selectively permeable membrane." },
    ],
    correctOptionId: "a",
    explanation: "Net water movement is toward the higher solute concentration, assuming the solute cannot cross the membrane.",
    source: "demo",
  },
  {
    id: "practice-his-source", courseId: "his-210", concept: "Historical source analysis",
    prompt: "Why should a historian consider the intended audience of a primary source?",
    options: [
      { id: "a", text: "It proves the source is accurate." },
      { id: "b", text: "It reveals the creator's purpose and may explain choices in language or emphasis." },
      { id: "c", text: "It makes the source a secondary source." },
      { id: "d", text: "It removes the need to consider context." },
    ],
    correctOptionId: "b",
    explanation: "Audience is part of context. It can help explain what the creator wanted readers to think, feel, or do.",
    source: "demo",
  },
  {
    id: "practice-mat-function", courseId: "mat-151", concept: "Functions",
    prompt: "Which relation is a function?",
    options: [
      { id: "a", text: "{(1, 2), (1, 3), (2, 4)}" },
      { id: "b", text: "{(2, 1), (3, 1), (4, 1)}" },
      { id: "c", text: "{(0, 2), (0, 5), (1, 7)}" },
      { id: "d", text: "{(3, 4), (3, 6), (3, 8)}" },
    ],
    correctOptionId: "b",
    explanation: "A function assigns exactly one output to each input. Different inputs may share the same output.",
    source: "demo",
  },,
  {
    id: "practice-eng-source-check", courseId: "eng-204", concept: "Source evaluation",
    prompt: "Which source is usually the strongest starting point for a research claim about a recent public-health recommendation?",
    options: [
      { id: "a", text: "An anonymous post with no links or publication date." },
      { id: "b", text: "A current report from a recognized public-health agency that cites its evidence." },
      { id: "c", text: "An old opinion column that does not discuss the recommendation." },
      { id: "d", text: "A product advertisement from a company selling a related service." },
    ],
    correctOptionId: "b",
    explanation: "A current, accountable source that identifies its evidence is more suitable for verifying a current public-health recommendation. Check the underlying studies and date before relying on it.",
    source: "demo",
  },
  {
    id: "practice-eng-paraphrase", courseId: "eng-204", concept: "Paraphrase and citation",
    prompt: "What is the best way to use a source idea in a paraphrase?",
    options: [
      { id: "a", text: "Change a few words and keep the original sentence structure." },
      { id: "b", text: "Rewrite the idea in your own structure and wording, preserve its meaning, and cite the source." },
      { id: "c", text: "Remove the author’s name because the wording is different." },
      { id: "d", text: "Use the idea without citation if it is less than one sentence." },
    ],
    correctOptionId: "b",
    explanation: "A valid paraphrase accurately restates the source idea using your own sentence structure and wording and still gives credit to the source.",
    source: "demo",
  },
  {
    id: "practice-bio-active-transport", courseId: "bio-112", concept: "Membrane transport",
    prompt: "Which statement best describes active transport across a cell membrane?",
    options: [
      { id: "a", text: "Particles move down their concentration gradient without energy." },
      { id: "b", text: "Water moves across a membrane toward higher solute concentration." },
      { id: "c", text: "A cell uses energy to move a substance against its concentration or electrochemical gradient." },
      { id: "d", text: "Particles move only through the phospholipid tails." },
    ],
    correctOptionId: "c",
    explanation: "Active transport requires an energy input, directly or indirectly, to move substances against a gradient.",
    source: "demo",
  },
  {
    id: "practice-bio-hypotonic", courseId: "bio-112", concept: "Osmotic balance",
    prompt: "A typical animal cell is placed in a hypotonic solution. What is the likely net effect?",
    options: [
      { id: "a", text: "Water enters the cell, causing it to swell and potentially lyse." },
      { id: "b", text: "Water leaves the cell, causing it to shrink." },
      { id: "c", text: "There is no net water movement." },
      { id: "d", text: "The cell wall prevents any volume change." },
    ],
    correctOptionId: "a",
    explanation: "A hypotonic surrounding solution has a lower effective solute concentration than the cell, so water moves into the cell by osmosis. Animal cells lack a rigid cell wall.",
    source: "demo",
  },
  {
    id: "practice-his-corroboration", courseId: "his-210", concept: "Corroboration",
    prompt: "Two independent primary sources describe the same event but disagree about its cause. What should a historian do next?",
    options: [
      { id: "a", text: "Choose the source with the more confident wording." },
      { id: "b", text: "Discard both sources because they disagree." },
      { id: "c", text: "Compare each source’s context, purpose, evidence and perspective with additional records." },
      { id: "d", text: "Assume the later source is automatically correct." },
    ],
    correctOptionId: "c",
    explanation: "Corroboration compares evidence across sources while accounting for context, perspective, purpose and limits. Disagreement is a reason to investigate, not to discard evidence automatically.",
    source: "demo",
  },
  {
    id: "practice-his-causation", courseId: "his-210", concept: "Historical causation",
    prompt: "Which approach best supports a claim that one event contributed to a later historical change?",
    options: [
      { id: "a", text: "Show only that the two events happened in sequence." },
      { id: "b", text: "Use contextual evidence to explain a plausible mechanism and consider other contributing factors." },
      { id: "c", text: "Assume that events occurring close together have a direct causal link." },
      { id: "d", text: "Ignore evidence that points to other explanations." },
    ],
    correctOptionId: "b",
    explanation: "Chronology alone does not prove causation. Historical causal arguments need evidence of mechanisms, context and the role of other factors.",
    source: "demo",
  },
  {
    id: "practice-mat-translation", courseId: "mat-151", concept: "Function transformations",
    prompt: "For g(x) = f(x) + 4, how is the graph of f(x) transformed?",
    options: [
      { id: "a", text: "Shifted four units to the right." },
      { id: "b", text: "Shifted four units to the left." },
      { id: "c", text: "Shifted four units up." },
      { id: "d", text: "Reflected across the x-axis." },
    ],
    correctOptionId: "c",
    explanation: "Adding a constant outside the function shifts every output upward by that amount, so the graph moves four units up.",
    source: "demo",
  },
  {
    id: "practice-mat-domain", courseId: "mat-151", concept: "Function domain",
    prompt: "What is the domain of f(x) = 1 / (x - 3)?",
    options: [
      { id: "a", text: "All real numbers." },
      { id: "b", text: "All real numbers except x = 3." },
      { id: "c", text: "All real numbers greater than 3." },
      { id: "d", text: "All real numbers except x = 0." },
    ],
    correctOptionId: "b",
    explanation: "The denominator cannot equal zero. Since x - 3 = 0 at x = 3, the domain includes every real number except 3.",
    source: "demo",
  }
];
