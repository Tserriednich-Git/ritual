import type { ColorToken } from '../domain/types';

export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  /** Used by the heatmap's four intensity steps. */
  heatSteps: [string, string, string];
};

export const lightPalette: Palette = {
  background: '#F6F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEFF4',
  border: '#DFDEE7',
  text: '#15141A',
  textMuted: '#6F6C7B',
  textOnAccent: '#FFFFFF',
  accent: '#6D4AFF',
  accentSoft: '#EAE4FF',
  success: '#1F9D68',
  danger: '#C0392B',
  heatSteps: ['#D9CFFF', '#A893FF', '#6D4AFF'],
};

export const darkPalette: Palette = {
  background: '#0E1116',
  surface: '#161B22',
  surfaceAlt: '#1F2630',
  border: '#2A323D',
  text: '#ECF1F6',
  textMuted: '#98A2AE',
  textOnAccent: '#0E1116',
  accent: '#9C86FF',
  accentSoft: '#241F3A',
  success: '#34C88A',
  danger: '#F0796A',
  heatSteps: ['#2C2A46', '#4A4080', '#9C86FF'],
};

/**
 * Habit colours are tokens, not hex: the stored row stays meaningful when the
 * palette is re-themed, and each token supplies its own light/dark pair.
 */
export const tokenColors: Record<ColorToken, { light: string; dark: string }> = {
  violet: { light: '#6D4AFF', dark: '#9C86FF' },
  teal: { light: '#0E8F8C', dark: '#3FC9C5' },
  amber: { light: '#B87503', dark: '#F5B13C' },
  rose: { light: '#C2336B', dark: '#F27BA6' },
  sky: { light: '#1A6FB5', dark: '#5CB6F0' },
  lime: { light: '#4F8A10', dark: '#93D14E' },
};

export function tokenColor(token: ColorToken, scheme: 'light' | 'dark'): string {
  return tokenColors[token][scheme];
}

/** Tinted background for a chip/row in the given scheme. */
export function tokenSoft(token: ColorToken, scheme: 'light' | 'dark'): string {
  return scheme === 'light' ? `${tokenColors[token].light}1F` : `${tokenColors[token].dark}2E`;
}
