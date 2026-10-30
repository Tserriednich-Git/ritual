import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';

import { todayISO } from '../domain/date';
import type { Habit, HabitDraft } from '../domain/types';
import {
  archiveHabit,
  deleteHabit,
  insertHabit,
  listHabits,
  unarchiveHabit,
  updateHabit,
} from '../db/repositories/habitRepository';
import { listAllCompletionDates, toggleCompletion } from '../db/repositories/completionRepository';
import {
  getTheme,
  getWeekStartsOn,
  setTheme as persistTheme,
  setWeekStartsOn as persistWeekStart,
} from '../db/repositories/preferenceRepository';
import type { ThemePreference, WeekStartPreference } from '../db/repositories/preferenceRepository';
import { syncReminders } from '../notifications/reminders';
import { createId } from '../utils/id';
import { ACTIVE_HABIT_LIMIT } from '../domain/types';

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

export type State = {
  status: StoreStatus;
  errorMessage: string | null;
  habits: Habit[];
  /** habitId → sorted completion dates. */
  completions: Record<string, string[]>;
  today: string;
  theme: ThemePreference;
  weekStartsOn: WeekStartPreference;
};

type Actions = {
  bootstrap: (db: SQLiteDatabase) => Promise<void>;
  refresh: () => Promise<void>;
  createHabit: (draft: HabitDraft) => Promise<Habit>;
  saveHabit: (habit: Habit) => Promise<void>;
  toggleCompletionOnDay: (habitId: string, localDate: string) => Promise<boolean>;
  toggleToday: (habitId: string) => Promise<boolean>;
  setReminderTime: (habitId: string, reminderTime: string | null) => Promise<void>;
  archive: (habitId: string) => Promise<void>;
  unarchive: (habitId: string) => Promise<void>;
  destroy: (habitId: string) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setWeekStartsOn: (value: WeekStartPreference) => Promise<void>;
  reset: () => void;
};

export type RitualStore = State & Actions;

const initialState: State = {
  status: 'idle',
  errorMessage: null,
  habits: [],
  completions: {},
  today: todayISO(),
  theme: 'system',
  weekStartsOn: 1,
};

/** Held outside the store: the database handle is not serialisable state. */
let dbRef: SQLiteDatabase | null = null;

function requireDb(): SQLiteDatabase {
  if (!dbRef) throw new Error('Store used before bootstrap() — is the app inside SQLiteProvider?');
  return dbRef;
}

export const useRitualStore = create<RitualStore>()((set, get) => {
  async function reloadReminders(): Promise<void> {
    try {
      await syncReminders(get().habits);
    } catch (error) {
      // Reminders are a convenience; a scheduling failure must not lose data.
      console.warn('Reminder sync failed', error);
    }
  }

  async function hydrate(): Promise<void> {
    const db = requireDb();
    const [habits, completionDates, theme, weekStartsOn] = await Promise.all([
      listHabits(db, { includeArchived: true }),
      listAllCompletionDates(db),
      getTheme(db),
      getWeekStartsOn(db),
    ]);
    const completions: Record<string, string[]> = {};
    for (const [habitId, dates] of completionDates) completions[habitId] = dates;
    set({
      habits,
      completions,
      theme,
      weekStartsOn,
      today: todayISO(),
      status: 'ready',
      errorMessage: null,
    });
  }

  return {
    ...initialState,

    async bootstrap(db) {
      dbRef = db;
      set({ status: 'loading' });
      try {
        await hydrate();
        await reloadReminders();
      } catch (error) {
        set({
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    refresh: hydrate,

    async createHabit(draft) {
      const db = requireDb();
      if (countActiveHabits(get()) >= ACTIVE_HABIT_LIMIT) {
        throw new Error(`Ritual tracks up to ${ACTIVE_HABIT_LIMIT} active habits.`);
      }
      const id = createId();
      const habit = await insertHabit(db, draft, id);
      set((state) => ({
        habits: [...state.habits, habit],
        completions: { ...state.completions, [habit.id]: [] },
      }));
      await reloadReminders();
      return habit;
    },

    async saveHabit(habit) {
      const db = requireDb();
      await updateHabit(db, habit);
      set((state) => ({ habits: state.habits.map((h) => (h.id === habit.id ? habit : h)) }));
      await reloadReminders();
    },

    async toggleCompletionOnDay(habitId, localDate) {
      const db = requireDb();
      const completed = await toggleCompletion(db, habitId, localDate);
      set((state) => {
        const existing = state.completions[habitId] ?? [];
        const next = completed
          ? [...existing, localDate].sort()
          : existing.filter((date) => date !== localDate);
        return { completions: { ...state.completions, [habitId]: next } };
      });
      return completed;
    },

    toggleToday(habitId) {
      return get().toggleCompletionOnDay(habitId, get().today);
    },

    async setReminderTime(habitId, reminderTime) {
      const habit = get().habits.find((h) => h.id === habitId);
      if (!habit) return;
      await get().saveHabit({ ...habit, reminderTime });
    },

    async archive(habitId) {
      const db = requireDb();
      await archiveHabit(db, habitId);
      set((state) => ({
        habits: state.habits.map((h) =>
          h.id === habitId ? { ...h, archivedAt: Date.now(), reminderTime: null } : h,
        ),
      }));
      await reloadReminders();
    },

    async unarchive(habitId) {
      const db = requireDb();
      await unarchiveHabit(db, habitId);
      set((state) => ({
        habits: state.habits.map((h) => (h.id === habitId ? { ...h, archivedAt: null } : h)),
      }));
    },

    async destroy(habitId) {
      const db = requireDb();
      await deleteHabit(db, habitId);
      set((state) => {
        const completions = { ...state.completions };
        delete completions[habitId];
        return { habits: state.habits.filter((h) => h.id !== habitId), completions };
      });
      await reloadReminders();
    },

    async setTheme(theme) {
      await persistTheme(requireDb(), theme);
      set({ theme });
    },

    async setWeekStartsOn(weekStartsOn) {
      await persistWeekStart(requireDb(), weekStartsOn);
      set({ weekStartsOn });
    },

    reset() {
      set({ ...initialState, today: todayISO() });
    },
  };
});

function countActiveHabits(state: State): number {
  return state.habits.filter((habit) => habit.archivedAt === null).length;
}

/** Convenience for screens that only care about non-archived habits. */
export function selectActiveHabits(state: State): Habit[] {
  return state.habits
    .filter((habit) => habit.archivedAt === null)
    .sort((a, b) => a.position - b.position);
}

/** Archived habits are a settings-list concern, not a per-day snapshot. */
export function selectArchivedHabits(habits: Habit[]): Habit[] {
  return habits.filter((habit) => habit.archivedAt !== null);
}
