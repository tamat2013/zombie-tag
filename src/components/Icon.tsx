// Line icons for menus and buttons (emoji stay in the game world, not the UI chrome).
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isRtl } from '../i18n/direction';
import { useLanguage } from '../i18n/language';
import { colors } from '../theme';
import { Text } from '../i18n/Text';
import { GLYPH_MAP } from './glyphMap';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** `directional` icons (arrows, chevrons) flip for right-to-left languages. */
export function Icon({ name, size = 22, color = colors.text, directional }: { name: IconName; size?: number; color?: string; directional?: boolean }) {
  const lang = useLanguage();
  const flip = directional && isRtl(lang);
  return <MaterialCommunityIcons name={name} size={size} color={color} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />;
}

/** Draws a data emoji (accessory, task, ability, outfit...) as a line icon; unknown ones fall back to the emoji text. */
export function Glyph({ emoji, size = 22, color = colors.text, fallbackStyle }: { emoji: string; size?: number; color?: string; fallbackStyle?: object }) {
  const key = emoji.replace(/️/g, '');
  const name = GLYPH_MAP[key];
  if (name) return <Icon name={name as IconName} size={size} color={color} />;
  return <Text style={[{ fontSize: size, color }, fallbackStyle]}>{emoji}</Text>;
}
