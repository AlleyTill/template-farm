"use client";

import { useState } from "react";
import type { HarvestWithContent } from "@/lib/types";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="nes-btn is-small"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function CommandBlock({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  const text = lines.join("\n");
  return (
    <section className="nes-container with-title is-rounded">
      <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
        {title}
      </p>
      {lines.length === 0 ? (
        <p style={{ color: "var(--farm-muted)" }}>(none)</p>
      ) : (
        <>
          <pre
            className="whitespace-pre-wrap break-words text-xs"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              background: "var(--farm-soil)",
              color: "var(--farm-wheat)",
              padding: "0.75rem",
              borderRadius: 4,
            }}
          >
            {text}
          </pre>
          <div className="mt-2">
            <CopyButton text={text} label={`Copy ${title}`} />
          </div>
        </>
      )}
    </section>
  );
}

export function RecipeView({ harvest }: { harvest: HarvestWithContent }) {
  return (
    <div className="space-y-4">
      <section className="nes-container with-title is-rounded">
        <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
          Stack
        </p>
        <div className="flex flex-wrap gap-2">
          {harvest.stack.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded"
              style={{
                background: "var(--farm-grass)",
                color: "var(--farm-ink)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <CommandBlock title="Scaffold" lines={harvest.scaffoldCommands} />
      <CommandBlock title="Build & run" lines={harvest.compileSteps} />

      <section className="nes-container with-title is-rounded">
        <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
          Rationale
        </p>
        <p
          className="whitespace-pre-wrap"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {harvest.rationale}
        </p>
      </section>
    </div>
  );
}
