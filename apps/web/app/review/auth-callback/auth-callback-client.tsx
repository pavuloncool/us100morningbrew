"use client";

import { useEffect, useState } from "react";

export function ReviewAuthCallbackClient() {
  const [message, setMessage] = useState("Kończę logowanie do panelu akceptacji...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const errorDescription = params.get("error_description");

    if (!accessToken) {
      setMessage(errorDescription ?? "Nie znaleziono tokenu logowania w linku.");
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
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Nie udało się zakończyć logowania.");
        }
        window.location.replace("/review");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : String(error));
      });
  }, []);

  return (
    <main className="page">
      <section className="review-panel review-form-panel">
        <p className="eyebrow">Review login</p>
        <h1>Logowanie</h1>
        <p>{message}</p>
        <p>
          <a href="/review/login">Wróć do logowania</a>
        </p>
      </section>
    </main>
  );
}
