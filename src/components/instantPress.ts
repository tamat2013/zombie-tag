// React Native has ONE touch "responder" at a time. While a finger holds the joystick, a normal
// Pressable cannot become the responder, so buttons ignored taps until the joystick was released.
// Raw touch-start events are delivered to the touched view regardless of the responder, so we fire
// the action on touch start, and keep onPress for mouse/keyboard. A short window avoids double firing.
import { useRef } from 'react';

export function instantPress(onPress: () => void, enabled = true) {
  const last = useRef(0);
  const fire = () => {
    if (!enabled) return;
    const t = Date.now();
    if (t - last.current < 350) return;
    last.current = t;
    onPress();
  };
  return { onTouchStart: fire, onPress: fire };
}
