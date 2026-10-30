import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type State = { error: Error | null };

/**
 * Last line of defence. A render crash should show something readable and tell
 * the user their data is still on disk, rather than a red box or a blank screen.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    // Deliberately no remote reporting: Ritual sends nothing anywhere.
    console.error('Unhandled render error', error);
  }

  override render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something broke</Text>
        <Text style={styles.body}>
          Your habits and check-ins are still stored on this device — reloading will not lose them.
        </Text>
        <Text style={styles.detail}>{this.state.error.message}</Text>
        <View style={styles.actions}>
          <Text style={styles.action} onPress={() => this.setState({ error: null })}>
            Try again
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: 'center', gap: 12, backgroundColor: '#0E1116' },
  title: { color: '#ECF1F6', fontSize: 22, fontWeight: '700' },
  body: { color: '#98A2AE', fontSize: 15, lineHeight: 22 },
  detail: { color: '#F0796A', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 16 },
  action: { color: '#9C86FF', fontSize: 16, fontWeight: '600', paddingVertical: 8 },
});
