// Tells the UI which layout to use: "desktop" (a computer's browser with a wide window) or "phone"
// (the app, and the web build opened on a phone/tablet).
import { Platform, useWindowDimensions } from 'react-native';

export type DeviceKind = 'desktop' | 'phone';

export const DESKTOP_MIN_WIDTH = 900;

// True for browsers on touch-only devices (phones, tablets), false for computers with a mouse.
export const isTouchWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

export function useDevice(): { kind: DeviceKind; isDesktop: boolean; width: number; height: number } {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && !isTouchWeb && width >= DESKTOP_MIN_WIDTH;
  return { kind: isDesktop ? 'desktop' : 'phone', isDesktop, width, height };
}
