/**
 * Configuration Supabase — lue UNIQUEMENT depuis l'environnement, jamais de
 * valeur en dur ni de fallback (CLAUDE.md). L'absence de configuration est une
 * erreur explicite, pas un démarrage silencieux avec des clés vides.
 */
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export const MISSING_SUPABASE_ENV_ERROR =
  'Configuration Supabase manquante : renseignez EXPO_PUBLIC_SUPABASE_URL et ' +
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local';

/** Valide une paire (url, clé). Pur et testable, séparé de la lecture d'env. */
export function validateSupabaseEnv(
  url: string | undefined,
  publishableKey: string | undefined,
): SupabaseEnv {
  if (!url || !publishableKey) {
    throw new Error(MISSING_SUPABASE_ENV_ERROR);
  }
  return { url, publishableKey };
}

/**
 * Lit et valide la config depuis l'env. Les `EXPO_PUBLIC_*` sont inlinées par
 * Expo au build (accès en notation pointée volontaire).
 */
export function readSupabaseEnv(): SupabaseEnv {
  return validateSupabaseEnv(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
