import { render, screen } from '@testing-library/react-native';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/tw';

it('rend les primitives UI (verre, fond, press)', () => {
  render(
    <>
      <AmbientBackground />
      <GlassCard>
        <Text>contenu</Text>
      </GlassCard>
      <PressableScale>
        <Text>bouton</Text>
      </PressableScale>
    </>,
  );
  expect(screen.getByText('contenu')).toBeOnTheScreen();
  expect(screen.getByText('bouton')).toBeOnTheScreen();
});
