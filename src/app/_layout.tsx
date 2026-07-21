import '../global.css';
import '@/i18n';

import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold } from '@expo-google-fonts/lora';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { runGuestMigrationOnSignIn } from '@/account/account-sync';
import { BootstrapError } from '@/components/app/bootstrap-error';
import { GlassTabBar } from '@/components/app/glass-tab-bar';
import { initFastingNotifications } from '@/notifications/fasting-notifications';
import { appStore, useAppStore } from '@/stores/app-store';
import { authStore, useAuthStore } from '@/stores/auth-store';
import { fastingStore } from '@/stores/fasting-store';
import { kairosNavigationTheme } from '@/theme/navigation';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const appStatus = useAppStore((state) => state.status);
  const authStatus = useAuthStore((state) => state.status);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  // Lien profond qui a (r)ouvert l'app : confirmation email ou reset Supabase.
  const deepLink = Linking.useURL();

  useEffect(() => {
    // Premier lancement : ouvre la base et crée/recharge l'invité (mode invité, CLAUDE.md).
    initFastingNotifications();
    void appStore.getState().bootstrap();
  }, []);

  useEffect(() => {
    // Écoute la session Supabase. Résilient si l'env n'est pas configuré :
    // l'auth reste indisponible mais l'app démarre normalement.
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = authStore.getState().init();
    } catch {
      // Supabase non configuré — mode invité uniquement.
    }
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    // Session en cours rechargée après le bootstrap (paliers manqués rattrapés).
    if (appStatus === 'ready') {
      void fastingStore.getState().hydrate();
    }
  }, [appStatus]);

  useEffect(() => {
    // À la connexion : convertit l'invité en inscrit (en place + upload cloud).
    // Idempotent → un échec réseau réessaie à la prochaine connexion.
    if (appStatus === 'ready' && authStatus === 'signedIn' && authUserId) {
      void runGuestMigrationOnSignIn(authUserId).catch(() => undefined);
    }
  }, [appStatus, authStatus, authUserId]);

  useEffect(() => {
    // Lien email cliqué : échange le code contre une session (confirmation/reset).
    if (deepLink) {
      void authStore.getState().handleAuthDeepLink(deepLink);
    }
  }, [deepLink]);

  const fontsReady = fontsLoaded || fontError !== null;
  // Le splash se retire dès qu'on a quelque chose à montrer : l'app OU l'écran d'erreur.
  const settled = appStatus === 'ready' || appStatus === 'error';

  useEffect(() => {
    if (fontsReady && settled) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady, settled]);

  if (!fontsReady || !settled) {
    return null;
  }

  // Échec d'ouverture de la base : message clair + réessayer (pas d'UI muette).
  if (appStatus === 'error') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <BootstrapError onRetry={() => void appStore.getState().bootstrap()} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={kairosNavigationTheme}>
        <StatusBar style="light" />
        {/* Stack en haut, barre d'onglets en bas : frères de flex, aucun recouvrement. */}
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="precautions" options={{ presentation: 'modal' }} />
            </Stack>
          </View>
          <GlassTabBar />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
