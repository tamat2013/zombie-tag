// Player profile: identity and account on the left, stats, achievements and abilities on the right. The phone pages through the tabs instead of scrolling.
import { useDevice } from '../utils/device';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, TextInput, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { PlayerStats, Role } from '../types';
import { Card, Grid, H, P, Pill, ProgressBar, Screen, ScreenHeader, Tabs } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { findSkin } from '../data/skins';
import { outfitEmoji } from '../data/catalog';
import { ABILITIES, MAX_LOADOUT } from '../engine/abilities';
import { ACHIEVEMENTS, MAX_LEVEL, formatSeconds, levelInfo } from '../logic/progression';
import { toggleLoadout } from '../logic/shop';
import { authService } from '../services/authService';
import { Icon, Glyph } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

type Tab = 'stats' | 'achievements' | 'loadout';

const STAT_ROWS: { key: keyof PlayerStats; label: string; icon: IconName; format?: (n: number) => string }[] = [
  { key: 'matchesPlayed', label: 'Matches', icon: 'gamepad-variant-outline' },
  { key: 'wins', label: 'Wins', icon: 'trophy-outline' },
  { key: 'survivorWins', label: 'Survivor wins', icon: 'shield-account-outline' },
  { key: 'zombieWins', label: 'Zombie wins', icon: 'skull-outline' },
  { key: 'infections', label: 'Infections', icon: 'biohazard' },
  { key: 'tasksCompleted', label: 'Tasks', icon: 'wrench-outline' },
  { key: 'secondsSurvived', label: 'Time survived', icon: 'timer-outline', format: formatSeconds },
  { key: 'abilitiesUsed', label: 'Abilities used', icon: 'lightning-bolt-outline' },
  { key: 'obstacleRuns', label: 'Obstacle runs', icon: 'flag-checkered' },
  { key: 'obstacleGolds', label: 'Gold medals', icon: 'medal' },
  { key: 'tournamentMatches', label: 'Tournament matches', icon: 'podium' },
  { key: 'skinsCreated', label: 'Skins designed', icon: 'palette-outline' },
  { key: 'mapsCreated', label: 'Maps created', icon: 'map-outline' },
];

const ROLES: { role: Role; title: string }[] = [
  { role: 'survivor', title: 'Survivor' },
  { role: 'zombie', title: 'Zombie' },
];

