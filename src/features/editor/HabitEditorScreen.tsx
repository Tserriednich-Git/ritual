import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { StackScreenProps } from '../../app/navigation/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import {
  MAX_HABIT_DESCRIPTION,
  MAX_HABIT_NAME,
  type Frequency,
  type HabitDraft,
} from '../../domain/types';
import { validateHabit, duplicateNameCheck, type FieldError } from '../../domain/validation';
import {
  areNotificationsEnabled,
  requestNotificationPermission,
} from '../../notifications/reminders';
import { useRitualStore } from '../../store/useRitualStore';
import { spacing, useTheme } from '../../theme/theme';
import { FrequencyPicker } from './FrequencyPicker';
import { TimeField } from './TimeField';
import { ColorPicker, IconPicker } from './pickers';

type Props = StackScreenProps<'HabitEditor'>;

const BLANK: HabitDraft = {
  name: '',
  description: '',
  color: 'violet',
  icon: '✅',
  frequency: { kind: 'every_day' },
  reminderTime: null,
};

export function HabitEditorScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const habitId = route.params?.habitId;
  const existing = useRitualStore(
    (state) => state.habits.find((habit) => habit.id === habitId) ?? null,
  );
  const habits = useRitualStore((state) => state.habits);
  const createHabit = useRitualStore((state) => state.createHabit);
  const saveHabit = useRitualStore((state) => state.saveHabit);

  const [draft, setDraft] = useState<HabitDraft>(() =>
    existing
      ? {
          name: existing.name,
          description: existing.description,
          color: existing.color,
          icon: existing.icon,
          frequency: existing.frequency,
          reminderTime: existing.reminderTime,
        }
      : BLANK,
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [permission, setPermission] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit habit' : 'New habit' });
    void areNotificationsEnabled().then(setPermission);
  }, [navigation, existing]);

  const patch = useCallback(
    (next: Partial<HabitDraft>) => setDraft((current) => ({ ...current, ...next })),
    [],
  );

  const result = useMemo(() => validateHabit(draft), [draft]);
  const clash = useMemo(
    () =>
      duplicateNameCheck(
        habits
          .filter((habit) => habit.id !== habitId && habit.archivedAt === null)
          .map((habit) => habit.name),
        draft.name,
      ),
    [habits, draft.name, habitId],
  );

  const errors: FieldError[] = result.ok
    ? clash
      ? [{ field: 'name', message: clash }]
      : []
    : result.errors;

  const errorFor = (field: FieldError['field']) =>
    errors.find((error) => error.field === field)?.message;

  const submit = async () => {
    setTouched(true);
    setFailure(null);
    if (!result.ok || clash) return;
    setSaving(true);
    try {
      if (existing) {
        await saveHabit({ ...existing, ...result.draft });
      } else {
        await createHabit(result.draft);
      }
      navigation.goBack();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Could not save this habit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.stack}>
          <Card style={styles.column}>
            <Label text="Name" />
            <TextInput
              value={draft.name}
              onChangeText={(text) => patch({ name: text.slice(0, MAX_HABIT_NAME) })}
              placeholder="Read 10 pages"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Habit name"
              maxLength={MAX_HABIT_NAME}
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceAlt,
                },
              ]}
            />
            <Footer
              text={`${draft.name.length}/${MAX_HABIT_NAME}`}
              error={touched ? errorFor('name') : undefined}
            />

            <Label text="Why (optional)" />
            <TextInput
              value={draft.description}
              onChangeText={(text) => patch({ description: text.slice(0, MAX_HABIT_DESCRIPTION) })}
              placeholder="Keeps me honest"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Habit note"
              maxLength={MAX_HABIT_DESCRIPTION}
              multiline
              style={[
                styles.input,
                styles.multiline,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceAlt,
                },
              ]}
            />
            <Footer
              text={`${draft.description.length}/${MAX_HABIT_DESCRIPTION}`}
              error={touched ? errorFor('description') : undefined}
            />
          </Card>

          <Card style={styles.column}>
            <Label text="Icon" />
            <IconPicker value={draft.icon} onChange={(icon) => patch({ icon })} />
            <Label text="Colour" />
            <ColorPicker
              value={draft.color}
              onChange={(color) => patch({ color })}
              scheme={theme.scheme}
            />
          </Card>

          <Card style={styles.column}>
            <Label text="How often" />
            <FrequencyPicker
              value={draft.frequency}
              onChange={(frequency: Frequency) => patch({ frequency })}
            />
            {touched ? <Footer error={errorFor('frequency')} /> : null}
          </Card>

          <Card style={styles.column}>
            <TimeField
              value={draft.reminderTime}
              onChange={(reminderTime) => patch({ reminderTime })}
              permissionGranted={permission}
              onRequestPermission={() => void requestNotificationPermission().then(setPermission)}
            />
          </Card>

          {failure ? (
            <Text variant="caption" tone="danger">
              {failure}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => navigation.goBack()}
              disabled={saving}
            />
            <Button
              label={existing ? 'Save changes' : 'Create habit'}
              onPress={() => void submit()}
              loading={saving}
              disabled={touched && errors.length > 0}
              fullWidth
            />
          </View>

          <Text variant="caption" tone="muted">
            Nothing you type leaves this device. Ritual has no server and no analytics.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text variant="label" tone="muted" accessibilityRole="label">
      {text.toUpperCase()}
    </Text>
  );
}

function Footer({ text, error }: { text?: string; error?: string }) {
  if (error) {
    return (
      <Text variant="caption" tone="danger" accessibilityRole="alert">
        {error}
      </Text>
    );
  }
  if (!text) return null;
  return (
    <Text variant="caption" tone="muted">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  stack: { gap: spacing.lg },
  column: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    fontSize: 16,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
});
