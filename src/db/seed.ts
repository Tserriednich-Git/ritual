import type { SQLiteDatabase } from 'expo-sqlite';

import { countActiveHabits, insertHabit } from './repositories/habitRepository';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from './repositories/preferenceRepository';
import type { HabitDraft } from '../domain/types';
import { createId } from '../utils/id';

/**
 * First-run content. Real habits, zero fabricated history: seeding check-ins
 * would show a streak the user never earned, which defeats the point of the
 * streak engine.
 */
const STARTER_HABITS: HabitDraft[] = [
  {
    name: 'Move for 20 minutes',
    description: 'Walk, stretch, lift — anything that isn’t sitting.',
    color: 'teal',
    icon: '🏃',
    frequency: { kind: 'times_per_week', target: 4 },
    reminderTime: null,
  },
  {
    name: 'Read 10 pages',
    description: 'Paper or e-reader, not feeds.',
    color: 'amber',
    icon: '📚',
    frequency: { kind: 'every_day' },
    reminderTime: null,
  },
  {
    name: 'Water refill',
    description: 'Refill the bottle before the next one.',
    color: 'sky',
    icon: '💧',
    frequency: { kind: 'every_day' },
    reminderTime: null,
  },
];

/** Creates the starter set exactly once per install, on an empty database. */
export async function seedOnFirstRun(db: SQLiteDatabase): Promise<number> {
  if (await hasCompletedOnboarding(db)) return 0;
  if ((await countActiveHabits(db)) > 0) {
    await markOnboardingComplete(db);
    return 0;
  }

  for (const draft of STARTER_HABITS) {
    await insertHabit(db, draft, createId());
  }
  await markOnboardingComplete(db);
  return STARTER_HABITS.length;
}
