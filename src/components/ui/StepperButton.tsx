import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '../../theme/theme';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function StepperButton({ label, onPress, disabled = false, accessibilityLabel }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceAlt,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
