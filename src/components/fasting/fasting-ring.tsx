import type { ReactNode } from 'react';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import { View } from '@/tw';

const RING_WIDTH = 10;
/** Marge réservée au halo autour de l'arc — l'arc lumineux ne doit pas être rogné. */
const GLOW_WIDTH = 26;
const TICK_COUNT = 96;
const TICK_LENGTH = 3;
/** Arc minimal visible dès la première seconde (cap arrondi = point lumineux). */
const MIN_PROGRESS = 0.004;

/**
 * Anneau de progression du jeûne : piste sombre, graduations fines, arc en
 * dégradé cuivre→ambre avec halo. Le contenu (chrono…) se rend au centre.
 */
export function FastingRing({
  progress,
  overTarget,
  size,
  children,
}: {
  /** Progression vers l'objectif, dans [0, 1]. */
  progress: number;
  /** Objectif dépassé : l'arc plein passe en ambre vif. */
  overTarget: boolean;
  size: number;
  children: ReactNode;
}) {
  const center = size / 2;
  const radius = center - GLOW_WIDTH / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(MIN_PROGRESS, progress));
  const dashOffset = circumference * (1 - clamped);

  const tickRadius = radius - RING_WIDTH - 7;
  const tickGap = (2 * Math.PI * tickRadius) / TICK_COUNT - TICK_LENGTH;
  const innerRadius = tickRadius - 14;

  // Départ à 12 h, sens horaire (les cercles SVG démarrent à 3 h).
  const fromTop = `rotate(-90 ${center} ${center})`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="fasting-ring-arc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.accentBright} />
            <Stop offset="1" stopColor={colors.accentDeep} />
          </LinearGradient>
        </Defs>

        {/* Disque central légèrement surélevé, sous le chrono. */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill={colors.surface}
          stroke={colors.border}
          strokeWidth={1}
          strokeOpacity={0.6}
        />

        {/* Piste complète. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.surfaceRaised}
          strokeWidth={RING_WIDTH}
        />

        {/* Graduations fines à l'intérieur de la piste. */}
        <Circle
          cx={center}
          cy={center}
          r={tickRadius}
          fill="none"
          stroke={colors.border}
          strokeWidth={5}
          strokeDasharray={[TICK_LENGTH, tickGap]}
          transform={fromTop}
        />

        {/* Halo diffus sous l'arc de progression. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={overTarget ? colors.accentBright : colors.accent}
          strokeOpacity={0.28}
          strokeWidth={GLOW_WIDTH}
          strokeLinecap="round"
          strokeDasharray={[circumference, circumference]}
          strokeDashoffset={dashOffset}
          transform={fromTop}
        />

        {/* Arc de progression. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={overTarget ? colors.accentBright : 'url(#fasting-ring-arc)'}
          strokeWidth={RING_WIDTH}
          strokeLinecap="round"
          strokeDasharray={[circumference, circumference]}
          strokeDashoffset={dashOffset}
          transform={fromTop}
        />
      </Svg>

      <View className="absolute inset-0 items-center justify-center">{children}</View>
    </View>
  );
}
