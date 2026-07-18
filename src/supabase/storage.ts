import * as SecureStore from 'expo-secure-store';

/**
 * Stockage de la session Supabase adossé au trousseau sécurisé de l'appareil.
 * Les clés Supabase peuvent contenir des caractères refusés par SecureStore →
 * on les assainit.
 *
 * NOTE (à durcir en 1.1 si besoin) : SecureStore a une limite de taille sur
 * Android ; si un token la dépasse, basculer vers un stockage chiffré + volume
 * plus large (clé AES dans SecureStore, valeur chiffrée en AsyncStorage).
 */
const sanitizeKey = (key: string): string => key.replace(/[^a-zA-Z0-9._-]/g, '_');

export const secureStorage = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(sanitizeKey(key)),
  setItem: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(sanitizeKey(key), value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(sanitizeKey(key)),
};
