import React from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { useTheme, type AppTheme, typography } from '../../theme/theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  tone?: 'default' | 'muted' | 'accent' | 'danger' | 'success';
  theme?: AppTheme;
};

const toneResolver: Record<NonNullable<Props['tone']>, (theme: AppTheme) => string> = {
  default: (theme) => theme.colors.text,
  muted: (theme) => theme.colors.textMuted,
  accent: (theme) => theme.colors.accent,
  danger: (theme) => theme.colors.danger,
  success: (theme) => theme.colors.success,
};

/**
 * One text component so type scale and colour never drift between screens.
 * Accepts an injected theme for use inside unit tests that render it standalone.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  muted,
  theme: injected,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const resolved = injected ?? theme;
  const colour = muted ? resolved.colors.textMuted : toneResolver[tone](resolved);
  return (
    <RNText
      accessibilityRole="text"
      style={[styles.base, typography[variant], { color: colour }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // Keeps Android's font scaling inside the layout instead of clipping.
    includeFontPadding: false,
  },
});
