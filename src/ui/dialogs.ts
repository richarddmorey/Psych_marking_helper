import { SETTINGS } from '../data/settings';
import {
  closeInstrBtn, helpContact, helpContactLink, helpContactName, closeInstrBtn2, instrDialog, openInstructions, restoreAccept, restoreDialog,
  restoreDiscard, restoreSummary
} from '../dom';
import { sectionsHaveContent, sectionsWordCount } from '../lib/text';
import { currentDraft, currentTemplate } from '../state';
import { saveDrafts } from '../storage';
import { refreshUI } from './preview';
import { applyCollapsedState, populateTextareasFromDraft } from './sections';
import { showToast } from './toast';

function closeInstr(): void {
  instrDialog.close();
  openInstructions.focus();
}

function renderHelpContact(): void {
  const { contactName, contactEmail, emailSubject } = SETTINGS.help;
  if (!contactEmail) return;
  helpContactName.textContent = contactName;
  helpContactLink.textContent = contactEmail;
  helpContactLink.href = 'mailto:' + contactEmail + (emailSubject ? '?subject=' + encodeURIComponent(emailSubject) : '');
  helpContact.hidden = false;
}

export function bindInstructionsDialog(): void {
  renderHelpContact();
  openInstructions.addEventListener('click', () => instrDialog.showModal());
  closeInstrBtn.addEventListener('click', closeInstr);
  closeInstrBtn2.addEventListener('click', closeInstr);
  instrDialog.addEventListener('click', (e) => {
    if (e.target === instrDialog) {
      const r = instrDialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        closeInstr();
      }
    }
  });

  // Escape must not dismiss the restore prompt; its buttons close it explicitly.
  restoreDialog.addEventListener('cancel', (e) => e.preventDefault());
}

/** Shows the restore prompt if the current template has a saved draft. */
export function offerDraftRestore(): void {
  const draft = currentDraft();
  if (!sectionsHaveContent(draft.sections)) {
    refreshUI();
    return;
  }

  const words = sectionsWordCount(draft.sections);
  const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : '';
  restoreSummary.textContent =
    'A ' + currentTemplate().title.replace(' Marking Helper', '') +
    ' draft with ' + words + ' word' + (words === 1 ? '' : 's') +
    (when ? ' from ' + when : '') +
    ' is saved on this device.';

  const saved = JSON.parse(JSON.stringify(draft)) as typeof draft;
  draft.sections = {};
  draft.collapsed = {};

  // Every dialog button handler must close its dialog first.
  restoreAccept.addEventListener(
    'click',
    () => {
      restoreDialog.close();
      const d = currentDraft();
      d.sections = saved.sections || {};
      d.collapsed = saved.collapsed || {};
      populateTextareasFromDraft();
      applyCollapsedState();
      refreshUI();
      showToast('Draft restored');
    },
    { once: true }
  );

  restoreDiscard.addEventListener(
    'click',
    () => {
      restoreDialog.close();
      const d = currentDraft();
      d.sections = {};
      d.collapsed = {};
      d.savedAt = 0;
      saveDrafts();
      refreshUI();
      showToast('Started fresh');
    },
    { once: true }
  );

  restoreDialog.showModal();
  refreshUI();
}
