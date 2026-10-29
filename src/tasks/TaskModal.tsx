import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import type { TaskType } from '../types';
import { TASK_COMPONENTS, TASK_INFO } from './TaskGames';
import { colors } from '../theme';

interface Props {
  type: TaskType;
  speed: number;
  onComplete: () => void;
  onClose: () => void;
  danger: boolean;
}

/** Overlay that hosts a mini-game. The world keeps running behind it. */
export function TaskModal({ type, speed, onComplete, onClose, danger }: Props) {
  const Game = TASK_COMPONENTS[type];
  const info = TASK_INFO[type];
  return (
    <View style={styles.backdrop}>
      <View style={[styles.panel, danger && { borderColor: colors.blood }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text style={styles.title}>
            {info.title} {info.icon}
          </Text>
        </View>
        <Text style={styles.hint}>{info.hint}</Text>
        {danger ? <Text style={styles.danger}>⚠️ Zombie nearby!</Text> : null}
        <View style={styles.body}>
          <Game onComplete={onComplete} speed={speed} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  panel: { backgroundColor: colors.panel, borderRadius: 18, padding: 14, borderWidth: 2, borderColor: colors.border, minWidth: 340, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.panelLight, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.text, fontSize: 16, fontWeight: '900' },
  hint: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: 8 },
  danger: { color: colors.blood, fontWeight: '900', marginBottom: 6 },
  body: { paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
});
