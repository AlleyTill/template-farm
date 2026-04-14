"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Farmhand, type FarmhandMood } from "./farmhand";

type RejectState = {
  farmhandReply: string;
  mood: FarmhandMood;
};

export function SeedlingForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<RejectState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 3) {
      setError("Give me at least 3 letters, cowpoke.");
      return;
    }
    setBusy(true);
    setError(null);
    setRejected(null);
    try {
      const res = await fetch("/api/sprouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          (data && data.error && data.error.message) ||
            "Somethin' broke in the barn. Try again.",
        );
        return;
      }
      if (data.ok === false) {
        setRejected({
          farmhandReply: data.farmhandReply,
          mood: (data.mood as FarmhandMood) ?? "sassy",
        });
        return;
      }
      if (data.ok && data.sprout?.id) {
        router.push(`/sprout/${data.sprout.id}`);
        return;
      }
    } catch {
      setError("Network tipped over. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="nes-container is-rounded"
      style={{ backgroundColor: "var(--farm-wheat)", color: "var(--farm-ink)" }}
    >
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        <Farmhand mood={rejected?.mood ?? "default"} size={96} />
        <div
          className="nes-balloon from-left"
          style={{ flex: 1, color: "var(--farm-ink)" }}
        >
          {rejected
            ? rejected.farmhandReply
            : "Alright partner, in ONE sentence — what are you tryin' to build? And don't you dare say 'a todo app'."}
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label htmlFor="seedling-input" className="sr-only">
          Your app idea
        </label>
        <textarea
          id="seedling-input"
          className="nes-textarea"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="a cozy game where you grow vegetables with your cat"
          rows={3}
          maxLength={500}
          disabled={busy}
          style={{ color: "var(--farm-ink)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--farm-muted)" }}>
            {title.length}/500
          </span>
          <button
            type="submit"
            className="nes-btn is-success"
            disabled={busy}
          >
            {busy ? "Plantin'..." : rejected ? "Try again" : "Plant seedling 🌱"}
          </button>
        </div>
        {error && (
          <p role="alert" style={{ color: "var(--farm-ember)", margin: 0 }}>
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
