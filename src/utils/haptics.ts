import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (Platform.OS === 'web') return;
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
