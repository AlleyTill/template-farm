"use client";

import { useState } from "react";
import type { Ref } from "@/db/schema";

const KINDS = ["doc", "tutorial", "repo", "video", "other"] as const;
type Kind = (typeof KINDS)[number];

export function AddRefForm({
  harvestId,
  onAdded,
}: {
  harvestId: string;
  onAdded: (r: Ref) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("doc");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!url.trim() || !title.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/harvests/${harvestId}/refs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), title: title.trim(), kind }),
      });
      if (res.status === 429) {
        setErr("Slow down — try again in a moment.");
        return;
      }
      if (!res.ok) throw new Error("ref failed");
      const data = (await res.json()) as Ref;
      onAdded(data);
      setUrl("");
      setTitle("");
    } catch {
      setErr("Could not add reference");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div>
        <label htmlFor="ref-url" className="block text-sm">
          URL
        </label>
        <input
          id="ref-url"
          className="nes-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="ref-title" className="block text-sm">
          Title
        </label>
        <input
          id="ref-title"
          className="nes-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>
      <div>
        <label htmlFor="ref-kind" className="block text-sm">
          Kind
        </label>
        <div className="nes-select">
          <select
            id="ref-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        className="nes-btn is-success"
        disabled={busy || !url.trim() || !title.trim()}
      >
        {busy ? "adding..." : "add ref"}
      </button>
      {err ? (
        <p className="text-xs" style={{ color: "var(--farm-ember)" }}>
          {err}
        </p>
      ) : null}
    </form>
  );
}
