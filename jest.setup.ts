// Notifications and SQLite reach into native modules that do not exist under Jest.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('scheduled-id'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
    CALENDAR: 'calendar',
  },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  IosAuthorizationStatus: { DETERMINED: 2, PROVISIONAL: 3, FULL: 4 },
}));

jest.mock('expo-device', () => ({
  isDevice: false,
  osName: 'TestOS',
}));
