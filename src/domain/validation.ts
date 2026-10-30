import { parseTime } from './date';
import {
  COLOR_TOKENS,
  MAX_HABIT_DESCRIPTION,
  MAX_HABIT_NAME,
  type ColorToken,
  type Frequency,
  type HabitDraft,
} from './types';
import type { Weekday } from './date';

export type FieldError = {
  field: 'name' | 'description' | 'color' | 'icon' | 'frequency' | 'reminder';
  message: string;
};

export type ValidationResult =
  { ok: true; draft: HabitDraft } | { ok: false; errors: FieldError[] };

const VALID_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function validateHabit(input: Partial<HabitDraft>): ValidationResult {
  const errors: FieldError[] = [];

  const name = (input.name ?? '').trim();
  if (name.length === 0) {
    errors.push({ field: 'name', message: 'Give the habit a name.' });
  } else if (name.length > MAX_HABIT_NAME) {
    errors.push({ field: 'name', message: `Keep it under ${MAX_HABIT_NAME} characters.` });
  }

  const description = (input.description ?? '').trim();
  if (description.length > MAX_HABIT_DESCRIPTION) {
    errors.push({
      field: 'description',
      message: `Notes are capped at ${MAX_HABIT_DESCRIPTION} characters.`,
    });
  }

  const color = input.color;
  if (!color || !isColorTokenValue(color)) {
    errors.push({ field: 'color', message: 'Pick one of the available colours.' });
  }

  const icon = (input.icon ?? '').trim();
  if (icon.length === 0) {
    errors.push({ field: 'icon', message: 'Pick an icon.' });
  }

  const frequency = input.frequency;
  const frequencyError = validateFrequency(frequency);
  if (frequencyError) errors.push({ field: 'frequency', message: frequencyError });

  const reminder = input.reminderTime;
  if (reminder !== null && reminder !== undefined) {
    if (parseTime(reminder) === null) {
      errors.push({ field: 'reminder', message: 'Use a 24-hour HH:MM time.' });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    draft: {
      name,
      description,
      color: color as ColorToken,
      icon,
      frequency: frequency as Frequency,
      reminderTime: reminder ? (reminder as string) : null,
    },
  };
}

function isColorTokenValue(value: string): value is ColorToken {
  return (COLOR_TOKENS as string[]).includes(value);
}

export function validateFrequency(frequency: Frequency | undefined): string | null {
  if (!frequency) return 'Choose how often you want to do it.';

  switch (frequency.kind) {
    case 'every_day':
      return null;
    case 'times_per_week': {
      if (!Number.isInteger(frequency.target) || frequency.target < 1 || frequency.target > 7) {
        return 'A weekly habit needs a target between 1 and 7.';
      }
      return null;
    }
    case 'specific_days': {
      if (frequency.days.length === 0) return 'Select at least one day.';
      if (new Set(frequency.days).size !== frequency.days.length) return 'Days must be unique.';
      const invalid = frequency.days.some((d) => !VALID_WEEKDAYS.includes(d as Weekday));
      if (invalid) return 'Days must be between Sunday (0) and Saturday (6).';
      return null;
    }
  }
}

export function duplicateNameCheck(
  existingNames: string[],
  candidate: string,
  selfName?: string,
): string | null {
  const normalised = candidate.trim().toLowerCase();
  if (selfName && selfName.trim().toLowerCase() === normalised) return null;
  return existingNames.some((n) => n.trim().toLowerCase() === normalised)
    ? 'You already track a habit with that name.'
    : null;
}
