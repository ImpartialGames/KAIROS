import * as Linking from 'expo-linking';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { AuthClient, AuthUser } from '@/auth/auth-client';
import { parseAuthLink } from '@/auth/deep-link';
import { createSupabaseAuthClient } from '@/auth/supabase-auth-client';
import { getSupabase } from '@/supabase/client';

export type AuthStatus =
  | 'loading'
  | 'signedOut'
  | 'awaitingConfirmation'
  | 'signedIn'
  | 'recovering';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Email en attente de confirmation (après inscription). */
  pendingEmail: string | null;
  error: string | null;
  /** S'abonne aux changements de session + charge la session courante. Retourne le désabonnement. */
  init(): () => void;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Déclenche l'email de reset ; retourne true si l'envoi n'a pas échoué. */
  requestPasswordReset(email: string): Promise<boolean>;
  /** Traite un lien profond d'auth (confirmation / reset) : échange le code. */
  handleAuthDeepLink(url: string): Promise<void>;
  /** Définit un nouveau mot de passe (fin du flux de récupération). */
  updatePassword(newPassword: string): Promise<boolean>;
  clearError(): void;
}

export function createAuthStore(getAuthClient: () => AuthClient) {
  // Client résolu une seule fois (évite d'appeler getSupabase à l'import).
  let cached: AuthClient | null = null;
  const auth = () => (cached ??= getAuthClient());

  return createStore<AuthState>()((set, get) => ({
    status: 'loading',
    user: null,
    pendingEmail: null,
    error: null,

    init() {
      const client = auth();
      const unsubscribe = client.onAuthStateChange((session, event) => {
        if (event === 'passwordRecovery' && session) {
          set({ status: 'recovering', user: session.user, pendingEmail: null, error: null });
        } else if (session) {
          set({ status: 'signedIn', user: session.user, pendingEmail: null, error: null });
        } else if (get().status !== 'awaitingConfirmation') {
          set({ status: 'signedOut', user: null });
        }
      });
      void client.getSession().then((session) => {
        // Ne pas écraser un état déjà fixé par un événement concurrent.
        if (get().status !== 'loading') {
          return;
        }
        set(
          session
            ? { status: 'signedIn', user: session.user }
            : { status: 'signedOut', user: null },
        );
      });
      return unsubscribe;
    },

    async signUp(email, password) {
      set({ error: null });
      const outcome = await auth().signUp(email, password);
      if (outcome.errorMessage) {
        set({ error: outcome.errorMessage });
        return;
      }
      if (outcome.session) {
        set({ status: 'signedIn', user: outcome.session.user, pendingEmail: null });
      } else {
        set({ status: 'awaitingConfirmation', pendingEmail: email });
      }
    },

    async signIn(email, password) {
      set({ error: null });
      const outcome = await auth().signIn(email, password);
      if (outcome.errorMessage) {
        set({ error: outcome.errorMessage });
        return;
      }
      if (outcome.session) {
        set({ status: 'signedIn', user: outcome.session.user, pendingEmail: null });
      }
    },

    async signOut() {
      const { errorMessage } = await auth().signOut();
      if (errorMessage) {
        set({ error: errorMessage });
        return;
      }
      set({ status: 'signedOut', user: null, pendingEmail: null });
    },

    async requestPasswordReset(email) {
      set({ error: null });
      const { errorMessage } = await auth().requestPasswordReset(email);
      if (errorMessage) {
        set({ error: errorMessage });
        return false;
      }
      return true;
    },

    async handleAuthDeepLink(url) {
      const { code, errorMessage } = parseAuthLink(url);
      if (errorMessage) {
        set({ error: errorMessage });
        return;
      }
      if (!code) {
        return;
      }
      // L'échange déclenche onAuthStateChange (→ signedIn ou recovering).
      const outcome = await auth().exchangeCodeForSession(code);
      if (outcome.errorMessage) {
        set({ error: outcome.errorMessage });
      }
    },

    async updatePassword(newPassword) {
      set({ error: null });
      const { errorMessage } = await auth().updatePassword(newPassword);
      if (errorMessage) {
        set({ error: errorMessage });
        return false;
      }
      set({ status: 'signedIn' });
      return true;
    },

    clearError() {
      set({ error: null });
    },
  }));
}

/** Store d'auth unique (production) — les tests créent le leur avec un faux client.
 *  Redirection deep-link résolue à la demande (kairos://) pour les emails Supabase. */
export const authStore = createAuthStore(() =>
  createSupabaseAuthClient(getSupabase(), { redirectTo: Linking.createURL('') }),
);

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}
