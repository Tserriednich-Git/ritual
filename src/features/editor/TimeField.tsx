import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { formatTime, parseTime } from '../../domain/date';
import { spacing } from '../../theme/theme';
import { Text } from '../../components/ui/Text';
import { StepperButton } from '../../components/ui/StepperButton';

type Props = {
  /** 'HH:MM' or null when reminders are off for this habit. */
  value: string | null;
  onChange: (next: string | null) => void;
  permissionGranted: boolean;
  onRequestPermission: () => void;
};

const MINUTE_STEP = 15;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Deliberately not a native datetime picker: adding a dependency for a
 * fifteen-minute granularity control is not worth the extra surface area.
 */
export function TimeField({ value, onChange, permissionGranted, onRequestPermission }: Props) {
  const enabled = value !== null;
  const time = parseTime(value ?? '') ?? { hour: 8, minute: 0 };

  const shift = (hours: number, minutes: number) => {
    const total = time.hour * 60 + time.minute + hours * 60 + minutes;
    const wrapped = ((total % 1440) + 1440) % 1440;
    onChange(`${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`);
  };

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subtitle">Daily reminder</Text>
          <Text variant="caption" tone="muted">
            {enabled
              ? `Notifies you at ${formatTime(time)} — local notifications only.`
              : 'No reminder scheduled.'}
          </Text>
        </View>
        <Switch
          value={enabled}
          accessibilityRole="switch"
          accessibilityLabel="Daily reminder"
          onValueChange={(next) => onChange(next ? `${pad(time.hour)}:${pad(time.minute)}` : null)}
        />
      </View>

      {enabled ? (
        <>
          <View style={styles.stepper}>
            <StepperButton label="−" onPress={() => shift(-1, 0)} />
            <Text variant="title">{formatTime(time)}</Text>
            <StepperButton label="+" onPress={() => shift(1, 0)} />
            <View style={{ width: spacing.md }} />
            <StepperButton label={`−${MINUTE_STEP}m`} onPress={() => shift(0, -MINUTE_STEP)} />
            <StepperButton label={`+${MINUTE_STEP}m`} onPress={() => shift(0, MINUTE_STEP)} />
          </View>
          {!permissionGranted ? (
            <View style={styles.row}>
              <Text variant="caption" tone="danger" style={{ flex: 1 }}>
                Notifications are blocked in system settings, so this reminder will not fire.
              </Text>
              <Text variant="label" tone="accent" onPress={onRequestPermission}>
                Ask again
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
