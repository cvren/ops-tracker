import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const adminEmail = "admin@ops-tracker.local";
const managerEmail = "manager@ops-tracker.local";
const operatorEmail = "operator@ops-tracker.local";
const reviewerEmail = "reviewer@ops-tracker.local";
const viewerEmail = "viewer@ops-tracker.local";
const sharedPassword = "ChangeMe123!";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Access the ops control tower" })
  ).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(sharedPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

function runRecurringTick() {
  execFileSync("corepack", ["pnpm", "recurring:tick"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe"
  });
}

function reseedDatabase() {
  execFileSync("corepack", ["pnpm", "db:seed"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe"
  });
}

test.afterAll(() => {
  // Restore the canonical demo baseline so post-suite recurring:tick validation
  // still measures the documented fresh-seed scheduled outcome.
  reseedDatabase();
});

test("team can execute the v0.2.0 collaboration flow end-to-end", async ({
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
      name: "Spot the risk, then clear it before the morning slips."
    })
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByRole("link", { name: /^Overdue \d+/ })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Review Queue \d+/ })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Blocked \d+/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Due Today \d+/ })
  ).toBeVisible();

  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/workspace$/);
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

  await page.goto("/projects");
  await expect(page).toHaveURL(/\/projects$/);
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

  await expect(page.getByRole("link", { name: projectName })).toBeVisible();
  await page.getByRole("link", { name: projectName }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);

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

  await expect(page.getByRole("link", { name: taskTitle })).toBeVisible();
  await page.getByRole("link", { name: taskTitle }).click();
  await expect(page).toHaveURL(/\/tasks\/.+/);
  await page.getByLabel("Task title").fill(updatedTaskTitle);
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: updatedTaskTitle })
  ).toBeVisible();

  await signOut(page);
  await signIn(page, operatorEmail);

  await page.goto("/tasks?view=my-tasks");
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await page.getByRole("link", { name: updatedTaskTitle }).click();
  await expect(page).toHaveURL(/\/tasks\/.+/);
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(page.getByText("In progress").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request review" })
  ).toBeVisible();

  await page.getByLabel("Comment").fill(firstComment);
  await page
    .getByLabel("Mention members")
    .selectOption([
      { label: "Mika Reviewer · reviewer@ops-tracker.local" }
    ]);
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByText(firstComment)).toBeVisible();
  await expect(
    page.getByText("Mentioned Mika Reviewer", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("commented on the task").first()).toBeVisible();
  await expect(
    page.getByText("mentioned Mika Reviewer in a comment").first()
  ).toBeVisible();

  await page.getByRole("button", { name: "Request review" }).click();
  await expect(page.getByText("Needs review").first()).toBeVisible();
  await expect(
    page.getByText("requested review from Mika Reviewer").first()
  ).toBeVisible();

  await signOut(page);
  await signIn(page, reviewerEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox$/);
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
  await expect(page).toHaveURL(/\/tasks\/.+/);
  await expect(page.getByText(firstComment)).toBeVisible();
  await expect(
    page.getByText("requested review from Mika Reviewer").first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Request changes" }).click();
  await expect(page.getByText("requested changes").first()).toBeVisible();
  await expect(page.getByText("Changes requested").first()).toBeVisible();

  await signOut(page);
  await signIn(page, operatorEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await expect(page.getByText("requested changes").first()).toBeVisible();

  await page.goto("/tasks?view=my-tasks");
  await page.getByRole("link", { name: updatedTaskTitle }).click();
  await expect(page).toHaveURL(/\/tasks\/.+/);
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(page.getByText("In progress").first()).toBeVisible();
  await page.getByLabel("Comment").fill(secondComment);
  await page
    .getByLabel("Mention members")
    .selectOption([
      { label: "Mika Reviewer · reviewer@ops-tracker.local" }
    ]);
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByText(secondComment)).toBeVisible();
  await page.getByRole("button", { name: "Request review" }).click();
  await expect(page.getByText("Needs review").first()).toBeVisible();

  await signOut(page);
  await signIn(page, reviewerEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await expect(
    page.getByText("requested review from Mika Reviewer").first()
  ).toBeVisible();
  await page.getByRole("link", { name: "Open item" }).first().click();
  await expect(page).toHaveURL(/\/tasks\/.+/);
  await expect(
    page.getByRole("heading", { name: updatedTaskTitle })
  ).toBeVisible();
  await expect(page.getByText(secondComment)).toBeVisible();
  await expect(
    page.getByText("mentioned Mika Reviewer in a comment").first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve and finish" }).click();
  await expect(page.getByText("Done").first()).toBeVisible();
  await expect(page.getByText("approved the task").first()).toBeVisible();

  await signOut(page);
  await signIn(page, operatorEmail);

  await expect(page.getByRole("link", { name: /^Inbox \d+/ })).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByText(updatedTaskTitle).first()).toBeVisible();
  await expect(page.getByText("approved the task").first()).toBeVisible();

  await page.goto("/tasks?view=overdue");
  await expect(page.getByText("Resolve carrier API dependency")).toBeVisible();
  await page.goto("/tasks?view=unassigned");
  await expect(
    page.getByText("Backfill owner for store escalation sheet")
  ).toBeVisible();
});

test("admin can clear risky queues with the M3.2 bulk manager console flow", async ({
  page
}) => {
  test.setTimeout(120000);

  const pushedDueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 6)
    .toISOString()
    .slice(0, 10);

  await signIn(page, adminEmail);

  await expect(
    page.getByRole("heading", {
      name: "Spot the risk, then clear it before the morning slips."
    })
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("link", { name: /^Overdue 3/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Review Queue 2/ })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Unassigned 2/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Blocked 2/ })).toBeVisible();

  await page.getByRole("link", { name: /^Unassigned 2/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Unassigned" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\?view=unassigned/);
  await page
    .getByLabel("Select Backfill owner for store escalation sheet")
    .check();
  await page
    .getByLabel("Select Assign nightly variance audit owner")
    .check();
  await expect(page.getByText("2 selected")).toBeVisible();
  await page
    .getByLabel("Set owner")
    .selectOption({ label: "Ken Operator · operator@ops-tracker.local" });
  await page.getByRole("button", { name: "Apply bulk changes" }).click();
  await expect(page.getByText("No matching tasks")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /^Unassigned 0/ })).toBeVisible();

  await page.getByRole("link", { name: /^Overdue 3/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Overdue" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\?view=overdue/);
  await page
    .getByLabel("Select Resolve carrier API dependency")
    .check();
  await page
    .getByLabel("Select Wait on warehouse firewall approval")
    .check();
  await expect(page.getByText("2 selected")).toBeVisible();
  await page.getByLabel("Set due date").fill(pushedDueDate);
  await page.getByRole("button", { name: "Apply bulk changes" }).click();
  await expect(page.getByText("Updated 2 tasks.")).toBeVisible();
  await expect(page.getByText("Close scanner parity gap for west dock")).toBeVisible();
  await expect(page.getByText("Resolve carrier API dependency")).toHaveCount(0);
  await expect(page.getByText("Wait on warehouse firewall approval")).toHaveCount(0);

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /^Overdue 1/ })).toBeVisible();

  await page.getByRole("link", { name: /^Blocked 2/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Blocked Aging" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\?view=blocked-aging/);
  await expect(page.getByText("Resolve carrier API dependency")).toBeVisible();
  await page.getByRole("button", { name: "Select page" }).click();
  await expect(page.getByText("2 selected")).toBeVisible();
  await page.getByLabel("Blocked state").selectOption("unblock");
  await page.getByRole("button", { name: "Apply bulk changes" }).click();
  await expect(page.getByText("No matching tasks")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /^Blocked 0/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Overdue 1/ })).toBeVisible();

  await page.getByRole("link", { name: /^Review Queue 2/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Review Queue" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\?view=review-queue/);
  await expect(
    page.getByText("Review partner escalation rollback brief")
  ).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Full workload view" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Workload by Member" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\?view=workload/);
  await expect(
    page.locator("p").filter({ hasText: "Ken Operator" }).first()
  ).toBeVisible();
  await expect(page.getByText(/Open tasks:/).first()).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Open high-risk queue" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "High-Risk Queue" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\?view=high-risk/);
  await expect(
    page.getByText("Review partner escalation rollback brief")
  ).toBeVisible();
  await expect(page.getByText("Close scanner parity gap for west dock")).toBeVisible();

  await page.goto("/tasks");
  await page.getByRole("link", { name: "Resolve carrier API dependency" }).click();
  await expect(
    page.getByRole("heading", { name: "Resolve carrier API dependency" })
  ).toBeVisible();
  await expect(page.getByText("Bulk updated").first()).toBeVisible();
  await expect(page.getByText("bulk updated blocked state").first()).toBeVisible();
});

