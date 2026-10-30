import { useColorScheme } from 'react-native';

import type { ThemePreference } from '../db/repositories/preferenceRepository';
import { darkPalette, lightPalette, type Palette } from './palette';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  title: { fontSize: 21, fontWeight: '700', lineHeight: 27 },
  subtitle: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
} as const;

export const touchTarget = 44;

export type AppTheme = {
  scheme: 'light' | 'dark';
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  touchTarget: number;
};

export function buildTheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined,
): AppTheme {
  const scheme = preference === 'system' ? (systemScheme ?? 'light') : preference;
  return {
    scheme,
    colors: scheme === 'dark' ? darkPalette : lightPalette,
    spacing,
    radius,
    typography,
    touchTarget,
  };
}

/**
 * Resolves the user's preference against the OS setting. `preference` comes from
 * the store, so a theme change re-renders without touching system APIs again.
 */
export function useTheme(preference: ThemePreference = 'system'): AppTheme {
  const systemScheme = useColorScheme();
  return buildTheme(preference, systemScheme);
}
