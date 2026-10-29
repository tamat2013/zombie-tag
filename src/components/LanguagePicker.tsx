// Grid of language chips: flag + native name. Used on the sign-up screen and in Settings.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from './ui';
import { LANGUAGES } from '../i18n/languages';
import { setLanguage, useLanguage } from '../i18n/language';
import { haptic } from '../utils/haptics';

export function LanguagePicker() {
  const lang = useLanguage();
  return (
    <View style={styles.wrap}>
      {LANGUAGES.map((l) => (
        <Chip
          key={l.code}
          label={`${l.flag} ${l.name}`}
          active={lang === l.code}
          onPress={() => {
            haptic('light');
            setLanguage(l.code);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
