import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import type { AuthClient, AuthSession } from '@/auth/auth-client';

const toUser = (user: Pick<User, 'id' | 'email'>) => ({
  id: user.id,
  email: user.email ?? null,
});

const toSession = (session: Session | null): AuthSession | null =>
  session ? { user: toUser(session.user) } : null;

/**
 * Adaptateur AuthClient au-dessus de Supabase Auth. La cible de redirection du
 * reset de mot de passe (deep link) est fournie par l'appelant (écrans, 1.1b).
 */
export function createSupabaseAuthClient(
  supabase: SupabaseClient,
  options: { passwordResetRedirectTo?: string } = {},
): AuthClient {
  const auth = supabase.auth;

  return {
    async getSession() {
      const { data } = await auth.getSession();
      return toSession(data.session);
    },

    onAuthStateChange(handler) {
      const { data } = auth.onAuthStateChange((_event, session) => {
        handler(toSession(session));
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp(email, password) {
      const { data, error } = await auth.signUp({ email, password });
      return {
        user: data.user ? toUser(data.user) : null,
        session: toSession(data.session),
        errorMessage: error?.message ?? null,
      };
    },

    async signIn(email, password) {
      const { data, error } = await auth.signInWithPassword({ email, password });
      return {
        user: data.user ? toUser(data.user) : null,
        session: toSession(data.session),
        errorMessage: error?.message ?? null,
      };
    },

    async signOut() {
      const { error } = await auth.signOut();
      return { errorMessage: error?.message ?? null };
    },

    async requestPasswordReset(email) {
      const { error } = await auth.resetPasswordForEmail(email, {
        redirectTo: options.passwordResetRedirectTo,
      });
      return { errorMessage: error?.message ?? null };
    },
  };
}
