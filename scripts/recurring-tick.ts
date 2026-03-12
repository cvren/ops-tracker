import { runRecurringScheduleTick } from "@/lib/recurring-executions";

async function main() {
  const result = await runRecurringScheduleTick();

  console.log(
    [
      "ops-tracker recurring tick completed.",
      `Due: ${result.dueCount}`,
      `Succeeded: ${result.succeededCount}`,
      `Failed: ${result.failedCount}`,
      `Skipped: ${result.skippedCount}`
    ].join(" ")
  );

  for (const item of result.items) {
    const detail =
      item.outcome === "SUCCESS"
        ? `task=${item.taskId} execution=${item.executionId}`
        : item.executionId
          ? `execution=${item.executionId}`
          : "execution=none";

    console.log(
      [
        `[${item.outcome}]`,
        item.templateName,
        `slot=${item.scheduledFor.toISOString()}`,
        detail,
        `message=${item.message}`
      ].join(" ")
    );
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
