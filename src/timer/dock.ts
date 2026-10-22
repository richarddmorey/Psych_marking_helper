import { timerDock, timerTab } from '../dom';

let timerOpen = false;
let forceTimerTimeout: number | null = null;
let forceCloseOnEnd = false;

export function setTimerOpen(open: boolean): void {
  timerOpen = open;
  timerDock.classList.toggle('open', open);
  timerTab.setAttribute('aria-expanded', String(open));
  const label = open ? 'Close timer' : 'Open timer';
  timerTab.setAttribute('aria-label', label);
  timerTab.setAttribute('title', label);
}

/** Reveals the panel for `ms` if it was closed (used by Warning/Alarm). */
export function forceTimerOpenFor(ms: number): void {
  if (forceTimerTimeout) clearTimeout(forceTimerTimeout);
  forceCloseOnEnd = false;

  if (!timerOpen) {
    setTimerOpen(true);
    forceCloseOnEnd = true;
  }

  forceTimerTimeout = window.setTimeout(() => {
    if (forceCloseOnEnd) setTimerOpen(false);
    forceTimerTimeout = null;
    forceCloseOnEnd = false;
  }, ms);
}

export function bindTimerDock(): void {
  timerTab.addEventListener('click', () => {
    if (forceTimerTimeout) {
      clearTimeout(forceTimerTimeout);
      forceTimerTimeout = null;
      forceCloseOnEnd = false;
    }
    setTimerOpen(!timerOpen);
  });
}
