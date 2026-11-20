// Web only: make the page behave like a native full-screen app (no scrolling, no zoom, no text
// selection, edge to edge) and enter real browser fullscreen + landscape lock on the first tap.
import { Platform } from 'react-native';
import { isTouchWeb } from './device';

export function setupWebApp() {
  // Only on phones/tablets; computers keep the normal desktop web page.
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !isTouchWeb) return;

  const meta = document.querySelector('meta[name="viewport"]') ?? document.head.appendChild(document.createElement('meta'));
  meta.setAttribute('name', 'viewport');
  meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

  const addMeta = (name: string, content: string) => {
    if (document.querySelector(`meta[name="${name}"]`)) return;
    const m = document.createElement('meta');
    m.name = name;
    m.content = content;
    document.head.appendChild(m);
  };
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  addMeta('theme-color', '#0b0f0a');

  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { width: 100%; height: 100%; height: 100dvh; margin: 0; padding: 0; overflow: hidden; background: #0b0f0a; }
    body { position: fixed; inset: 0; overscroll-behavior: none; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
    input, textarea { -webkit-user-select: text; user-select: text; touch-action: manipulation; }
  `;
  document.head.appendChild(style);

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const enterFullscreen = () => {
    const el: any = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement) return;
    Promise.resolve(req.call(el, { navigationUI: 'hide' }))
      .then(() => (screen.orientation as any)?.lock?.('landscape'))
      .catch(() => {});
  };
  // Browsers only allow fullscreen from a user gesture. Try on each tap until it works.
  const onTap = () => {
    enterFullscreen();
    if (document.fullscreenElement) document.removeEventListener('pointerup', onTap);
  };
  document.addEventListener('pointerup', onTap);
}
