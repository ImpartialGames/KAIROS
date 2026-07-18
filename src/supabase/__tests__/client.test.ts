import { createClient } from '@supabase/supabase-js';

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ id: 'supabase-client' })),
}));
jest.mock('@/supabase/storage', () => ({
  secureStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

let mockEnvThrow = false;
jest.mock('@/supabase/env', () => ({
  readSupabaseEnv: () => {
    if (mockEnvThrow) {
      throw new Error('Configuration Supabase manquante');
    }
    return { url: 'https://x.supabase.co', publishableKey: 'clef' };
  },
}));

// eslint-disable-next-line import/first -- doit suivre les jest.mock pour que le mock s'applique
import { getSupabase } from '@/supabase/client';

// Le mock est défini dans la factory (pas de référence externe en zone morte) ;
// on le récupère via l'import mocké.
const mockCreateClient = createClient as unknown as jest.Mock;

describe('getSupabase', () => {
  it('propage l’erreur de config env sans créer de client', () => {
    mockEnvThrow = true;
    expect(() => getSupabase()).toThrow('Configuration Supabase manquante');
    expect(mockCreateClient).not.toHaveBeenCalled();
    mockEnvThrow = false;
  });

  it('crée un client singleton, persistance sécurisée + refresh auto', () => {
    const first = getSupabase();
    const second = getSupabase();

    expect(first).toBe(second);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);

    const [url, key, options] = mockCreateClient.mock.calls[0] as [
      string,
      string,
      { auth: Record<string, unknown> },
    ];
    expect(url).toBe('https://x.supabase.co');
    expect(key).toBe('clef');
    expect(options.auth).toMatchObject({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });
  });
});
