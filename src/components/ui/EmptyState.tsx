import React from 'react';
import { View } from 'react-native';

import { spacing, useTheme } from '../../theme/theme';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  glyph?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ glyph = '🌱', title, message, actionLabel, onAction }: Props) {
  const theme = useTheme();
  return (
    <Card style={{ backgroundColor: theme.colors.surface, gap: spacing.md }}>
      <Text variant="display" style={{ textAlign: 'center' }} accessibilityElementsHidden>
        {glyph}
      </Text>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text tone="muted" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}
