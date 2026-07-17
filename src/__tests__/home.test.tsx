// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

describe('HomeScreen (placeholder étape 1)', () => {
  it('rend le nom produit et l’aperçu typographique via i18n', () => {
    render(<HomeScreen />);

    expect(screen.getByText('KAIROS')).toBeOnTheScreen();
    expect(screen.getByText('Le moment juste.')).toBeOnTheScreen();
    expect(screen.getByText('16:00:00')).toBeOnTheScreen();
  });
});
