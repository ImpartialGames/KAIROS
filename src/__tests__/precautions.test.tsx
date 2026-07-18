// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import PrecautionsScreen from '@/app/precautions';
import type { Repositories } from '@/repositories';
import type { User } from '@/schemas/user';
import { appStore } from '@/stores/app-store';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

const guest: User = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  isGuest: true,
  precautionsAcknowledgedAt: null,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

const mockAcknowledge = jest.fn(async (userId: string, acknowledgedAt: number) => ({
  ...guest,
  id: userId,
  precautionsAcknowledgedAt: acknowledgedAt,
}));

describe('PrecautionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStore.setState({
      status: 'ready',
      user: guest,
      repositories: {
        users: { acknowledgePrecautions: mockAcknowledge },
      } as unknown as Repositories,
      error: null,
    });
  });

  it('affiche le contenu source : contre-indications, supervision, effets', () => {
    render(<PrecautionsScreen />);

    expect(screen.getByText('Avant votre premier jeûne')).toBeOnTheScreen();
    expect(screen.getByText(/Grossesse et allaitement/)).toBeOnTheScreen();
    expect(screen.getByText(/Diabète, en particulier/)).toBeOnTheScreen();
    expect(screen.getByText(/Maux de tête/)).toBeOnTheScreen();
    expect(screen.getByText(/ne remplacent pas un avis médical/)).toBeOnTheScreen();
  });

  it("persiste l'acceptation puis revient en arrière", async () => {
    render(<PrecautionsScreen />);

    fireEvent.press(screen.getByText("J'ai lu et compris"));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockAcknowledge).toHaveBeenCalledWith(guest.id, expect.any(Number));
    expect(appStore.getState().user?.precautionsAcknowledgedAt).toEqual(expect.any(Number));
  });
});
