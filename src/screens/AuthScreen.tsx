// Sign up / log in with email and password.
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { authErrorMessage, authService } from '../services/authService';
import { BUILT_IN_SKINS } from '../data/skins';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (mode === 'register' && name.trim().length < 2) {
      setError('בחר שם שחקן (לפחות 2 תווים)');
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

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <View style={styles.heroChars}>
            <Character skin={BUILT_IN_SKINS[0]} size={64} />
            <Character skin={BUILT_IN_SKINS[9]} size={78} role="zombie" />
            <Character skin={BUILT_IN_SKINS[1]} size={64} />
          </View>
          <Text style={styles.title}>זומבי: התפרצות</Text>
          <Text style={styles.tagline}>שרוד 10 דקות... או הפוך לאחד מהם</Text>
        </View>

        <View style={styles.card}>
          <Tabs<Mode>
            tabs={[
              { id: 'login', label: 'התחברות' },
              { id: 'register', label: 'הרשמה' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />
          {mode === 'register' ? (
            <Field label="שם שחקן" value={name} onChangeText={setName} placeholder="למשל: צייד_זומבים" maxLength={16} />
          ) : null}
          <Field label="אימייל" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="סיסמה" value={password} onChangeText={setPassword} placeholder="לפחות 6 תווים" secureTextEntry onSubmitEditing={submit} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={mode === 'login' ? 'כניסה למשחק' : 'יצירת חשבון'} icon={mode === 'login' ? '🔓' : '✨'} onPress={submit} loading={busy} style={{ marginTop: 12 }} />
          {!authService.isOnline ? (
            <Text style={styles.offline}>
              מצב לא מקוון: Firebase לא הוגדר, ולכן החשבון נשמר במכשיר בלבד ומשחקים מתנהלים מול בוטים. ראה README להגדרה.
            </Text>
          ) : null}
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
  title: { color: colors.toxic, fontSize: 38, fontWeight: '900', textShadowColor: '#3f9b1f', textShadowRadius: 14 },
  tagline: { color: colors.textDim, fontSize: 15, marginTop: 4 },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, width: '100%', maxWidth: 440, alignSelf: 'center' },
  label: { color: colors.textDim, fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  input: { backgroundColor: '#0a0f09', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlign: 'right' },
  error: { color: colors.blood, fontWeight: '800', marginTop: 10, textAlign: 'right' },
  offline: { color: colors.textMuted, fontSize: 12, marginTop: 14, textAlign: 'right', lineHeight: 18 },
});
