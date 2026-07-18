import type { ReactNode } from 'react';
import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Retour tactile Apple : réaction au *press-down* (pas au relâchement) via un
 * léger enfoncement, ressort interruptible qui repart de la valeur courante
 * (§1 apple-design). L'habillage visuel reste porté par les enfants (GlassCard,
 * dégradés…) — ce composant n'ajoute que le toucher et l'échelle.
 */
export function PressableScale({
  children,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityState,
}: {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, ...accessibilityState }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => spring(0.96)}
      onPressOut={() => spring(1)}
      style={[{ transform: [{ scale }] }, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
