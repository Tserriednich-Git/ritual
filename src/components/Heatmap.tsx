import React from 'react';
import { StyleSheet, View } from 'react-native';

import { weekdayOf } from '../domain/date';
import type { HeatCell } from '../domain/stats';
import { radius, useTheme } from '../theme/theme';
import { Text } from './ui/Text';

type Props = {
  cells: HeatCell[];
  accent: string;
  /** Width available to the grid; cell size is derived from it. */
  width: number;
  columns?: number;
};

const GAP = 4;

/**
 * Contribution-style grid: one column per week (oldest at the left), seven rows
 * Sunday-first. Cell size derives from the measured container so the grid fits
 * every phone width without horizontal scrolling.
 */
export function Heatmap({ cells, accent, width, columns = 18 }: Props) {
  const theme = useTheme();
  const first = cells[0];
  const completed = cells.filter((cell) => cell.completed).length;
  const due = cells.filter((cell) => cell.due).length;

  if (!first) {
    return (
      <Text variant="caption" tone="muted">
        Check in a few times and your history appears here.
      </Text>
    );
  }

  const cellSize = Math.max(8, Math.floor((width - GAP * (columns - 1)) / columns));
  // Blank leading cells so the first visual row starts on Sunday.
  const leading = weekdayOf(first.date);
  const padded: (HeatCell | null)[] = [...Array.from({ length: leading }, () => null), ...cells];

  const weeks: (HeatCell | null)[][] = [];
  for (let index = 0; index < padded.length; index += 7) {
    weeks.push(padded.slice(index, index + 7));
  }

  const fill = (cell: HeatCell | null): string => {
    if (!cell) return 'transparent';
    if (cell.completed) return cell.level === 2 ? accent : `${accent}B3`;
    return cell.due ? theme.colors.surfaceAlt : `${theme.colors.surfaceAlt}80`;
  };

  return (
    <View
      style={styles.grid}
      accessibilityRole="summary"
      accessibilityLabel={`History grid: ${completed} of ${due} due days completed`}
    >
      {weeks.map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={styles.week}>
          {week.map((cell, dayIndex) => (
            <View
              key={`${weekIndex}-${dayIndex}`}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  borderRadius: radius.sm / 2,
                  backgroundColor: fill(cell),
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  week: { flexDirection: 'column', gap: GAP, marginRight: GAP },
  cell: { borderWidth: 0 },
});
