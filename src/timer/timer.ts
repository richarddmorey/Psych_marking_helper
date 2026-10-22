import { SETTINGS } from '../data/settings';
import { timerDisplay, timerResetBtn, timerStartStop } from '../dom';
import { timerSettings } from '../state';
import { clearAlarmTimeouts, getAudioContext, playAlarm, playWarning } from './audio';
import { forceTimerOpenFor } from './dock';

let running = false;
let accumulatedMs = 0;
let startedAt = 0;
let intervalId: number | null = null;

// Shared with settings.ts so editing a time re-arms the cue.
export const fired = { warning: false, alarm: false };

export function getElapsedMs(): number {
  return accumulatedMs + (running ? Date.now() - startedAt : 0);
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return Math.floor(totalSec / 60) + ':' + String(totalSec % 60).padStart(2, '0');
}

export function updateTimerDisplay(): void {
  timerDisplay.textContent = formatTime(getElapsedMs());
}

function tick(): void {
  updateTimerDisplay();
  const elapsedSec = Math.floor(getElapsedMs() / 1000);

  if (!fired.warning && timerSettings.warningEnabled && elapsedSec >= timerSettings.warningSec) {
    fired.warning = true;
    playWarning();
    forceTimerOpenFor(SETTINGS.timer.panelRevealMs);
  }
  if (!fired.alarm && timerSettings.alarmEnabled && elapsedSec >= timerSettings.alarmSec) {
    fired.alarm = true;
    playAlarm();
    forceTimerOpenFor(SETTINGS.timer.panelRevealMs);
  }
}

function setStartStopButton(isRunning: boolean): void {
  timerStartStop.textContent = isRunning ? 'Stop' : 'Start';
  timerStartStop.classList.toggle('btn-primary', !isRunning);
  timerStartStop.classList.toggle('btn-ghost', isRunning);
}

function startTimer(): void {
  if (running) return;
  getAudioContext(); // unlock audio on a user gesture
  startedAt = Date.now();
  running = true;
  setStartStopButton(true);
  intervalId = window.setInterval(tick, SETTINGS.timer.tickIntervalMs);
}

function stopTimer(): void {
  if (!running) return;
  accumulatedMs += Date.now() - startedAt;
  running = false;
  setStartStopButton(false);
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  updateTimerDisplay();
}

function resetTimer(): void {
  if (running) startedAt = Date.now();
  accumulatedMs = 0;
  fired.warning = false;
  fired.alarm = false;
  clearAlarmTimeouts();
  updateTimerDisplay();
}

export function stopTimerTimers(): void {
  if (intervalId) clearInterval(intervalId);
  clearAlarmTimeouts();
}

export function bindTimer(): void {
  timerStartStop.addEventListener('click', () => (running ? stopTimer() : startTimer()));
  timerResetBtn.addEventListener('click', resetTimer);
}
