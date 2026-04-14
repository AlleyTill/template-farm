"use client";

import { useState } from "react";
import type { PublicUser } from "@/lib/types";

type Props = {
  user: PublicUser;
  onRenamed: (user: PublicUser) => void;
};

export default function RenameCard({ user, onRenamed }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const trimmed = value.trim();
    if (trimmed === user.displayName) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as
        | { user: PublicUser }
        | { error: { message: string } }
        | null;
      if (!res.ok) {
        const msg =
          data && "error" in data ? data.error.message : "Rename failed.";
        setError(msg);
        return;
      }
      if (data && "user" in data) {
        onRenamed(data.user);
        setEditing(false);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nes-container with-title is-rounded">
      <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
        Farm name
      </p>
      {!editing ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>{user.displayName}</span>
          <button
            type="button"
            className="nes-btn"
            onClick={() => {
              setValue(user.displayName);
              setError(null);
              setEditing(true);
            }}
          >
            Rename
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label htmlFor="rename-input" style={{ fontSize: "0.85rem" }}>
            New farm name (3–40 chars, letters/numbers/spaces/-_&apos;)
          </label>
          <input
            id="rename-input"
            className="nes-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            disabled={busy}
          />
          {error && (
            <p
              role="alert"
              style={{ color: "var(--farm-ember)", margin: 0, fontSize: "0.85rem" }}
            >
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="nes-btn is-success"
              onClick={save}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="nes-btn"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
