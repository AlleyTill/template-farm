"use client";

import { useSearch } from "./search-context";

export function AIToggle() {
  const { aiOn, setAiOn } = useSearch();
  return (
    <label className="nes-container is-rounded flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="nes-checkbox"
        checked={aiOn}
        onChange={(e) => setAiOn(e.target.checked)}
      />
      <span className="text-xs sm:text-sm">
        Activate the farmhand spirit (AI)
      </span>
    </label>
  );
}
