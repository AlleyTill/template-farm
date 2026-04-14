"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SearchHit } from "@/lib/types";

type SearchState = {
  aiOn: boolean;
  setAiOn: (v: boolean) => void;
  hits: SearchHit[];
  setHits: (hits: SearchHit[]) => void;
  lastError: string | null;
  setError: (err: string | null) => void;
};

export const SearchContext = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [aiOn, setAiOn] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [lastError, setError] = useState<string | null>(null);

  const value = useMemo<SearchState>(
    () => ({ aiOn, setAiOn, hits, setHits, lastError, setError }),
    [aiOn, hits, lastError],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch(): SearchState {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used inside <SearchProvider>");
  }
  return ctx;
}
