import './styles/base.css';
import './styles/topbar.css';
import './styles/sections.css';
import './styles/preview.css';
import './styles/timer.css';
import './styles/toast.css';
import './styles/dialogs.css';
import './styles/responsive.css';

import {
  contentEl, htmlModeToggle, nameInput, previewDock, previewTab, resetAllBtn, templateSelect, topbar,
  copyTab
} from './dom';
import { SETTINGS } from './data/settings';
import { ACTIVE_TEMPLATES } from './data/templates';
import { currentDraft, prefs } from './state';
import {
  flushDraftsSave, loadDrafts, loadPrefs, loadTimerSettings, savePrefs, storageAvailable
} from './storage';
import { sectionsHaveContent } from './lib/text';
import { copyToClipboard } from './ui/clipboard';
import { bindInstructionsDialog, offerDraftRestore } from './ui/dialogs';
import { clearNameError } from './ui/nameValidation';
import { applyTemplateChrome, clearSection, handleTextareaInput, resetAll, switchTemplate } from './ui/actions';
import { setPreviewOpen, updatePreview } from './ui/preview';
import { renderSections, toggleCollapse } from './ui/sections';
import { showToast } from './ui/toast';
import { bindTimerDock, setTimerOpen } from './timer/dock';
import { bindTimer, stopTimerTimers, updateTimerDisplay } from './timer/timer';
import { bindTimerSettings, initTimerSettingsUI } from './timer/settings';

function bindEvents(): void {
  templateSelect.addEventListener('change', () => switchTemplate(templateSelect.value));

  nameInput.addEventListener('input', () => {
    prefs.name = nameInput.value;
    savePrefs();
    clearNameError();
    updatePreview();
  });

  htmlModeToggle.addEventListener('change', () => {
    prefs.htmlMode = htmlModeToggle.checked;
    savePrefs();
    updatePreview();
  });

  resetAllBtn.addEventListener('click', resetAll);
  copyTab.addEventListener('click', copyToClipboard);
  previewTab.addEventListener('click', () => setPreviewOpen(!previewDock.classList.contains('open')));

  contentEl.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches('textarea.comments')) handleTextareaInput(t as HTMLTextAreaElement);
  });

  contentEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const resetBtn = t.closest<HTMLElement>('.section-reset');
    if (resetBtn) {
      clearSection(resetBtn.closest<HTMLElement>('.section')!.dataset.sectionId!);
      return;
    }
    const head = t.closest<HTMLElement>('.section-head');
    if (head) toggleCollapse(head.closest<HTMLElement>('.section')!.dataset.sectionId!);
  });

  contentEl.addEventListener('keydown', (e) => {
    const head = (e.target as HTMLElement).closest<HTMLElement>('.section-head');
    if (head && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggleCollapse(head.closest<HTMLElement>('.section')!.dataset.sectionId!);
    }
  });

  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'Enter') {
      e.preventDefault();
      copyToClipboard();
    } else if (mod && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      resetAll();
    } else if (e.key === 'Escape' && previewDock.classList.contains('open')) {
      setPreviewOpen(false);
      previewTab.focus();
    }
  });

  const syncTopbarShadow = () => topbar.classList.toggle('stuck', window.scrollY > 4);
  window.addEventListener('scroll', syncTopbarShadow, { passive: true });
  syncTopbarShadow();

  window.addEventListener('beforeunload', (e) => {
    flushDraftsSave();
    stopTimerTimers();
    if (!storageAvailable && sectionsHaveContent(currentDraft().sections)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  bindInstructionsDialog();
  bindTimerDock();
  bindTimer();
  bindTimerSettings();
}

function populateTemplateSelect(): void {
  templateSelect.innerHTML = '';
  ACTIVE_TEMPLATES.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.title.replace(/ Marking Helper$/, '');
    templateSelect.appendChild(opt);
  });
}

function init(): void {
  loadPrefs();
  loadDrafts();
  loadTimerSettings();

  populateTemplateSelect();
  templateSelect.value = prefs.template;
  nameInput.value = prefs.name || '';
  htmlModeToggle.checked = prefs.htmlMode !== false;

  initTimerSettingsUI();
  updateTimerDisplay();

  bindEvents();
  applyTemplateChrome();
  renderSections();
  offerDraftRestore();
  setTimerOpen(false);

  if (!storageAvailable) {
    showToast('Auto-save unavailable in this browser — close the tab with care', { timeout: SETTINGS.ui.toastStorageWarningMs });
  }
}

init();
