import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { weekdayShortNames, type Weekday } from '../../domain/date';
import { frequencyLabel } from '../../domain/frequency';
import { MAX_TARGET_PER_WEEK, type Frequency } from '../../domain/types';
import { radius, spacing, touchTarget, useTheme } from '../../theme/theme';
import { StepperButton } from '../../components/ui/StepperButton';
import { Text } from '../../components/ui/Text';

type Props = {
  value: Frequency;
  onChange: (next: Frequency) => void;
};

const MODES: { kind: Frequency['kind']; caption: string; build: () => Frequency }[] = [
  {
    kind: 'every_day',
    caption: 'A day-based streak grows every day you check in.',
    build: () => ({ kind: 'every_day' }),
  },
  {
    kind: 'times_per_week',
    caption: 'Streaks are counted in weeks, so a skipped Tuesday costs you nothing.',
    build: () => ({ kind: 'times_per_week', target: 3 }),
  },
  {
    kind: 'specific_days',
    caption: 'Only the selected weekdays count as due days.',
    build: () => ({ kind: 'specific_days', days: [1, 3, 5] }),
  },
];

export function FrequencyPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const mode = MODES.find((candidate) => candidate.kind === value.kind);

  const toggleDay = (day: Weekday) => {
    if (value.kind !== 'specific_days') return;
    const has = value.days.includes(day);
    const days = has
      ? value.days.filter((d) => d !== day)
      : [...value.days, day].sort((a, b) => a - b);
    onChange({ kind: 'specific_days', days });
  };

  return (
    <View style={styles.stack}>
      <View style={styles.modes} accessibilityRole="radiogroup" accessibilityLabel="Frequency">
        {MODES.map((candidate) => {
          const selected = candidate.kind === value.kind;
          return (
            <Pressable
              key={candidate.kind}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={frequencyLabel(candidate.build())}
              onPress={() => onChange(candidate.build())}
              style={({ pressed }) => [
                styles.mode,
                {
                  borderColor: selected ? theme.colors.accent : theme.colors.border,
                  backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surface,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text variant="label">{frequencyLabel(candidate.build())}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode ? (
        <Text variant="caption" tone="muted">
          {mode.caption}
        </Text>
      ) : null}

      {value.kind === 'times_per_week' ? (
        <View style={styles.stepperRow}>
          <Text variant="label" tone="muted">
            CHECK-INS PER WEEK
          </Text>
          <View style={styles.stepper}>
            <StepperButton
              label="−"
              disabled={value.target <= 1}
              onPress={() => onChange({ kind: 'times_per_week', target: value.target - 1 })}
            />
            <Text variant="title" style={styles.stepperValue}>
              {value.target}
            </Text>
            <StepperButton
              label="+"
              disabled={value.target >= MAX_TARGET_PER_WEEK}
              onPress={() => onChange({ kind: 'times_per_week', target: value.target + 1 })}
            />
          </View>
        </View>
      ) : null}

      {value.kind === 'specific_days' ? (
        <View style={styles.days} accessibilityRole="group" accessibilityLabel="Days of the week">
          {weekdayShortNames.map((label, index) => {
            const day = index as Weekday;
            const selected = value.days.includes(day);
            return (
              <Pressable
                key={label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={label}
                onPress={() => toggleDay(day)}
                hitSlop={spacing.xs}
                style={({ pressed }) => [
                  styles.day,
                  {
                    width: touchTarget - 6,
                    height: touchTarget - 6,
                    borderRadius: radius.pill,
                    borderColor: selected ? theme.colors.accent : theme.colors.border,
                    backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  variant="label"
                  style={{ color: selected ? theme.colors.textOnAccent : theme.colors.textMuted }}
                >
                  {label.slice(0, 2)}
                </Text>
              </Pressable>
            );
          })}
          {value.days.length === 0 ? (
            <Text variant="caption" tone="danger">
              Pick at least one day.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mode: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperValue: { minWidth: 28, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  day: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
