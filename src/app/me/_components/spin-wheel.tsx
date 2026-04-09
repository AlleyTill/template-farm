'use client';

import { useEffect, useRef, useState } from 'react';

type SpinWheelProps = {
  initialSpinTokens: number;
  initialBonusPrompts: number;
  onUpdate?: (state: { spinTokens: number; bonusPrompts: number }) => void;
};

type SpinResponse = {
  promptsWon: number;
  totalBonusPrompts: number;
  spinTokensRemaining: number;
};

const SLICE_LABELS = ['+1', '+2', '+3', '+5'];

export default function SpinWheel({
  initialSpinTokens,
  initialBonusPrompts,
  onUpdate,
}: SpinWheelProps) {
  const [spinTokens, setSpinTokens] = useState(initialSpinTokens);
  const [bonusPrompts, setBonusPrompts] = useState(initialBonusPrompts);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    setSpinTokens(initialSpinTokens);
  }, [initialSpinTokens]);

  useEffect(() => {
    setBonusPrompts(initialBonusPrompts);
  }, [initialBonusPrompts]);

  async function handleSpin() {
    if (spinning || spinTokens <= 0) return;
    setError(null);
    setMessage(null);
    setSpinning(true);
    pendingRef.current = true;

    // Kick off visual spin: a big random rotation
    const base = 360 * 5 + Math.floor(Math.random() * 360);
    setAngle((prev) => prev + base);

    try {
      const res = await fetch('/api/me/spin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });

      if (!res.ok) {
        if (res.status === 400) {
          setError('No spin tokens left — refer friends to earn more.');
        } else if (res.status === 429) {
          setError('Whoa, slow down! Try spinning again in a moment.');
        } else {
          setError('Something went wrong at the wheel');
        }
        return;
      }

      const data = (await res.json()) as SpinResponse;

      // Land on the slice matching the prize (visual only)
      const sliceIndex = Math.max(
        0,
        SLICE_LABELS.findIndex((l) => l === `+${data.promptsWon}`),
      );
      const idx = sliceIndex === -1 ? 0 : sliceIndex;
      // Each slice is 90deg; center it under the top pointer
      const target = 360 * 6 - (idx * 90 + 45);
      setAngle(target);

      setSpinTokens(data.spinTokensRemaining);
      setBonusPrompts(data.totalBonusPrompts);
      setMessage(`🌾 You won ${data.promptsWon} prompts!`);
      onUpdate?.({
        spinTokens: data.spinTokensRemaining,
        bonusPrompts: data.totalBonusPrompts,
      });
    } catch {
      setError('Something went wrong at the wheel');
    } finally {
      pendingRef.current = false;
      // Keep spinning state for the CSS transition
      window.setTimeout(() => setSpinning(false), 1600);
    }
  }

  const disabled = spinning || spinTokens <= 0;

  return (
    <div
      className="nes-container is-rounded with-title"
      style={{ backgroundColor: 'var(--farm-sky)', color: 'var(--farm-ink)' }}
    >
      <p className="title" style={{ backgroundColor: 'var(--farm-sky)' }}>
        Harvest Wheel
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div>
            <p style={{ margin: 0 }}>Spin tokens</p>
            <p style={{ margin: 0, fontSize: '1.5rem', color: 'var(--farm-ember)' }}>
              {spinTokens}
            </p>
          </div>
          <div>
            <p style={{ margin: 0 }}>Bonus prompts</p>
            <p style={{ margin: 0, fontSize: '1.5rem', color: 'var(--farm-grass-dark)' }}>
              {bonusPrompts}
            </p>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            width: 220,
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Pointer */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '18px solid var(--farm-ink)',
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: '4px solid var(--farm-ink)',
              background: `conic-gradient(
                var(--farm-wheat) 0deg 90deg,
                var(--farm-grass) 90deg 180deg,
                var(--farm-ember) 180deg 270deg,
                var(--farm-soil) 270deg 360deg
              )`,
              transform: `rotate(${angle}deg)`,
              transition: 'transform 1.5s cubic-bezier(.2,.8,.2,1)',
            }}
          >
            {SLICE_LABELS.map((label, i) => {
              // Place label at center of each slice (i*90 + 45 deg from top)
              const a = i * 90 + 45;
              return (
                <span
                  key={label}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${a}deg) translateY(-70px) rotate(${-a}deg)`,
                    color: 'var(--farm-ink)',
                    fontWeight: 'bold',
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className={`nes-btn ${disabled ? 'is-disabled' : 'is-error'}`}
          disabled={disabled}
          onClick={handleSpin}
        >
          {spinTokens > 0 ? (spinning ? 'Spinning…' : 'SPIN') : 'Refer friends to earn spins'}
        </button>

        {message && (
          <div
            className="nes-container is-rounded"
            style={{ backgroundColor: 'var(--farm-wheat)', color: 'var(--farm-ink)' }}
          >
            {message}
          </div>
        )}
        {error && (
          <div
            className="nes-container is-rounded"
            style={{ backgroundColor: 'var(--farm-ember)', color: '#fff' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
