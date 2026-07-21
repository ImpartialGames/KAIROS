import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';

import type { AuthClient, AuthEvent, AuthSession } from '@/auth/auth-client';

const toUser = (user: Pick<User, 'id' | 'email'>) => ({
  id: user.id,
  email: user.email ?? null,
});

const toSession = (session: Session | null): AuthSession | null =>
  session ? { user: toUser(session.user) } : null;

const toEvent = (event: AuthChangeEvent, session: Session | null): AuthEvent => {
  if (event === 'PASSWORD_RECOVERY') return 'passwordRecovery';
  return session ? 'signedIn' : 'signedOut';
};

/**
 * Adaptateur AuthClient au-dessus de Supabase Auth. `redirectTo` est le lien
 * profond (kairos://…) vers lequel Supabase renvoie après un clic sur un email
 * de confirmation ou de réinitialisation.
 */
export function createSupabaseAuthClient(
  supabase: SupabaseClient,
  options: { redirectTo?: string } = {},
): AuthClient {
  const auth = supabase.auth;

  return {
    async getSession() {
      const { data } = await auth.getSession();
      return toSession(data.session);
    },

    onAuthStateChange(handler) {
      const { data } = auth.onAuthStateChange((event, session) => {
        handler(toSession(session), toEvent(event, session));
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp(email, password) {
      const { data, error } = await auth.signUp({
        email,
        password,
        options: { emailRedirectTo: options.redirectTo },
      });
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
        redirectTo: options.redirectTo,
      });
      return { errorMessage: error?.message ?? null };
    },

    async exchangeCodeForSession(code) {
      const { data, error } = await auth.exchangeCodeForSession(code);
      return {
        user: data.user ? toUser(data.user) : null,
        session: toSession(data.session),
        errorMessage: error?.message ?? null,
      };
    },

    async updatePassword(newPassword) {
      const { error } = await auth.updateUser({ password: newPassword });
      return { errorMessage: error?.message ?? null };
    },
  };
}
