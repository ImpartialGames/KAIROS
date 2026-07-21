import '@/i18n';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import AccountScreen from '@/app/account';
import IndexScreen from '@/app/index';

/**
 * Reproduit la navigation réelle : l'accueil pousse /account via router.push.
 * Teste le mécanisme (Stack racine + push), pas un composant isolé.
 */
describe('navigation vers le compte', () => {
  it('l’accès compte depuis l’accueil ouvre l’écran compte', async () => {
    renderRouter(
      {
        index: IndexScreen,
        account: AccountScreen,
        _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      },
      { initialUrl: '/' },
    );

    // Le bouton d'accès compte (pastille en haut à droite de l'accueil).
    fireEvent.press(screen.getByLabelText('Compte'));

    // L'écran compte doit être monté (formulaire de connexion/inscription).
    await waitFor(() => expect(screen.getByText('Se connecter')).toBeOnTheScreen());
  });

  it('ouvre directement le formulaire d’inscription avec ?mode=signUp', async () => {
    renderRouter(
      {
        index: IndexScreen,
        account: AccountScreen,
        _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      },
      { initialUrl: '/account?mode=signUp' },
    );

    await waitFor(() => expect(screen.getByText('Créer un compte')).toBeOnTheScreen());
  });
});
