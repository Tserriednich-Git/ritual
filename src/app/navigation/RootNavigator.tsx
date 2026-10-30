import React from 'react';
import { Platform, Text as RNText } from 'react-native';
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HabitDetailScreen } from '../../features/detail/HabitDetailScreen';
import { HabitEditorScreen } from '../../features/editor/HabitEditorScreen';
import { ProgressScreen } from '../../features/progress/ProgressScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { TodayScreen } from '../../features/today/TodayScreen';
import { useRitualStore } from '../../store/useRitualStore';
import { useTheme } from '../../theme/theme';
import type { RootStackParamList, TabsParamList } from './types';

const Tabs = createBottomTabNavigator<TabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_GLYPHS: Record<keyof TabsParamList, string> = {
  Today: '◎',
  Progress: '▤',
  Settings: '⚙',
};

function TabNavigator() {
  const preference = useRitualStore((state) => state.theme);
  const theme = useTheme(preference);
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <RNText style={{ color, fontSize: size + 8 }}>{TAB_GLYPHS[route.name] ?? '•'}</RNText>
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingTop: Platform.OS === 'ios' ? 6 : 2,
        },
      })}
    >
      <Tabs.Screen name="Today" component={TodayScreen} />
      <Tabs.Screen name="Progress" component={ProgressScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

/**
 * One stack wrapping the tab screen. Each screen draws its own title block, so
 * stack headers are only used for the pushed routes.
 */
export function RootNavigator() {
  const preference = useRitualStore((state) => state.theme);
  const theme = useTheme(preference);
  const navBase = theme.scheme === 'dark' ? NavDarkTheme : NavLightTheme;

  const navigationTheme = {
    ...navBase,
    colors: {
      ...navBase.colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="HabitEditor"
          component={HabitEditorScreen}
          options={{ title: 'New habit', headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="HabitDetail"
          component={HabitDetailScreen}
          options={{ title: 'Habit' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
