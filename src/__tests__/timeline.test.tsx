// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { render, screen } from '@testing-library/react-native';

import TimelineScreen from '@/app/timeline';
import { HOUR_MS } from '@/domain/fasting';
import type { FastSession } from '@/schemas/fast-session';
import { fastingStore } from '@/stores/fasting-store';

const NOW = 1_700_100_000_000;

const sessionStartedHoursAgo = (hours: number): FastSession => ({
  id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  userId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  protocol: 'custom',
  targetHours: 96,
  status: 'running',
  startedAt: NOW - hours * HOUR_MS,
  endedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
});

beforeEach(() => {
  jest.clearAllMocks();
  fastingStore.setState({ activeSession: null, reachedHours: [], hydrated: true });
});

describe('TimelineScreen — mode éducatif (aucune session)', () => {
  it('affiche les 9 paliers avec leur contenu, sans état d’avancement', () => {
    render(<TimelineScreen />);

    expect(screen.getByText('Timeline biochimique')).toBeOnTheScreen();
    expect(screen.getByText('12 heures')).toBeOnTheScreen();
    expect(screen.getByText('96 heures')).toBeOnTheScreen();
    expect(screen.getByText(/Démarrez un jeûne/)).toBeOnTheScreen();

    // Aucun libellé d'état en mode éducatif.
    expect(screen.queryByText('En cours')).not.toBeOnTheScreen();
    expect(screen.queryByText('Atteint')).not.toBeOnTheScreen();
  });
});

describe('TimelineScreen — session en cours', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('à 20 h : 12/16 atteints, 18 en cours, 24 prochain', () => {
    fastingStore.setState({ activeSession: sessionStartedHoursAgo(20) });
    render(<TimelineScreen />);

    // 12 h et 16 h franchis → deux « Atteint ».
    expect(screen.getAllByText('Atteint')).toHaveLength(2);
    // 18 h = état biologique actuel.
    expect(screen.getAllByText('En cours')).toHaveLength(1);
    // 24 h = prochain palier.
    expect(screen.getAllByText('Prochain palier')).toHaveLength(1);
    // Chrono de jeûne affiché.
    expect(screen.getByText(/20:00:0\d de jeûne/)).toBeOnTheScreen();
  });
});
