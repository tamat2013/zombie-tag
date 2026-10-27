// Personal skin designer: body/accent colors, eyes, pattern, accessory and name, with a live preview.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScreenProps } from '../navigation/types';
import type { Role, Skin, SkinEyes, SkinPattern } from '../types';
import { Screen, ScreenHeader, Card, Chip, H } from '../components/ui';
import { Button } from '../components/Button';
import { Character } from '../components/Character';
import { useGame, useProfile } from '../state/GameContext';
import { SKIN_ACCESSORIES, SKIN_COLOR_PALETTE } from '../data/skins';
import { bumpStat } from '../logic/progression';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

const EYES: { id: SkinEyes; label: string }[] = [
  { id: 'round', label: 'עגולות' },
  { id: 'angry', label: 'כועסות' },
  { id: 'sleepy', label: 'ישנוניות' },
  { id: 'cyclops', label: 'קיקלופ' },
];

const PATTERNS: { id: SkinPattern; label: string }[] = [
  { id: 'none', label: 'חלק' },
  { id: 'stripes', label: 'פסים' },
  { id: 'spots', label: 'נקודות' },
  { id: 'split', label: 'חצוי' },
  { id: 'ring', label: 'טבעת' },
];

const MAX_CUSTOM = 12;

export function SkinDesignerScreen({ navigation, route }: ScreenProps<'SkinDesigner'>) {
  const profile = useProfile();
  const { updateProfile, toast } = useGame();
  const existing = profile.customSkins.find((s) => s.id === route.params?.skinId);

  const [name, setName] = useState(existing?.name ?? 'הסקין שלי');
  const [body, setBody] = useState(existing?.body ?? SKIN_COLOR_PALETTE[13]);
  const [accent, setAccent] = useState(existing?.accent ?? SKIN_COLOR_PALETTE[4]);
  const [eyes, setEyes] = useState<SkinEyes>(existing?.eyes ?? 'round');
  const [pattern, setPattern] = useState<SkinPattern>(existing?.pattern ?? 'stripes');
  const [accessory, setAccessory] = useState(existing?.accessory ?? '');
  const [previewRole, setPreviewRole] = useState<Role>('survivor');

  const skin: Skin = {
    id: existing?.id ?? 'preview',
    name: name.trim() || 'הסקין שלי',
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
      toast(`אפשר לשמור עד ${MAX_CUSTOM} סקינים אישיים`, { tone: 'bad' });
      return;
    }
    const saved: Skin = { ...skin, id: existing?.id ?? `custom-${Date.now().toString(36)}` };
    let next = {
      ...profile,
      customSkins: existing ? profile.customSkins.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...profile.customSkins],
      selectedSkinId: saved.id,
    };
    let unlocked: string[] = [];
    if (!existing) {
      const r = bumpStat(next, 'skinsCreated');
      next = r.profile;
      unlocked = r.unlocked.map((a) => `${a.badge} ${a.title}`);
    }
    updateProfile(next);
    haptic('success');
    toast(existing ? 'הסקין עודכן' : 'הסקין נשמר ונבחר!', { icon: '🎨', tone: 'good' });
    unlocked.forEach((u) => toast(`הישג חדש: ${u}`, { tone: 'good' }));
    navigation.goBack();
  };

  const remove = () => {
    if (!existing) return;
    updateProfile((p) => ({
      ...p,
      customSkins: p.customSkins.filter((s) => s.id !== existing.id),
      selectedSkinId: p.selectedSkinId === existing.id ? p.ownedSkins[0] : p.selectedSkinId,
    }));
    toast('הסקין נמחק', { icon: '🗑️' });
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <ScreenHeader title={existing ? 'עריכת סקין' : 'מעצב סקינים'} />

      <Card style={styles.preview}>
        <View style={styles.stage}>
          <Character skin={skin} size={140} role={previewRole} />
        </View>
        <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10 }}>
          <Chip label="שורד" active={previewRole === 'survivor'} onPress={() => setPreviewRole('survivor')} color={colors.survivor} />
          <Chip label="זומבי" active={previewRole === 'zombie'} onPress={() => setPreviewRole('zombie')} />
          <Chip label="🎲 אקראי" onPress={randomize} color={colors.gold} />
        </View>
      </Card>

      <Section title="שם">
        <TextInput value={name} onChangeText={setName} maxLength={14} style={styles.input} placeholderTextColor={colors.textMuted} />
      </Section>

      <Section title="צבע גוף">
        <Swatches value={body} onChange={setBody} />
      </Section>
      <Section title="צבע משני">
        <Swatches value={accent} onChange={setAccent} />
      </Section>

      <Section title="עיניים">
        <View style={styles.chips}>
          {EYES.map((e) => (
            <Chip key={e.id} label={e.label} active={eyes === e.id} onPress={() => setEyes(e.id)} />
          ))}
        </View>
      </Section>

      <Section title="דוגמה">
        <View style={styles.chips}>
          {PATTERNS.map((p) => (
            <Chip key={p.id} label={p.label} active={pattern === p.id} onPress={() => setPattern(p.id)} />
          ))}
        </View>
      </Section>

      <Section title="אביזר">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse' }}>
          {SKIN_ACCESSORIES.map((a) => (
            <Pressable key={a || 'none'} onPress={() => setAccessory(a)} style={[styles.acc, accessory === a && { borderColor: colors.toxic }]}>
              <Text style={{ fontSize: 24 }}>{a || '🚫'}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Section>

      <Text style={styles.note}>סקינים אישיים הם קוסמטיים בלבד (ללא כוח מיוחד), כדי לשמור על משחק הוגן.</Text>
      <Button title={existing ? 'שמור שינויים' : 'שמור ובחר'} icon="💾" onPress={save} style={{ marginTop: 12 }} />
      {existing ? <Button title="מחק סקין" icon="🗑️" variant="danger" small onPress={remove} style={{ marginTop: 10 }} /> : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <H size={15} style={{ marginBottom: 8 }}>
        {title}
      </H>
      {children}
    </View>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.swatches}>
      {SKIN_COLOR_PALETTE.map((c) => (
        <Pressable key={c} onPress={() => onChange(c)} style={[styles.swatch, { backgroundColor: c }, value === c && styles.swatchActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', paddingVertical: 20 },
  stage: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#0e160c', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: '#0a0f09', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlign: 'right' },
  swatches: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  swatchActive: { borderColor: '#fff', borderWidth: 3, transform: [{ scale: 1.15 }] },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  acc: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  note: { color: colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 18 },
});
