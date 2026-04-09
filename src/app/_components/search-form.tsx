"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "./search-context";
import type { SearchHit, Harvest } from "@/lib/types";

export function SearchForm() {
  const router = useRouter();
  const { aiOn, setHits, setError } = useSearch();
  const [description, setDescription] = useState("");
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);

  const tooShort = description.trim().length < 10;

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (tooShort || searching) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: description.trim() }),
      });
      if (res.status === 429) {
        setHits([]);
        setError("The farm is resting — too many requests. Try again soon.");
        return;
      }
      if (!res.ok) {
        setHits([]);
        setError("Something went wrong searching the fields.");
        return;
      }
      const data = (await res.json()) as { hits: SearchHit[] };
      setHits(data.hits ?? []);
    } catch {
      setHits([]);
      setError("Something went wrong searching the fields.");
    } finally {
      setSearching(false);
    }
  }

  async function handleGenerate() {
    if (tooShort || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (res.status === 429) {
        setError(
          "Quota exhausted — the farm is resting. Try community search instead.",
        );
        return;
      }
      if (!res.ok) {
        setError("Something went wrong asking the farmhand.");
        return;
      }
      const harvest = (await res.json()) as Harvest;
      if (harvest?.id) {
        router.push(`/h/${harvest.id}`);
      } else {
        setError("Something went wrong asking the farmhand.");
      }
    } catch {
      setError("Something went wrong asking the farmhand.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <form
      className="nes-container is-rounded flex flex-col gap-3"
      onSubmit={handleSearch}
    >
      <label htmlFor="farm-description" className="text-xs sm:text-sm">
        Describe your project
      </label>
      <div className="nes-field">
        <textarea
          id="farm-description"
          className="nes-textarea"
          rows={5}
          minLength={10}
          maxLength={2000}
          placeholder="e.g. a small next.js blog with markdown posts and an RSS feed"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-describedby="farm-description-help"
        />
      </div>
      <p id="farm-description-help" className="text-xs" style={{ color: "var(--farm-muted)" }}>
        {description.trim().length}/2000 — min 10 characters
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="nes-btn is-success"
          disabled={tooShort || searching}
        >
          {searching ? "Searching..." : "Search the fields"}
        </button>
        {aiOn && (
          <button
            type="button"
            className="nes-btn is-warning"
            disabled={tooShort || generating}
            onClick={handleGenerate}
          >
            {generating ? "Sprouting..." : "Ask the farmhand"}
          </button>
        )}
      </div>
    </form>
  );
}
