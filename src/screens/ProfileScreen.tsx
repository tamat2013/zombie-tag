// Player profile: level, stats, achievements & badges, ability loadout and account.
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScreenProps } from '../navigation/types';
import type { PlayerStats, Role } from '../types';
import { Screen, ScreenHeader, Card, H, P, ProgressBar, Tabs, Pill } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { findSkin } from '../data/skins';
import { outfitEmoji } from '../data/catalog';
import { ABILITIES, MAX_LOADOUT } from '../engine/abilities';
import { ACHIEVEMENTS, MAX_LEVEL, formatSeconds, levelInfo } from '../logic/progression';
import { toggleLoadout } from '../logic/shop';
import { authService } from '../services/authService';
import { colors } from '../theme';
import { haptic } from '../utils/haptics';

type Tab = 'stats' | 'achievements' | 'loadout';

const STAT_ROWS: { key: keyof PlayerStats; label: string; icon: string; format?: (n: number) => string }[] = [
  { key: 'matchesPlayed', label: 'משחקים', icon: '🎮' },
  { key: 'wins', label: 'ניצחונות', icon: '🏆' },
  { key: 'survivorWins', label: 'ניצחונות כשורד', icon: '🛡️' },
  { key: 'zombieWins', label: 'ניצחונות כזומבי', icon: '🧟' },
  { key: 'infections', label: 'הדבקות', icon: '☣️' },
  { key: 'tasksCompleted', label: 'משימות', icon: '🔧' },
  { key: 'secondsSurvived', label: 'זמן הישרדות', icon: '⏱️', format: formatSeconds },
  { key: 'abilitiesUsed', label: 'שימוש ביכולות', icon: '⚡' },
  { key: 'obstacleRuns', label: 'ריצות מכשולים', icon: '🏁' },
  { key: 'obstacleGolds', label: 'מדליות זהב', icon: '🥇' },
  { key: 'tournamentMatches', label: 'משחקי טורניר', icon: '🎖️' },
  { key: 'skinsCreated', label: 'סקינים שעוצבו', icon: '🎨' },
  { key: 'mapsCreated', label: 'מפות שנוצרו', icon: '🗺️' },
];

