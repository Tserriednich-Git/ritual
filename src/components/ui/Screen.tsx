import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../../theme/theme';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Rendered after the list, above the tab bar. */
  footer?: React.ReactNode;
  rightHeader?: React.ReactNode;
  scrollable?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Every screen shares this shell: safe area, header, scroll behaviour and the
 * `accessibilityHeading` announcement that screen readers need on navigation.
 */
export function Screen({
  title,
  subtitle,
  children,
  footer,
  rightHeader,
  scrollable = true,
  contentStyle,
}: Props) {
  const theme = useTheme();
  const body = (
    <View style={[styles.body, contentStyle]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="label" tone="muted" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightHeader ? <View style={styles.right}>{rightHeader}</View> : null}
      </View>
      {children}
      {footer}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  body: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  subtitle: { letterSpacing: 0.2 },
  right: { alignItems: 'flex-end' },
});
