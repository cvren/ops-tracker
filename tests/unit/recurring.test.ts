import { describe, expect, it } from "vitest";

import {
  calculateNextRunAt,
  formatRecurringInterval
} from "@/lib/recurring";

describe("recurring schedule helpers", () => {
  it("advances daily, weekly, and monthly schedules", () => {
    expect(
      calculateNextRunAt({
        cadence: "DAILY",
        interval: 2,
        nextRunAt: new Date("2026-03-11T12:00:00.000Z")
      }).toISOString()
    ).toBe("2026-03-13T12:00:00.000Z");

    expect(
      calculateNextRunAt({
        cadence: "WEEKLY",
        interval: 1,
        nextRunAt: new Date("2026-03-11T12:00:00.000Z")
      }).toISOString()
    ).toBe("2026-03-18T12:00:00.000Z");

    expect(
      calculateNextRunAt({
        cadence: "MONTHLY",
        interval: 1,
        nextRunAt: new Date("2026-03-11T12:00:00.000Z")
      }).toISOString()
    ).toBe("2026-04-11T12:00:00.000Z");
  });

  it("formats readable interval labels", () => {
    expect(formatRecurringInterval({ cadence: "DAILY", interval: 1 })).toBe(
      "Every day"
    );
    expect(formatRecurringInterval({ cadence: "WEEKLY", interval: 2 })).toBe(
      "Every 2 weeks"
    );
  });
});
