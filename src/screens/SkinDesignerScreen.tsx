// Personal skin designer: body/accent colors, eyes, pattern, accessory and name, with a live preview. The phone keeps the preview on the left and switches between the look and the face on the right; the desktop shows both side by side.
import { useDevice } from '../utils/device';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, TextInput, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { ScreenProps } from '../navigation/types';
import type { Role, Skin, SkinEyes, SkinPattern } from '../types';
import { Card, Chip, H, Screen, ScreenHeader, Tabs } from '../components/ui';
import { Glyph, Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { SKIN_ACCESSORIES, SKIN_COLOR_PALETTE } from '../data/skins';
import { bumpStat } from '../logic/progression';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

const EYES: { id: SkinEyes; label: string }[] = [
  { id: 'round', label: 'Round' },
  { id: 'angry', label: 'Angry' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'cyclops', label: 'Cyclops' },
];

const PATTERNS: { id: SkinPattern; label: string }[] = [
  { id: 'none', label: 'Plain' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'spots', label: 'Spots' },
  { id: 'split', label: 'Split' },
  { id: 'ring', label: 'Ring' },
];

const MAX_CUSTOM = 12;

type Tab = 'look' | 'face';

export function SkinDesignerScreen({ navigation, route }: ScreenProps<'SkinDesigner'>) {
  const { isDesktop } = useDevice();
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const existing = profile.customSkins.find((s) => s.id === route.params?.skinId);

  const [name, setName] = useState(existing?.name ?? 'My skin');
  const [body, setBody] = useState(existing?.body ?? SKIN_COLOR_PALETTE[13]);
  const [accent, setAccent] = useState(existing?.accent ?? SKIN_COLOR_PALETTE[4]);
  const [eyes, setEyes] = useState<SkinEyes>(existing?.eyes ?? 'round');
  const [pattern, setPattern] = useState<SkinPattern>(existing?.pattern ?? 'stripes');
  const [accessory, setAccessory] = useState(existing?.accessory ?? '');
  const [previewRole, setPreviewRole] = useState<Role>('survivor');
  const [tab, setTab] = useState<Tab>('look');

  const skin: Skin = {
    id: existing?.id ?? 'preview',
    name: name.trim() || 'My skin',
    body,
    accent,
    eyes,
    pattern,
    accessory,
    price: 0,
    rarity: 'common',
    custom: true,
  };

  const randomize = () => {
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
    setBody(pick(SKIN_COLOR_PALETTE));
    setAccent(pick(SKIN_COLOR_PALETTE));
    setEyes(pick(EYES).id);
    setPattern(pick(PATTERNS).id);
    setAccessory(pick(SKIN_ACCESSORIES));
    haptic('light');
  };

  const save = () => {
    if (!existing && profile.customSkins.length >= MAX_CUSTOM) {
      toast(`You can save up to ${MAX_CUSTOM} custom skins`, { tone: 'bad' });
      return;
    }
    const saved: Skin = { ...skin, id: existing?.id ?? `custom-${Date.now().toString(36)}` };
    let next = {
      ...profile,
      customSkins: existing ? profile.customSkins.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...profile.customSkins],
      selectedSkinId: saved.id,
    };
    let unlocked: { title: string; badge: string }[] = [];
    if (!existing) {
      const r = bumpStat(next, 'skinsCreated');
      next = r.profile;
      unlocked = r.unlocked;
    }
    updateProfile(next);
    haptic('success');
    toast(existing ? 'Skin updated' : 'Skin saved and selected!', { icon: '🎨', tone: 'good' });
    unlocked.forEach((a) => toast(`New achievement: ${a.title}`, { icon: a.badge, tone: 'good' }));
    navigation.goBack();
  };

  const remove = () => {
    if (!existing) return;
    updateProfile((p) => ({
      ...p,
      customSkins: p.customSkins.filter((s) => s.id !== existing.id),
      selectedSkinId: p.selectedSkinId === existing.id ? p.ownedSkins[0] : p.selectedSkinId,
    }));
    toast('Skin deleted', { icon: '🗑️' });
    navigation.goBack();
  };

  const preview = (
    <Card style={[styles.preview, isDesktop ? styles.previewDesk : styles.previewPhone]}>
      <View style={[styles.stage, isDesktop ? styles.stageDesk : styles.stagePhone]}>
        <Character skin={skin} size={isDesktop ? 140 : 72} role={previewRole} />
      </View>
      <View style={styles.chips}>
        <Chip label="Survivor" active={previewRole === 'survivor'} onPress={() => setPreviewRole('survivor')} color={colors.survivor} />
        <Chip label="Zombie" active={previewRole === 'zombie'} onPress={() => setPreviewRole('zombie')} />
        {isDesktop ? <Chip label="Random" onPress={randomize} color={colors.gold} /> : null}
      </View>
    </Card>
  );

  const nameField = (
    <View style={styles.field}>
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} maxLength={14} style={[styles.input, !isDesktop && styles.inputPhone]} placeholderTextColor={colors.textMuted} />
    </View>
  );

  const look = (
    <View style={[styles.stack, isDesktop && styles.stackDesk]}>
      <Section title="Body color" phone={!isDesktop}>
        <Swatches value={body} onChange={setBody} size={isDesktop ? 30 : 22} />
      </Section>
      <Section title="Accent color" phone={!isDesktop}>
        <Swatches value={accent} onChange={setAccent} size={isDesktop ? 30 : 22} />
      </Section>
    </View>
  );

  const face = (
    <View style={[styles.stack, isDesktop && styles.stackDesk]}>
      <Section title="Eyes" phone={!isDesktop}>
        <View style={styles.chips}>
          {EYES.map((e) => (
            <Chip key={e.id} label={e.label} active={eyes === e.id} onPress={() => setEyes(e.id)} />
          ))}
        </View>
      </Section>
      <Section title="Pattern" phone={!isDesktop}>
        <View style={styles.chips}>
          {PATTERNS.map((p) => (
            <Chip key={p.id} label={p.label} active={pattern === p.id} onPress={() => setPattern(p.id)} />
          ))}
        </View>
      </Section>
      <Section title="Accessory" phone={!isDesktop}>
        <View style={styles.accs}>
          {SKIN_ACCESSORIES.map((a) => (
            <Pressable key={a || 'none'} onPress={() => setAccessory(a)} style={[styles.acc, isDesktop ? styles.accDesk : styles.accPhone, accessory === a && styles.accOn]}>
              {a ? <Glyph emoji={a} size={isDesktop ? 26 : 17} color={colors.gold} /> : <Icon name="cancel" size={isDesktop ? 24 : 16} color={colors.textDim} />}
            </Pressable>
          ))}
        </View>
      </Section>
    </View>
  );

  const saveButton = (small: boolean) => (
    <Button title={existing ? 'Save changes' : 'Save and select'} icon="💾" small={small} style={small ? { flex: 1 } : undefined} onPress={save} />
  );
  const deleteButton = existing ? <Button title="Delete skin" icon="🗑️" variant="danger" small onPress={remove} /> : null;

  const left = isDesktop ? (
    <View style={styles.leftDesk}>
      {preview}
      {nameField}
      <Text style={styles.note}>Custom skins are cosmetic only (no special power) to keep the game fair.</Text>
      <View style={styles.grow} />
      {saveButton(false)}
      {deleteButton}
    </View>
  ) : (
    <View style={styles.leftPhone}>
      {preview}
      {nameField}
    </View>
  );

  const right = isDesktop ? (
    <View style={styles.rightDesk}>
      <Card style={styles.col}>{look}</Card>
      <Card style={styles.col}>{face}</Card>
    </View>
  ) : (
    <View style={styles.right}>
      <Tabs<Tab> tabs={[{ id: 'look', label: 'Look' }, { id: 'face', label: 'Face' }]} value={tab} onChange={setTab} />
      <Card style={styles.panel}>{tab === 'look' ? look : face}</Card>
      <View style={styles.footer}>
        <Button title="Random" variant="blue" small onPress={randomize} />
        {saveButton(true)}
        {deleteButton}
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title={existing ? 'Edit skin' : 'Skin designer'} />
      <View style={[styles.row, isDesktop && styles.rowDesk]}>
        {left}
        {right}
      </View>
    </Screen>
  );
}

