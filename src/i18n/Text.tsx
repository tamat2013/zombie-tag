// Drop-in replacement for react-native's Text that shows the string in the player's language and direction.
import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';
import { isRtl, mirrorStyle } from './direction';
import { useLanguage } from './language';
import { translateChildren } from './translate';

export const Text = React.forwardRef<RNText, TextProps>(function Text({ children, style, ...rest }, ref) {
  const lang = useLanguage();
  const s = isRtl(lang) ? mirrorStyle(StyleSheet.flatten(style) as Record<string, unknown> | undefined, true) : style;
  return (
    <RNText ref={ref} style={s as TextProps['style']} {...rest}>
      {translateChildren(children, lang) as React.ReactNode}
    </RNText>
  );
});
