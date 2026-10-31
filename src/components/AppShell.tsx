// Navigation chrome for the menu screens: a left sidebar on desktop, a bottom tab bar on phones.
import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useGame } from '../state/GameContext';
import { claimableCount } from '../logic/missions';
import { levelInfo } from '../logic/progression';
import { colors, fonts, radius } from '../theme';
import { playSfx } from '../services/sound';
import { useDevice } from '../utils/device';

export type ShellKey = 'Home' | 'Shop' | 'Missions' | 'SkinSelect' | 'Profile' | 'Settings';

const ITEMS: { key: ShellKey; label: string; icon: IconName }[] = [
  { key: 'Home', label: 'Home', icon: 'home-variant-outline' },
  { key: 'Shop', label: 'Shop', icon: 'shopping-outline' },
  { key: 'Missions', label: 'Missions', icon: 'clipboard-check-outline' },
  { key: 'SkinSelect', label: 'Skins', icon: 'tshirt-crew-outline' },
  { key: 'Profile', label: 'Profile', icon: 'account-outline' },
];

function useItems(active: ShellKey) {
  const nav = useNavigation<any>();
  const { profile } = useGame();
  const ready = profile ? claimableCount(profile, Date.now()) : 0;
  return ITEMS.map((it) => ({
    ...it,
    active: it.key === active,
    badge: it.key === 'Missions' ? ready : 0,
    go: () => {
      if (it.key === active) return;
      playSfx('click', 0.6);
      if (it.key === 'Home') nav.navigate('Home');
      else nav.navigate(it.key);
    },
  }));
}

export function SideBar({ active }: { active: ShellKey }) {
  const items = useItems(active);
  const nav = useNavigation<any>();
  const { profile } = useGame();
  const lvl = profile ? levelInfo(profile.xp) : null;
  return (
    <View style={s.side}>
      <Text style={s.logo}>ZOMBIE TAG</Text>
      {profile ? (
        <View style={s.me}>
          <View style={s.meBadge}>
            <Text style={s.meBadgeText}>{lvl?.level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.meName} numberOfLines={1}>
              {profile.displayName}
            </Text>
            <Text style={s.meSub}>
              {profile.coins.toLocaleString()} coins · {profile.medals} medals
            </Text>
          </View>
        </View>
      ) : null}
      <View style={{ gap: 6, marginTop: 8 }}>
        {items.map((it) => (
          <Pressable key={it.key} onPress={it.go} style={({ pressed }) => [s.sideItem, it.active && s.sideItemOn, pressed && { opacity: 0.8 }]} accessibilityState={{ selected: it.active }}>
            <Icon name={it.icon} size={22} color={it.active ? colors.ink : colors.textDim} />
            <Text style={[s.sideLabel, it.active && { color: colors.ink }]}>{it.label}</Text>
            {it.badge ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{it.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => nav.navigate('Settings')} style={[s.sideItem, active === 'Settings' && s.sideItemOn]}>
        <Icon name="cog-outline" size={22} color={active === 'Settings' ? colors.ink : colors.textDim} />
        <Text style={[s.sideLabel, active === 'Settings' && { color: colors.ink }]}>Settings</Text>
      </Pressable>
    </View>
  );
}

export function TabBar({ active }: { active: ShellKey }) {
  const items = useItems(active);
  return (
    <View style={s.tabs}>
      {items.map((it) => (
        <Pressable key={it.key} onPress={it.go} style={s.tab} accessibilityState={{ selected: it.active }}>
          <View style={[s.tabIcon, it.active && s.tabIconOn]}>
            <Icon name={it.icon} size={22} color={it.active ? colors.ink : colors.textDim} />
            {it.badge ? (
              <View style={[s.badge, { position: 'absolute', top: -4, right: -4 }]}>
                <Text style={s.badgeText}>{it.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[s.tabLabel, it.active && { color: colors.toxic }]}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function useShellKind() {
  return useDevice().kind;
}

const s = StyleSheet.create({
  side: { width: 248, backgroundColor: colors.bgAlt, padding: 18, gap: 10, borderRightWidth: 2, borderRightColor: colors.border },
  logo: { color: colors.toxic, fontSize: 28, fontFamily: fonts.logo, marginBottom: 8 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.panel, borderRadius: radius.md, padding: 10 },
  meBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blood, alignItems: 'center', justifyContent: 'center' },
  meBadgeText: { color: colors.text, fontWeight: '900', fontSize: 15 },
  meName: { color: colors.text, fontWeight: '800', fontSize: 15, textAlign: 'left' },
  meSub: { color: colors.textDim, fontSize: 12, textAlign: 'left' },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingHorizontal: 14, borderRadius: radius.md },
  sideItemOn: { backgroundColor: colors.toxic },
  sideLabel: { color: colors.textDim, fontWeight: '800', fontSize: 15 },
  badge: { marginLeft: 'auto', minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.blood, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: colors.bgAlt },
  badgeText: { color: colors.text, fontWeight: '900', fontSize: 12 },
  tabs: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 3, paddingBottom: 3 },
  tab: { flex: 1, alignItems: 'center', gap: 1, minHeight: 50, justifyContent: 'center' },
  tabIcon: { width: 52, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: colors.toxic },
  tabLabel: { color: colors.textDim, fontSize: 11, fontWeight: '800' },
});
