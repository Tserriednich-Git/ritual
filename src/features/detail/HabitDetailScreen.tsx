import React, { useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { StackScreenProps } from '../../app/navigation/types';
import { Heatmap } from '../../components/Heatmap';
import { WeekStrip } from '../../components/WeekStrip';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { addDays, friendlyDateLabel, startOfWeekISO, weekdayShortNames } from '../../domain/date';
import { frequencyLabel } from '../../domain/frequency';
import { buildHeatmap, localDateFromEpoch, percentage, weekdayBreakdown } from '../../domain/stats';
import { streakLabel } from '../../domain/streak';
import { selectRowFor } from '../../store/selectors';
import { useRitualStore } from '../../store/useRitualStore';
import { spacing, useTheme } from '../../theme/theme';
import { tokenColor } from '../../theme/palette';

type Props = StackScreenProps<'HabitDetail'>;

export function HabitDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const habits = useRitualStore((state) => state.habits);
  const completions = useRitualStore((state) => state.completions);
  const today = useRitualStore((state) => state.today);
  const weekStartsOn = useRitualStore((state) => state.weekStartsOn);
  const toggleOnDay = useRitualStore((state) => state.toggleCompletionOnDay);
  const archive = useRitualStore((state) => state.archive);
  const unarchive = useRitualStore((state) => state.unarchive);

  const [width, setWidth] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);

  const row = useMemo(
    () => selectRowFor({ habits, completions, today }, route.params.habitId),
    [habits, completions, today, route.params.habitId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: row?.habit.name ?? 'Habit' });
  }, [navigation, row?.habit.name]);

  if (!row) {
    return (
      <Screen title="Habit not found" subtitle="It may have been deleted on another screen.">
        <Button label="Back to Today" variant="secondary" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const accent = tokenColor(row.habit.color, theme.scheme);
  const dates = completions[row.habit.id] ?? [];
  const anchor = addDays(startOfWeekISO(today, weekStartsOn), weekOffset * 7);
  const cells = buildHeatmap(row.habit, dates, today, 18);
  const weekdays = weekdayBreakdown(row.habit, dates, today);
  const archived = row.habit.archivedAt !== null;

  return (
    <Screen title={row.habit.name} subtitle={frequencyLabel(row.habit.frequency)}>
      <Card style={[styles.column, { borderLeftWidth: 4, borderLeftColor: accent }]}>
        <View style={styles.metricRow}>
          <Metric label="current" value={streakLabel(row.stats.streak)} accent={accent} />
          <Metric label="best" value={`${row.stats.streak.longest} ${row.stats.streak.unit}`} />
          <Metric label="check-ins" value={String(row.stats.totalCompletions)} />
        </View>
        <ProgressBar
          value={row.stats.consistency}
          tint={accent}
          accessibilityLabel={`Consistency ${percentage(row.stats.consistency)}`}
        />
        <Text variant="caption" tone="muted">
          {percentage(row.stats.consistency)} of the last 28 days’ obligations met
          {row.stats.lastCompletedDate
            ? ` · last check-in ${friendlyDateLabel(row.stats.lastCompletedDate, today)}`
            : ''}
        </Text>
      </Card>

      {archived ? (
        <Card
          style={[
            styles.banner,
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <Text variant="label" tone="muted">
            Archived — it keeps its history but stops appearing on Today.
          </Text>
          <Button
            label="Restore habit"
            variant="secondary"
            onPress={() => void unarchive(row.habit.id)}
          />
        </Card>
      ) : null}

      <Card style={styles.column}>
        <View style={styles.weekHeader}>
          <Text variant="label" tone="muted">
            WEEK OF {friendlyDateLabel(anchor, today).toUpperCase()}
          </Text>
          <View style={styles.weekNav}>
            <Button
              label="‹"
              size="sm"
              variant="ghost"
              onPress={() => setWeekOffset((n) => n - 1)}
            />
            <Button
              label="›"
              size="sm"
              variant="ghost"
              disabled={weekOffset >= 0}
              onPress={() => setWeekOffset((n) => Math.min(0, n + 1))}
            />
          </View>
        </View>
        <WeekStrip
          anchorDate={anchor}
          completedDates={dates}
          today={today}
          accent={accent}
          weekStartsOn={weekStartsOn}
          minDate={localDateFromEpoch(row.habit.createdAt)}
          onToggleDay={(date) => void toggleOnDay(row.habit.id, date)}
        />
        <Text variant="caption" tone="muted">
          Tap any past day to backfill a check-in you forgot.
        </Text>
      </Card>

      <Card style={styles.column} padded>
        <Text variant="label" tone="muted">
          HISTORY
        </Text>
        <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {width > 0 ? <Heatmap cells={cells} accent={accent} width={width} /> : null}
        </View>
      </Card>

      <Card style={styles.column}>
        <Text variant="label" tone="muted">
          BY WEEKDAY
        </Text>
        {weekdays.map((summary, index) => (
          <View key={index} style={styles.weekdayRow}>
            <Text variant="caption" style={styles.weekdayLabel}>
              {weekdayShortNames[index] ?? ''}
            </Text>
            <ProgressBar
              value={summary.rate}
              height={6}
              tint={accent}
              accessibilityLabel={`Weekday ${index} completion rate`}
              style={{ flex: 1 }}
            />
            <Text variant="caption" tone="muted">
              {summary.due === 0 ? '—' : `${summary.count}/${summary.due}`}
            </Text>
          </View>
        ))}
      </Card>

      {row.habit.description ? (
        <Card style={styles.column}>
          <Text variant="label" tone="muted">
            NOTE
          </Text>
          <Text>{row.habit.description}</Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Edit habit"
          variant="secondary"
          onPress={() => navigation.navigate('HabitEditor', { habitId: row.habit.id })}
        />
        <Button
          label={archived ? 'Already archived' : 'Archive'}
          variant="ghost"
          disabled={archived}
          onPress={() => void archive(row.habit.id)}
        />
      </View>
    </Screen>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="title" style={accent ? { color: accent } : undefined}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing.sm },
  banner: { gap: spacing.md },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, gap: 2 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekNav: { flexDirection: 'row', gap: spacing.xs },
  weekdayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekdayLabel: { width: 34 },
  actions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
});
