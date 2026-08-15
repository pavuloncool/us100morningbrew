import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runMorningBrewAutomation: vi.fn()
}));

vi.mock("@/lib/automation", () => ({
  runMorningBrewAutomation: mocks.runMorningBrewAutomation
}));

import { POST } from "./route";

describe("review rerun route", () => {
  beforeEach(() => {
    mocks.runMorningBrewAutomation.mockReset();
  });

  it("defaults manual weekly reruns to PL only", async () => {
    mocks.runMorningBrewAutomation.mockResolvedValue({
      status: "drafted"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/review/rerun", {
        body: JSON.stringify({
          mode: "full",
          reportType: "weekly",
          token: "test"
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.runMorningBrewAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        force: true,
        locales: ["pl"],
        reportType: "weekly",
        runSource: "review-weekly-full"
      }),
      expect.objectContaining({
        US100_WEEKLY_SUMMARY_ENABLED: "true"
      })
    );
  });
});
