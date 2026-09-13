"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-browser persisted state for Phase 1 interactions (votes, saves, follows,
 * challenge progress). Starts from `initial` on the server and first client
 * render to avoid hydration mismatches, then loads the stored value.
 */
export function useLocalStorageState<T>(key: string, initial: T): [T, (update: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Storage unavailable (private mode, blocked site data) — keep in-memory state.
    }
    setLoaded(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Ignore write failures; state still updates for this session.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, loaded];
}
