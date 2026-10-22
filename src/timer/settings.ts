import {
  alarmDur, alarmMin, alarmSec, alarmToggle, warningDur, warningMin, warningSec, warningToggle
} from '../dom';
import { timerSettings } from '../state';
import { saveTimerSettings } from '../storage';
import { showToast } from '../ui/toast';
import { getAudioContext } from './audio';
import { fired } from './timer';

function clamp(value: string, max: number): number {
  return Math.max(0, Math.min(max, parseInt(value, 10) || 0));
}

function readDuration(minInput: HTMLInputElement, secInput: HTMLInputElement): number {
  return clamp(minInput.value, 99) * 60 + clamp(secInput.value, 59);
}

function writeDuration(minInput: HTMLInputElement, secInput: HTMLInputElement, totalSec: number): void {
  minInput.value = String(Math.floor(totalSec / 60));
  secInput.value = String(totalSec % 60);
}

/** Marks invalid (0:00) durations and switches the cue off. */
export function updateDurationValidity(
  minInput: HTMLInputElement,
  secInput: HTMLInputElement,
  durEl: HTMLElement,
  toggleEl: HTMLInputElement
): number {
  const total = readDuration(minInput, secInput);
  durEl.classList.toggle('invalid', total <= 0);

  if (total <= 0 && toggleEl.checked) {
    toggleEl.checked = false;
    if (toggleEl === warningToggle) timerSettings.warningEnabled = false;
    if (toggleEl === alarmToggle) timerSettings.alarmEnabled = false;
    saveTimerSettings();
  }
  return total;
}

interface Cue {
  toggle: HTMLInputElement;
  min: HTMLInputElement;
  sec: HTMLInputElement;
  dur: HTMLElement;
  missingMessage: string;
  fireKey: 'warning' | 'alarm';
  setEnabled: (v: boolean) => void;
  setSeconds: (v: number) => void;
}

const cues: Cue[] = [
  {
    toggle: warningToggle, min: warningMin, sec: warningSec, dur: warningDur,
    missingMessage: 'Please set a warning time first', fireKey: 'warning',
    setEnabled: (v) => (timerSettings.warningEnabled = v),
    setSeconds: (v) => (timerSettings.warningSec = v)
  },
  {
    toggle: alarmToggle, min: alarmMin, sec: alarmSec, dur: alarmDur,
    missingMessage: 'Please set an alarm time first', fireKey: 'alarm',
    setEnabled: (v) => (timerSettings.alarmEnabled = v),
    setSeconds: (v) => (timerSettings.alarmSec = v)
  }
];

function refreshFromUI(cue: Cue): void {
  cue.setSeconds(updateDurationValidity(cue.min, cue.sec, cue.dur, cue.toggle));
  fired[cue.fireKey] = false;
  saveTimerSettings();
}

export function initTimerSettingsUI(): void {
  warningToggle.checked = timerSettings.warningEnabled;
  alarmToggle.checked = timerSettings.alarmEnabled;
  writeDuration(warningMin, warningSec, timerSettings.warningSec);
  writeDuration(alarmMin, alarmSec, timerSettings.alarmSec);
  cues.forEach((c) => updateDurationValidity(c.min, c.sec, c.dur, c.toggle));
}

export function bindTimerSettings(): void {
  cues.forEach((cue) => {
    cue.toggle.addEventListener('change', () => {
      getAudioContext();
      if (cue.toggle.checked && readDuration(cue.min, cue.sec) <= 0) {
        cue.toggle.checked = false;
        showToast(cue.missingMessage);
        return;
      }
      cue.setEnabled(cue.toggle.checked);
      saveTimerSettings();
    });

    cue.min.addEventListener('input', () => refreshFromUI(cue));
    cue.sec.addEventListener('input', () => refreshFromUI(cue));
    cue.min.addEventListener('blur', () => {
      cue.min.value = String(clamp(cue.min.value, 99));
      refreshFromUI(cue);
    });
    cue.sec.addEventListener('blur', () => {
      cue.sec.value = String(clamp(cue.sec.value, 59));
      refreshFromUI(cue);
    });
  });
}
