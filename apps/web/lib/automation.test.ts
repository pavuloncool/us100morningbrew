import { describe, expect, it } from "vitest";

import { getWarsawRunWindow } from "./automation";

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
});
