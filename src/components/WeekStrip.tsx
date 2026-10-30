import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDays, diffDays, startOfWeekISO, weekdayLabel } from '../domain/date';
import { useTheme, radius, spacing, touchTarget } from '../theme/theme';
import { Text } from './ui/Text';

type Props = {
  /** Absolute week (any date inside it) that the strip displays. */
  anchorDate: string;
  completedDates: string[];
  today: string;
  accent: string;
  weekStartsOn: 0 | 1;
  /** Earliest day that can be checked — usually the habit's creation date. */
  minDate?: string;
  onToggleDay: (date: string) => void;
};

/**
 * A whole week of one-tap check-ins, including backfilling a missed day.
 * Future days are disabled, as is anything before `minDate`.
 */
export function WeekStrip({
  anchorDate,
  completedDates,
  today,
  accent,
  weekStartsOn,
  minDate,
  onToggleDay,
}: Props) {
  const theme = useTheme();
  const weekStart = startOfWeekISO(anchorDate, weekStartsOn);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const done = new Set(completedDates);

  return (
    <View style={styles.strip} accessibilityRole="adjustable">
      {days.map((date) => {
        const isFuture = diffDays(today, date) > 0;
        const isBeforeHabit = minDate !== undefined && diffDays(minDate, date) < 0;
        const disabled = isFuture || isBeforeHabit;
        const isCompleted = done.has(date);
        const isToday = date === today;
        return (
          <Pressable
            key={date}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityLabel={weekdayLabel(date)}
            accessibilityHint={isFuture ? 'Not open yet' : 'Toggles the check-in for this day'}
            accessibilityState={{ checked: isCompleted, disabled }}
            onPress={() => onToggleDay(date)}
            hitSlop={spacing.xs}
            style={({ pressed }) => [
              styles.day,
              {
                width: touchTarget,
                height: touchTarget,
                borderRadius: radius.pill,
                borderColor: isToday ? accent : theme.colors.border,
                backgroundColor: isCompleted ? accent : theme.colors.surface,
                opacity: disabled ? 0.35 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              variant="label"
              style={{ color: isCompleted ? theme.colors.textOnAccent : theme.colors.textMuted }}
            >
              {weekdayLabel(date).slice(0, 2)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  day: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
