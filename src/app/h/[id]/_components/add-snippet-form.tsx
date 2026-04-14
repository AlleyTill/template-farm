"use client";

import { useState } from "react";
import type { Snippet } from "@/db/schema";

const LANGUAGES = ["js", "ts", "py", "go", "rs", "sh", "sql", "html", "css", "other"] as const;
const MAX_CODE = 10000;

export function AddSnippetForm({
  harvestId,
  onAdded,
}: {
  harvestId: string;
  onAdded: (s: Snippet) => void;
}) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("ts");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim() || !code.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/harvests/${harvestId}/snippets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), language, code }),
      });
      if (res.status === 429) {
        setErr("Slow down — try again in a moment.");
        return;
      }
      if (!res.ok) throw new Error("snippet failed");
      const data = (await res.json()) as Snippet;
      onAdded(data);
      setTitle("");
      setCode("");
    } catch {
      setErr("Could not post snippet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div>
        <label htmlFor="snippet-title" className="block text-sm">
          Title
        </label>
        <input
          id="snippet-title"
          className="nes-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>
      <div>
        <label htmlFor="snippet-language" className="block text-sm">
          Language
        </label>
        <div className="nes-select">
          <select
            id="snippet-language"
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value as (typeof LANGUAGES)[number])
            }
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="snippet-code" className="block text-sm">
          Code
        </label>
        <textarea
          id="snippet-code"
          className="nes-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value.slice(0, MAX_CODE))}
          rows={8}
          maxLength={MAX_CODE}
        />
        <span className="text-xs" style={{ color: "var(--farm-muted)" }}>
          {code.length} / {MAX_CODE}
        </span>
      </div>
      <button
        type="submit"
        className="nes-btn is-success"
        disabled={busy || !title.trim() || !code.trim()}
      >
        {busy ? "posting..." : "add snippet"}
      </button>
      {err ? (
        <p className="text-xs" style={{ color: "var(--farm-ember)" }}>
          {err}
        </p>
      ) : null}
    </form>
  );
}
