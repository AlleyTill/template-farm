"use client";

import { useState } from "react";
import type { Snippet } from "@/db/schema";
import { AddSnippetForm } from "./add-snippet-form";

export function SnippetsSection({
  harvestId,
  initialSnippets,
}: {
  harvestId: string;
  initialSnippets: Snippet[];
}) {
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);

  return (
    <section
      className="nes-container with-title is-rounded"
      aria-labelledby="snippets-title"
    >
      <p
        id="snippets-title"
        className="title"
        style={{ fontFamily: "var(--font-pixel)" }}
      >
        Snippets
      </p>

      {snippets.length === 0 ? (
        <p style={{ color: "var(--farm-muted)" }}>No snippets yet.</p>
      ) : (
        <ul className="list-none p-0 space-y-3">
          {snippets.map((s) => (
            <li
              key={s.id}
              className="nes-container with-title"
              style={{ background: "var(--farm-wheat)" }}
            >
              <p className="title">{s.title}</p>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  background: "var(--farm-grass)",
                  color: "var(--farm-ink)",
                }}
              >
                {s.language}
              </span>
              <pre
                className="mt-2 whitespace-pre-wrap break-words text-xs"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  background: "var(--farm-soil)",
                  color: "var(--farm-wheat)",
                  padding: "0.75rem",
                  borderRadius: 4,
                }}
              >
                {s.code}
              </pre>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <AddSnippetForm
          harvestId={harvestId}
          onAdded={(s) => setSnippets((xs) => [...xs, s])}
        />
      </div>
    </section>
  );
}
