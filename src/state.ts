import type { Draft, Prefs, Template, TimerSettings } from './types';
import { SETTINGS } from './data/settings';
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from './data/templates';

export const prefs: Prefs = { name: '', htmlMode: true, template: DEFAULT_TEMPLATE_ID };

export const drafts: Record<string, Draft> = {};
Object.keys(TEMPLATES).forEach((id) => {
  drafts[id] = emptyDraft();
});

export const timerSettings: TimerSettings = {
  warningEnabled: false,
  warningSec: SETTINGS.timer.defaultWarningSec,
  alarmEnabled: false,
  alarmSec: SETTINGS.timer.defaultAlarmSec
};

export function emptyDraft(): Draft {
  return { sections: {}, collapsed: {}, savedAt: 0 };
}

export function currentTemplate(): Template {
  return TEMPLATES[prefs.template] || TEMPLATES[DEFAULT_TEMPLATE_ID];
}

export function currentDraft(): Draft {
  return drafts[prefs.template] || (drafts[prefs.template] = emptyDraft());
}

export function currentCollapsed(): Record<string, boolean> {
  const d = currentDraft();
  if (!d.collapsed) d.collapsed = {};
  return d.collapsed;
}
