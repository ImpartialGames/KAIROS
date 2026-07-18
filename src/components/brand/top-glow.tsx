import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

/** Halo chaud « lever de soleil » derrière le logo (accent cuivre-ambré, jamais bleu/vert). */
export function TopGlow() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '58%' }}
    >
      <LinearGradient
        colors={['rgba(227,154,86,0.16)', 'rgba(200,123,63,0.05)', 'rgba(13,11,8,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.68, y: 0 }}
        end={{ x: 0.32, y: 1 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
