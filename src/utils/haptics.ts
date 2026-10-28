import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getSoundSettings } from '../services/sound';

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (Platform.OS === 'web' || !getSoundSettings().vibration) return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else
      Haptics.impactAsync(
        kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy,
      );
  } catch {
    // Haptics are a nice-to-have.
  }
}
