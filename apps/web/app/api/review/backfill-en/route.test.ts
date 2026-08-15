import { getLatestBriefing } from "@us100/research";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  publishEnglishTranslationFromLatestPolish: vi.fn()
}));

vi.mock("@/lib/briefing-translation", () => ({
  publishEnglishTranslationFromLatestPolish: mocks.publishEnglishTranslationFromLatestPolish
}));

import { POST } from "./route";

describe("review EN backfill route", () => {
  beforeEach(() => {
    mocks.publishEnglishTranslationFromLatestPolish.mockReset();
  });

  it("passes weekly report type to the translation backfill", async () => {
    const briefing = {
      ...getLatestBriefing("en"),
      language: "en" as const,
      status: "published" as const
    };
    mocks.publishEnglishTranslationFromLatestPolish.mockResolvedValue(briefing);

    const response = await POST(
      new NextRequest("http://localhost/api/review/backfill-en", {
        body: JSON.stringify({
          date: briefing.date,
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
    expect(mocks.publishEnglishTranslationFromLatestPolish).toHaveBeenCalledWith({
      date: briefing.date,
      reportType: "weekly"
    });
  });
});