export function ProfileScreen({ navigation }: ScreenProps<'Profile'>) {
  const { isDesktop } = useDevice();
  const profile = useProfile();
  const { updateProfile, signOut, toast } = useGame();
  const [tab, setTab] = useState<Tab>('stats');
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const info = levelInfo(profile.xp);
  const skin = findSkin(profile.selectedSkinId, profile.customSkins);
  const winRate = profile.stats.matchesPlayed ? Math.round((profile.stats.wins / profile.stats.matchesPlayed) * 100) : 0;
  const earned = ACHIEVEMENTS.filter((a) => profile.achievements.includes(a.id));
  const abilities = ROLES.flatMap(({ role, title }) =>
    profile.ownedAbilities
      .map((id) => ABILITIES[id])
      .filter((a) => a && a.role === role)
      .map((a) => ({ a, role, title })),
  );
  const cloudColor = authService.isOnline ? colors.survivor : colors.textDim;

  const saveName = () => {
    const n = name.trim().slice(0, 16);
    if (n.length < 2) return toast('Name is too short', { tone: 'bad' });
    updateProfile((p) => ({ ...p, displayName: n }));
    setEditingName(false);
    toast('Name updated', { icon: '✏️', tone: 'good' });
  };

  const hero = (
    <Card style={isDesktop ? styles.heroDesk : styles.heroPhone}>
      <Character skin={skin} size={isDesktop ? 96 : 44} outfit={outfitEmoji(profile.equippedOutfit)} />
      <View style={styles.heroText}>
        {editingName ? (
          <View style={styles.editRow}>
            <TextInput value={name} onChangeText={setName} maxLength={16} style={[styles.nameInput, !isDesktop && styles.nameInputPhone]} autoFocus onSubmitEditing={saveName} />
            <Button small title="Save" onPress={saveName} />
          </View>
        ) : (
          <Text style={[styles.name, !isDesktop && styles.namePhone]} numberOfLines={1} onPress={() => setEditingName(true)}>
            {profile.displayName}
          </Text>
        )}
        {isDesktop ? <P dim style={styles.small}>{profile.email}</P> : null}
        <Text style={[styles.level, !isDesktop && styles.levelPhone]}>
          Level {info.level}
          {info.level >= MAX_LEVEL ? ' (max)' : ''}
        </Text>
        <ProgressBar value={info.progress} color={colors.gold} height={isDesktop ? 9 : 6} />
        {isDesktop ? (
          <P dim style={styles.small}>
            {info.level >= MAX_LEVEL ? 'You reached the top level!' : `${info.into}/${info.needed} XP to the next level`}
          </P>
        ) : null}
      </View>
    </Card>
  );

  // Coins and medals already sit in the header's currency bar, so the pills only add what the header lacks.
  const pills = (
    <View style={styles.pills}>
      <Pill lead={<Icon name="trophy-award" size={15} color={colors.purple} />} text={`${profile.achievements.length}/${ACHIEVEMENTS.length}`} color={colors.purple} />
      {isDesktop ? <Pill lead={<Icon name="chart-line" size={15} color={colors.toxic} />} text={`${winRate}% wins`} color={colors.toxic} /> : null}
      <Pill
        lead={<Icon name={authService.isOnline ? 'cloud-check-outline' : 'cloud-off-outline'} size={15} color={cloudColor} />}
        text={authService.isOnline ? 'Cloud synced' : 'Local mode'}
        color={cloudColor}
      />
    </View>
  );

  const badges = (
    <View style={styles.badges}>
      {earned.length ? (
        earned.map((a) => <Glyph key={a.id} emoji={a.badge} size={28} color={colors.gold} />)
      ) : (
        <P dim style={styles.small}>
          No badges yet. Play to unlock achievements!
        </P>
      )}
    </View>
  );

  const actions = (
    <View style={isDesktop ? styles.actionsDesk : styles.actionsPhone}>
      <Button
        small={!isDesktop}
        title={isDesktop ? 'Design a skin' : 'Skins'}
        lead={<Icon name="palette-outline" size={isDesktop ? 20 : 16} color={colors.text} />}
        variant="dark"
        onPress={() => navigation.navigate('SkinDesigner')}
      />
      <Button
        small={!isDesktop}
        title="Sign out"
        lead={<Icon name="logout" size={isDesktop ? 20 : 16} color={colors.ink} directional />}
        variant="danger"
        onPress={() => signOut()}
      />
    </View>
  );

  const left = (
    <View style={isDesktop ? styles.leftDesk : styles.leftPhone}>
      {hero}
      {pills}
      {isDesktop ? badges : null}
      <View style={styles.grow} />
      {actions}
    </View>
  );

  const tabs = (
    <Tabs<Tab>
      tabs={[
        { id: 'stats', label: 'Stats' },
        { id: 'achievements', label: 'Achievements' },
        { id: 'loadout', label: 'Abilities' },
      ]}
      value={tab}
      onChange={setTab}
    />
  );

  const statGrid = (
    <Grid
      items={STAT_ROWS}
      minWidth={isDesktop ? 200 : 130}
      minHeight={isDesktop ? 96 : 30}
      gap={isDesktop ? 12 : 6}
      paged
      renderItem={(s) => {
        const value = s.format ? s.format(profile.stats[s.key]) : profile.stats[s.key].toLocaleString();
        return isDesktop ? (
          <Card style={[styles.cell, styles.centered]}>
            <Icon name={s.icon} size={28} color={colors.toxic} />
            <Text style={styles.valueDesk}>{value}</Text>
            <Text style={styles.labelDesk} numberOfLines={1}>
              {s.label}
            </Text>
          </Card>
        ) : (
          <View style={[styles.tile, styles.tileRow]}>
            <Icon name={s.icon} size={16} color={colors.toxic} />
            <View style={styles.grow}>
              <Text style={styles.value}>{value}</Text>
              <Text style={styles.label} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );

  const achievementGrid = (
    <Grid
      items={ACHIEVEMENTS}
      minWidth={isDesktop ? 300 : 180}
      minHeight={isDesktop ? 96 : 36}
      gap={isDesktop ? 12 : 6}
      paged
      renderItem={(a) => {
        const done = profile.achievements.includes(a.id);
        const [cur, target] = a.progress(profile);
        const content = (
          <>
            <View style={done ? undefined : styles.faded}>
              <Glyph emoji={a.badge} size={isDesktop ? 34 : 20} color={colors.gold} />
            </View>
            <View style={styles.grow}>
              <Text style={isDesktop ? styles.titleDesk : styles.title} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={isDesktop ? styles.descDesk : styles.desc} numberOfLines={1}>
                {a.description}
              </Text>
              {isDesktop && !done ? <ProgressBar value={target ? cur / target : 0} color={colors.purple} height={6} /> : null}
            </View>
            <View style={styles.side}>
              {done ? <Icon name="check-circle" size={isDesktop ? 24 : 16} color={colors.toxic} /> : <Text style={styles.prog}>{cur}/{target}</Text>}
              <Reward coins={a.coins} medals={a.medals} />
            </View>
          </>
        );
        return isDesktop ? (
          <Card style={[styles.cell, styles.achRow]} highlight={done ? colors.gold : undefined}>
            {content}
          </Card>
        ) : (
          <View style={[styles.tile, styles.tileRow, done && styles.tileDone]}>{content}</View>
        );
      }}
    />
  );

  const abilityGrid = (items: typeof abilities) => (
    <Grid
      items={items}
      minWidth={isDesktop ? 200 : 150}
      minHeight={isDesktop ? 120 : 36}
      gap={isDesktop ? 12 : 6}
      paged
      renderItem={({ a, role, title }) => {
        const on = profile.loadout[role].includes(a.id);
        const press = () => {
          const r = toggleLoadout(profile, role, a.id);
          if (r.ok) {
            haptic('light');
            updateProfile(r.profile);
          } else toast(r.error, { tone: 'bad' });
        };
        return (
          <Pressable onPress={press} style={({ pressed }) => [styles.grow, pressed && { opacity: 0.7 }]}>
            {isDesktop ? (
              <Card style={[styles.cell, styles.centered]} highlight={on ? colors.toxic : undefined}>
                <View style={on ? undefined : styles.faded}>
                  <Glyph emoji={a.icon} size={34} />
                </View>
                <Text style={styles.abilityName} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={[styles.status, { color: on ? colors.toxic : colors.textMuted }]}>{on ? 'Equipped' : 'Not equipped'}</Text>
              </Card>
            ) : (
              <View style={[styles.tile, styles.tileRow, on && styles.tileDone]}>
                <View style={on ? undefined : styles.faded}>
                  <Glyph emoji={a.icon} size={20} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={[styles.roleTag, { color: role === 'zombie' ? colors.blood : colors.toxic }]}>{title}</Text>
                </View>
                {on ? <Icon name="check-circle" size={16} color={colors.toxic} /> : null}
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );

  const loadout = isDesktop ? (
    <View style={[styles.grow, styles.stack]}>
      <P dim style={styles.small}>
        Selected abilities show up in matches. You can buy more in the shop.
      </P>
      <View style={styles.columns}>
        {ROLES.map(({ role, title }) => (
          <View key={role} style={styles.column}>
            <H size={16}>
              {title} · {profile.loadout[role].length}/{MAX_LOADOUT}
            </H>
            {abilityGrid(abilities.filter((x) => x.role === role))}
          </View>
        ))}
      </View>
    </View>
  ) : (
    abilityGrid(abilities)
  );

  const body = tab === 'stats' ? statGrid : tab === 'achievements' ? achievementGrid : loadout;

  const right = (
    <View style={[styles.right, isDesktop && styles.rightDesk]}>
      {tabs}
      <View style={styles.grow}>{body}</View>
    </View>
  );

  return (
    <Screen shell="Profile">
      <ScreenHeader title="Profile" />
      <View style={[styles.row, isDesktop && styles.rowDesk]}>
        {left}
        {right}
      </View>
    </Screen>
  );
}

/** The coins and medals an achievement pays out, as small icons. */
function Reward({ coins, medals }: { coins?: number; medals?: number }) {
  return (
    <View style={styles.reward}>
      {coins ? (
        <>
          <Icon name="circle-multiple" size={11} color={colors.coin} />
          <Text style={styles.rewardText}>{coins}</Text>
        </>
      ) : null}
      {medals ? (
        <>
          <Icon name="medal-outline" size={11} color={colors.medal} />
          <Text style={styles.rewardText}>{medals}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 10 },
  rowDesk: { gap: 24 },
  leftPhone: { width: 250, gap: 5 },
  leftDesk: { width: 340, gap: 14 },
  right: { flex: 1, gap: 6 },
  rightDesk: { gap: 14 },
  grow: { flex: 1 },
  stack: { gap: 10 },
  columns: { flex: 1, flexDirection: 'row', gap: 14 },
  column: { flex: 1, gap: 8 },
  heroPhone: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  heroDesk: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroText: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'left' },
  namePhone: { fontSize: 17 },
  nameInput: { flex: 1, backgroundColor: colors.bgAlt, color: colors.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 16, textAlign: 'left', borderWidth: 1, borderColor: colors.border },
  nameInputPhone: { paddingVertical: 3, fontSize: 14 },
  editRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  level: { color: colors.gold, fontWeight: '900', fontSize: 16, textAlign: 'left' },
  levelPhone: { fontSize: 13 },
  small: { fontSize: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionsPhone: { flexDirection: 'row', gap: 6 },
  actionsDesk: { gap: 10 },
  cell: { flex: 1, justifyContent: 'center' },
  centered: { alignItems: 'center', gap: 4, padding: 10 },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { flex: 1, borderRadius: radius.sm, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3 },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileDone: { borderColor: colors.gold },
  faded: { opacity: 0.35 },
  value: { color: colors.text, fontWeight: '900', fontSize: 13 },
  label: { color: colors.textDim, fontSize: 10 },
  valueDesk: { color: colors.text, fontWeight: '900', fontSize: 22 },
  labelDesk: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  title: { color: colors.text, fontWeight: '800', fontSize: 12, textAlign: 'left' },
  titleDesk: { color: colors.text, fontWeight: '900', fontSize: 15, textAlign: 'left' },
  desc: { color: colors.textDim, fontSize: 10, textAlign: 'left' },
  descDesk: { color: colors.textDim, fontSize: 12, textAlign: 'left' },
  side: { alignItems: 'flex-end', gap: 2 },
  prog: { color: colors.textDim, fontWeight: '800', fontSize: 12 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rewardText: { color: colors.coin, fontSize: 11, fontWeight: '700' },
  abilityName: { color: colors.text, fontWeight: '800', fontSize: 14, textAlign: 'center' },
  status: { fontSize: 12, fontWeight: '800' },
  roleTag: { fontSize: 10, fontWeight: '800', textAlign: 'left' },
});
