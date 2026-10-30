/** SQLite row shapes. Column names match `schema.ts` exactly. */

export type HabitRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  frequency_kind: string;
  frequency_target: number | null;
  frequency_days: string;
  reminder_time: string | null;
  position: number;
  created_at: number;
  archived_at: number | null;
};

export type CompletionRow = {
  id: number;
  habit_id: string;
  local_date: string;
  completed_at: number;
  note: string;
};

export type CountRow = {
  habit_id: string;
  total: number;
};
