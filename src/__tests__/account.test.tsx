// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AccountScreen from '@/app/account';
import { authStore, type AuthState } from '@/stores/auth-store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

const setAuth = (over: Partial<AuthState>) => {
  authStore.setState({
    status: 'signedOut',
    user: null,
    pendingEmail: null,
    error: null,
    signIn: jest.fn(async () => undefined),
    signUp: jest.fn(async () => undefined),
    signOut: jest.fn(async () => undefined),
    requestPasswordReset: jest.fn(async () => true),
    updatePassword: jest.fn(async () => true),
    ...over,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setAuth({});
});

describe('AccountScreen', () => {
  it('déconnecté : formulaire de connexion, bascule vers inscription, mot de passe oublié', () => {
    render(<AccountScreen />);

    expect(screen.getByLabelText('Adresse email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mot de passe')).toBeOnTheScreen();
    expect(screen.getByText('Se connecter')).toBeOnTheScreen();
    expect(screen.getByText(/Pas encore de compte/)).toBeOnTheScreen();
    expect(screen.getByText('Mot de passe oublié ?')).toBeOnTheScreen();
  });

  it('connexion : soumet email + mot de passe au store', async () => {
    const signIn = jest.fn(async () => undefined);
    setAuth({ signIn });
    render(<AccountScreen />);

    fireEvent.changeText(screen.getByLabelText('Adresse email'), 'a@b.co');
    fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'motdepasse');
    fireEvent.press(screen.getByText('Se connecter'));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('a@b.co', 'motdepasse'));
  });

  it('inscription : bascule puis soumet au store', async () => {
    const signUp = jest.fn(async () => undefined);
    setAuth({ signUp });
    render(<AccountScreen />);

    fireEvent.press(screen.getByText(/Pas encore de compte/));
    fireEvent.changeText(screen.getByLabelText('Adresse email'), 'a@b.co');
    fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'motdepasse');
    fireEvent.press(screen.getByText('Créer un compte'));

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('a@b.co', 'motdepasse'));
  });

  it('reset : envoie le lien et affiche la confirmation', async () => {
    const requestPasswordReset = jest.fn(async () => true);
    setAuth({ requestPasswordReset });
    render(<AccountScreen />);

    fireEvent.press(screen.getByText('Mot de passe oublié ?'));
    fireEvent.changeText(screen.getByLabelText('Adresse email'), 'a@b.co');
    fireEvent.press(screen.getByText('Envoyer le lien'));

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('a@b.co'));
    expect(await screen.findByText(/lien de réinitialisation/)).toBeOnTheScreen();
  });

  it('en attente de confirmation : message avec l’email', () => {
    setAuth({ status: 'awaitingConfirmation', pendingEmail: 'a@b.co' });
    render(<AccountScreen />);

    expect(screen.getByText('Vérifiez vos emails')).toBeOnTheScreen();
    expect(screen.getByText(/a@b\.co/)).toBeOnTheScreen();
  });

  it('récupération : saisie d’un nouveau mot de passe et enregistrement', async () => {
    const updatePassword = jest.fn(async () => true);
    setAuth({ status: 'recovering', updatePassword });
    render(<AccountScreen />);

    expect(screen.getByText('Choisir un nouveau mot de passe')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Nouveau mot de passe'), 'nouveau-secret');
    fireEvent.press(screen.getByText('Enregistrer le mot de passe'));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('nouveau-secret'));
  });

  it('connecté : email, message de synchro, déconnexion', () => {
    const signOut = jest.fn(async () => undefined);
    setAuth({
      status: 'signedIn',
      user: { id: 'auth-1', email: 'a@b.co' },
      signOut,
    });
    render(<AccountScreen />);

    expect(screen.getByText('Connecté')).toBeOnTheScreen();
    expect(screen.getByText('a@b.co')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Se déconnecter'));
    expect(signOut).toHaveBeenCalled();
  });
});
