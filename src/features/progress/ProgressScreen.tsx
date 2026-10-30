import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TabScreenProps } from '../../app/navigation/types';
import { MiniBars } from '../../components/MiniBars';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { frequencyLabel } from '../../domain/frequency';
import { percentage } from '../../domain/stats';
import { streakLabel } from '../../domain/streak';
import type { HabitWithProgress, Streak } from '../../domain/types';
import { tokenColor } from '../../theme/palette';
import { radius, spacing, useTheme } from '../../theme/theme';
import { selectDailyTotals, selectProgressSummary, selectTodayRows } from '../../store/selectors';
import { useRitualStore } from '../../store/useRitualStore';

type Props = TabScreenProps<'Progress'>;

function maxStreak(rows: HabitWithProgress[]): Streak | null {
  let best: Streak | null = null;
  for (const row of rows) {
    if (best === null || row.stats.streak.longest > best.longest) best = row.stats.streak;
  }
  return best && best.longest > 0 ? best : null;
}

export function ProgressScreen({ navigation }: Props) {
  const theme = useTheme();
  const habits = useRitualStore((state) => state.habits);
  const completions = useRitualStore((state) => state.completions);
  const today = useRitualStore((state) => state.today);

  const rows = useMemo(
    () => selectTodayRows({ habits, completions, today }),
    [habits, completions, today],
  );
  const summary = useMemo(
    () => selectProgressSummary({ habits, completions, today }),
    [habits, completions, today],
  );
  const totals = useMemo(
    () => selectDailyTotals({ habits, completions, today }, 30),
    [habits, completions, today],
  );
  const best = maxStreak(rows);
  const liveCount = rows.filter((row) => row.stats.streak.current > 0).length;

  return (
    <Screen
      title="Progress"
      subtitle="Every number here is computed on-device from your check-ins."
    >
      {rows.length === 0 ? (
        <EmptyState
          glyph="📊"
          title="Nothing to chart yet"
          message="Once you have a habit and a couple of check-ins, streaks and consistency appear on this tab."
          actionLabel="Add a habit"
          onAction={() => navigation.navigate('HabitEditor')}
        />
      ) : (
        <View style={styles.stack}>
          <Card style={styles.column}>
            <Text variant="label" tone="muted">
              TODAY
            </Text>
            <Text variant="display">
              {summary.doneToday}
              <Text variant="title" tone="muted">
                {` / ${summary.dueToday} complete`}
              </Text>
            </Text>
            <ProgressBar
              value={summary.completionRatio}
              accessibilityLabel={`Today ${summary.doneToday} of ${summary.dueToday} habits complete`}
            />
          </Card>

          <Card style={styles.column}>
            <View style={styles.rowBetween}>
              <Text variant="label" tone="muted">
                LAST 30 DAYS
              </Text>
              <Text variant="caption" tone="muted">
                {summary.totalCheckIns} check-ins
              </Text>
            </View>
            <MiniBars
              values={totals.map((day) => day.done)}
              accent={theme.colors.accent}
              accessibilityLabel={`Check-ins per day over 30 days; ${totals.filter((day) => day.done > 0).length} days have at least one`}
            />
          </Card>

          <Card style={styles.statsRow}>
            <Stat value={String(liveCount)} caption="live streaks" />
            <Stat
              value={best ? String(best.longest) : '0'}
              caption={`best ${best?.unit ?? 'day'} streak`}
            />
            <Stat value={String(rows.length)} caption="active habits" />
          </Card>

          {summary.bestStreak ? (
            <Card
              style={[
                styles.featured,
                { borderColor: tokenColor(summary.bestStreak.habit.color, theme.scheme) },
              ]}
            >
              <Text variant="display" accessibilityElementsHidden>
                {summary.bestStreak.habit.icon}
              </Text>
              <View style={styles.column}>
                <Text variant="label" tone="muted">
                  LONGEST LIVE RUN
                </Text>
                <Text variant="title">{summary.bestStreak.habit.name}</Text>
                <Text
                  variant="subtitle"
                  style={{ color: tokenColor(summary.bestStreak.habit.color, theme.scheme) }}
                >
                  {streakLabel(summary.bestStreak.stats.streak)}
                </Text>
              </View>
            </Card>
          ) : null}

          <View style={styles.stack}>
            {rows.map((row) => {
              const accent = tokenColor(row.habit.color, theme.scheme);
              return (
                <Pressable
                  key={row.habit.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.habit.name}. Current streak ${streakLabel(row.stats.streak)}, consistency ${percentage(row.stats.consistency)}.`}
                  accessibilityHint="Opens details and history"
                  onPress={() => navigation.navigate('HabitDetail', { habitId: row.habit.id })}
                  style={({ pressed }) => [
                    styles.habitCard,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                      {row.habit.icon} {row.habit.name}
                    </Text>
                    <Text variant="label" style={{ color: accent }}>
                      {streakLabel(row.stats.streak)}
                    </Text>
                  </View>
                  <Text variant="caption" tone="muted">
                    {frequencyLabel(row.habit.frequency)} · best {row.stats.streak.longest}{' '}
                    {row.stats.streak.unit} · consistency {percentage(row.stats.consistency)}
                  </Text>
                  <ProgressBar
                    value={row.stats.consistency}
                    height={6}
                    tint={accent}
                    accessibilityLabel={`${row.habit.name} consistency over the last 28 days`}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </Screen>
  );
}

function Stat({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="muted">
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  column: { gap: spacing.xs },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  featured: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  habitCard: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm },
});
