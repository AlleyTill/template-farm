"use client";

import { useState } from "react";

export type FarmhandMood = "default" | "happy" | "thinking" | "sassy" | "angry";

const MOOD_EMOJI: Record<FarmhandMood, string> = {
  default: "🧑‍🌾",
  happy: "😄",
  thinking: "🤔",
  sassy: "😏",
  angry: "😤",
};

/**
 * Farmhand companion sprite. If an image exists at
 * /farmhand/{mood}.png it renders that; otherwise falls back to an emoji.
 *
 * Drop PNGs in public/farmhand/ named: default.png, happy.png, thinking.png,
 * sassy.png, angry.png. Recommended 128-256px, transparent, pixel art.
 */
export function Farmhand({
  mood = "default",
  size = 128,
}: {
  mood?: FarmhandMood;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.7,
          lineHeight: 1,
          imageRendering: "pixelated",
        }}
        aria-label={`Farmhand (${mood})`}
      >
        {MOOD_EMOJI[mood]}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/farmhand/${mood}.png`}
      alt={`Farmhand (${mood})`}
      width={size}
      height={size}
      onError={() => setImgFailed(true)}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        objectFit: "contain",
      }}
    />
  );
}
