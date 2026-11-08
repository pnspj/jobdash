'use client';

import { useEffect, useState } from 'react';

/**
 * useState backed by localStorage. The stored value is read after mount,
 * so server and first client render both use `initial` (no hydration mismatch).
 */
export function usePersistentState<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: read the stored value once per key (initial is a fallback only)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue({ ...initial, ...JSON.parse(raw) });
    } catch {
      // ignore broken storage
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, loaded]);

  // `loaded`: the stored value has been applied (render decisions that depend on it should wait)
  return [value, setValue, loaded] as const;
}
