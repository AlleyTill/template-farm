"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Farmhand, type FarmhandMood } from "@/app/_components/farmhand";

type SproutStage = {
  id: string;
  stage: string;
  question: string;
  userAnswer: string | null;
  farmhandReply: string | null;
  mood: string;
  createdAt: string;
};

type Sprout = {
  id: string;
  title: string;
  currentStage: string;
  intent: string;
  finalPlan: HarvestPlan | null;
  stages: SproutStage[];
};

type HarvestPlan = {
  tagline: string;
  tools: Array<{
    id: string;
    name: string;
    url: string;
    tagline: string;
    why: string;
  }>;
  nextSteps: string[];
  encouragement: string;
};

const STAGE_META: Record<string, { emoji: string; label: string }> = {
  seed: { emoji: "🌱", label: "Seed" },
  sprout: { emoji: "🌿", label: "Sprout" },
  leaf: { emoji: "🍃", label: "Leaf" },
  stalk: { emoji: "🌾", label: "Stalk" },
  bloom: { emoji: "🌻", label: "Bloom" },
  harvest: { emoji: "🎀", label: "Harvest" },
};
const STAGE_ORDER = ["seed", "sprout", "leaf", "stalk", "bloom", "harvest"];

export default function SproutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [sprout, setSprout] = useState<Sprout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sprouts/${id}`, { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setError("This sprout's gone missin'.");
          return;
        }
        const data = (await res.json()) as { sprout: Sprout };
        if (!cancelled) setSprout(data.sprout);
      } catch {
        if (!cancelled) setError("Network trouble. Try refreshin'.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function advance(e: React.FormEvent) {
    e.preventDefault();
    if (!sprout) return;
    const trimmed = answer.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sprouts/${id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answer: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          (data && data.error && data.error.message) ||
            "Farmhand stubbed his toe. Try again.",
        );
        return;
      }
      setSprout({
        ...data.sprout,
        finalPlan: data.harvestPlan ?? data.sprout.finalPlan ?? null,
      });
      setAnswer("");
    } catch {
      setError("Network tipped over.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="nes-container">
          <p>Walkin' out to check on yer sprout...</p>
        </div>
      </main>
    );
  }

  if (error || !sprout) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="nes-container is-error">
          <p>{error ?? "Can't find this sprout."}</p>
          <Link href="/" className="nes-btn" style={{ marginTop: "1rem" }}>
            Back to the farm
          </Link>
        </div>
      </main>
    );
  }

  const currentStageIdx = STAGE_ORDER.indexOf(sprout.currentStage);
  const isDone = sprout.currentStage === "harvest" && sprout.finalPlan;
  // The currently-open stage row is the last one — its question is what the
  // farmhand is asking. The stage rows before it are the conversation history.
  const lastStage = sprout.stages[sprout.stages.length - 1];
  const lastMood = (lastStage?.mood as FarmhandMood) ?? "default";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <header>
        <Link
          href="/"
          style={{ color: "var(--farm-wheat)", textDecoration: "underline", fontSize: "0.85rem" }}
        >
          ← back to the farm
        </Link>
        <h1
          className="farm-title"
          style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}
        >
          {sprout.title}
        </h1>
      </header>

      {/* Growth bar */}
      <div
        className="nes-container is-rounded"
        style={{ backgroundColor: "var(--farm-wheat)", color: "var(--farm-ink)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          {STAGE_ORDER.map((s, i) => {
            const done = i < currentStageIdx;
            const active = i === currentStageIdx;
            return (
              <div
                key={s}
                style={{
                  flex: 1,
                  minWidth: 60,
                  textAlign: "center",
                  opacity: done || active ? 1 : 0.35,
                  fontSize: "0.75rem",
                }}
              >
                <div style={{ fontSize: "1.5rem" }}>{STAGE_META[s].emoji}</div>
                <div style={{ fontWeight: active ? "bold" : "normal" }}>
                  {STAGE_META[s].label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversation history */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {sprout.stages.map((s, i) => {
          const isLast = i === sprout.stages.length - 1;
          return (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Farmhand question */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <Farmhand mood={(s.mood as FarmhandMood) ?? "default"} size={64} />
                <div
                  className="nes-balloon from-left"
                  style={{ flex: 1, color: "var(--farm-ink)" }}
                >
                  <strong>{STAGE_META[s.stage]?.emoji} {STAGE_META[s.stage]?.label}:</strong>{" "}
                  {s.farmhandReply ?? s.question}
                  {s.farmhandReply && !isLast && (
                    <>
                      <br />
                      <br />
                      <em style={{ opacity: 0.8 }}>{s.question}</em>
                    </>
                  )}
                </div>
              </div>
              {/* User answer */}
              {s.userAnswer && (
                <div
                  className="nes-balloon from-right"
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "80%",
                    color: "var(--farm-ink)",
                  }}
                >
                  {s.userAnswer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Harvest ceremony */}
      {isDone && sprout.finalPlan && (
        <section
          className="nes-container with-title is-rounded"
          style={{ backgroundColor: "var(--farm-wheat)", color: "var(--farm-ink)" }}
        >
          <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
            🎀 Harvest
          </p>
          <p><strong>Your sprout:</strong> {sprout.finalPlan.tagline}</p>

          <h3 style={{ marginTop: "1rem", fontFamily: "var(--font-pixel)" }}>
            🛠 Tools the farmhand picks for you
          </h3>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {sprout.finalPlan.tools.map((t) => (
              <li key={t.id} className="nes-container is-rounded" style={{ backgroundColor: "#fff" }}>
                <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: "bold" }}>
                  {t.name}
                </a>{" "}
                — {t.tagline}
                <div style={{ fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--farm-muted)" }}>
                  {t.why}
                </div>
              </li>
            ))}
          </ul>

          <h3 style={{ marginTop: "1rem", fontFamily: "var(--font-pixel)" }}>
            📋 Your next steps
          </h3>
          <ol>
            {sprout.finalPlan.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>

          <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
            🧑‍🌾 {sprout.finalPlan.encouragement}
          </p>
        </section>
      )}

      {/* Answer form */}
      {!isDone && (
        <form
          onSubmit={advance}
          className="nes-container is-rounded"
          style={{ backgroundColor: "var(--farm-wheat)", color: "var(--farm-ink)", display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <label htmlFor="sprout-answer" style={{ fontWeight: "bold" }}>
            Your answer
          </label>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <Farmhand mood={lastMood} size={64} />
            <textarea
              id="sprout-answer"
              className="nes-textarea"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={busy}
              placeholder="Tell the farmhand..."
              style={{ flex: 1, color: "var(--farm-ink)" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--farm-muted)" }}>
              {answer.length}/2000
            </span>
            <button type="submit" className="nes-btn is-success" disabled={busy}>
              {busy ? "Listenin'..." : "Tell the farmhand"}
            </button>
          </div>
          {error && (
            <p role="alert" style={{ color: "var(--farm-ember)", margin: 0 }}>
              {error}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
