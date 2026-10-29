// Line icons for menus and buttons (emoji stay in the game world, not the UI chrome).
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isRtl } from '../i18n/direction';
import { useLanguage } from '../i18n/language';
import { colors } from '../theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** `directional` icons (arrows, chevrons) flip for right-to-left languages. */
export function Icon({ name, size = 22, color = colors.text, directional }: { name: IconName; size?: number; color?: string; directional?: boolean }) {
  const lang = useLanguage();
  const flip = directional && isRtl(lang);
  return <MaterialCommunityIcons name={name} size={size} color={color} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />;
}
