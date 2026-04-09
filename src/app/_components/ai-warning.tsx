"use client";

import { useSearch } from "./search-context";

export function AIWarning() {
  const { aiOn } = useSearch();
  if (!aiOn) return null;
  return (
    <div
      className="nes-container is-rounded"
      style={{
        borderColor: "var(--farm-ember)",
        background: "var(--farm-wheat)",
      }}
      role="note"
    >
      <p
        className="text-xs sm:text-sm"
        style={{ color: "var(--farm-ink)" }}
      >
        <strong style={{ color: "var(--farm-ember)" }}>Heads up:</strong>{" "}
        activating AI sends your project description to Anthropic (Claude) to
        generate a template. Your description and the result become part of
        the public Template Farm library by default.
      </p>
    </div>
  );
}
