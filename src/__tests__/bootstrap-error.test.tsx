// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { BootstrapError } from '@/components/app/bootstrap-error';

describe('BootstrapError', () => {
  it('affiche le message d’erreur et déclenche onRetry', () => {
    const onRetry = jest.fn();
    render(<BootstrapError onRetry={onRetry} />);

    expect(screen.getByText('Un souci au démarrage')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Réessayer'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
