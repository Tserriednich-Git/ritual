import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  radius,
  spacing,
  touchTarget,
  typography,
  useTheme,
  type AppTheme,
} from '../../theme/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** Leading glyph, e.g. '+' or '✓'. */
  glyph?: string;
  fullWidth?: boolean;
  accessibilityHint?: string;
  theme?: AppTheme;
  style?: StyleProp<ViewStyle>;
};

const heights: Record<Size, number> = { sm: 36, md: touchTarget, lg: 54 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  glyph,
  fullWidth = false,
  accessibilityHint,
  theme: injected,
  style,
}: Props) {
  const fallback = useTheme();
  const theme = injected ?? fallback;
  const inactive = disabled || loading;

  const palette = {
    primary: {
      bg: theme.colors.accent,
      fg: theme.colors.textOnAccent,
      border: theme.colors.accent,
    },
    secondary: { bg: theme.colors.surfaceAlt, fg: theme.colors.text, border: theme.colors.border },
    ghost: { bg: 'transparent', fg: theme.colors.accent, border: 'transparent' },
    danger: { bg: theme.colors.danger, fg: '#FFFFFF', border: theme.colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radius.md,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <Text
          tone="default"
          style={{
            color: palette.fg,
            ...typography[variant === 'primary' || variant === 'danger' ? 'subtitle' : 'label'],
          }}
        >
          {glyph ? `${glyph}  ${label}` : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
