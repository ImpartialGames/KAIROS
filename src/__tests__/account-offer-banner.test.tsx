// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { AccountOfferBanner } from '@/components/account/account-offer-banner';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => jest.clearAllMocks());

describe('AccountOfferBanner', () => {
  it('affiche l’offre et renvoie vers l’écran compte', () => {
    render(<AccountOfferBanner onDismiss={jest.fn()} />);

    expect(screen.getByText('Sauvegardez vos progrès')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Créer un compte'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/account', params: { mode: 'signUp' } });
  });

  it('peut être ignorée (non bloquante)', () => {
    const onDismiss = jest.fn();
    render(<AccountOfferBanner onDismiss={onDismiss} />);

    fireEvent.press(screen.getByLabelText('Plus tard'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
