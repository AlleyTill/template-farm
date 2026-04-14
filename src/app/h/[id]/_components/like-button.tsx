"use client";

import { useState } from "react";

export function LikeButton({
  harvestId,
  initialLiked,
  initialCount,
  onChange,
}: {
  harvestId: string;
  initialLiked: boolean;
  initialCount: number;
  onChange?: (liked: boolean, count: number) => void;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const optimisticLiked = !liked;
    const optimisticCount = count + (optimisticLiked ? 1 : -1);
    setLiked(optimisticLiked);
    setCount(optimisticCount);
    try {
      const res = await fetch(`/api/harvests/${harvestId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("like failed");
      const data = (await res.json()) as { liked: boolean; likeCount: number };
      setLiked(data.liked);
      setCount(data.likeCount);
      onChange?.(data.liked, data.likeCount);
    } catch {
      setLiked(!optimisticLiked);
      setCount(count);
      setErr("Could not update like");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={liked}
        aria-label={liked ? "Unlike harvest" : "Like harvest"}
        className={`nes-btn ${liked ? "is-error" : ""}`}
        style={liked ? { color: "var(--farm-wheat)" } : undefined}
      >
        {liked ? "★ liked" : "☆ like"} ({count})
      </button>
      {err ? (
        <span className="text-xs" style={{ color: "var(--farm-ember)" }}>
          {err}
        </span>
      ) : null}
    </div>
  );
}
