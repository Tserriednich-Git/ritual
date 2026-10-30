module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  // Screens are covered by manual device testing; gating on them would only
  // inflate the number with JSX nobody asserts on.
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/store/selectors.ts',
    'src/db/mapping.ts',
    'src/utils/id.ts',
    'src/components/HabitRow.tsx',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  clearMocks: true,
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
};
