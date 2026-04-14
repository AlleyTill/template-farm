"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export default function RecoverPage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passphrase.trim()) {
      setStatus({ kind: "error", message: "Enter your passphrase" });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/session/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ passphrase }),
      });
      if (res.ok) {
        router.push("/me");
        return;
      }
      if (res.status === 401) {
        setStatus({ kind: "error", message: "Passphrase not recognized" });
        return;
      }
      if (res.status === 429) {
        setStatus({
          kind: "error",
          message: "Too many attempts. Try again in a few minutes.",
        });
        return;
      }
      setStatus({ kind: "error", message: "Something went wrong" });
    } catch {
      setStatus({ kind: "error", message: "Network error" });
    }
  }

  const submitting = status.kind === "submitting";

  return (
    <main
      style={{
        maxWidth: "32rem",
        margin: "0 auto",
        padding: "2rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div className="nes-container with-title">
        <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
          Restore your farm
        </p>
        <p>
          Enter the passphrase you saved at signup. We use it to restore your
          session on this device.
        </p>
        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <label className="nes-field">
            <span>Passphrase</span>
            <input
              type="password"
              autoComplete="current-password"
              className="nes-input"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={submitting}
            />
          </label>

          {status.kind === "error" && (
            <div className="nes-container is-error">
              <p style={{ margin: 0 }}>{status.message}</p>
            </div>
          )}

          <button
            type="submit"
            className="nes-btn is-primary"
            disabled={submitting}
          >
            {submitting ? "Restoring..." : "Restore my farm"}
          </button>
        </form>
      </div>

      <Link href="/" className="nes-btn">
        Back to the farm
      </Link>
    </main>
  );
}
