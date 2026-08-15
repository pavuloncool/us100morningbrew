import { describe, expect, it } from "vitest";

import { getWarsawRunWindow, getWarsawWeeklyRunWindow } from "./automation";

describe("cron scheduling", () => {
  it("runs at 08:00 Europe/Warsaw during summer time", () => {
    const window = getWarsawRunWindow(new Date("2026-08-13T06:00:00.000Z"));
    expect(window).toMatchObject({
      date: "2026-08-13",
      hour: 8,
      isWeekday: true,
      shouldRun: true
    });
  });

  it("skips outside the Warsaw 08:00 run window", () => {
    const window = getWarsawRunWindow(new Date("2026-08-13T07:00:00.000Z"));
    expect(window.shouldRun).toBe(false);
  });

  it("runs weekly summaries at 09:00 Europe/Warsaw on Saturday during summer time", () => {
    const window = getWarsawWeeklyRunWindow(new Date("2026-08-15T07:00:00.000Z"));
    expect(window).toMatchObject({
      date: "2026-08-15",
      hour: 9,
      isSaturday: true,
      reportType: "weekly",
      shouldRun: true
    });
  });

  it("skips weekly summaries outside the Saturday 09:00 run window", () => {
    const window = getWarsawWeeklyRunWindow(new Date("2026-08-15T06:00:00.000Z"));
    expect(window.shouldRun).toBe(false);
  });
});
