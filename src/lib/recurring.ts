import { RecurringCadence } from "@prisma/client";

export function calculateNextRunAt(input: {
  cadence: RecurringCadence;
  interval: number;
  nextRunAt: Date;
}) {
  const nextRunAt = new Date(input.nextRunAt);

  switch (input.cadence) {
    case RecurringCadence.DAILY:
      nextRunAt.setUTCDate(nextRunAt.getUTCDate() + input.interval);
      return nextRunAt;
    case RecurringCadence.WEEKLY:
      nextRunAt.setUTCDate(nextRunAt.getUTCDate() + input.interval * 7);
      return nextRunAt;
    case RecurringCadence.MONTHLY:
      nextRunAt.setUTCMonth(nextRunAt.getUTCMonth() + input.interval);
      return nextRunAt;
    default:
      return nextRunAt;
  }
}

export function formatRecurringInterval(input: {
  cadence: RecurringCadence;
  interval: number;
}) {
  const cadenceLabel =
    input.cadence === RecurringCadence.DAILY
      ? "day"
      : input.cadence === RecurringCadence.WEEKLY
        ? "week"
        : "month";

  return input.interval === 1
    ? `Every ${cadenceLabel}`
    : `Every ${input.interval} ${cadenceLabel}s`;
}
