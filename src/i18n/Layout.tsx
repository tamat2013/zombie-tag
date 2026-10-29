// Drop-in View / Pressable / ScrollView / TextInput that mirror their styles for right-to-left languages.
import React from 'react';
import { Pressable as RNPressable, ScrollView as RNScrollView, StyleSheet, TextInput as RNTextInput, View as RNView } from 'react-native';
import type { PressableProps, ScrollViewProps, StyleProp, TextInputProps, ViewProps } from 'react-native';
import { isRtl, mirrorStyle } from './direction';
import { useLanguage } from './language';
import { fonts } from '../theme';

function useRtl() {
  return isRtl(useLanguage());
}

function mirror(style: StyleProp<any>, rtl: boolean, text = false): StyleProp<any> {
  if (!rtl) return style;
  return mirrorStyle(StyleSheet.flatten(style) as Record<string, unknown> | undefined, text);
}

export const View = React.forwardRef<RNView, ViewProps>(function View({ style, ...rest }, ref) {
  const rtl = useRtl();
  return <RNView ref={ref} style={mirror(style, rtl)} {...rest} />;
});

export const Pressable = React.forwardRef<RNView, PressableProps>(function Pressable({ style, ...rest }, ref) {
  const rtl = useRtl();
  const s = typeof style === 'function' ? (state: any) => mirror(style(state), rtl) : mirror(style, rtl);
  return <RNPressable ref={ref} style={s as PressableProps['style']} {...rest} />;
});

export const ScrollView = React.forwardRef<RNScrollView, ScrollViewProps>(function ScrollView({ style, contentContainerStyle, ...rest }, ref) {
  const rtl = useRtl();
  return <RNScrollView ref={ref} style={mirror(style, rtl)} contentContainerStyle={mirror(contentContainerStyle, rtl)} {...rest} />;
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const rtl = useRtl();
  return <RNTextInput ref={ref} style={[{ fontFamily: fonts.medium }, mirror(style, rtl, true)]} {...rest} />;
});
