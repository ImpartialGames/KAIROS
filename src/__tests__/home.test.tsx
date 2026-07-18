// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import type { User } from '@/schemas/user';
import { appStore } from '@/stores/app-store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const guest: User = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  isGuest: true,
  precautionsAcknowledgedAt: null,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStore.setState({ status: 'ready', user: guest, repositories: null, error: null });
  });

  it('rend le nom produit et l’aperçu typographique via i18n', () => {
    render(<HomeScreen />);

    expect(screen.getByText('KAIROS')).toBeOnTheScreen();
    expect(screen.getByText('Le moment juste.')).toBeOnTheScreen();
    expect(screen.getByText('16:00:00')).toBeOnTheScreen();
  });

  it('route vers les précautions au tout premier démarrage de jeûne', () => {
    render(<HomeScreen />);

    fireEvent.press(screen.getByText('Commencer un jeûne'));
    expect(mockPush).toHaveBeenCalledWith('/precautions');
  });

  it('ne remontre plus les précautions une fois acceptées', () => {
    appStore.setState({
      user: { ...guest, precautionsAcknowledgedAt: 1_700_000_100_000 },
    });
    render(<HomeScreen />);

    fireEvent.press(screen.getByText('Commencer un jeûne'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText(/Précautions acceptées/)).toBeOnTheScreen();
  });
});
