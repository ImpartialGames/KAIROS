// Mocks d'environnement pour Jest (modules natifs sans implémentation en test).
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr' }],
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));

jest.mock(
  'react-native-safe-area-context',
  () =>
    // Le mock officiel exporte l'objet via `export default` — interop CJS oblige à déballer.
    require('react-native-safe-area-context/jest/mock').default,
);
