import { test, expect } from "@playwright/test";

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
  await page.getByLabel("Update status for " + title).selectOption("in_progress");
  await expect(page.locator(".status-pill.status-in_progress")).toBeVisible();
});

test("creates and edits the connected calendar agenda", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Calendar/ }).click();
  await page.getByRole("button", { name: "Add event" }).click();
  const title = "Browser qualification study block";
  await page.getByLabel("Event title").fill(title);
  await page.getByLabel("Notes").fill("Verify calendar persistence and edit workflow.");
  await page.getByRole("button", { name: "Save event" }).click();
  await expect(page.getByText(title)).toBeVisible();

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

test("runs a timed Study Lab practice attempt and records local results", async ({ page }) => {
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: /^Study Lab/ }).click();
  await page.getByRole("button", { name: "Start timed practice" }).click();
  await expect(page.getByText(/QUESTION 1 OF/)).toBeVisible();
  await page.locator(".practice-option").first().click();
  await page.getByRole("button", { name: "Flag for review" }).click();
  await page.getByRole("button", { name: /Next/ }).click();
  await expect(page.getByText(/QUESTION 2 OF/)).toBeVisible();
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: /Finish practice/ }).click();
  await expect(page.getByText(/PRACTICE RESULTS/)).toBeVisible();
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
