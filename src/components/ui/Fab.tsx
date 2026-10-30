import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { radius, touchTarget, useTheme } from '../../theme/theme';
import { Text } from './Text';

type Props = {
  onPress: () => void;
  label: string;
  glyph?: string;
};

/**
 * Floating action button. `hitSlop` plus an explicit touchTarget keeps the tap
 * area ≥44pt even though the visible circle is smaller.
 */
export function Fab({ onPress, label, glyph = '+' }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Creates a new habit"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.fab,
        {
          width: touchTarget + 8,
          height: touchTarget + 8,
          borderRadius: radius.pill,
          backgroundColor: theme.colors.accent,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text variant="display" style={{ color: theme.colors.textOnAccent, lineHeight: 34 }}>
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
