// The monthly "rate the game" pop-up. Shown on the home screen until the player rates; "Later" waits a month.
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { View } from '../i18n/Layout';
import { Text } from '../i18n/Text';
import { RatingBox } from './RatingBox';
import { shouldAskForRating } from '../logic/rating';
import { ratingService } from '../services/ratingService';
import { useGame, useProfile } from '../state/GameContext';
import { colors, radius } from '../theme';

export function RatingPrompt() {
  const profile = useProfile();
  const { toast } = useGame();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    ratingService.touch().then((s) => {
      if (alive && shouldAskForRating(s, Date.now())) {
        setOpen(true);
        ratingService.markAsked();
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!open) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Enjoying Zombie Tag?</Text>
        <Text style={styles.sub}>Rate the game from 1 to 5 stars. You can change it later in Settings.</Text>
        <RatingBox
          saveLabel="Send rating"
          onLater={() => setOpen(false)}
          onSave={async (stars, review) => {
            await ratingService.save(profile.uid, profile.displayName, stars, review);
            setOpen(false);
            toast('Thanks for rating!', { icon: '⭐' });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 },
  card: { width: '100%', maxWidth: 420, gap: 10, padding: 16, borderRadius: radius.lg, backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.border },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  sub: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
});
