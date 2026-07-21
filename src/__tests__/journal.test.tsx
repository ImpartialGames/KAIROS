// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import JournalScreen from '@/app/journal';
import type { FastSession } from '@/schemas/fast-session';
import type { JournalEntry } from '@/schemas/journal-entry';
import { journalStore } from '@/stores/journal-store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

const NOW = 1_700_100_000_000;

const resetStore = (over: Partial<Parameters<typeof journalStore.setState>[0]> = {}) => {
  journalStore.setState({
    entries: [],
    sessions: [],
    phasesBySession: {},
    loaded: true,
    load: jest.fn(async () => undefined),
    addEntry: jest.fn(async () => undefined),
    ...over,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('JournalScreen', () => {
  it('affiche le formulaire et l’état vide sans historique', () => {
    render(<JournalScreen />);

    expect(screen.getByText('Journal')).toBeOnTheScreen();
    expect(screen.getByText('Nouvelle note')).toBeOnTheScreen();
    expect(screen.getByText(/Votre journal est encore vide/)).toBeOnTheScreen();
  });

  it('enregistre une note texte (humeur nulle)', async () => {
    const addEntry = jest.fn(async () => undefined);
    resetStore({ addEntry });
    render(<JournalScreen />);

    fireEvent.changeText(
      screen.getByLabelText('Une note sur votre énergie, votre humeur, votre jeûne…'),
      'Bien dormi, énergie stable.',
    );
    fireEvent.press(screen.getByText('Enregistrer'));

    await waitFor(() =>
      expect(addEntry).toHaveBeenCalledWith({
        mood: null,
        tags: [],
        note: 'Bien dormi, énergie stable.',
      }),
    );
  });

  it('enregistre une humeur seule (note nulle)', async () => {
    const addEntry = jest.fn(async () => undefined);
    resetStore({ addEntry });
    render(<JournalScreen />);

    fireEvent.press(screen.getByLabelText('Humeur 4 sur 5'));
    fireEvent.press(screen.getByText('Enregistrer'));

    await waitFor(() => expect(addEntry).toHaveBeenCalledWith({ mood: 4, tags: [], note: null }));
  });

  it('enregistre des ressentis seuls (tags)', async () => {
    const addEntry = jest.fn(async () => undefined);
    resetStore({ addEntry });
    render(<JournalScreen />);

    fireEvent.press(screen.getByLabelText('Clarté mentale'));
    fireEvent.press(screen.getByLabelText('Faim'));
    fireEvent.press(screen.getByText('Enregistrer'));

    await waitFor(() =>
      expect(addEntry).toHaveBeenCalledWith({
        mood: null,
        tags: ['clarte_mentale', 'faim'],
        note: null,
      }),
    );
  });

  it('rend le fil : session terminée avec paliers et note', () => {
    // Le fil borne à 30 j via Date.now() — on fige l'horloge sur NOW.
    jest.useFakeTimers({ now: NOW });
    const session: FastSession = {
      id: 'sess-1',
      userId: 'u',
      protocol: '16:8',
      targetHours: 16,
      status: 'completed',
      startedAt: NOW - 3 * 86_400_000,
      endedAt: NOW - 3 * 86_400_000 + 16 * 3_600_000,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const entry: JournalEntry = {
      id: 'entry-1',
      userId: 'u',
      sessionId: null,
      mood: 5,
      tags: [],
      note: 'Clarté mentale nette.',
      createdAt: NOW - 86_400_000,
      updatedAt: NOW - 86_400_000,
    };
    resetStore({ sessions: [session], entries: [entry], phasesBySession: { 'sess-1': [12, 16] } });

    render(<JournalScreen />);

    expect(screen.getByText('Jeûne terminé')).toBeOnTheScreen();
    expect(screen.getByText('12 h')).toBeOnTheScreen();
    expect(screen.getByText('Clarté mentale nette.')).toBeOnTheScreen();
    expect(screen.queryByText(/Votre journal est encore vide/)).not.toBeOnTheScreen();

    jest.useRealTimers();
  });
});
