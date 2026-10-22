import { DEFAULT_TEMPLATE_ID, TEMPLATES, isSelectableTemplate } from './data/templates';
import { cyrb53 } from './lib/text';
import { SETTINGS } from './data/settings';
import { drafts, emptyDraft, prefs, timerSettings } from './state';
import type { Template } from './types';

const PREFS_KEY = SETTINGS.storage.prefsKey;
const DRAFTS_KEY = SETTINGS.storage.draftsKey;
const TIMER_KEY = SETTINGS.storage.timerKey;

export let storageAvailable = true;
try {
  localStorage.setItem('__pmh_test__', '1');
  localStorage.removeItem('__pmh_test__');
} catch {
  storageAvailable = false;
}

export function templateHash(template: Template): string {
  const canonical = JSON.stringify({
    prefixes: template.prefixes || {},
    sections: template.sections || []
  });
  return cyrb53(canonical).toString(16);
}

export function loadPrefs(): void {
  if (!storageAvailable) return;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    prefs.name = typeof parsed.name === 'string' ? parsed.name : '';
    prefs.htmlMode = parsed.htmlMode !== false;
    prefs.template = isSelectableTemplate(parsed.template) ? parsed.template : DEFAULT_TEMPLATE_ID;
  } catch {
    /* ignore */
  }
}

export function savePrefs(): void {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** Drafts with a mismatched template hash or older than maxDraftAgeDays are discarded. */
export function loadDrafts(): void {
  if (!storageAvailable) return;
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const maxAgeMs = SETTINGS.storage.maxDraftAgeDays * 86400 * 1000;

    Object.keys(TEMPLATES).forEach((tid) => {
      const stored = parsed[tid];
      if (!stored || typeof stored !== 'object') return;

      if (stored.hash !== templateHash(TEMPLATES[tid])) {
        drafts[tid] = emptyDraft();
        return;
      }
      if (stored.savedAt && now - stored.savedAt > maxAgeMs) {
        drafts[tid] = emptyDraft();
        return;
      }

      drafts[tid] = {
        sections: stored.sections && typeof stored.sections === 'object' ? stored.sections : {},
        collapsed: stored.collapsed && typeof stored.collapsed === 'object' ? stored.collapsed : {},
        savedAt: stored.savedAt || 0
      };
    });
  } catch {
    /* ignore */
  }
}

export function saveDrafts(): void {
  if (!storageAvailable) return;
  try {
    const toStore: Record<string, unknown> = {};
    Object.keys(drafts).forEach((tid) => {
      if (!drafts[tid] || !TEMPLATES[tid]) return;
      const isActive = tid === prefs.template;
      toStore[tid] = {
        hash: templateHash(TEMPLATES[tid]),
        sections: drafts[tid].sections || {},
        collapsed: drafts[tid].collapsed || {},
        savedAt: isActive ? Date.now() : drafts[tid].savedAt || 0
      };
    });
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(toStore));
  } catch {
    /* ignore */
  }
}

let saveTimer: number | undefined;

export function scheduleDraftsSave(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveDrafts, SETTINGS.storage.autosaveDelayMs);
}

export function flushDraftsSave(): void {
  clearTimeout(saveTimer);
  saveDrafts();
}

export function loadTimerSettings(): void {
  if (!storageAvailable) return;
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p.warningEnabled === 'boolean') timerSettings.warningEnabled = p.warningEnabled;
    if (typeof p.warningSec === 'number' && p.warningSec >= 1) timerSettings.warningSec = p.warningSec;
    if (typeof p.alarmEnabled === 'boolean') timerSettings.alarmEnabled = p.alarmEnabled;
    if (typeof p.alarmSec === 'number' && p.alarmSec >= 1) timerSettings.alarmSec = p.alarmSec;
  } catch {
    /* ignore */
  }
}

export function saveTimerSettings(): void {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timerSettings));
  } catch {
    /* ignore */
  }
}
