import { brandTitleText } from '../dom';
import { isSelectableTemplate } from '../data/templates';
import { sectionsHaveContent } from '../lib/text';
import { currentDraft, currentTemplate, prefs } from '../state';
import { saveDrafts, savePrefs, scheduleDraftsSave } from '../storage';
import { autoGrow, populateTextareasFromDraft, renderSections, sectionTextareas } from './sections';
import { refreshUI } from './preview';
import { showToast } from './toast';

export function applyTemplateChrome(): void {
  const template = currentTemplate();
  document.title = template.title;
  brandTitleText.textContent = template.title;
}

export function syncTemplateQuery(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('template', prefs.template);
  window.history.replaceState(window.history.state, '', url);
}

export function switchTemplate(id: string): void {
  if (!isSelectableTemplate(id) || id === prefs.template) return;

  saveDrafts();
  prefs.template = id;
  savePrefs();
  syncTemplateQuery();

  applyTemplateChrome();
  renderSections();
  populateTextareasFromDraft();
  refreshUI();
}

export function handleTextareaInput(ta: HTMLTextAreaElement): void {
  const sid = ta.dataset.sectionId!;
  const d = currentDraft();
  if (!d.sections[sid]) d.sections[sid] = {};
  d.sections[sid][ta.dataset.boxKey!] = ta.value;

  scheduleDraftsSave();
  autoGrow(ta);
  refreshUI();
}

export function clearSection(sid: string): void {
  const d = currentDraft();
  const sectionData = d.sections[sid] || {};
  if (!sectionsHaveContent({ [sid]: sectionData })) return;

  const snapshot = JSON.parse(JSON.stringify(sectionData)) as Record<string, string>;

  d.sections[sid] = {};
  saveDrafts();
  sectionTextareas(sid).forEach((ta) => {
    ta.value = '';
    autoGrow(ta);
  });
  refreshUI();

  showToast('Section cleared', {
    action: {
      label: 'Undo',
      onClick: () => {
        currentDraft().sections[sid] = snapshot;
        saveDrafts();
        sectionTextareas(sid).forEach((ta) => {
          ta.value = snapshot[ta.dataset.boxKey!] || '';
          autoGrow(ta);
        });
        refreshUI();
        showToast('Section restored');
      }
    }
  });
}

export function resetAll(): void {
  const d = currentDraft();
  if (!sectionsHaveContent(d.sections)) return;

  const snapshot = JSON.parse(JSON.stringify(d.sections));

  d.sections = {};
  saveDrafts();
  sectionTextareas().forEach((ta) => {
    ta.value = '';
    autoGrow(ta);
  });
  refreshUI();

  showToast('All feedback cleared', {
    action: {
      label: 'Undo',
      onClick: () => {
        currentDraft().sections = snapshot;
        saveDrafts();
        populateTextareasFromDraft();
        refreshUI();
        showToast('Feedback restored');
      }
    }
  });
}
