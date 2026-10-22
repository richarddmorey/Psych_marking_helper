import { nameError, nameInput } from '../dom';
import { showToast } from './toast';

export function clearNameError(): void {
  nameError.hidden = true;
  nameInput.classList.remove('invalid');
  nameInput.removeAttribute('aria-invalid');
}

export function flagNameRequired(): void {
  nameError.hidden = false;
  nameInput.setAttribute('aria-invalid', 'true');
  nameInput.classList.remove('invalid');
  void nameInput.offsetWidth; // restart the shake animation
  nameInput.classList.add('invalid');
  nameInput.focus({ preventScroll: true });
  const len = nameInput.value.length;
  try {
    nameInput.setSelectionRange(len, len);
  } catch {
    /* ignore */
  }
  showToast('Please enter your name before copying');
}
