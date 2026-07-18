// Dans l'app, _layout.tsx initialise i18n avant de rendre les écrans — même contrat ici.
import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { GlassTabBar } from '@/components/app/glass-tab-bar';

const mockReplace = jest.fn();
let mockPathname = '/';
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/';
});

describe('GlassTabBar', () => {
  it('affiche les 4 piliers', () => {
    render(<GlassTabBar />);
    expect(screen.getByText('Jeûne')).toBeOnTheScreen();
    expect(screen.getByText('Timeline')).toBeOnTheScreen();
    expect(screen.getByText('Lexique')).toBeOnTheScreen();
    expect(screen.getByText('Journal')).toBeOnTheScreen();
  });

  it('bascule vers un onglet en remplaçant la route (pas d’empilement)', () => {
    render(<GlassTabBar />);
    fireEvent.press(screen.getByLabelText('Lexique'));
    expect(mockReplace).toHaveBeenCalledWith('/lexique');
  });

  it('disparaît sur une route non-onglet (modale précautions)', () => {
    mockPathname = '/precautions';
    render(<GlassTabBar />);
    expect(screen.queryByText('Jeûne')).not.toBeOnTheScreen();
  });
});
