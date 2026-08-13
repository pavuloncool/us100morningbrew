"use client";

import { useEffect } from "react";

export function ReviewAuthFragmentHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const authType = params.get("type");

    if (!accessToken || !authType) {
      return;
    }

    fetch("/api/review/session", {
      body: JSON.stringify({ accessToken }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Review session was not accepted.");
        }
        window.history.replaceState(null, "", window.location.pathname);
        window.location.replace("/review");
      })
      .catch(() => {
        window.history.replaceState(null, "", window.location.pathname);
        window.location.replace("/review/login?error=supabase");
      });
  }, []);

  return null;
}
