import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computeAccountOffer, shouldOfferAccount } from '@/account/account-offer';
import { AccountOfferBanner } from '@/components/account/account-offer-banner';
import { ActiveFastView } from '@/components/fasting/active-fast-view';
import { StartFastView } from '@/components/fasting/start-fast-view';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFastingStore } from '@/stores/fasting-store';
import { colors } from '@/theme/tokens';
import { ScrollView, View } from '@/tw';

/** Écran principal : choix du protocole (logo + verre), ou session de jeûne en cours. */
export default function HomeScreen() {
  const { t } = useTranslation('account');
  const router = useRouter();
  const activeSession = useFastingStore((state) => state.activeSession);
  const signedIn = useAuthStore((state) => state.status === 'signedIn');
  const user = useAppStore((state) => state.user);
  const repositories = useAppStore((state) => state.repositories);

  const [offer, setOffer] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Proposition de compte à un invité qui a des données à sauvegarder.
    // setState uniquement dans la résolution async (pas de cascade de rendus).
    if (!user || !repositories || !user.isGuest) {
      return;
    }
    let cancelled = false;
    void computeAccountOffer(repositories, user.id, Date.now()).then((inputs) => {
      if (!cancelled) {
        setOffer(shouldOfferAccount({ isGuest: user.isGuest, ...inputs }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, repositories, activeSession]);

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      {/* Bas géré par la barre d'onglets — pas d'edge bas ici. */}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Accès au compte (connecté = pastille accent). */}
        <View className="flex-row justify-end px-6 pt-2">
          <PressableScale onPress={() => router.push('/account')} accessibilityLabel={t('title')}>
            <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
              <Ionicons
                name={signedIn ? 'person-circle' : 'person-circle-outline'}
                size={22}
                color={signedIn ? colors.accent : colors.contentMuted}
              />
            </View>
          </PressableScale>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center gap-6 px-6 pb-8"
        >
          {/* La condition invité au rendu couvre un `offer` devenu obsolète après inscription. */}
          {!activeSession && offer && !dismissed && user?.isGuest && (
            <AccountOfferBanner onDismiss={() => setDismissed(true)} />
          )}
          {activeSession ? <ActiveFastView session={activeSession} /> : <StartFastView />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
