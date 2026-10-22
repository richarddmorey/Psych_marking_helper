import { SETTINGS } from '../data/settings';

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioContext = new AC();
    } catch {
      return null;
    }
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

export function playTone(freq: number, durationSec: number, startOffsetSec = 0): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const attackEnd = Math.min(0.02, durationSec * 0.5);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(SETTINGS.timer.volume, now + attackEnd);
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
  osc.start(now);
  osc.stop(now + durationSec + 0.05);
}

/** Two tones separated by a short gap. */
export function playWarning(): void {
  const { freqHz, durationSec, gapSec } = SETTINGS.timer.warningTone;
  playTone(freqHz, durationSec, 0);
  playTone(freqHz, durationSec, durationSec + gapSec);
}

let alarmTimeouts: number[] = [];

/** Rapid beeps repeated every cycleMs. */
export function playAlarm(): void {
  const { freqHz, beepSec, beepStepSec, beepsPerCycle, cycleMs, cycles } = SETTINGS.timer.alarmTone;
  for (let i = 0; i < cycles; i++) {
    alarmTimeouts.push(
      window.setTimeout(() => {
        for (let b = 0; b < beepsPerCycle; b++) playTone(freqHz, beepSec, b * beepStepSec);
      }, i * cycleMs)
    );
  }
}

export function clearAlarmTimeouts(): void {
  alarmTimeouts.forEach(clearTimeout);
  alarmTimeouts = [];
}