function Section({ title, phone, children }: { title: string; phone: boolean; children: React.ReactNode }) {
  if (phone) {
    return (
      <View style={styles.inline}>
        <Text style={styles.inlineLabel} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.inlineBody}>{children}</View>
      </View>
    );
  }
  return (
    <View>
      <H size={15} style={styles.sectionTitle}>
        {title}
      </H>
      {children}
    </View>
  );
}

function Swatches({ value, onChange, size }: { value: string; onChange: (c: string) => void; size: number }) {
  return (
    <View style={styles.swatches}>
      {SKIN_COLOR_PALETTE.map((c) => (
        <Pressable key={c} onPress={() => onChange(c)} style={[styles.swatch, { width: size, height: size, borderRadius: size / 2, backgroundColor: c }, value === c && styles.swatchActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 12 },
  rowDesk: { gap: 28 },
  grow: { flex: 1 },
  // Phone: the preview and name on the left, the look or the face on the right.
  leftPhone: { width: 200, gap: 6 },
  right: { flex: 1, gap: 6 },
  panel: { flex: 1, padding: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Desktop: the preview, name and save on the left, the look and the face side by side.
  leftDesk: { width: 340, gap: 14 },
  rightDesk: { flex: 1, flexDirection: 'row', gap: 16 },
  col: { flex: 1, padding: 16 },
  preview: { alignItems: 'center' },
  previewPhone: { padding: 8, gap: 6 },
  previewDesk: { padding: 16, gap: 12 },
  stage: { alignItems: 'center', justifyContent: 'center', borderRadius: 100, backgroundColor: 'rgba(13,10,31,0.55)', borderWidth: 1, borderColor: colors.border },
  stagePhone: { width: 84, height: 84 },
  stageDesk: { width: 200, height: 200 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  field: { gap: 3 },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800' },
  input: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlign: 'left' },
  inputPhone: { paddingVertical: 7, fontSize: 15 },
  stack: { gap: 8 },
  stackDesk: { gap: 18 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineLabel: { width: 92, color: colors.textDim, fontSize: 12, fontWeight: '800' },
  inlineBody: { flex: 1 },
  sectionTitle: { marginBottom: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatch: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  swatchActive: { borderColor: '#fff', borderWidth: 3, transform: [{ scale: 1.15 }] },
  accs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  acc: { borderRadius: radius.sm, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  accPhone: { width: 28, height: 28 },
  accDesk: { width: 48, height: 48, borderRadius: 12 },
  accOn: { borderColor: colors.toxic },
  note: { color: colors.textMuted, fontSize: 12, textAlign: 'left' },
});
