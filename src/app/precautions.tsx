import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useAppStore } from '@/stores/app-store';
import { colors } from '@/theme/tokens';
import { ScrollView, Text, View } from '@/tw';

interface PrecautionSection {
  title: string;
  items: string[];
}

const ctaGlow = {
  shadowColor: colors.accent,
  shadowOpacity: 0.5,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
} as const;

/**
 * Précautions et contre-indications (source : docs-source/biochimie-approfondie.md,
 * §« Considérations pratiques et précautions »). Affiché une seule fois, avant le
 * tout premier jeûne — l'acceptation est persistée sur l'enregistrement invité.
 */
export default function PrecautionsScreen() {
  const { t } = useTranslation('precautions');
  const router = useRouter();
  const acknowledgePrecautions = useAppStore((state) => state.acknowledgePrecautions);
  const [saving, setSaving] = useState(false);

  const sections = t('sections', { returnObjects: true }) as PrecautionSection[];

  const onAcknowledge = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await acknowledgePrecautions();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
          <View className="gap-2">
            <Text className="font-serif-semibold text-3xl tracking-tight text-content">
              {t('title')}
            </Text>
            <Text className="font-serif text-base leading-6 text-content-muted">{t('intro')}</Text>
          </View>

          {sections.map((section) => (
            <GlassCard key={section.title} contentClassName="gap-3 p-5">
              <Text className="font-sans-medium text-xs uppercase tracking-[2px] text-accent">
                {section.title}
              </Text>
              {section.items.map((item) => (
                <View key={item} className="flex-row gap-3">
                  <View className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                  <Text className="flex-1 font-serif text-base leading-6 text-content">{item}</Text>
                </View>
              ))}
            </GlassCard>
          ))}

          <Text className="font-serif text-sm leading-5 text-content-faint">{t('disclaimer')}</Text>
        </ScrollView>

        {/* Barre d'action translucide — le contenu défile dessous (§12 apple-design). */}
        <View className="px-6 pb-4 pt-3">
          <BlurView
            intensity={40}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.topHairline]} />
          <PressableScale
            onPress={onAcknowledge}
            disabled={saving}
            style={saving ? undefined : ctaGlow}
          >
            <View className="overflow-hidden rounded-2xl" style={{ opacity: saving ? 0.6 : 1 }}>
              <LinearGradient
                colors={[colors.accentBright, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View className="flex-row items-center justify-center gap-3 px-6 py-4">
                  <Text className="font-sans-bold text-base text-background">
                    {t('acknowledge')}
                  </Text>
                  <Ionicons name="checkmark" size={18} color={colors.background} />
                </View>
              </LinearGradient>
            </View>
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topHairline: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
