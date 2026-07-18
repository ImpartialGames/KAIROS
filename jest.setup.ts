// Mocks d'environnement pour Jest (modules natifs sans implémentation en test).
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr' }],
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));

// En test, la persistance passe par l'adaptateur node:sqlite (src/db/testing) —
// toute ouverture de la base expo-sqlite est un bug de test, pas un fallback.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => {
    throw new Error('expo-sqlite indisponible sous Jest — injecter createTestDb()');
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock(
  'react-native-safe-area-context',
  () =>
    // Le mock officiel exporte l'objet via `export default` — interop CJS oblige à déballer.
    require('react-native-safe-area-context/jest/mock').default,
);
