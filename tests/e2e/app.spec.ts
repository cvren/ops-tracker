import { expect, test } from "@playwright/test";

const reviewerEmail = "reviewer@ops-tracker.local";
const reviewerPassword = "ChangeMe123!";

test("reviewer can validate the main workflow end-to-end", async ({ page }) => {
  test.setTimeout(90000);

  const suffix = Date.now().toString().slice(-6);
  const projectName = `Dock rollout ${suffix}`;
  const projectCode = `OPS-${suffix}`;
  const taskTitle = `Confirm dock scan ${suffix}`;
  const updatedTaskTitle = `Confirm dock scan ${suffix} updated`;

  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Access the review workspace" })
  ).toBeVisible();

  await page.getByLabel("Email").fill(reviewerEmail);
  await page.getByLabel("Password").fill(reviewerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");

  await expect(
    page.getByRole("heading", { name: "Stay on top of active work." })
  ).toBeVisible({ timeout: 10000 });

  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.waitForURL("**/projects");
  await expect(
    page.getByRole("heading", {
      name: "Keep every delivery track visible."
    })
  ).toBeVisible({ timeout: 10000 });

  await page.getByLabel("Project name").fill("A");
  await page.getByLabel("Code").fill("bad code");
  await page.getByLabel("Brief").fill("short");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByText("Project validation failed.")).toBeVisible();

  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Code").fill(projectCode);
  await page
    .getByLabel("Brief")
    .fill("Track the dock-floor rollout and the remaining scanner checks.");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByText(`Project ${projectCode} created.`)).toBeVisible();
  await expect(page.getByText(projectName)).toBeVisible();
  await page.getByRole("link", { name: projectName }).click();
  await page.waitForURL(/\/projects\/.+/);

  await expect(
    page.getByRole("heading", { name: projectName })
  ).toBeVisible({ timeout: 10000 });

  await page.getByLabel("Task title").fill(taskTitle);
  await page
    .getByLabel("Description")
    .fill("Validate the final scanner pass and confirm the dock-floor handoff.");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(
    page.getByText("Task created and linked to the project.")
  ).toBeVisible();
  await page.getByRole("link", { name: taskTitle }).click();
  await page.waitForURL(/\/tasks\/.+/);

  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible({
    timeout: 10000
  });
  await page.getByLabel("Task title").fill(updatedTaskTitle);
  await page.getByRole("button", { name: "Save task" }).click();

  await expect(page.getByText("Task updated.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: updatedTaskTitle })
  ).toBeVisible();

  await page.getByRole("button", { name: "In progress" }).click();
  await expect(
    page.getByText("Status changed to In progress.")
  ).toBeVisible();
  await expect(page.getByText("In progress").first()).toBeVisible();

  await page.getByRole("link", { name: "Tasks", exact: true }).click();
  await page.waitForURL("**/tasks");
  await page
    .getByPlaceholder("Search task title, description, or project")
    .fill(updatedTaskTitle);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText(updatedTaskTitle)).toBeVisible();

  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.waitForURL("**/projects");
  await page
    .getByPlaceholder("Search by project name, code, or brief")
    .fill("OPS-EMPTY");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("link", { name: "Documentation refresh" }).click();
  await page.waitForURL(/\/projects\/.+/);

  await expect(page.getByText("No tasks for this project")).toBeVisible();
});
