// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import LexiconScreen from '@/app/lexique';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LexiconScreen', () => {
  it('affiche les entrées et la section synergies au repos', () => {
    render(<LexiconScreen />);

    expect(screen.getByText('Lexique')).toBeOnTheScreen();
    expect(screen.getByText('Cétose')).toBeOnTheScreen();
    expect(screen.getByText('Autophagie')).toBeOnTheScreen();
    // BDNF ajouté au lexique par le pipeline (étape 5).
    expect(screen.getByText(/BDNF/)).toBeOnTheScreen();
    // Section synergies visible tant qu'on ne cherche pas.
    expect(screen.getByText('Synergies entre mécanismes')).toBeOnTheScreen();
  });

  it('filtre les entrées à la recherche et masque les synergies', () => {
    render(<LexiconScreen />);

    fireEvent.changeText(screen.getByLabelText('Rechercher un terme…'), 'autophagie');

    expect(screen.getByText('Autophagie')).toBeOnTheScreen();
    expect(screen.queryByText('Cétose')).not.toBeOnTheScreen();
    expect(screen.queryByText('Synergies entre mécanismes')).not.toBeOnTheScreen();
  });

  it('affiche un état vide quand rien ne correspond', () => {
    render(<LexiconScreen />);

    fireEvent.changeText(screen.getByLabelText('Rechercher un terme…'), 'zzzzz');

    expect(screen.getByText(/Aucun terme ne correspond/)).toBeOnTheScreen();
  });
});
