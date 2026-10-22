import {
  charCountValue, contentEl, htmlModeToggle, nameInput, previewBody, previewBoxLabel,
  previewDock, previewPanelInner, previewSubtitle, previewTab, previewWarning, wordCountValue
} from '../dom';
import { buildFeedback } from '../lib/buildFeedback';
import { countWords } from '../lib/text';
import { currentDraft, currentTemplate } from '../state';

export function refreshCounts(): void {
  let totalWords = 0;
  let totalChars = 0;
  const data = currentDraft().sections;

  currentTemplate().sections.forEach((section) => {
    const sectionData = data[section.id] || {};
    let sectionWords = 0;

    section.boxes.forEach((box) => {
      const text = (sectionData[box.key] || '').trim();
      if (!text) return;
      const w = countWords(text);
      sectionWords += w;
      totalWords += w;
      totalChars += text.length;
    });

    const wcEl = contentEl.querySelector(
      `.section[data-section-id="${section.id}"] .section-word-count`
    );
    if (wcEl) {
      wcEl.textContent = sectionWords > 0 ? sectionWords + (sectionWords === 1 ? ' word' : ' words') : '';
    }
  });

  wordCountValue.textContent = String(totalWords);
  charCountValue.textContent = totalChars.toLocaleString();
}

export function updatePreview(): void {
  const built = buildFeedback({
    template: currentTemplate(),
    sections: currentDraft().sections,
    name: nameInput.value
  });
  const scrollTop = previewBody.scrollTop;
  const htmlMode = htmlModeToggle.checked;

  previewSubtitle.textContent = htmlMode
    ? 'Rendered view — the copied text includes HTML tags.'
    : 'Plain-text view — the copied text has no HTML tags, just real line breaks.';

  previewBoxLabel.textContent = htmlMode
    ? 'Feedback to copy (rendered)'
    : 'Feedback to copy (plain text)';

  if (built.hasContent) {
    if (htmlMode) {
      previewBody.innerHTML = built.previewHtml;
      previewBody.classList.remove('plain-mode');
    } else {
      previewBody.textContent = built.plainText;
      previewBody.classList.add('plain-mode');
    }
  } else {
    previewBody.innerHTML =
      '<em class="preview-empty">Nothing written yet — feedback you add will appear here.</em>';
    previewBody.classList.remove('plain-mode');
  }

  previewBody.scrollTop = scrollTop;
  previewWarning.hidden = built.hasName || !built.hasContent;
}

export function refreshUI(): void {
  refreshCounts();
  updatePreview();
}

export function setPreviewOpen(open: boolean): void {
  previewDock.classList.toggle('open', open);
  previewTab.setAttribute('aria-expanded', String(open));
  const label = open ? 'Hide feedback preview' : 'Show feedback preview';
  previewTab.setAttribute('aria-label', label);
  previewTab.setAttribute('title', label);
  previewPanelInner.setAttribute('aria-hidden', String(!open));
  if (open) updatePreview();
}
