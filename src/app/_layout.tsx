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

import { appStore, useAppStore } from '@/stores/app-store';
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
    void appStore.getState().bootstrap();
  }, []);

  const fontsReady = fontsLoaded || fontError !== null;
  // 'error' laisse l'app se rendre : mieux vaut une UI dégradée qu'un splash infini.
  const appReady = appStatus === 'ready' || appStatus === 'error';

  useEffect(() => {
    if (fontsReady && appReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady, appReady]);

  if (!fontsReady || !appReady) {
    return null;
  }

  return (
    <ThemeProvider value={kairosNavigationTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="precautions" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
