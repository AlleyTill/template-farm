'use client';

import { useState } from 'react';

type ReferralBannerProps = {
  myReferralCode: string;
  canEnterCode: boolean;
  onBound?: () => void;
};

export default function ReferralBanner({
  myReferralCode,
  canEnterCode,
  onBound,
}: ReferralBannerProps) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bound, setBound] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myReferralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  async function handleBind(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || bound) return;
    setError(null);
    setMessage(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError("That code doesn't look right");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many attempts — try again soon');
        } else {
          setError("That code doesn't look right");
        }
        return;
      }
      setBound(true);
      setMessage('Thanks! Your friend will earn a spin when you post your first harvest.');
      onBound?.();
    } catch {
      setError("That code doesn't look right");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="nes-container is-rounded with-title"
      style={{ backgroundColor: 'var(--farm-sky)', color: 'var(--farm-ink)' }}
    >
      <p className="title" style={{ backgroundColor: 'var(--farm-sky)' }}>
        Farm Friends
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <p style={{ margin: '0 0 .5rem 0' }}>Your farm code:</p>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code
              style={{
                backgroundColor: 'var(--farm-wheat)',
                color: 'var(--farm-ink)',
                padding: '.25rem .5rem',
                fontSize: '1.1rem',
              }}
            >
              {myReferralCode}
            </code>
            <button
              type="button"
              className="nes-btn is-primary"
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{ flex: '1 1 260px' }}>
          {canEnterCode ? (
            <form onSubmit={handleBind}>
              <p style={{ margin: '0 0 .5rem 0' }}>Got a code from a friend?</p>
              <div className="nes-field" style={{ marginBottom: '.5rem' }}>
                <input
                  type="text"
                  className="nes-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={bound || submitting}
                  placeholder="FRIEND-CODE"
                />
              </div>
              <button
                type="submit"
                className={`nes-btn ${bound || submitting ? 'is-disabled' : 'is-success'}`}
                disabled={bound || submitting}
              >
                {submitting ? 'Binding…' : 'Bind'}
              </button>
              {message && (
                <p style={{ marginTop: '.5rem', color: 'var(--farm-grass-dark)' }}>{message}</p>
              )}
              {error && (
                <p style={{ marginTop: '.5rem', color: 'var(--farm-ember)' }}>{error}</p>
              )}
            </form>
          ) : (
            <p style={{ margin: 0, color: 'var(--farm-muted)' }}>
              You&apos;ve already joined a farm.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
