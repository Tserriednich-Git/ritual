import { useRitualStore } from './useRitualStore';
import type { Snapshot } from './selectors';

/**
 * Subscribes to the three primitives the selectors need. Returning a fresh
 * object is safe: components memoise on the primitive fields, not this wrapper.
 */
export function useSnapshot(): Snapshot {
  const habits = useRitualStore((state) => state.habits);
  const completions = useRitualStore((state) => state.completions);
  const today = useRitualStore((state) => state.today);
  return { habits, completions, today };
}
