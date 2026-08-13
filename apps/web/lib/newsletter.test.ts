import { describe, expect, it } from "vitest";
import { getLatestBriefing } from "@us100/research";

import { createNewsletterDraft, renderNewsletterHtml } from "./newsletter";

describe("newsletter", () => {
  it("renders briefing content as newsletter HTML", () => {
    const briefing = getLatestBriefing("pl");
    const html = renderNewsletterHtml(briefing, "https://example.com/pl/briefings/test");

    expect(html).toContain("US100 Morning Brew");
    expect(html).toContain(briefing.headline);
    expect(html).toContain("Czytaj online");
  });

  it("skips Kit when newsletter provider is not enabled", async () => {
    const briefing = getLatestBriefing("pl");

    await expect(createNewsletterDraft(briefing, {})).resolves.toMatchObject({
      provider: "disabled",
      status: "skipped"
    });
  });
});
