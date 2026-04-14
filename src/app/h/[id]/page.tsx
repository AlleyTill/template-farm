"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { HarvestWithContent } from "@/lib/types";
import { HarvestHeader } from "./_components/harvest-header";
import { RecipeView } from "./_components/recipe-view";
import { CommentsSection } from "./_components/comments-section";
import { SnippetsSection } from "./_components/snippets-section";
import { RefsSection } from "./_components/refs-section";
import { LikeButton } from "./_components/like-button";
import { ForkButton } from "./_components/fork-button";

export default function HarvestPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [harvest, setHarvest] = useState<HarvestWithContent | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/harvests/${id}`, {
          credentials: "same-origin",
        });
        if (res.status === 404) {
          if (!cancelled) setStatus("notfound");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const data = (await res.json()) as HarvestWithContent;
        if (!cancelled) {
          setHarvest(data);
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div
          className="nes-container is-rounded"
          style={{ color: "var(--farm-ink)" }}
        >
          <p>Loading harvest...</p>
        </div>
      </main>
    );
  }

  if (status === "notfound") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div
          className="nes-container with-title is-rounded"
          style={{ color: "var(--farm-ink)" }}
        >
          <p className="title">Oh no</p>
          <p>This harvest has withered.</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !harvest) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div
          className="nes-container is-rounded is-error"
          style={{ color: "var(--farm-ink)" }}
        >
          <p>Something went wrong loading this harvest. Try again later.</p>
        </div>
      </main>
    );
  }

  const refreshLiked = (liked: boolean, likeCount: number) => {
    setHarvest((h) => (h ? { ...h, likedByMe: liked, likeCount } : h));
  };

  return (
    <main
      className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6"
      style={{ color: "var(--farm-ink)" }}
    >
      <HarvestHeader harvest={harvest} />
      <RecipeView harvest={harvest} />
      <div className="flex flex-wrap items-center gap-3">
        <LikeButton
          harvestId={harvest.id}
          initialLiked={harvest.likedByMe}
          initialCount={harvest.likeCount}
          onChange={refreshLiked}
        />
        <ForkButton harvestId={harvest.id} />
      </div>
      <SnippetsSection
        harvestId={harvest.id}
        initialSnippets={harvest.snippets}
      />
      <RefsSection harvestId={harvest.id} initialRefs={harvest.refs} />
      <CommentsSection
        harvestId={harvest.id}
        initialComments={harvest.comments}
      />
    </main>
  );
}
