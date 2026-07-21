import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useAuthStore } from '@/stores/auth-store';
import { colors } from '@/theme/tokens';
import { ScrollView, Text, TextInput, View } from '@/tw';

type Mode = 'signIn' | 'signUp' | 'reset';

/** Bouton d'action principal en dégradé cuivre. */
function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={{ alignSelf: 'stretch' }}>
      <View className="overflow-hidden rounded-2xl" style={{ opacity: disabled ? 0.5 : 1 }}>
        <LinearGradient
          colors={[colors.accentBright, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View className="items-center px-6 py-4">
            <Text className="font-sans-bold text-base text-background">{label}</Text>
          </View>
        </LinearGradient>
      </View>
    </PressableScale>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  keyboardType?: 'email-address';
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans text-sm text-content-muted">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.contentFaint}
        className="rounded-2xl border border-border bg-surface px-4 py-3 font-sans text-base text-content"
      />
    </View>
  );
}

/** Écran compte : connexion / inscription / reset, attente de confirmation, connecté. */
export default function AccountScreen() {
  const { t } = useTranslation('account');
  const router = useRouter();

  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = () => {
    if (mode === 'reset') {
      void run(async () => {
        const ok = await requestPasswordReset(email.trim());
        if (ok) setResetSent(true);
      });
    } else if (mode === 'signUp') {
      void run(() => signUp(email.trim(), password));
    } else {
      void run(() => signIn(email.trim(), password));
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <View className="flex-row items-center gap-3 px-6 pb-2 pt-2">
          <PressableScale onPress={() => router.back()} accessibilityLabel={t('title')}>
            <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
              <Ionicons name="chevron-back" size={20} color={colors.content} />
            </View>
          </PressableScale>
          <Text className="font-serif-semibold text-2xl tracking-tight text-content">
            {t('title')}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 pb-12 pt-2">
          {status === 'signedIn' && user ? (
            <GlassCard elevated contentClassName="gap-4 p-5">
              <View className="flex-row items-center gap-3">
                <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                <Text className="font-serif-semibold text-lg text-content">
                  {t('signedInTitle')}
                </Text>
              </View>
              <Text className="font-sans text-sm text-content-muted">{user.email}</Text>
              <Text className="font-serif text-base leading-6 text-content-muted">
                {t('signedInBody')}
              </Text>
              <PressableScale onPress={() => void run(() => signOut())} disabled={busy}>
                <View className="items-center rounded-2xl border border-border px-6 py-3">
                  <Text className="font-sans-medium text-base text-danger">{t('signOut')}</Text>
                </View>
              </PressableScale>
            </GlassCard>
          ) : status === 'awaitingConfirmation' ? (
            <GlassCard elevated contentClassName="gap-4 p-5">
              <View className="flex-row items-center gap-3">
                <Ionicons name="mail-outline" size={22} color={colors.accent} />
                <Text className="font-serif-semibold text-lg text-content">
                  {t('awaitingTitle')}
                </Text>
              </View>
              <Text className="font-serif text-base leading-6 text-content-muted">
                {t('awaitingBody', { email: pendingEmail ?? '' })}
              </Text>
              <PressableScale onPress={() => setMode('signIn')}>
                <View className="items-center rounded-2xl border border-border px-6 py-3">
                  <Text className="font-sans-medium text-base text-content">
                    {t('backToSignIn')}
                  </Text>
                </View>
              </PressableScale>
            </GlassCard>
          ) : (
            <>
              <Text className="font-serif text-base leading-6 text-content-muted">
                {t('intro')}
              </Text>

              <GlassCard elevated contentClassName="gap-4 p-5">
                <Field
                  label={t('email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />

                {mode === 'reset' ? (
                  <>
                    {resetSent && (
                      <Text className="font-serif text-sm leading-5 text-accent">
                        {t('resetSent')}
                      </Text>
                    )}
                    <PrimaryButton label={t('resetSend')} onPress={onSubmit} disabled={busy} />
                    <PressableScale onPress={() => setMode('signIn')}>
                      <Text className="text-center font-sans text-sm text-content-muted">
                        {t('backToSignIn')}
                      </Text>
                    </PressableScale>
                  </>
                ) : (
                  <>
                    <Field
                      label={t('password')}
                      value={password}
                      onChangeText={setPassword}
                      secure
                    />
                    {error && <Text className="font-sans text-sm text-danger">{error}</Text>}
                    <PrimaryButton
                      label={mode === 'signUp' ? t('signUp') : t('signIn')}
                      onPress={onSubmit}
                      disabled={busy}
                    />
                    <PressableScale
                      onPress={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')}
                    >
                      <Text className="text-center font-sans text-sm text-accent">
                        {mode === 'signUp' ? t('haveAccount') : t('noAccount')}
                      </Text>
                    </PressableScale>
                    <PressableScale onPress={() => setMode('reset')}>
                      <Text className="text-center font-sans text-sm text-content-faint">
                        {t('forgotPassword')}
                      </Text>
                    </PressableScale>
                  </>
                )}
              </GlassCard>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
