"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Harvest } from "@/lib/types";

export function ForkButton({ harvestId }: { harvestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fork() {
    if (busy) return;
    if (!confirm("Fork this harvest into your own farm?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/harvests/${harvestId}/fork`, {
        method: "POST",
      });
      if (res.status === 401) {
        setErr("Sign in to fork");
        return;
      }
      if (!res.ok) throw new Error("fork failed");
      const data = (await res.json()) as Harvest;
      router.push(`/h/${data.id}`);
    } catch {
      setErr("Could not fork");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={fork}
        disabled={busy}
        className="nes-btn is-primary"
        aria-label="Fork harvest"
      >
        {busy ? "forking..." : "⑂ fork"}
      </button>
      {err ? (
        <span className="text-xs" style={{ color: "var(--farm-ember)" }}>
          {err}
        </span>
      ) : null}
    </div>
  );
}
