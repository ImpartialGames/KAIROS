import '../global.css';
import '@/i18n';

import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold } from '@expo-google-fonts/lora';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootstrapError } from '@/components/app/bootstrap-error';
import { GlassTabBar } from '@/components/app/glass-tab-bar';
import { initFastingNotifications } from '@/notifications/fasting-notifications';
import { appStore, useAppStore } from '@/stores/app-store';
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

  useEffect(() => {
    // Premier lancement : ouvre la base et crée/recharge l'invité (mode invité, CLAUDE.md).
    initFastingNotifications();
    void appStore.getState().bootstrap();
  }, []);

  useEffect(() => {
    // Session en cours rechargée après le bootstrap (paliers manqués rattrapés).
    if (appStatus === 'ready') {
      void fastingStore.getState().hydrate();
    }
  }, [appStatus]);

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
