"use client";

import Link from "next/link";
import { useSearch } from "./search-context";
import type { SearchHit } from "@/lib/types";

function relativeTime(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function HitCard({ hit }: { hit: SearchHit }) {
  const stack = Array.isArray(hit.stack) ? (hit.stack as string[]) : [];
  return (
    <Link href={`/h/${hit.id}`} className="block no-underline">
      <article className="nes-container is-rounded hover:opacity-90 transition-opacity">
        <h3
          className="text-sm mb-2"
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          {hit.name}
        </h3>
        {stack.length > 0 && (
          <div className="mb-2">
            {stack.slice(0, 6).map((s) => (
              <span key={s} className="farm-pill">
                {s}
              </span>
            ))}
          </div>
        )}
        <p className="farm-clamp-3 text-sm mb-2">{hit.description}</p>
        <div
          className="flex gap-3 text-xs"
          style={{ color: "var(--farm-muted)" }}
        >
          <span>♥ {hit.likeCount}</span>
          <span>{relativeTime(hit.createdAt)}</span>
        </div>
      </article>
    </Link>
  );
}

export function ResultsList() {
  const { hits, lastError } = useSearch();

  if (lastError) {
    return (
      <div
        className="nes-container is-rounded"
        role="alert"
        style={{ borderColor: "var(--farm-ember)" }}
      >
        <p style={{ color: "var(--farm-ember)" }}>{lastError}</p>
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="nes-container is-rounded text-center">
        <p className="text-sm" style={{ color: "var(--farm-muted)" }}>
          Sow a description above and search the fields to see what the
          community has already grown.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      aria-live="polite"
      aria-label="Search results"
    >
      {hits.map((hit) => (
        <HitCard key={hit.id} hit={hit} />
      ))}
    </div>
  );
}
