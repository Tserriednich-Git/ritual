import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME } from '../../db/schema';
import { runMigrations } from '../../db/migrations';
import { seedOnFirstRun } from '../../db/seed';
import { installNotificationHandler } from '../../notifications/reminders';
import { todayISO } from '../../domain/date';
import { useRitualStore } from '../../store/useRitualStore';
import { useTheme } from '../../theme/theme';

/**
 * Opens the database, upgrades the schema and seeds first-run content before
 * anything can read from it. `SQLiteProvider` holds the single connection for
 * the lifetime of the app.
 */
async function prepareDatabase(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  await seedOnFirstRun(db);
}

function LoadingView() {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}

function DataBootstrap({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const status = useRitualStore((state) => state.status);
  const bootstrap = useRitualStore((state) => state.bootstrap);
  const refresh = useRitualStore((state) => state.refresh);

  useEffect(() => {
    installNotificationHandler();
    void bootstrap(db);
  }, [db, bootstrap]);

  // The Today list is keyed on the local calendar day, so crossing midnight has
  // to roll the list over without a restart.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const state = useRitualStore.getState();
      if (state.today !== todayISO()) void state.refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  if (status === 'idle' || status === 'loading') return <LoadingView />;
  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={prepareDatabase}>
        <DataBootstrap>{children}</DataBootstrap>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
