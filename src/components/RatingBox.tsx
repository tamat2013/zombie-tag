// Five tappable stars plus an optional review, shared by the monthly prompt and the Settings screen.
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, TextInput, View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { Button } from './Button';
import { Icon } from './Icon';
import { REVIEW_MAX } from '../logic/rating';
import { colors, radius } from '../theme';
import { haptic } from '../utils/haptics';

export function RatingBox({ initialStars = 0, initialReview = '', saveLabel, onSave, onLater }: {
  initialStars?: number;
  initialReview?: string;
  saveLabel: string;
  onSave: (stars: number, review: string) => void | Promise<void>;
  onLater?: () => void;
}) {
  const [stars, setStars] = useState(initialStars);
  const [review, setReview] = useState(initialReview);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!stars || busy) return;
    setBusy(true);
    try {
      await onSave(stars, review);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.box}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              haptic('light');
              setStars(n);
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n}`}
          >
            <Icon name={n <= stars ? 'star' : 'star-outline'} size={34} color={n <= stars ? colors.gold : colors.textDim} />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={review}
        onChangeText={setReview}
        placeholder="Write a review (optional)"
        placeholderTextColor={colors.textDim}
        maxLength={REVIEW_MAX}
        multiline
        style={styles.input}
      />
      <View style={styles.actions}>
        {onLater ? <Button title="Later" variant="ghost" small onPress={onLater} /> : null}
        <Button title={saveLabel} variant="primary" small disabled={!stars} loading={busy} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, alignSelf: 'stretch' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  input: {
    minHeight: 46,
    maxHeight: 70,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
});
