import { FakeAuthClient } from '@/auth/testing/fake-auth-client';
import { createAuthStore } from '@/stores/auth-store';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('auth-store', () => {
  describe('inscription avec confirmation email', () => {
    let fake: FakeAuthClient;
    let store: ReturnType<typeof createAuthStore>;

    beforeEach(() => {
      fake = new FakeAuthClient({ requireConfirmation: true });
      store = createAuthStore(() => fake);
      store.getState().init();
    });

    it('passe en attente de confirmation après inscription', async () => {
      await store.getState().signUp('a@b.co', 'motdepasse');
      expect(store.getState().status).toBe('awaitingConfirmation');
      expect(store.getState().pendingEmail).toBe('a@b.co');
      expect(store.getState().user).toBeNull();
    });

    it('bascule en connecté quand l’email est confirmé (lien reçu)', async () => {
      await store.getState().signUp('a@b.co', 'motdepasse');
      fake.confirmEmail('a@b.co');
      await flush();

      expect(store.getState().status).toBe('signedIn');
      expect(store.getState().user?.email).toBe('a@b.co');
      expect(store.getState().pendingEmail).toBeNull();
    });

    it('refuse un email déjà inscrit', async () => {
      await store.getState().signUp('a@b.co', 'motdepasse');
      await store.getState().signUp('a@b.co', 'autre');
      expect(store.getState().error).toMatch(/déjà utilisé/);
    });

    it('refuse la connexion tant que l’email n’est pas confirmé', async () => {
      await store.getState().signUp('a@b.co', 'motdepasse');
      await store.getState().signIn('a@b.co', 'motdepasse');
      expect(store.getState().error).toMatch(/non confirmé/);
      expect(store.getState().status).toBe('awaitingConfirmation');
    });
  });

  describe('sans confirmation (compte confirmé)', () => {
    let fake: FakeAuthClient;
    let store: ReturnType<typeof createAuthStore>;

    beforeEach(() => {
      fake = new FakeAuthClient({ requireConfirmation: false });
      store = createAuthStore(() => fake);
      store.getState().init();
    });

    it('inscription → connecté directement', async () => {
      await store.getState().signUp('a@b.co', 'motdepasse');
      expect(store.getState().status).toBe('signedIn');
      expect(store.getState().user?.email).toBe('a@b.co');
    });

    it('connexion : succès, mauvais mot de passe, déconnexion', async () => {
      await store.getState().signUp('a@b.co', 'motdepasse');
      await store.getState().signOut();
      expect(store.getState().status).toBe('signedOut');

      await store.getState().signIn('a@b.co', 'mauvais');
      expect(store.getState().error).toMatch(/invalides/);

      await store.getState().signIn('a@b.co', 'motdepasse');
      expect(store.getState().status).toBe('signedIn');
    });

    it('reset de mot de passe : envoi accepté', async () => {
      await expect(store.getState().requestPasswordReset('a@b.co')).resolves.toBe(true);
    });
  });

  it('restaure la session existante au démarrage', async () => {
    const fake = new FakeAuthClient({ requireConfirmation: false });
    // Un compte déjà connecté d'une session précédente.
    await fake.signUp('a@b.co', 'motdepasse');

    const store = createAuthStore(() => fake);
    store.getState().init();
    await flush();

    expect(store.getState().status).toBe('signedIn');
    expect(store.getState().user?.email).toBe('a@b.co');
  });

  it('clearError efface l’erreur', async () => {
    const fake = new FakeAuthClient({ requireConfirmation: false });
    const store = createAuthStore(() => fake);
    await store.getState().signIn('inconnu@b.co', 'x');
    expect(store.getState().error).not.toBeNull();
    store.getState().clearError();
    expect(store.getState().error).toBeNull();
  });
});