test("admin can turn repeat work into templates and manual recurring generation", async ({
  page
}) => {
  test.setTimeout(120000);

  const suffix = Date.now().toString().slice(-6);
  const templateName = `Recurring audit ${suffix}`;
  const taskTitle = `Prepare recurring audit ${suffix}`;
  const scheduleDate = new Date().toISOString().slice(0, 10);

  await signIn(page, adminEmail);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Open templates" }).click();
  await expect(page).toHaveURL(/\/templates$/);
  await expect(
    page.getByRole("heading", {
      name: "Turn repeat work into one-click generation."
    })
  ).toBeVisible();

  const createTemplatePanel = page
    .getByRole("heading", { name: "Capture repeatable work" })
    .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]");

  await createTemplatePanel.getByLabel("Template name").fill(templateName);
  await createTemplatePanel.getByLabel("Task title").fill(taskTitle);
  await createTemplatePanel
    .getByLabel("Description")
    .fill("Create the repeatable audit packet without rebuilding the task by hand.");
  await createTemplatePanel
    .getByLabel("Default owner")
    .selectOption({ label: "Ken Operator · operator@ops-tracker.local" });
  await createTemplatePanel
    .getByLabel("Default reviewer")
    .selectOption({ label: "Mika Reviewer · reviewer@ops-tracker.local" });
  await createTemplatePanel.getByLabel("Due offset days").fill("2");
  await createTemplatePanel.getByLabel("Default priority").selectOption("HIGH");
  await createTemplatePanel.getByLabel("Default status").selectOption("BACKLOG");
  await createTemplatePanel.getByRole("button", { name: "Create template" }).click();

  await expect(page.getByText(`Template ${templateName} created.`)).toBeVisible();
  const templateCard = page
    .getByRole("heading", { name: taskTitle })
    .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]");
  await expect(templateCard).toContainText(templateName);

  await templateCard
    .getByLabel("Generate into project")
    .selectOption({ label: "OPS-ALPHA · Harbor inventory rollout" });
  await templateCard.getByRole("button", { name: "Generate task" }).click();
  await expect(
    templateCard.getByText(`Created task from template ${templateName}.`)
  ).toBeVisible();
  await templateCard.getByRole("link", { name: "Open task" }).click();

  await expect(page).toHaveURL(/\/tasks\/.+/);
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
  await expect(page.getByText("Created from template").first()).toBeVisible();
  await expect(
    page.getByText(`created "${taskTitle}" from template ${templateName}`).first()
  ).toBeVisible();

  await page.goto("/templates");
  const createSchedulePanel = page
    .getByRole("heading", { name: "Generate repeat work on demand" })
    .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]");

  await createSchedulePanel
    .getByLabel("Template")
    .selectOption({ label: `${templateName} · ${taskTitle}` });
  await createSchedulePanel
    .getByLabel("Project")
    .selectOption({ label: "OPS-BETA · Retail launch recovery" });
  await createSchedulePanel.getByLabel("Cadence").selectOption("DAILY");
  await createSchedulePanel.getByLabel("Interval").fill("1");
  await createSchedulePanel.getByLabel("Next run date").fill(scheduleDate);
  await createSchedulePanel.getByRole("button", { name: "Create schedule" }).click();

  await expect(page.getByText("Recurring schedule created.")).toBeVisible();
  const recurringSection = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Issue the next run only when you decide it is time"
    })
  });
  const scheduleCard = recurringSection
    .getByText(templateName, { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]");
  const scheduleButton = scheduleCard.getByRole("button", {
    name: "Generate now"
  });
  await scheduleButton.click();
  await expect(scheduleCard.getByText(`Generated ${taskTitle}.`)).toBeVisible();
  await scheduleCard.getByRole("link", { name: "Open task" }).click();

  await expect(page).toHaveURL(/\/tasks\/.+/);
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
  await expect(page.getByText("Recurring schedule executed").first()).toBeVisible();
  await expect(
    page.getByText(`generated recurring task from ${templateName}`).first()
  ).toBeVisible();

  await page.goto("/tasks?view=due-this-week");
  await expect(page.getByText(taskTitle).first()).toBeVisible();

  await page.goto("/templates");
  await expect(
    page.getByText(`generated recurring task from ${templateName}`).first()
  ).toBeVisible();
});

