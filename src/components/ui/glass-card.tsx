import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { View } from '@/tw';
import { colors } from '@/theme/tokens';

/**
 * Surface « liquid glass » : flou de fond (matériau translucide, l'équivalent
 * du backdrop-filter d'Apple), teinte chaude semi-opaque, liseré clair en haut
 * (lumière qui accroche le bord) et ombre portée. Le poids encode la hiérarchie
 * (§12 apple-design) : `elevated` = plus opaque et ombre plus profonde.
 */
export function GlassCard({
  children,
  className,
  contentClassName,
  elevated = false,
}: {
  children: ReactNode;
  /** Layout du conteneur (marges, largeur…). */
  className?: string;
  /** Padding/disposition du contenu interne. */
  contentClassName?: string;
  elevated?: boolean;
}) {
  return (
    <View
      className={`overflow-hidden rounded-3xl ${className ?? ''}`}
      style={elevated ? shadow.elevated : shadow.regular}
    >
      <BlurView
        intensity={elevated ? 40 : 26}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* Teinte chaude : donne le corps du verre par-dessus le flou. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: elevated ? TINT_ELEVATED : TINT }]}
      />
      {/* Liseré clair (bord supérieur = lumière) + contour subtil. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.hairline]}
        className="rounded-3xl"
      />
      <View className={contentClassName ?? 'p-5'}>{children}</View>
    </View>
  );
}

const TINT = 'rgba(26,23,18,0.55)';
const TINT_ELEVATED = 'rgba(36,31,24,0.68)';

const shadow = StyleSheet.create({
  regular: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
});

const styles = StyleSheet.create({
  hairline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderTopColor: 'rgba(242,234,217,0.16)',
  },
});
