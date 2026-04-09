"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { Harvest } from "@/lib/types";
import ProfileHeader from "./_components/profile-header";
import PublicHarvestsList from "./_components/public-harvests-list";

type Profile = {
  id: string;
  displayName: string;
  createdAt: string;
  publicHarvestCount: number;
  totalLikesReceived: number;
};

type State =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error"; message: string }
  | { status: "ok"; profile: Profile; harvests: Harvest[] };

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(name)}`,
        );
        if (res.status === 404) {
          if (!cancelled) setState({ status: "not_found" });
          return;
        }
        if (!res.ok) {
          if (!cancelled)
            setState({ status: "error", message: "Could not load profile" });
          return;
        }
        const data = (await res.json()) as {
          profile: Profile;
          harvests: Harvest[];
        };
        if (!cancelled)
          setState({
            status: "ok",
            profile: data.profile,
            harvests: data.harvests ?? [],
          });
      } catch {
        if (!cancelled)
          setState({ status: "error", message: "Network error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <main
      style={{
        maxWidth: "48rem",
        margin: "0 auto",
        padding: "2rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {state.status === "loading" && (
        <div className="nes-container">
          <p>Looking up the farmer...</p>
        </div>
      )}

      {state.status === "not_found" && (
        <div className="nes-container with-title">
          <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
            Empty field
          </p>
          <p>This farmer hasn&apos;t settled here yet.</p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/" className="nes-btn">
              Back to the farm
            </Link>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="nes-container is-error">
          <p>{state.message}</p>
        </div>
      )}

      {state.status === "ok" && (
        <>
          <ProfileHeader
            displayName={state.profile.displayName}
            createdAt={state.profile.createdAt}
            publicHarvestCount={state.profile.publicHarvestCount}
            totalLikesReceived={state.profile.totalLikesReceived}
          />
          <PublicHarvestsList harvests={state.harvests} />
        </>
      )}
    </main>
  );
}
