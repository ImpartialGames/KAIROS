import { newId, now } from '@/db/runtime';

/** Dépendances injectables des repositories — horloge et générateur d'ids. */
export interface RepositoryDeps {
  newId(): string;
  now(): number;
}

export const defaultRepositoryDeps: RepositoryDeps = { newId, now };
