import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore } from '@/stores/app-store';
import { Pressable, ScrollView, Text, View } from '@/tw';

interface PrecautionSection {
  title: string;
  items: string[];
}

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
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <View className="flex-1 bg-background">
        <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
          <Text className="font-serif-semibold text-2xl text-content">{t('title')}</Text>
          <Text className="font-serif text-base leading-6 text-content-muted">{t('intro')}</Text>

          {sections.map((section) => (
            <View
              key={section.title}
              className="gap-3 rounded-2xl border border-border bg-surface p-5"
            >
              <Text className="font-sans-medium text-sm uppercase tracking-[2px] text-accent">
                {section.title}
              </Text>
              {section.items.map((item) => (
                <Text key={item} className="font-serif text-base leading-6 text-content">
                  {'•'} {item}
                </Text>
              ))}
            </View>
          ))}

          <Text className="font-serif text-sm leading-5 text-content-faint">{t('disclaimer')}</Text>
        </ScrollView>

        <View className="border-t border-border px-6 py-4">
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onAcknowledge}
            className="items-center rounded-2xl bg-accent px-6 py-4 active:bg-accent-deep disabled:opacity-60"
          >
            <Text className="font-sans-bold text-base text-background">{t('acknowledge')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
