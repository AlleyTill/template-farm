"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Harvest } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; harvests: Harvest[] };

function formatDate(value: string | Date): string {
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

export default function MyHarvestsList() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/harvests?mine=true", {
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled)
            setState({ status: "error", message: "Could not load harvests" });
          return;
        }
        const data = (await res.json()) as { harvests: Harvest[] };
        if (!cancelled)
          setState({ status: "ok", harvests: data.harvests ?? [] });
      } catch {
        if (!cancelled)
          setState({ status: "error", message: "Network error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="nes-container">
        <p>Loading your harvests...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="nes-container is-error">
        <p>{state.message}</p>
      </div>
    );
  }

  if (state.harvests.length === 0) {
    return (
      <div className="nes-container with-title">
        <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
          My Harvests
        </p>
        <p>No harvests yet. Plant your first seed!</p>
      </div>
    );
  }

  return (
    <div className="nes-container with-title">
      <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
        My Harvests
      </p>
      <ul
        className="nes-list is-circle"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        {state.harvests.map((h) => (
          <li key={h.id}>
            <Link href={`/h/${h.id}`} style={{ color: "var(--farm-ink)" }}>
              <strong>{h.name}</strong>
            </Link>{" "}
            <span
              className={
                h.visibility === "public"
                  ? "nes-badge"
                  : "nes-badge is-dark"
              }
              style={{ marginLeft: "0.25rem" }}
            >
              <span
                className={
                  h.visibility === "public" ? "is-success" : "is-dark"
                }
              >
                {h.visibility}
              </span>
            </span>
            <div
              style={{
                color: "var(--farm-muted)",
                fontSize: "0.85em",
              }}
            >
              {h.stack.join(", ")} · {formatDate(h.createdAt)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
