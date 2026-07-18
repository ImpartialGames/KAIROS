import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { colors } from '@/theme/tokens';
import { Text, View } from '@/tw';

interface Tab {
  href: Href;
  pathname: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}

const TABS: Tab[] = [
  { href: '/', pathname: '/', icon: 'timer-outline', labelKey: 'fasting' },
  { href: '/timeline', pathname: '/timeline', icon: 'pulse', labelKey: 'timeline' },
  { href: '/lexique', pathname: '/lexique', icon: 'book-outline', labelKey: 'lexicon' },
  { href: '/journal', pathname: '/journal', icon: 'journal-outline', labelKey: 'journal' },
];

/** Routes qui ne sont pas des onglets (modales…) : la barre disparaît. */
const HIDDEN_ROUTES = new Set(['/precautions']);

/**
 * Barre d'onglets translucide, chrome persistant des 4 piliers. Rendue dans
 * _layout à côté du Stack (pas de recouvrement : elle occupe le bas, les écrans
 * le haut). Onglet actif détecté via le chemin, bascule en `replace` (pas
 * d'empilement), gère elle-même l'inset bas.
 */
export function GlassTabBar() {
  const { t } = useTranslation('tabs');
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (HIDDEN_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <View style={{ paddingBottom: insets.bottom }}>
      <BlurView
        intensity={40}
        tint="dark"
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.topHairline]} />
      <View className="flex-row">
        {TABS.map((tab) => {
          const active = pathname === tab.pathname;
          const tone = active ? colors.accent : colors.contentFaint;
          return (
            <PressableScale
              key={tab.pathname}
              style={{ flex: 1 }}
              onPress={() => router.replace(tab.href)}
              accessibilityLabel={t(tab.labelKey)}
              accessibilityState={{ selected: active }}
            >
              <View className="items-center gap-1 py-2">
                <Ionicons name={tab.icon} size={22} color={tone} />
                <Text className="font-sans-medium text-[11px]" style={{ color: tone }}>
                  {t(tab.labelKey)}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topHairline: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
