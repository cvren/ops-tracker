import { expect, test, type Page } from "@playwright/test";

const adminEmail = "admin@ops-tracker.local";
const operatorEmail = "operator@ops-tracker.local";
const reviewerEmail = "reviewer@ops-tracker.local";
const sharedPassword = "ChangeMe123!";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Access the ops control tower" })
  ).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(sharedPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
}

test("team can execute the M2 comment and inbox flow end-to-end", async ({
  page
}) => {
  test.setTimeout(120000);

  const suffix = Date.now().toString().slice(-6);
  const projectName = `Dock control ${suffix}`;
  const projectCode = `OPS-${suffix}`;
  const taskTitle = `Confirm dock scan ${suffix}`;
  const updatedTaskTitle = `Confirm dock scan ${suffix} updated`;
  const firstComment =
    "Scanner sync is stable. Please review the dock-floor handoff note.";
  const secondComment =
    "Updated the rollback owner and validation query. Ready for another pass.";
  const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24)
    .toISOString()
    .slice(0, 10);

  await signIn(page, adminEmail);

  await expect(
    page.getByRole("heading", {
      name: "See what needs attention before the handoff slips."
    })
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("link", { name: /^My Tasks \d+/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Needs Review \d+/ })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Overdue \d+/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Unassigned \d+/ })
  ).toBeVisible();

  await page.getByRole("link", { name: "Workspace", exact: true }).click();
  await page.waitForURL("**/workspace");
  await expect(
    page.getByRole("heading", { name: "Manage the people behind the handoff." })
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByRole("main").getByText("Aiko Admin", { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Ken Operator", { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Mika Reviewer", { exact: true }).first()
  ).toBeVisible();

  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.waitForURL("**/projects");
  await expect(
    page.getByRole("heading", {
      name: "Keep every delivery track visible."
    })
  ).toBeVisible({ timeout: 10000 });

  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Code").fill(projectCode);
  await page
    .getByLabel("Brief")
    .fill("Track the dock-floor rollout and the remaining scanner checks.");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByText(`Project ${projectCode} created.`)).toBeVisible();
  await page.getByRole("link", { name: projectName }).click();
  await page.waitForURL(/\/projects\/.+/);

  await page.getByLabel("Task title").fill(taskTitle);
  await page
    .getByLabel("Description")
    .fill("Validate the final scanner pass and confirm the dock-floor handoff.");
  await page
    .getByLabel("Current owner")
    .selectOption({ label: "Ken Operator · operator@ops-tracker.local" });
  await page
    .getByLabel("Reviewer")
    .selectOption({ label: "Mika Reviewer · reviewer@ops-tracker.local" });
  await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(
    page.getByText("Task created and linked to the project.")
  ).toBeVisible();
  await page.getByRole("link", { name: taskTitle }).click();
  await page.waitForURL(/\/tasks\/.+/);
  await page.getByLabel("Task title").fill(updatedTaskTitle);
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByText("Task updated.")).toBeVisible();

  await signOut(page);
  await signIn(page, operatorEmail);

  await page.goto("/tasks?view=my-tasks");
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await page.getByRole("link", { name: updatedTaskTitle }).click();
  await page.waitForURL(/\/tasks\/.+/);
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(
    page.getByText("Status changed to In progress.")
  ).toBeVisible();

  await page.getByLabel("Comment").fill(firstComment);
  await page
    .getByLabel("Mention members")
    .selectOption([
      { label: "Mika Reviewer · reviewer@ops-tracker.local" }
    ]);
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByText("Comment added.")).toBeVisible();
  await expect(page.getByText(firstComment)).toBeVisible();
  await expect(
    page.getByText("Mentioned Mika Reviewer", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("commented on the task").first()).toBeVisible();
  await expect(
    page.getByText("mentioned Mika Reviewer in a comment").first()
  ).toBeVisible();

  await page.getByRole("button", { name: "Request review" }).click();
  await expect(page.getByText("Review requested.")).toBeVisible();

  await signOut(page);
  await signIn(page, reviewerEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.getByRole("link", { name: /^Inbox/ }).click();
  await page.waitForURL("**/inbox");
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await expect(
    page.getByText("mentioned Mika Reviewer in a comment").first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(
    page.getByRole("button", { name: "Mark all read" })
  ).toHaveCount(0);

  await page.goto("/tasks?view=needs-review");
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await page.getByRole("link", { name: updatedTaskTitle }).click();
  await page.waitForURL(/\/tasks\/.+/);
  await expect(page.getByText(firstComment)).toBeVisible();
  await expect(
    page.getByText("requested review from Mika Reviewer").first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Request changes" }).click();
  await expect(page.getByText("requested changes").first()).toBeVisible();

  await signOut(page);
  await signIn(page, operatorEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.getByRole("link", { name: /^Inbox/ }).click();
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await expect(page.getByText("requested changes").first()).toBeVisible();

  await page.goto("/tasks?view=my-tasks");
  await page.getByRole("link", { name: updatedTaskTitle }).click();
  await page.waitForURL(/\/tasks\/.+/);
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(
    page.getByText("Status changed to In progress.")
  ).toBeVisible();
  await page.getByLabel("Comment").fill(secondComment);
  await page
    .getByLabel("Mention members")
    .selectOption([
      { label: "Mika Reviewer · reviewer@ops-tracker.local" }
    ]);
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByText("Comment added.")).toBeVisible();
  await expect(page.getByText(secondComment)).toBeVisible();
  await page.getByRole("button", { name: "Request review" }).click();
  await expect(page.getByText("Review requested.")).toBeVisible();

  await signOut(page);
  await signIn(page, reviewerEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.getByRole("link", { name: /^Inbox/ }).click();
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await expect(
    page.getByText("requested review from Mika Reviewer").first()
  ).toBeVisible();
  await page.getByRole("link", { name: "Open item" }).first().click();
  await page.waitForURL(/\/tasks\/.+/);
  await expect(
    page.getByRole("heading", { name: updatedTaskTitle })
  ).toBeVisible();
  await expect(page.getByText(secondComment)).toBeVisible();
  await expect(
    page.getByText("mentioned Mika Reviewer in a comment").first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve and finish" }).click();
  await expect(page.getByText("Task approved and marked done.")).toBeVisible();
  await expect(page.getByText("approved the task").first()).toBeVisible();

  await signOut(page);
  await signIn(page, operatorEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.getByRole("link", { name: /^Inbox/ }).click();
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await expect(page.getByText("approved the task").first()).toBeVisible();

  await page.goto("/tasks?view=overdue");
  await expect(page.getByText("Resolve carrier API dependency")).toBeVisible();
  await page.goto("/tasks?view=unassigned");
  await expect(
    page.getByText("Backfill owner for store escalation sheet")
  ).toBeVisible();
});
