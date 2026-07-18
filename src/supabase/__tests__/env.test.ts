import { MISSING_SUPABASE_ENV_ERROR, readSupabaseEnv, validateSupabaseEnv } from '@/supabase/env';

describe('validateSupabaseEnv', () => {
  it('retourne la config quand url et clé sont présentes', () => {
    expect(validateSupabaseEnv('https://x.supabase.co', 'clef')).toEqual({
      url: 'https://x.supabase.co',
      publishableKey: 'clef',
    });
  });

  it.each([
    ['url manquante', undefined, 'clef'],
    ['clé manquante', 'https://x.supabase.co', undefined],
    ['les deux manquantes', undefined, undefined],
    ['url vide (pas de fallback)', '', 'clef'],
    ['clé vide (pas de fallback)', 'https://x.supabase.co', ''],
  ])('lève sans fallback : %s', (_label, url, key) => {
    expect(() => validateSupabaseEnv(url, key)).toThrow(MISSING_SUPABASE_ENV_ERROR);
  });
});

describe('readSupabaseEnv', () => {
  it('lève quand la configuration env est absente (aucune clé en test)', () => {
    expect(() => readSupabaseEnv()).toThrow(MISSING_SUPABASE_ENV_ERROR);
  });
});
