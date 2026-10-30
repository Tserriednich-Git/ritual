import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { radius, useTheme } from '../../theme/theme';

type Props = {
  /** 0…1 */
  value: number;
  height?: number;
  tint?: string;
  style?: ViewStyle;
  accessibilityLabel: string;
};

export function ProgressBar({ value, height = 8, tint, style, accessibilityLabel }: Props) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const trackHeight = Math.max(height, 6);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        {
          height: trackHeight,
          borderRadius: radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: tint ?? theme.colors.accent,
        }}
      />
    </View>
  );
}
