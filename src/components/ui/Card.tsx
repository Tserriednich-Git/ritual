import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '../../theme/theme';
import { Text } from './Text';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function Card({ children, style, padded = true }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: radius.md,
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Overrides the accent when the chip represents a coloured habit. */
  tint?: string;
  accessibilityLabel?: string;
};

export function Chip({ label, selected = false, onPress, tint, accessibilityLabel }: ChipProps) {
  const theme = useTheme();
  const accent = tint ?? theme.colors.accent;
  const body = (
    <View
      style={[
        styles.chip,
        {
          borderRadius: radius.pill,
          borderColor: selected ? accent : theme.colors.border,
          backgroundColor: selected ? `${accent}2E` : theme.colors.surface,
        },
      ]}
    >
      {/* A coloured dot keeps the label legible even on a tinted fill. */}
      <View
        style={[
          styles.chipDot,
          {
            backgroundColor: selected ? accent : theme.colors.border,
            width: selected ? 8 : 6,
            height: selected ? 8 : 6,
          },
        ]}
      />
      <Text>{label}</Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={spacing.xs}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipDot: { borderRadius: radius.pill },
});
