import Link from "next/link";

export default function PassphraseCard() {
  return (
    <div
      className="nes-container with-title"
      style={{ background: "var(--farm-sky)", color: "var(--farm-ink)" }}
    >
      <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
        Your Passphrase
      </p>
      <p>
        Your farm is protected by a passphrase you saw once at signup. We never
        store it in plain text and it is the only way back into your farm from
        another device.
      </p>
      <p style={{ marginTop: "0.75rem" }}>
        Lost your session? Use your passphrase to restore access.
      </p>
      <div style={{ marginTop: "1rem" }}>
        <Link href="/recover" className="nes-btn is-primary">
          Recover my farm
        </Link>
      </div>
    </div>
  );
}
