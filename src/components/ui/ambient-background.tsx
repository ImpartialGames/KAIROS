import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { View } from '@/tw';
import { colors, palette } from '@/theme/tokens';

/**
 * Fond ambiant : base sombre + halos cuivre-ambré radiaux très diffus.
 * Donne aux surfaces de verre (GlassCard) de la matière à capter — sans ces
 * nuances chaudes, un flou sur du noir plat ne « lit » pas comme du verre.
 * Accent chaud uniquement (jamais bleu/vert), cohérent avec l'identité.
 */
export function AmbientBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="ambient-top" cx="74%" cy="6%" r="60%">
            <Stop offset="0" stopColor={palette.ambre} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.ambre} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="ambient-low" cx="12%" cy="82%" r="55%">
            <Stop offset="0" stopColor={palette.cuivre} stopOpacity={0.12} />
            <Stop offset="1" stopColor={palette.cuivre} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={colors.background} />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ambient-top)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ambient-low)" />
      </Svg>
    </View>
  );
}
