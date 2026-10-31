// Grid of language chips: code + native name. Used on the sign-up screen and in Settings. The compact phone version shows codes only, so the sign-up screen fits its height.
import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Chip } from './ui';
import { LANGUAGES } from '../i18n/languages';
import { setLanguage, useLanguage } from '../i18n/language';
import { haptic } from '../utils/haptics';
import { colors } from '../theme';

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const lang = useLanguage();
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {LANGUAGES.map((l) => {
        const active = lang === l.code;
        const choose = () => {
          haptic('light');
          setLanguage(l.code);
        };
        // Flag emoji show as plain letters on Windows, so the code is drawn instead.
        const code = l.code.toUpperCase();
        if (compact) {
          return (
            <Pressable key={l.code} onPress={choose} accessibilityLabel={l.name} style={[styles.tag, active && styles.tagActive]}>
              <Text style={[styles.tagText, active && styles.tagTextActive]}>{code}</Text>
            </Pressable>
          );
        }
        return <Chip key={l.code} label={`${code} · ${l.name}`} active={active} onPress={choose} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  wrapCompact: { gap: 6, marginTop: 6 },
  tag: { minWidth: 32, height: 30, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  tagActive: { backgroundColor: colors.toxic, borderColor: colors.toxicDark },
  tagText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  tagTextActive: { color: colors.ink },
});
