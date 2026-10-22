import { SETTINGS } from '../data/settings';
import { toastEl } from '../dom';

let toastTimer: number | undefined;

interface ToastOptions {
  action?: { label: string; onClick: () => void };
  timeout?: number;
}

export function showToast(message: string, opts: ToastOptions = {}): void {
  clearTimeout(toastTimer);

  toastEl.innerHTML = '';
  toastEl.appendChild(document.createTextNode(message));

  if (opts.action) {
    const { label, onClick } = opts.action;
    toastEl.classList.add('has-action');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      clearTimeout(toastTimer);
      toastEl.classList.remove('show');
      onClick();
    });
    toastEl.appendChild(btn);
  } else {
    toastEl.classList.remove('has-action');
  }

  toastEl.classList.add('show');

  const timeout = opts.timeout || (opts.action ? SETTINGS.ui.toastWithActionMs : SETTINGS.ui.toastDefaultMs);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), timeout);
}
