import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { readSupabaseEnv } from '@/supabase/env';
import { secureStorage } from '@/supabase/storage';

let client: SupabaseClient | null = null;

/**
 * Client Supabase unique (singleton), initialisé à la demande depuis l'env.
 * Session persistée dans le trousseau sécurisé, rafraîchissement auto des
 * tokens ; pas de détection d'URL (pas d'OAuth web ici).
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, publishableKey } = readSupabaseEnv();
    client = createClient(url, publishableKey, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