test("manager can inspect scheduled execution history and rerun a failed scheduled slot", async ({
  page
}) => {
  test.setTimeout(120000);

  await signIn(page, managerEmail);
  await page.goto("/templates");

  const recurringSection = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Issue the next run only when you decide it is time"
    })
  });

  const scheduledDigestCard = recurringSection
    .getByText("Scheduled inventory digest", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]");
  await expect(
    scheduledDigestCard.getByText("No execution history yet.")
  ).toBeVisible();

  runRecurringTick();
  await page.goto("/templates");

  const scheduledExecutionRows =
    recurringSection
      .getByText("Scheduled inventory digest", { exact: true })
      .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]")
      .locator('[id^="execution-"]');

  await expect
    .poll(async () => scheduledExecutionRows.count())
    .toBe(1);
  const latestScheduledExecution = scheduledExecutionRows.first();
  await expect(
    latestScheduledExecution.getByText("Success", { exact: true })
  ).toBeVisible();
  await expect(
    latestScheduledExecution.getByText("Triggered by System")
  ).toBeVisible();
  await expect(
    latestScheduledExecution.getByText("Generated tasks: 1")
  ).toBeVisible();
  await latestScheduledExecution
    .getByRole("link", { name: "Publish scheduled inventory digest" })
    .click();

  await expect(page).toHaveURL(/\/tasks\/.+/);
  await expect(
    page.getByRole("heading", { name: "Publish scheduled inventory digest" })
  ).toBeVisible();
  await expect(
    page.getByText("This task came from a recurring execution")
  ).toBeVisible();

  await page.goto("/templates");

  const recoveryScheduleCard = recurringSection
    .getByText("Recovery retry drill", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]");
  const recoveryExecutionRows =
    recoveryScheduleCard.locator('[id^="execution-"]');

  await expect
    .poll(async () => recoveryExecutionRows.count())
    .toBeGreaterThan(0);
  const initialRecoveryExecutionCount = await recoveryExecutionRows.count();
  const failedExecutionRow = recoveryExecutionRows
    .filter({
      hasText:
        "Scheduled retry packet generation failed while the nightly slot was processing."
    })
    .first();
  await expect(
    failedExecutionRow.getByText("Failed", { exact: true })
  ).toBeVisible();
  await expect(
    failedExecutionRow.getByText("Triggered by System")
  ).toBeVisible();
  await expect(
    failedExecutionRow.getByText(
      "Scheduled retry packet generation failed while the nightly slot was processing."
    )
  ).toBeVisible();
  await failedExecutionRow
    .getByRole("button", { name: "Rerun failed slot" })
    .click();

  await expect
    .poll(async () => recoveryExecutionRows.count())
    .toBe(initialRecoveryExecutionCount + 1);
  const latestRecoveryExecution = recoveryExecutionRows.first();
  await expect(
    latestRecoveryExecution.getByText("Success", { exact: true })
  ).toBeVisible();
  await expect(
    latestRecoveryExecution.getByText("Rerun", { exact: true })
  ).toBeVisible();
  await latestRecoveryExecution
    .getByRole("link", { name: "Reissue launch recovery retry packet" })
    .click();

  await expect(page).toHaveURL(/\/tasks\/.+/);
  await expect(
    page.getByRole("heading", { name: "Reissue launch recovery retry packet" })
  ).toBeVisible();
  await expect(
    page.getByText("This task came from a recurring execution")
  ).toBeVisible();
});

