/**
 * Message d'une erreur SQL quel que soit le moteur : les erreurs natives
 * (node:sqlite en test, binding expo-sqlite) ne satisfont pas toujours
 * `instanceof Error` selon le realm — on lit `message` défensivement.
 */
export function sqlErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
