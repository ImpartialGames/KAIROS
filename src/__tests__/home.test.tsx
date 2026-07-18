// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { HOUR_MS } from '@/domain/fasting';
import type { FastSession } from '@/schemas/fast-session';
import type { User } from '@/schemas/user';
import { appStore } from '@/stores/app-store';
import { fastingStore } from '@/stores/fasting-store';

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

describe('HomeScreen — pas de session en cours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStore.setState({ status: 'ready', user: guest, repositories: null, error: null });
    fastingStore.setState({ activeSession: null, reachedHours: [], hydrated: true });
  });

  it('rend le logo de marque, le choix de protocole et la devise via i18n', () => {
    render(<HomeScreen />);

    expect(screen.getByTestId('brand-logo')).toBeOnTheScreen();
    expect(screen.getByText('Choisissez votre protocole')).toBeOnTheScreen();
    expect(screen.getByText('OMAD')).toBeOnTheScreen();
    expect(screen.getByText('Science. Clarté. Discipline.')).toBeOnTheScreen();
  });

  it('affiche la fenêtre d’alimentation dérivée du protocole', () => {
    render(<HomeScreen />);

    // 16:8 sélectionné par défaut → 16 h de jeûne / 8 h d'alimentation.
    expect(screen.getByText('16 h de jeûne')).toBeOnTheScreen();
    expect(screen.getByText("8 h d'alimentation")).toBeOnTheScreen();
  });

  it('route vers les précautions au tout premier démarrage de jeûne', () => {
    const mockStartFast = jest.fn(async () => undefined);
    fastingStore.setState({ startFast: mockStartFast });
    render(<HomeScreen />);

    fireEvent.press(screen.getByText('Commencer un jeûne'));

    expect(mockPush).toHaveBeenCalledWith('/precautions');
    expect(mockStartFast).not.toHaveBeenCalled();
  });

  it('démarre le jeûne une fois les précautions acceptées', () => {
    const mockStartFast = jest.fn(async () => undefined);
    appStore.setState({ user: { ...guest, precautionsAcknowledgedAt: 1_700_000_100_000 } });
    fastingStore.setState({ startFast: mockStartFast });
    render(<HomeScreen />);

    fireEvent.press(screen.getByText('Commencer un jeûne'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockStartFast).toHaveBeenCalledWith({ protocol: '16:8', targetHours: undefined });
  });
});

describe('HomeScreen — session en cours', () => {
  const NOW = 1_700_100_000_000;

  const session: FastSession = {
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    userId: guest.id,
    protocol: '16:8',
    targetHours: 16,
    status: 'running',
    startedAt: NOW - (17 * HOUR_MS + 3 * 60_000 + 4_000),
    endedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
    appStore.setState({
      status: 'ready',
      user: { ...guest, precautionsAcknowledgedAt: guest.createdAt },
      repositories: null,
      error: null,
    });
    fastingStore.setState({ activeSession: session, reachedHours: [12, 16], hydrated: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('affiche le chrono, l’objectif, les paliers atteints et les actions', () => {
    render(<HomeScreen />);

    expect(screen.getByText('17:03:04')).toBeOnTheScreen();
    expect(screen.getByText(/Objectif 16 h/)).toBeOnTheScreen();
    expect(screen.getByText('12 h')).toBeOnTheScreen();
    expect(screen.getByText('16 h')).toBeOnTheScreen();
    expect(screen.getByText(/Prochain palier : 18 h/)).toBeOnTheScreen();
    expect(screen.getByText('Terminer le jeûne')).toBeOnTheScreen();
    expect(screen.getByText('Abandonner')).toBeOnTheScreen();
  });

  it('Terminer appelle completeFast', () => {
    const mockComplete = jest.fn(async () => undefined);
    fastingStore.setState({ completeFast: mockComplete });
    render(<HomeScreen />);

    fireEvent.press(screen.getByText('Terminer le jeûne'));
    expect(mockComplete).toHaveBeenCalled();
  });
});
