import { describe, expect, it } from "vitest";

import {
  createReviewSession,
  hasReviewAccess,
  isReviewEmailAllowed,
  verifyReviewSession
} from "./review-auth";

const env = {
  NODE_ENV: "production",
  US100_REVIEW_EMAILS: "owner@example.com",
  US100_REVIEW_SECRET: "review-secret"
};

describe("review auth", () => {
  it("allows only configured review emails in production", () => {
    expect(isReviewEmailAllowed("owner@example.com", env)).toBe(true);
    expect(isReviewEmailAllowed("other@example.com", env)).toBe(false);
  });

  it("creates and verifies signed review sessions", () => {
    const session = createReviewSession("owner@example.com", env);

    expect(verifyReviewSession(session, env)).toEqual({ email: "owner@example.com" });
    expect(hasReviewAccess({ session }, env)).toBe(true);
  });

  it("rejects tampered sessions", () => {
    const session = createReviewSession("owner@example.com", env);
    const [payload, signature] = session.split(".");
    expect(payload).toBeTruthy();
    expect(signature).toBeTruthy();
    if (!payload || !signature) {
      throw new Error("Expected a signed review session.");
    }
    const replacement = payload[0] === "a" ? "b" : "a";
    const tampered = `${replacement}${payload.slice(1)}.${signature}`;

    expect(verifyReviewSession(tampered, env)).toBeNull();
  });
});
