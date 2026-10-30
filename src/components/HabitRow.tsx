import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { frequencyLabel } from '../domain/frequency';
import { streakAdjective } from '../domain/streak';
import type { HabitWithProgress } from '../domain/types';
import { tokenColor, tokenSoft } from '../theme/palette';
import { radius, spacing, touchTarget, useTheme } from '../theme/theme';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { Text } from './ui/Text';

type Props = {
  row: HabitWithProgress;
  onToggle: () => void;
  onOpen: () => void;
  scheme: 'light' | 'dark';
};

const CHECK_GLYPH = '✓';

export function HabitRow({ row, onToggle, onOpen, scheme }: Props) {
  const theme = useTheme();
  const accent = tokenColor(row.habit.color, scheme);
  const soft = tokenSoft(row.habit.color, scheme);
  const checked = row.completedToday;
  const streak = row.stats.streak.current;

  return (
    <Card
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderColor: checked ? accent : theme.colors.border,
      }}
    >
      <Pressable
        accessibilityRole="image"
        accessibilityLabel={`${row.habit.name}, ${frequencyLabel(row.habit.frequency)}`}
        accessibilityHint="Opens the habit details"
        onPress={onOpen}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <View
          style={[
            styles.glyph,
            { backgroundColor: soft, borderColor: accent, borderRadius: radius.md },
          ]}
        >
          <Text variant="title">{row.habit.icon}</Text>
        </View>
        <View style={styles.copy}>
          <Text variant="subtitle" numberOfLines={1} style={checked ? styles.done : undefined}>
            {row.habit.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {streak > 0
              ? `${frequencyLabel(row.habit.frequency)} · ${streakAdjective(row.stats.streak)} streak`
              : frequencyLabel(row.habit.frequency)}
          </Text>
          <ProgressBar
            value={row.stats.consistency}
            height={5}
            tint={accent}
            accessibilityLabel={`${row.habit.name} consistency over the last 28 days`}
            style={styles.progress}
          />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={row.habit.name}
        accessibilityHint={
          checked ? 'Double tap to undo today’s check-in' : 'Double tap to check off today'
        }
        accessibilityState={{ checked }}
        onPress={onToggle}
        hitSlop={spacing.sm}
        style={({ pressed }) => [
          styles.check,
          {
            width: touchTarget,
            height: touchTarget,
            borderRadius: radius.pill,
            borderColor: accent,
            backgroundColor: checked ? accent : 'transparent',
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text variant="subtitle" style={{ color: checked ? theme.colors.textOnAccent : accent }}>
          {CHECK_GLYPH}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  glyph: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: spacing.xs },
  progress: { marginTop: spacing.xs },
  done: { opacity: 0.72 },
  check: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
