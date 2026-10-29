// Drop-in replacement for react-native's Text that shows the string in the player's language and direction,
// and draws it in the Rubik font file that matches its weight.
import React from 'react';
import { Platform, StyleSheet, Text as RNText } from 'react-native';
import type { TextProps, TextStyle } from 'react-native';
import { isRtl, mirrorStyle } from './direction';
import { useLanguage } from './language';
import { translateChildren } from './translate';
import { fontForWeight } from '../theme';

function withFont(style: TextStyle | undefined): TextStyle {
  const s = { ...(style ?? {}) };
  if (!s.fontFamily) {
    s.fontFamily = fontForWeight(s.fontWeight);
    // Android picks a fallback font when a custom family also has a weight set.
    if (Platform.OS === 'android') delete s.fontWeight;
  }
  return s;
}

export const Text = React.forwardRef<RNText, TextProps>(function Text({ children, style, ...rest }, ref) {
  const lang = useLanguage();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const s = withFont(isRtl(lang) ? (mirrorStyle(flat as Record<string, unknown> | undefined, true) as TextStyle) : flat);
  return (
    <RNText ref={ref} style={s} {...rest}>
      {translateChildren(children, lang) as React.ReactNode}
    </RNText>
  );
});