export function ProfileScreen({ navigation }: ScreenProps<'Profile'>) {
  const profile = useProfile();
  const { updateProfile, signOut, toast } = useGame();
  const [tab, setTab] = useState<Tab>('stats');
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const info = levelInfo(profile.xp);
  const skin = findSkin(profile.selectedSkinId, profile.customSkins);
  const winRate = profile.stats.matchesPlayed ? Math.round((profile.stats.wins / profile.stats.matchesPlayed) * 100) : 0;

  const saveName = () => {
    const n = name.trim().slice(0, 16);
    if (n.length < 2) return toast('שם קצר מדי', { tone: 'bad' });
    updateProfile((p) => ({ ...p, displayName: n }));
    setEditingName(false);
    toast('השם עודכן', { icon: '✏️', tone: 'good' });
  };

  return (
    <Screen scroll>
      <ScreenHeader title="פרופיל" />
      <Card style={styles.hero}>
        <Character skin={skin} size={96} outfit={outfitEmoji(profile.equippedOutfit)} />
        <View style={{ flex: 1, gap: 4 }}>
          {editingName ? (
            <View style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>
              <TextInput value={name} onChangeText={setName} maxLength={16} style={styles.nameInput} autoFocus onSubmitEditing={saveName} />
              <Button small title="שמור" onPress={saveName} />
            </View>
          ) : (
            <Text style={styles.name} onPress={() => setEditingName(true)}>
              {profile.displayName} ✏️
            </Text>
          )}
          <P dim style={{ fontSize: 12 }}>{profile.email}</P>
          <Text style={styles.level}>
            ⭐ רמה {info.level}
            {info.level >= MAX_LEVEL ? ' (מקסימום)' : ''}
          </Text>
          <ProgressBar value={info.progress} color={colors.gold} height={9} />
          <P dim style={{ fontSize: 11 }}>
            {info.level >= MAX_LEVEL ? 'הגעת לרמה הגבוהה ביותר!' : `${info.into}/${info.needed} XP לרמה הבאה`}
          </P>
        </View>
      </Card>

      <View style={styles.pills}>
        <Pill icon="🪙" text={profile.coins.toLocaleString()} color={colors.coin} />
        <Pill icon="🏅" text={String(profile.medals)} color={colors.medal} />
        <Pill icon="🎖️" text={`${profile.achievements.length}/${ACHIEVEMENTS.length}`} color={colors.purple} />
        <Pill icon="📈" text={`${winRate}% ניצחונות`} color={colors.toxic} />
        <Pill icon={authService.isOnline ? '🌐' : '📴'} text={authService.isOnline ? 'מחובר לענן' : 'מצב מקומי'} color={authService.isOnline ? colors.survivor : colors.textDim} />
      </View>

      <Tabs
        tabs={[
          { id: 'stats', label: '📊 סטטיסטיקה' },
          { id: 'achievements', label: '🎖️ הישגים' },
          { id: 'loadout', label: '⚡ יכולות' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <View style={{ marginTop: 12 }}>
        {tab === 'stats' ? (
          <View style={styles.grid}>
            {STAT_ROWS.map((s) => (
              <View key={s.key} style={styles.stat}>
                <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                <Text style={styles.statValue}>{s.format ? s.format(profile.stats[s.key]) : profile.stats[s.key].toLocaleString()}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'achievements' ? (
          <View style={{ gap: 8 }}>
            <View style={styles.badges}>
              {ACHIEVEMENTS.filter((a) => profile.achievements.includes(a.id)).map((a) => (
                <Text key={a.id} style={styles.badge}>
                  {a.badge}
                </Text>
              ))}
              {profile.achievements.length === 0 ? <P dim>עוד אין תגים. שחק כדי לפתוח הישגים!</P> : null}
            </View>
            {ACHIEVEMENTS.map((a) => {
              const done = profile.achievements.includes(a.id);
              const [cur, target] = a.progress(profile);
              return (
                <Card key={a.id} style={[styles.row, !done && { opacity: 0.85 }]} highlight={done ? colors.gold : undefined}>
                  <Text style={[styles.achBadge, !done && { opacity: 0.3 }]}>{a.badge}</Text>
                  <View style={{ flex: 1, gap: 3 }}>
                    <H size={15}>{a.title}</H>
                    <P dim style={{ fontSize: 12 }}>{a.description}</P>
                    {!done ? <ProgressBar value={target ? cur / target : 0} color={colors.purple} height={6} /> : null}
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    {done ? <Text style={styles.done}>✔</Text> : <Text style={styles.prog}>{cur}/{target}</Text>}
                    <Text style={styles.reward}>
                      {a.coins ? `${a.coins}🪙` : ''} {a.medals ? `${a.medals}🏅` : ''}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        {tab === 'loadout' ? <LoadoutEditor /> : null}
      </View>

      <View style={{ gap: 10, marginTop: 20 }}>
        <Button title="עיצוב סקין" icon="🎨" variant="dark" onPress={() => navigation.navigate('SkinDesigner')} />
        <Button title="התנתק" icon="🚪" variant="danger" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}

function LoadoutEditor() {
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const roles: { role: Role; title: string }[] = [
    { role: 'survivor', title: '🧍 שורד' },
    { role: 'zombie', title: '🧟 זומבי' },
  ];
  return (
    <View style={{ gap: 14 }}>
      <P dim>היכולות שנבחרו יופיעו במשחק. אפשר לקנות יכולות נוספות בחנות.</P>
      {roles.map(({ role, title }) => (
        <View key={role} style={{ gap: 6 }}>
          <H size={16}>
            {title} · {profile.loadout[role].length}/{MAX_LOADOUT}
          </H>
          <View style={styles.grid}>
            {profile.ownedAbilities
              .map((id) => ABILITIES[id])
              .filter((a) => a && a.role === role)
              .map((a) => {
                const on = profile.loadout[role].includes(a.id);
                return (
                  <Card
                    key={a.id}
                    style={styles.ability}
                    highlight={on ? colors.toxic : undefined}
                    onPress={() => {
                      const r = toggleLoadout(profile, role, a.id);
                      if (r.ok) {
                        haptic('light');
                        updateProfile(r.profile);
                      } else toast(r.error, { tone: 'bad' });
                    }}
                  >
                    <Text style={{ fontSize: 30, opacity: on ? 1 : 0.4 }}>{a.icon}</Text>
                    <Text style={styles.abilityName}>{a.name}</Text>
                    <Text style={{ color: on ? colors.toxic : colors.textMuted, fontSize: 11, fontWeight: '800' }}>{on ? 'מצויד' : 'לא מצויד'}</Text>
                  </Card>
                );
              })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  name: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'right' },
  nameInput: { flex: 1, backgroundColor: colors.bgAlt, color: colors.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: colors.border },
  level: { color: colors.gold, fontWeight: '900', fontSize: 16, textAlign: 'right' },
  pills: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginVertical: 12 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  stat: { width: '31%', flexGrow: 1, backgroundColor: colors.panel, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: 10, gap: 2 },
  statValue: { color: colors.text, fontWeight: '900', fontSize: 18 },
  statLabel: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  badges: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  badge: { fontSize: 30 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  achBadge: { fontSize: 34 },
  done: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  prog: { color: colors.textDim, fontWeight: '800' },
  reward: { color: colors.coin, fontSize: 11, fontWeight: '700' },
  ability: { width: 104, alignItems: 'center', gap: 4, paddingVertical: 12 },
  abilityName: { color: colors.text, fontWeight: '800', fontSize: 12, textAlign: 'center' },
});
