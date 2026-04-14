"use client";

import { useState } from "react";
import type { Ref } from "@/db/schema";
import { AddRefForm } from "./add-ref-form";

export function RefsSection({
  harvestId,
  initialRefs,
}: {
  harvestId: string;
  initialRefs: Ref[];
}) {
  const [refs, setRefs] = useState<Ref[]>(initialRefs);

  return (
    <section
      className="nes-container with-title is-rounded"
      aria-labelledby="refs-title"
    >
      <p
        id="refs-title"
        className="title"
        style={{ fontFamily: "var(--font-pixel)" }}
      >
        References
      </p>

      {refs.length === 0 ? (
        <p style={{ color: "var(--farm-muted)" }}>No references yet.</p>
      ) : (
        <ul className="list-none p-0 space-y-2">
          {refs.map((r) => (
            <li key={r.id} className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  background: "var(--farm-grass)",
                  color: "var(--farm-ink)",
                }}
              >
                {r.kind}
              </span>
              <a
                href={r.url}
                target="_blank"
                rel="noopener nofollow noreferrer"
                className="underline"
                style={{ color: "var(--farm-grass-dark)" }}
              >
                {r.title}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <AddRefForm
          harvestId={harvestId}
          onAdded={(r) => setRefs((xs) => [...xs, r])}
        />
      </div>
    </section>
  );
}
