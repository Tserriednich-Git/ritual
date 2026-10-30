import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ErrorBoundary } from './src/app/ErrorBoundary';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { AppProviders } from './src/app/providers/AppProviders';
import { useRitualStore } from './src/store/useRitualStore';
import { buildTheme } from './src/theme/theme';

export default function App() {
  const preference = useRitualStore((state) => state.theme);
  const theme = buildTheme(preference, useColorScheme());

  return (
    <ErrorBoundary>
      <AppProviders>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </AppProviders>
    </ErrorBoundary>
  );
}
