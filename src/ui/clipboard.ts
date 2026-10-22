import { copyArea, htmlModeToggle, nameInput } from '../dom';
import { buildFeedback } from '../lib/buildFeedback';
import { sectionsWordCount } from '../lib/text';
import { currentDraft, currentTemplate } from '../state';
import { clearNameError, flagNameRequired } from './nameValidation';
import { showToast } from './toast';

function selectBuffer(): void {
  try {
    copyArea.focus({ preventScroll: true });
  } catch {
    copyArea.focus();
  }
  copyArea.select();
  copyArea.setSelectionRange(0, 99999);
}

export function copyToClipboard(): void {
  try {
    const name = (nameInput.value || '').trim();
    if (!name) {
      flagNameRequired();
      return;
    }
    clearNameError();

    const built = buildFeedback({
      template: currentTemplate(),
      sections: currentDraft().sections,
      name
    });
    if (!built.hasContent) {
      showToast('Nothing to copy yet — add some feedback first');
      return;
    }

    const htmlMode = htmlModeToggle.checked;
    const payload = htmlMode ? built.taggedText : built.plainText;

    copyArea.value = payload;
    selectBuffer();

    const words = sectionsWordCount(currentDraft().sections);
    const done = () =>
      showToast(
        `Copied ${words} word${words === 1 ? '' : 's'} (${htmlMode ? 'HTML' : 'plain text'}) — ready to paste`
      );

    const execCommandCopy = () => {
      try {
        selectBuffer();
        document.execCommand('copy');
        done();
      } catch {
        showToast('Copy failed — please copy the text manually');
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(done).catch(execCommandCopy);
    } else {
      execCommandCopy();
    }
  } catch (err) {
    console.error('Copy failed:', err);
    showToast('Copy failed — please try again');
  }
}
