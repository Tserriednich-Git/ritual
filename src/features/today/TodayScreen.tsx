import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TabScreenProps } from '../../app/navigation/types';
import { HabitRow } from '../../components/HabitRow';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Fab } from '../../components/ui/Fab';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { friendlyDateLabel } from '../../domain/date';
import { selectTodayRows } from '../../store/selectors';
import { useRitualStore } from '../../store/useRitualStore';
import { spacing, useTheme } from '../../theme/theme';

type Props = TabScreenProps<'Today'>;

export function TodayScreen({ navigation }: Props) {
  const theme = useTheme();
  const habits = useRitualStore((state) => state.habits);
  const completions = useRitualStore((state) => state.completions);
  const today = useRitualStore((state) => state.today);
  const status = useRitualStore((state) => state.status);
  const errorMessage = useRitualStore((state) => state.errorMessage);
  const toggleToday = useRitualStore((state) => state.toggleToday);
  const refresh = useRitualStore((state) => state.refresh);

  const rows = useMemo(
    () => selectTodayRows({ habits, completions, today }),
    [habits, completions, today],
  );

  const due = rows.filter((row) => row.dueToday);
  const done = rows.filter((row) => row.completedToday);
  const ratio = due.length === 0 ? 0 : done.length / due.length;
  const allDone = due.length > 0 && done.length === due.length;

  return (
    <>
      <Screen
        title="Today"
        subtitle={friendlyDateLabel(today)}
        rightHeader={
          due.length > 0 ? (
            <View style={styles.summary}>
              <Text variant="label" tone="muted">
                {done.length}/{due.length} done
              </Text>
              <ProgressBar
                value={ratio}
                accessibilityLabel="Today’s progress"
                style={styles.summaryBar}
              />
            </View>
          ) : null
        }
      >
        {status === 'error' ? (
          <Card style={styles.column}>
            <Text variant="subtitle" tone="danger">
              Could not open your data
            </Text>
            <Text tone="muted">{errorMessage ?? 'Unknown storage error.'}</Text>
            <Button label="Try again" variant="secondary" onPress={() => void refresh()} />
          </Card>
        ) : null}

        {allDone ? (
          <Card
            style={[
              styles.column,
              { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
            ]}
          >
            <Text variant="subtitle">Everything done for today.</Text>
            <Text variant="caption" tone="muted">
              Streaks roll over at midnight. Tomorrow’s list is already set.
            </Text>
          </Card>
        ) : null}

        {rows.length === 0 && status !== 'error' ? (
          <EmptyState
            title="No habits yet"
            message="Ritual keeps everything on this device. Add one habit — drink water, read, move — and the streak maths starts today."
            actionLabel="Add your first habit"
            onAction={() => navigation.navigate('HabitEditor')}
          />
        ) : (
          <View style={styles.list}>
            {rows.map((row) => (
              <HabitRow
                key={row.habit.id}
                row={row}
                scheme={theme.scheme}
                onToggle={() => void toggleToday(row.habit.id)}
                onOpen={() => navigation.navigate('HabitDetail', { habitId: row.habit.id })}
              />
            ))}
          </View>
        )}
      </Screen>
      {rows.length > 0 ? (
        <Fab label="New habit" onPress={() => navigation.navigate('HabitEditor')} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  column: { gap: spacing.sm },
  summary: { alignItems: 'flex-end', gap: spacing.xs },
  summaryBar: { width: 96 },
});
