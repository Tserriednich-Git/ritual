import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card, Chip } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { parseBackup } from '../../domain/backup';
import { applyBackup, exportCsvFile, exportJsonFile, previewExport } from '../../db/backup';
import { deleteHabit, listHabits } from '../../db/repositories/habitRepository';
import {
  requestNotificationPermission,
  sendTestReminder,
  syncReminders,
} from '../../notifications/reminders';
import { selectTodayRows } from '../../store/selectors';
import { selectArchivedHabits, useRitualStore } from '../../store/useRitualStore';
import type { ThemePreference } from '../../db/repositories/preferenceRepository';
import { spacing, useTheme } from '../../theme/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const habits = useRitualStore((state) => state.habits);
  const completions = useRitualStore((state) => state.completions);
  const today = useRitualStore((state) => state.today);
  const preference = useRitualStore((state) => state.theme);
  const setThemePreference = useRitualStore((state) => state.setTheme);
  const weekStartsOn = useRitualStore((state) => state.weekStartsOn);
  const setWeekStartsOn = useRitualStore((state) => state.setWeekStartsOn);
  const unarchive = useRitualStore((state) => state.unarchive);
  const refresh = useRitualStore((state) => state.refresh);

  const [notificationsOn, setNotificationsOn] = useState(true);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const rows = selectTodayRows({ habits, completions, today });
  const archived = selectArchivedHabits(habits);
  const previewHabit = rows[0]?.habit;
  const reminderCount = rows.filter((row) => row.habit.reminderTime !== null).length;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const runExport = async (kind: 'json' | 'csv') => {
    setBusy('export');
    setMessage(null);
    try {
      const file = kind === 'json' ? await exportJsonFile(db) : await exportCsvFile(db);
      await previewExport(file, `Export Ritual ${kind}`);
      setMessage(`Saved as ${file.name} inside the app’s Documents folder.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    const parsed = parseBackup(importText);
    if (!parsed.ok) {
      setMessage(`Import rejected: ${parsed.issues[0]?.message ?? 'invalid backup'}`);
      return;
    }
    setBusy('import');
    try {
      const applied = await applyBackup(db, parsed.backup, 'merge');
      await refresh();
      const skipped =
        parsed.backup.habits.length + parsed.backup.completions.length >
        applied.habits + applied.completions;
      setMessage(
        `Imported ${applied.habits} habits and ${applied.completions} check-ins${skipped ? ' (some rows already existed)' : '.'}`,
      );
      setImportText('');
      setShowImport(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setBusy(null);
    }
  };

  const eraseEverything = () => {
    Alert.alert(
      'Erase all Ritual data?',
      'This deletes every habit and check-in stored on this device. Export a backup first if you might want the history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase everything',
          style: 'destructive',
          onPress: async () => {
            for (const habit of await listHabits(db, { includeArchived: true })) {
              await deleteHabit(db, habit.id);
            }
            await refresh();
            setMessage('All local data erased.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.stack}>
          <Text variant="display" accessibilityRole="header">
            Settings
          </Text>

          <Card style={styles.column}>
            <Text variant="label" tone="muted">
              APPEARANCE
            </Text>
            <View style={styles.chips}>
              {THEME_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={preference === option.value}
                  onPress={() => void setThemePreference(option.value)}
                />
              ))}
            </View>
            <Text variant="label" tone="muted">
              WEEK STARTS ON
            </Text>
            <View style={styles.chips}>
              <Chip
                label="Monday"
                selected={weekStartsOn === 1}
                onPress={() => void setWeekStartsOn(1)}
              />
              <Chip
                label="Sunday"
                selected={weekStartsOn === 0}
                onPress={() => void setWeekStartsOn(0)}
              />
            </View>
          </Card>

          <Card style={styles.column}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="subtitle">Reminders</Text>
                <Text variant="caption" tone="muted">
                  {reminderCount > 0
                    ? `${reminderCount} habit${reminderCount === 1 ? '' : 's'} scheduled locally.`
                    : 'Set a time on a habit to schedule a nudge.'}
                </Text>
              </View>
              <Switch
                value={notificationsOn}
                accessibilityRole="switch"
                accessibilityLabel="Reminders"
                onValueChange={async (next) => {
                  if (!next) {
                    await syncReminders([]);
                    setNotificationsOn(false);
                    return;
                  }
                  const granted = await requestNotificationPermission();
                  setNotificationsOn(granted);
                  if (granted) await syncReminders(habits);
                }}
              />
            </View>
            {previewHabit ? (
              <Button
                label="Preview a reminder"
                variant="secondary"
                size="sm"
                onPress={() => void sendTestReminder(previewHabit)}
              />
            ) : null}
          </Card>

          <Card style={styles.column}>
            <Text variant="label" tone="muted">
              YOUR DATA STAYS HERE
            </Text>
            <Text variant="body">
              Ritual has no account, no server and no analytics. Everything is stored in a SQLite
              file inside the app’s private sandbox; uninstalling the app deletes it.
            </Text>
            <View style={styles.chips}>
              <Button
                label="Export JSON"
                variant="secondary"
                size="sm"
                loading={busy === 'export'}
                onPress={() => void runExport('json')}
              />
              <Button
                label="Export CSV"
                variant="secondary"
                size="sm"
                onPress={() => void runExport('csv')}
              />
              <Button
                label={showImport ? 'Close import' : 'Import JSON'}
                variant="ghost"
                size="sm"
                onPress={() => setShowImport((open) => !open)}
              />
            </View>
            {showImport ? (
              <View style={styles.column}>
                <TextInput
                  value={importText}
                  onChangeText={setImportText}
                  multiline
                  placeholder="Paste the contents of a ritual-backup-*.json file"
                  placeholderTextColor={theme.colors.textMuted}
                  accessibilityLabel="Backup JSON"
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surfaceAlt,
                    },
                  ]}
                />
                <Button
                  label="Merge into this device"
                  variant="primary"
                  size="sm"
                  loading={busy === 'import'}
                  disabled={importText.trim().length === 0}
                  onPress={() => void runImport()}
                />
              </View>
            ) : null}
            {message ? (
              <Text variant="caption" tone="accent">
                {message}
              </Text>
            ) : null}
          </Card>

          {archived.length > 0 ? (
            <Card style={styles.column}>
              <Text variant="label" tone="muted">
                ARCHIVED ({archived.length})
              </Text>
              {archived.map((habit) => (
                <View key={habit.id} style={styles.rowBetween}>
                  <Text style={{ flex: 1 }} numberOfLines={1}>
                    {habit.icon} {habit.name}
                  </Text>
                  <Button
                    label="Restore"
                    variant="ghost"
                    size="sm"
                    onPress={() => void unarchive(habit.id)}
                  />
                </View>
              ))}
            </Card>
          ) : null}

          <Card style={styles.column}>
            <Text variant="label" tone="muted">
              ABOUT
            </Text>
            <Text variant="caption" tone="muted">
              Ritual {appVersion} · build {Constants.expoConfig?.slug ?? 'ritual'}
            </Text>
            <View style={styles.chips}>
              <Button
                label="Privacy policy"
                variant="ghost"
                size="sm"
                onPress={() => void Linking.openURL('https://example.com/ritual/privacy')}
              />
              <Button
                label="Terms"
                variant="ghost"
                size="sm"
                onPress={() => void Linking.openURL('https://example.com/ritual/terms')}
              />
            </View>
            <Text variant="caption" tone="muted">
              Ritual is a wellbeing tool, not medical or mental-health advice.
            </Text>
          </Card>

          <Card style={[styles.column, { borderColor: theme.colors.danger }]}>
            <Text variant="label" tone="danger">
              DANGER ZONE
            </Text>
            <Button
              label="Erase all local data"
              variant="danger"
              size="sm"
              onPress={eraseEverything}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  stack: { gap: spacing.lg },
  column: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: 14,
  },
});
