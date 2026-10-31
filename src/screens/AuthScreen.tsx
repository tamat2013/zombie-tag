// Sign up / log in with email and password.
// Desktop: brand on the left, form on the right, filling the window. Phone: brand, mode tabs and language on the left, the form on the right, nothing scrolls.
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
  const compact = !isDesktop;
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

  const hero = (
    <View style={styles.hero}>
      <View style={styles.heroChars}>
        <Character skin={BUILT_IN_SKINS[0]} size={compact ? 30 : 64} />
        <Character skin={BUILT_IN_SKINS[9]} size={compact ? 38 : 78} role="zombie" />
        <Character skin={BUILT_IN_SKINS[1]} size={compact ? 30 : 64} />
      </View>
      <Text style={[styles.title, compact && styles.titlePhone]}>Zombie Outbreak</Text>
      {compact ? null : <Text style={styles.tagline}>Survive 10 minutes... or become one of them</Text>}
    </View>
  );

  const modeTabs = (
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
  );

  const language = (
    <View style={[styles.card, compact && styles.cardPhone]}>
      <Text style={[styles.label, compact && styles.labelPhone]}>{!compact && mode === 'register' ? 'Which language do you want to play in?' : 'Language'}</Text>
      <LanguagePicker compact={compact} />
    </View>
  );

  const offline = !authService.isOnline ? (
    <Text style={styles.offline}>
      Offline mode: Firebase is not set up, so your account is saved on this device only and matches are played against bots. See the README to set it up.
    </Text>
  ) : null;

  const emailField = (
    <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" compact={compact} />
  );
  const passwordField = (
    <Field label="Password" value={password} onChangeText={setPassword} placeholder={tr('At least 6 characters')} secureTextEntry onSubmitEditing={submit} compact={compact} />
  );

  const form = (
    <View style={[styles.card, compact && styles.cardPhone]}>
      {compact ? null : modeTabs}
      {mode === 'register' ? (
        <Field label="Player name" value={name} onChangeText={setName} placeholder={tr('e.g. ZombieHunter')} maxLength={16} compact={compact} />
      ) : null}
      {compact ? (
        <View style={styles.pair}>
          <View style={styles.half}>{emailField}</View>
          <View style={styles.half}>{passwordField}</View>
        </View>
      ) : (
        <>
          {emailField}
          {passwordField}
        </>
      )}
      {error ? <Text style={[styles.error, compact && styles.errorPhone]}>{error}</Text> : null}
      <Button title={mode === 'login' ? 'Enter game' : 'Create account'} onPress={submit} loading={busy} small={compact} style={{ marginTop: compact ? 8 : 12 }} />
      <Button title="Continue as guest (no account)" variant="ghost" onPress={guest} disabled={busy} small={compact} style={{ marginTop: compact ? 6 : 8 }} />
      {compact ? null : offline}
    </View>
  );

  if (isDesktop) {
    return (
      <Screen scroll>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.deskRow}>
          <View style={styles.deskHalf}>{hero}</View>
          <View style={styles.deskHalf}>
            <View style={styles.deskForm}>
              {language}
              {form}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.phoneRow}>
        <View style={styles.phoneLeft}>
          {hero}
          {modeTabs}
          {language}
        </View>
        <View style={styles.phoneRight}>{form}</View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string; compact?: boolean }) {
  const { label, compact, style, ...rest } = props;
  return (
    <View style={compact ? styles.fieldPhone : styles.field}>
      <Text style={[styles.label, compact && styles.labelPhone]}>{label}</Text>
      <TextInput placeholderTextColor={colors.textMuted} style={[styles.input, compact && styles.inputPhone, style]} autoCorrect={false} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  deskRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 56 },
  deskHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deskForm: { width: '100%', maxWidth: 440, gap: 14 },
  phoneRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  phoneLeft: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  phoneRight: { flex: 1.25, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 6 },
  heroChars: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 8 },
  title: { color: colors.toxic, fontSize: 44, fontWeight: '900', textShadowColor: colors.toxicDark, textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 0 },
  titlePhone: { fontSize: 34, textShadowOffset: { width: 0, height: 3 } },
  tagline: { color: colors.textDim, fontSize: 15 },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: 20, borderBottomWidth: 6, borderBottomColor: 'rgba(0,0,0,0.35)', width: '100%', maxWidth: 440, alignSelf: 'center' },
  cardPhone: { padding: 12, borderBottomWidth: 5 },
  field: { marginTop: 10 },
  fieldPhone: { marginTop: 8 },
  pair: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '700', textAlign: 'left', marginBottom: 4 },
  labelPhone: { fontSize: 12, marginBottom: 2 },
  input: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', color: colors.text, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, textAlign: 'left' },
  inputPhone: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, borderRadius: 14 },
  error: { color: colors.blood, fontWeight: '800', marginTop: 10, textAlign: 'left' },
  errorPhone: { fontSize: 13, marginTop: 8 },
  offline: { color: colors.textMuted, fontSize: 12, textAlign: 'left', lineHeight: 18, maxWidth: 440 },
});
