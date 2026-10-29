// Drop-in replacement for react-native's Text that shows the string in the player's language.
import React from 'react';
import { Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';
import { useLanguage } from './language';
import { translateChildren } from './translate';

export const Text = React.forwardRef<RNText, TextProps>(function Text({ children, ...rest }, ref) {
  const lang = useLanguage();
  return (
    <RNText ref={ref} {...rest}>
      {translateChildren(children, lang) as React.ReactNode}
    </RNText>
  );
});
