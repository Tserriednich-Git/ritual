import { Platform } from 'react-native';

// These two enums are re-exported through expo-notifications' build index, which
// the import resolver cannot follow, so they come in by name rather than as
// `Notifications.AndroidImportance`.
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import * as Notifications from 'expo-notifications';

import { parseTime } from '../domain/date';
import type { Habit } from '../domain/types';

/**
 * Android requires every notification to belong to a channel, and on Android 13+
 * the runtime permission prompt only appears once at least one channel exists —
 * so channel creation must always happen before `requestPermissionsAsync`.
 */
export const REMINDER_CHANNEL_ID = 'ritual.reminders';

let handlerInstalled = false;

export function installNotificationHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // `shouldShowAlert` is deprecated in SDK 58; banner + list replace it.
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Habit reminders',
    description: 'Daily nudges for the habits you asked to be reminded about.',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted === true || settings.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureReminderChannel();
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/**
 * A daily repeating trigger is expressed differently per platform: Android has a
 * native daily trigger, while iOS repeats through a calendar trigger.
 */
export function buildDailyTrigger(
  hour: number,
  minute: number,
): Notifications.NotificationTriggerInput {
  if (Platform.OS === 'ios') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: REMINDER_CHANNEL_ID,
  };
}

export function remindersFor(habits: Habit[]): Habit[] {
  return habits.filter(
    (habit) =>
      habit.archivedAt === null &&
      habit.reminderTime !== null &&
      parseTime(habit.reminderTime) !== null,
  );
}

/**
 * Reschedules from scratch rather than diffing. With the documented habit limit
 * of 24 there is nothing to optimise, and a full rebuild cannot leave an
 * orphaned notification behind after an edit or archive.
 */
export async function syncReminders(habits: Habit[]): Promise<{ scheduled: number }> {
  installNotificationHandler();
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === 'web') return { scheduled: 0 };
  if (!(await areNotificationsEnabled())) return { scheduled: 0 };

  await ensureReminderChannel();

  const due = remindersFor(habits);
  for (const habit of due) {
    const time = parseTime(habit.reminderTime ?? '');
    if (!time) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${habit.icon} ${habit.name}`,
        body: buildReminderBody(habit),
      },
      trigger: buildDailyTrigger(time.hour, time.minute),
    });
  }

  return { scheduled: due.length };
}

function buildReminderBody(habit: Habit): string {
  if (habit.frequency.kind === 'times_per_week') {
    return `Aim for ${habit.frequency.target} check-ins this week.`;
  }
  if (habit.frequency.kind === 'specific_days') {
    return habit.description || 'Scheduled for today.';
  }
  return habit.description || 'Time to tick it off.';
}

/** Used by the Settings screen to prove the pipeline works without waiting. */
export async function sendTestReminder(habit: Habit): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: `${habit.icon} ${habit.name}`, body: 'This is what a reminder looks like.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
    },
  });
}
