import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("northstar-e2e-clean") !== "1") {
      localStorage.clear();
      sessionStorage.setItem("northstar-e2e-clean", "1");
    }
  });
  await page.goto("/");
});

test("dashboard, skip navigation, command palette and workspace navigation", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /Make today/ })).toBeVisible();
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();

  const paletteButton = page.getByRole("button", { name: "Open command palette" });
  await paletteButton.click();
  const dialog = page.getByRole("dialog", { name: "NORTHSTAR command palette" });
  await expect(dialog).toBeVisible();
  await page.getByRole("combobox", { name: "Search NORTHSTAR" }).fill("calendar");
  await expect(page.locator("#palette-calendar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(paletteButton).toBeFocused();

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Assignments/ }).click();
  await expect(page.getByRole("heading", { name: /Assignments/ })).toBeVisible();
});

test("creates an assignment and updates its local workflow status", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Assignments/ }).click();
  await page.getByRole("button", { name: "New assignment" }).click();
  const title = "Browser qualification assignment";
  await page.getByLabel("Assignment title").fill(title);
  await page.getByLabel("Description").fill("Created by the NORTHSTAR browser qualification suite.");
  await page.getByRole("button", { name: "Create assignment" }).click();

  const assignmentLink = page.getByRole("link", { name: title });
  await expect(assignmentLink).toBeVisible();
  const assignmentRow = page.locator(".assignment-row").filter({ has: assignmentLink });
  await expect(assignmentRow.locator(".origin-label")).toHaveText("PERSONAL");
  await page.getByLabel("Update personal status for " + title).selectOption("in_progress");
  await expect(assignmentRow.locator(".status-pill.status-in_progress")).toBeVisible();
  await page.reload();
  const persistedRow = page.locator(".assignment-row").filter({ has: page.getByRole("link", { name: title }) });
  await expect(persistedRow.locator(".status-pill.status-in_progress")).toBeVisible();
});

test("creates and edits the connected calendar agenda", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Calendar/ }).click();
  await page.getByRole("button", { name: "Add event" }).click();
  const title = "Browser qualification study block";
  await page.getByLabel("Event title").fill(title);
  await page.getByLabel("Notes").fill("Verify calendar persistence and edit workflow.");
  await page.getByRole("button", { name: "Save event" }).click();
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.locator(".calendar-item").filter({ hasText: title }).locator(".origin-label")).toHaveText("PERSONAL");

  await page.getByRole("button", { name: "Edit " + title }).click();
  await page.getByLabel("Event title").fill("Updated browser qualification study block");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Updated browser qualification study block")).toBeVisible();
});

test("creates a course and exposes its course hub", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Courses/ }).click();
  await page.getByRole("button", { name: "Add course" }).click();
  await page.getByLabel("Course code").fill("QA 205");
  await page.getByLabel("Course name").fill("Browser Qualification");
  await page.getByLabel("Instructor").fill("Dr. Northstar");
  await page.locator("form.editor-panel").getByRole("button", { name: "Add course" }).click();

  await expect(page.getByText("QA 205").first()).toBeVisible();
  await expect(page.locator(".course-card").filter({ hasText: "QA 205" }).locator(".origin-label")).toHaveText("PERSONAL");
  await page.getByRole("link", { name: /Open course hub/ }).last().click();
  await expect(page.getByRole("heading", { name: /Browser Qualification/ })).toBeVisible();
});

test("creates a course-linked resource in the personal library", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Resources/ }).click();
  await page.getByRole("button", { name: "Add resource" }).click();
  await page.getByLabel("Resource title").fill("Browser qualification reference");
  await page.getByLabel("Description").fill("A resource created by the browser qualification suite.");
  await page.getByLabel("Notes / content").fill("Local library persistence check.");
  await page.locator("form.editor-panel").getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByText("Browser qualification reference")).toBeVisible();
});

test("records an explicit grade without inferring it from assignment status", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Gradebook/ }).click();
  await page.getByRole("button", { name: "Add grade record" }).click();
  await page.getByLabel("Grade item title").fill("Browser qualification quiz");
  await page.getByLabel("Status").selectOption("graded");
  await page.getByLabel("Points possible").fill("20");
  await page.getByLabel("Score earned").fill("17");
  await page.getByRole("button", { name: "Save grade" }).click();
  await expect(page.getByText("Browser qualification quiz")).toBeVisible();
  await expect(page.locator(".grade-record").filter({ hasText: "Browser qualification quiz" }).locator(".origin-label")).toHaveText("PERSONAL");
  await expect(page.getByText("17 / 20").first()).toBeVisible();
});

test("saves a writing draft and runs the local structural review", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Review Center/ }).click();
  await page.getByRole("button", { name: "New draft" }).click();
  await page.getByLabel("Draft title").fill("Browser qualification essay");
  await page.getByLabel("Your writing").fill("This is a short sample draft. It is saved locally for a workflow check.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Saved to this browser")).toBeVisible();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByText("Moderate", { exact: true })).toBeVisible();
});

