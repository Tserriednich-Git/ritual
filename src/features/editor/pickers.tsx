import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { COLOR_TOKENS, HABIT_ICONS, type ColorToken } from '../../domain/types';
import { radius, spacing, touchTarget, useTheme } from '../../theme/theme';
import { tokenColor, tokenSoft } from '../../theme/palette';
import { Text } from '../../components/ui/Text';

type PickerProps<T> = {
  value: T;
  onChange: (next: T) => void;
};

export function IconPicker({ value, onChange }: PickerProps<string>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Habit icon">
      {HABIT_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <Pressable
            key={icon}
            accessibilityRole="radio"
            accessibilityLabel={`Icon ${icon}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(icon)}
            hitSlop={spacing.xs}
            style={({ pressed }) => [
              styles.icon,
              {
                borderColor: selected ? theme.colors.accent : theme.colors.border,
                backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surface,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text variant="title">{icon}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ColorPicker({
  value,
  onChange,
  scheme,
}: PickerProps<ColorToken> & { scheme: 'light' | 'dark' }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Habit colour">
      {COLOR_TOKENS.map((token) => {
        const selected = token === value;
        return (
          <Pressable
            key={token}
            accessibilityRole="radio"
            accessibilityLabel={`Colour ${token}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(token)}
            hitSlop={spacing.xs}
            style={({ pressed }) => [
              styles.swatch,
              {
                backgroundColor: tokenSoft(token, scheme),
                borderColor: selected ? tokenColor(token, scheme) : theme.colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: radius.pill,
                backgroundColor: tokenColor(token, scheme),
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const size = touchTarget - 4;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  icon: {
    width: size,
    height: size,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: size - 4,
    height: size - 4,
    borderWidth: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
