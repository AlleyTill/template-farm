"use client";

import { useState } from "react";
import type { HarvestWithContent } from "@/lib/types";

type CommentWithAuthor = HarvestWithContent["comments"][number];

const MAX = 5000;

export function AddCommentForm({
  harvestId,
  onAdded,
}: {
  harvestId: string;
  onAdded: (c: CommentWithAuthor) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/harvests/${harvestId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.status === 429) {
        setErr("Slow down — try again in a moment.");
        return;
      }
      if (!res.ok) throw new Error("comment failed");
      const data = (await res.json()) as CommentWithAuthor;
      onAdded(data);
      setBody("");
    } catch {
      setErr("Could not post comment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="comment-body" className="block text-sm">
        Leave a comment
      </label>
      <textarea
        id="comment-body"
        className="nes-textarea"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX))}
        maxLength={MAX}
        rows={4}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--farm-muted)" }}>
          {body.length} / {MAX}
        </span>
        <button
          type="submit"
          className="nes-btn is-success"
          disabled={busy || !body.trim()}
        >
          {busy ? "posting..." : "post"}
        </button>
      </div>
      {err ? (
        <p className="text-xs" style={{ color: "var(--farm-ember)" }}>
          {err}
        </p>
      ) : null}
    </form>
  );
}