test("uses self-guided flashcard practice without timed tests or graded attempts", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Study Lab/ }).click();
  await expect(page.getByText(/Study Lab does not create quizzes, timed tests or grades/)).toBeVisible();
  await expect(page.getByText(/SELF-GUIDED FLASHCARDS/)).toBeVisible();
  await expect(page.getByText("How well did you recall it?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Again", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Good", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start timed practice" })).toHaveCount(0);
  await expect(page.getByText(/QUESTION \\d+ OF/i)).toHaveCount(0);
});

test("persists the selected theme across reloads", async ({ page }) => {
  await page.locator(".sidebar").getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Light/ }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /Midnight/ }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "midnight");
});

test("keeps AI and Canvas clearly in their unconnected demo boundaries", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^AI Workspace/ }).click();
  await expect(page.getByText("SIMULATION ONLY")).toBeVisible();
  await page.getByRole("button", { name: "Turn on" }).click();
  await page.getByRole("button", { name: /Prepare a study plan/ }).click();
  await expect(page.getByText("SIMULATION OUTPUT")).toBeVisible();

  await page.locator(".sidebar").getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("link", { name: /View Canvas status/ }).click();
  await expect(page.getByText("NOT CONNECTED")).toBeVisible();
  await expect(page.getByText(/No Canvas URL, credentials/)).toBeVisible();
});

test("keeps the dashboard and assignments usable at an iPad Pro portrait viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Make today/ })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Assignments/ }).click();
  await expect(page.getByRole("heading", { name: /Assignments/ })).toBeVisible();
});

test("loads the cached application shell after network loss", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByRole("heading", { name: /Make today/ })).toBeVisible();
  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  expect(controlled).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Make today/ })).toBeVisible();
  await context.setOffline(false);
});

test("preserves concurrent edits until the conflict bundle save is acknowledged", async ({ page }) => {
  const secondTab = await page.context().newPage();
  await secondTab.goto("/");
  await expect(secondTab.getByRole("heading", { name: /Make today/ })).toBeVisible();

  const createAssignment = async (target, title) => {
    await target.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Assignments/ }).click();
    await target.getByRole("button", { name: "New assignment" }).click();
    await target.getByLabel("Assignment title").fill(title);
    await target.getByLabel("Description").fill("Concurrent tab conflict qualification.");
    await target.getByRole("button", { name: "Create assignment" }).click();
    await expect(target.getByRole("link", { name: title })).toBeVisible();
  };

  const firstTitle = "First tab preserved assignment";
  const secondTitle = "Second tab preserved assignment";
  await createAssignment(page, firstTitle);
  await expect.poll(() => page.evaluate((title) => {
    const snapshot = JSON.parse(localStorage.getItem("northstar-5-academic-demo-v1") || "null");
    return snapshot?.assignments?.some(item => item.title === title) ?? false;
  }, firstTitle)).toBe(true);
  await createAssignment(secondTab, secondTitle);

  await expect(page.getByText("Concurrent academic edit preserved")).toBeVisible();
  await expect(secondTab.getByText("Concurrent academic edit preserved")).toBeVisible();
  const downloadPromise = secondTab.waitForEvent("download");
  await secondTab.getByRole("button", { name: "Download both versions" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^northstar-conflict-/);
  const bundlePath = await download.path();
  const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
  expect(bundle.format).toBe("northstar-academic-conflict");
  expect(bundle.conflicts[0].attachmentManifest).toBeTruthy();
  expect(bundle.conflicts[0].attachmentManifest.local).toBeInstanceOf(Array);
  expect(bundle.conflicts[0].attachmentManifest.saved).toBeInstanceOf(Array);
  const conflictSnapshots = bundle.conflicts.flatMap(conflict => [
    conflict.localBackup.snapshot,
    conflict.savedBackup.snapshot,
  ]);
  const preservedTitles = conflictSnapshots.flatMap(snapshot => snapshot.assignments.map(item => item.title));
  expect(preservedTitles).toContain(firstTitle);
  expect(preservedTitles).toContain(secondTitle);

  await expect(secondTab.getByText("Concurrent academic edit preserved")).toBeVisible();
  await expect(secondTab.getByRole("button", { name: "I've saved the bundle — reload latest saved copy" })).toBeVisible();
  secondTab.once("dialog", dialog => dialog.accept());
  await secondTab.getByRole("button", { name: "I've saved the bundle — reload latest saved copy" }).click();
  await expect(secondTab.getByRole("link", { name: firstTitle })).toBeVisible();
  await expect(secondTab.getByRole("link", { name: secondTitle })).toHaveCount(0);
  await expect(secondTab.getByText("Concurrent academic edit preserved")).toBeHidden();
});
