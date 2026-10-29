// Tells the UI which layout to use: "desktop" (web with a wide window) or "phone" (everything else).
import { Platform, useWindowDimensions } from 'react-native';

export type DeviceKind = 'desktop' | 'phone';

export const DESKTOP_MIN_WIDTH = 900;

export function useDevice(): { kind: DeviceKind; isDesktop: boolean; width: number; height: number } {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
  return { kind: isDesktop ? 'desktop' : 'phone', isDesktop, width, height };
}
