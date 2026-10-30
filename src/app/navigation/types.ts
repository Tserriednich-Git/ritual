import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabsParamList = {
  Today: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  HabitEditor: { habitId?: string } | undefined;
  HabitDetail: { habitId: string };
};

/**
 * Tab screens sit inside the stack, so they receive both sets of props: tab
 * params for themselves and stack params for `navigate('HabitEditor')`.
 */
export type TabScreenProps<T extends keyof TabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type StackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  // Gives useNavigation() typed route names without importing them everywhere.
  namespace ReactNavigation {
    // React Navigation merges its container typing into this interface, so an
    // empty body that extends the param list is the documented shape.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
