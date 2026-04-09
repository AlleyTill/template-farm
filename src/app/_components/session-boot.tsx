"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tf_passphrase_acknowledged";

export function SessionBoot() {
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        if (
          typeof window !== "undefined" &&
          window.localStorage.getItem(STORAGE_KEY) === "1"
        ) {
          return;
        }
        const res = await fetch("/api/session/init", { method: "POST" });
        if (!res.ok) return;
        const data = (await res.json()) as { passphrase?: string };
        if (!cancelled && data?.passphrase) {
          setPassphrase(data.passphrase);
        }
      } catch {
        // silent — session boot is best-effort
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!passphrase) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(passphrase ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function handleDismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setPassphrase(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your recovery passphrase"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(42, 26, 12, 0.75)" }}
    >
      <div className="nes-container is-rounded max-w-lg w-full">
        <h2 className="text-base mb-3">Save your farm passphrase</h2>
        <p className="mb-3">
          Write this down. It is the ONLY way to restore your harvests on
          another device. It will not be shown again.
        </p>
        <pre
          className="recipe p-2 mb-3"
          style={{
            background: "var(--farm-sky)",
            border: "2px solid var(--farm-soil)",
          }}
        >
          {passphrase}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="nes-btn"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            className="nes-btn is-success"
            onClick={handleDismiss}
          >
            I&apos;ve saved it
          </button>
        </div>
      </div>
    </div>
  );
}
