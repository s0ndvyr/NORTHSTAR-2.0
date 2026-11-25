import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
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
  await expect(page.getByRole("option", { name: /Calendar/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(paletteButton).toBeFocused();

  await page.getByRole("link", { name: "Assignments" }).click();
  await expect(page.getByRole("heading", { name: /Assignments/ })).toBeVisible();
});

test("creates an assignment and updates its local workflow status", async ({ page }) => {
  await page.getByRole("link", { name: "Assignments" }).click();
  await page.getByRole("button", { name: "New assignment" }).click();
  const title = "Browser qualification assignment";
  await page.getByLabel("Assignment title").fill(title);
  await page.getByLabel("Description").fill("Created by the NORTHSTAR browser qualification suite.");
  await page.getByRole("button", { name: "Create assignment" }).click();

  const assignmentLink = page.getByRole("link", { name: title });
  await expect(assignmentLink).toBeVisible();
  await page.getByLabel("Update status for " + title).selectOption("in_progress");
  await expect(page.getByText("In progress").first()).toBeVisible();
});

test("creates and edits the connected calendar agenda", async ({ page }) => {
  await page.getByRole("link", { name: "Calendar" }).click();
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
  await page.getByRole("link", { name: "Courses" }).click();
  await page.getByRole("button", { name: "Add course" }).click();
  await page.getByLabel("Course code").fill("QA 205");
  await page.getByLabel("Course name").fill("Browser Qualification");
  await page.getByLabel("Instructor").fill("Dr. Northstar");
  await page.getByRole("button", { name: "Add course" }).click();

  await expect(page.getByText("QA 205").first()).toBeVisible();
  await page.getByRole("link", { name: /Open course hub/ }).last().click();
  await expect(page.getByRole("heading", { name: /Browser Qualification/ })).toBeVisible();
});