test("admin can safely delegate the manager console to a manager role", async ({
  page
}) => {
  test.setTimeout(120000);

  await signIn(page, adminEmail);

  await page.goto("/workspace");
  await expect(
    page.getByRole("heading", { name: "Manage the people behind the handoff." })
  ).toBeVisible();

  const operatorRoleSelect = page.getByLabel("Role for Ken Operator");
  await operatorRoleSelect.selectOption("MANAGER");
  await operatorRoleSelect
    .locator("xpath=ancestor::form[1]")
    .getByRole("button", { name: "Save role" })
    .click();
  await expect(page.getByText("Ken Operator is now Manager.")).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.getByText("granted manager access to Ken Operator").first()
  ).toBeVisible();

  await signOut(page);
  await signIn(page, operatorEmail);

  await expect(
    page.getByRole("heading", {
      name: "Spot the risk, then clear it before the morning slips."
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Templates", exact: true })
  ).toBeVisible();

  await page.goto("/tasks?view=review-queue");
  await expect(
    page.getByRole("heading", { level: 1, name: "Review Queue" })
  ).toBeVisible();
  await expect(page.getByText("Bulk actions")).toBeVisible();
  await page
    .getByLabel("Select Review partner escalation rollback brief")
    .check();
  await page
    .getByLabel("Set owner")
    .selectOption({ label: "Noa Manager · manager@ops-tracker.local" });
  await page.getByRole("button", { name: "Apply bulk changes" }).click();
  await expect(page.getByText("Updated 1 task.")).toBeVisible();

  await page.goto("/templates");
  await expect(
    page.getByRole("heading", {
      name: "Turn repeat work into one-click generation."
    })
  ).toBeVisible();
  const managerRecurringSection = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Issue the next run only when you decide it is time"
    })
  });
  const storeScheduleCard = managerRecurringSection
    .getByText("Store escalation digest", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-4xl')][1]");
  const managerGenerateNowButton = storeScheduleCard.getByRole("button", {
    name: "Generate now"
  });
  await expect(managerGenerateNowButton).toBeVisible();
  await managerGenerateNowButton.click();
  await expect(
    storeScheduleCard.getByText("Generated Publish store escalation digest.")
  ).toBeVisible();

  await signOut(page);
  await signIn(page, reviewerEmail);

  await expect(
    page.getByRole("link", { name: "Templates", exact: true })
  ).toHaveCount(0);
  await page.goto("/tasks?view=review-queue");
  await expect(
    page.getByRole("heading", { name: "This queue is available to workspace admins and managers." })
  ).toBeVisible();
  await page.goto("/templates");
  await expect(
    page.getByRole("heading", {
      name: "Template and recurring controls are manager-console only."
    })
  ).toBeVisible();

  await signOut(page);
  await signIn(page, viewerEmail);

  await expect(
    page.getByRole("link", { name: "Templates", exact: true })
  ).toHaveCount(0);
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { name: "Viewer role detected" })
  ).toBeVisible();
  await page.goto("/tasks");
  await page
    .getByRole("link", { name: "Validate scanner sync on dock floor" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Task edits are disabled" })
  ).toBeVisible();
  await expect(
    page.getByText("Workflow actions are disabled for viewer access.")
  ).toBeVisible();

  await signOut(page);
  await signIn(page, managerEmail);
  await expect(
    page.getByRole("heading", {
      name: "Spot the risk, then clear it before the morning slips."
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Templates", exact: true })
  ).toBeVisible();
});
