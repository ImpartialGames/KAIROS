import * as Crypto from 'expo-crypto';

/** Générateur d'identifiants et horloge — injectables dans les repositories pour les tests. */
export const newId = (): string => Crypto.randomUUID();

export const now = (): number => Date.now();
