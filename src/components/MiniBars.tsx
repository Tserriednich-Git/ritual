import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme';

type Props = {
  values: number[];
  accent: string;
  height?: number;
  accessibilityLabel: string;
};

/**
 * Dependency-free bar strip. Values are normalised against the maximum so a
 * quiet month still renders a readable shape instead of a flat line.
 */
export function MiniBars({ values, accent, height = 64, accessibilityLabel }: Props) {
  const theme = useTheme();
  const max = Math.max(1, ...values);

  return (
    <View
      style={[styles.row, { height }]}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
    >
      {values.map((value, index) => {
        const ratio = value / max;
        const isZero = value === 0;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: Math.max(2, Math.round(ratio * (height - 6))),
                backgroundColor: isZero ? theme.colors.surfaceAlt : accent,
                opacity: isZero ? 1 : 0.5 + ratio * 0.5,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' },
  bar: { flex: 1, borderRadius: 2, minWidth: 2 },
});
