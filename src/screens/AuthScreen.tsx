// Sign up / log in with email and password.
import { useDevice } from '../utils/device';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { TextInput, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Screen, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { LanguagePicker } from '../components/LanguagePicker';
import { tr, useLanguage } from '../i18n/language';
import { authErrorMessage, authService } from '../services/authService';
import { BUILT_IN_SKINS } from '../data/skins';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { isDesktop } = useDevice();
  useLanguage(); // re-render (placeholders use tr()) when the language changes
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (mode === 'register' && name.trim().length < 2) {
      setError('Choose a player name (at least 2 characters)');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') await authService.signUp(email, password, name);
      else await authService.signIn(email, password);
      haptic('success');
    } catch (e) {
      haptic('error');
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    setError(null);
    setBusy(true);
    try {
      await authService.signInGuest();
      haptic('success');
    } catch (e) {
      haptic('error');
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll style={isDesktop ? { maxWidth: 980, paddingTop: 60 } : undefined}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={isDesktop ? { flexDirection: 'row', alignItems: 'center', gap: 56 } : undefined}>
        <View style={[styles.hero, isDesktop && { flex: 1 }]}>
          <View style={styles.heroChars}>
            <Character skin={BUILT_IN_SKINS[0]} size={64} />
            <Character skin={BUILT_IN_SKINS[9]} size={78} role="zombie" />
            <Character skin={BUILT_IN_SKINS[1]} size={64} />
          </View>
          <Text style={styles.title}>Zombie Outbreak</Text>
          <Text style={styles.tagline}>Survive 10 minutes... or become one of them</Text>
        </View>

        <View style={isDesktop ? { flex: 1 } : undefined}>
        <View style={[styles.card, { marginBottom: 14 }]}>
          <Text style={styles.label}>{mode === 'register' ? 'Which language do you want to play in?' : 'Language'}</Text>
          <LanguagePicker />
        </View>

        <View style={styles.card}>
          <Tabs<Mode>
            tabs={[
              { id: 'login', label: 'Log in' },
              { id: 'register', label: 'Sign up' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />
          {mode === 'register' ? (
            <Field label="Player name" value={name} onChangeText={setName} placeholder={tr('e.g. ZombieHunter')} maxLength={16} />
          ) : null}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder={tr('At least 6 characters')} secureTextEntry onSubmitEditing={submit} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={mode === 'login' ? 'Enter game' : 'Create account'} onPress={submit} loading={busy} style={{ marginTop: 12 }} />
          <Button title="Continue as guest (no account)" variant="ghost" onPress={guest} disabled={busy} style={{ marginTop: 10 }} />
          {!authService.isOnline ? (
            <Text style={styles.offline}>
              Offline mode: Firebase is not set up, so your account is saved on this device only and matches are played against bots. See the README to set it up.
            </Text>
          ) : null}
        </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.textMuted} style={[styles.input, style]} autoCorrect={false} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  heroChars: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 16 },
  title: { color: colors.toxic, fontSize: 44, fontWeight: '900', textShadowColor: colors.toxicDark, textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 0 },
  tagline: { color: colors.textDim, fontSize: 15, marginTop: 4 },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: 20, borderBottomWidth: 6, borderBottomColor: 'rgba(0,0,0,0.35)', width: '100%', maxWidth: 440, alignSelf: 'center' },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '700', textAlign: 'left', marginBottom: 4 },
  input: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', color: colors.text, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, textAlign: 'left' },
  error: { color: colors.blood, fontWeight: '800', marginTop: 10, textAlign: 'left' },
  offline: { color: colors.textMuted, fontSize: 12, marginTop: 14, textAlign: 'left', lineHeight: 18 },
});
