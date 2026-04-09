"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicUser, QuotaInfo } from "@/lib/types";
import QuotaCard from "./_components/quota-card";
import PassphraseCard from "./_components/passphrase-card";
import MyHarvestsList from "./_components/my-harvests-list";
import SpinWheel from "./_components/spin-wheel";
import RenameCard from "./_components/rename-card";
import ReferralBanner from "@/app/_components/referral-banner";

type State =
  | { status: "loading" }
  | { status: "unauthed" }
  | { status: "error"; message: string }
  | { status: "ok"; user: PublicUser; quota: QuotaInfo };

export default function MePage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.status === 401) {
          if (!cancelled) setState({ status: "unauthed" });
          return;
        }
        if (!res.ok) {
          if (!cancelled)
            setState({ status: "error", message: "Could not load farm" });
          return;
        }
        const data = (await res.json()) as {
          user: PublicUser;
          quota: QuotaInfo;
        };
        if (!cancelled)
          setState({ status: "ok", user: data.user, quota: data.quota });
      } catch {
        if (!cancelled)
          setState({ status: "error", message: "Network error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <p>Walking out to the farm...</p>
        </div>
      )}

      {state.status === "unauthed" && (
        <div className="nes-container with-title is-warning">
          <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
            Not signed in
          </p>
          <p>
            You&apos;re not signed in yet. Visit the farm to get a passphrase,
            or <Link href="/recover">recover your farm</Link>.
          </p>
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
          <header>
            <h1 style={{ fontFamily: "var(--font-pixel)", margin: 0 }}>
              My Farm
            </h1>
            <p style={{ color: "var(--farm-muted)", marginTop: "0.25rem" }}>
              Welcome back, {state.user.displayName}
            </p>
          </header>

          <RenameCard
            user={state.user}
            onRenamed={(user) =>
              setState((prev) =>
                prev.status === "ok" ? { ...prev, user } : prev,
              )
            }
          />

          <QuotaCard quota={state.quota} />

          <PassphraseCard />

          <ReferralBanner
            myReferralCode={state.user.referralCode}
            canEnterCode={state.user.referredBy === null}
          />

          <SpinWheel
            initialSpinTokens={state.user.spinTokens}
            initialBonusPrompts={state.user.bonusPrompts}
            onUpdate={({ spinTokens, bonusPrompts }) =>
              setState((prev) =>
                prev.status === "ok"
                  ? {
                      ...prev,
                      user: { ...prev.user, spinTokens, bonusPrompts },
                      quota: { ...prev.quota, spinTokens, bonusPrompts },
                    }
                  : prev,
              )
            }
          />

          <MyHarvestsList />
        </>
      )}
    </main>
  );
}
