import { SETTINGS } from '../data/settings';
import { contentEl } from '../dom';
import { currentCollapsed, currentDraft, currentTemplate } from '../state';
import { saveDrafts } from '../storage';

export function autoGrow(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  const maxH = window.innerHeight * SETTINGS.ui.textareaMaxHeightRatio;
  ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
}

export function renderSections(): void {
  contentEl.innerHTML = '';
  const template = currentTemplate();
  const collapsed = currentCollapsed();

  template.sections.forEach((section) => {
    const el = document.createElement('section');
    el.className = 'section' + (section.final ? ' finalq' : '');
    el.dataset.sectionId = section.id;

    const head = document.createElement('div');
    head.className = 'section-head';
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', 'true');
    head.setAttribute('aria-controls', 'body-' + section.id);

    const h3 = document.createElement('h3');
    h3.textContent = section.heading;

    const wc = document.createElement('span');
    wc.className = 'section-word-count';

    const chev = document.createElement('span');
    chev.className = 'section-chevron';
    chev.setAttribute('aria-hidden', 'true');
    chev.textContent = '▾';

    head.append(h3, wc, chev);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'section-reset';
    resetBtn.setAttribute('aria-label', 'Clear this section');
    resetBtn.title = 'Clear this section';
    resetBtn.textContent = '×';

    const body = document.createElement('div');
    body.className = 'section-body' + (section.boxes.length === 1 ? ' single' : '');
    body.id = 'body-' + section.id;

    if (section.consider) {
      const p = document.createElement('p');
      p.className = 'consider';
      const em = document.createElement('em');
      em.textContent = 'Marker to consider:';
      p.append(em, ' ' + section.consider);
      body.appendChild(p);
    }

    section.boxes.forEach((box) => {
      const ta = document.createElement('textarea');
      ta.className = 'comments';
      if (box.kind === 'good') ta.classList.add('goodcomment');
      if (box.kind === 'improve') ta.classList.add('improvecomment');
      ta.placeholder = box.placeholder;
      ta.dataset.sectionId = section.id;
      ta.dataset.boxKey = box.key;
      ta.spellcheck = true;
      body.appendChild(ta);
    });

    el.append(head, resetBtn, body);
    contentEl.appendChild(el);

    if (collapsed[section.id]) {
      el.classList.add('collapsed');
      head.setAttribute('aria-expanded', 'false');
    }
  });
}

export function sectionTextareas(sectionId?: string): HTMLTextAreaElement[] {
  const sel = sectionId
    ? `textarea[data-section-id="${sectionId}"]`
    : 'textarea.comments';
  return Array.from(contentEl.querySelectorAll<HTMLTextAreaElement>(sel));
}

export function populateTextareasFromDraft(): void {
  const data = currentDraft().sections;
  sectionTextareas().forEach((ta) => {
    ta.value = (data[ta.dataset.sectionId!] || {})[ta.dataset.boxKey!] || '';
    autoGrow(ta);
  });
}

export function applyCollapsedState(): void {
  const collapsed = currentCollapsed();
  contentEl.querySelectorAll<HTMLElement>('.section').forEach((el) => {
    const isCollapsed = !!collapsed[el.dataset.sectionId!];
    el.classList.toggle('collapsed', isCollapsed);
    el.querySelector('.section-head')?.setAttribute('aria-expanded', String(!isCollapsed));
  });
}

export function toggleCollapse(sid: string): void {
  const el = contentEl.querySelector<HTMLElement>(`.section[data-section-id="${sid}"]`);
  if (!el) return;
  const isCollapsed = el.classList.toggle('collapsed');
  el.querySelector('.section-head')!.setAttribute('aria-expanded', String(!isCollapsed));

  currentCollapsed()[sid] = isCollapsed;
  saveDrafts();

  if (!isCollapsed) el.querySelectorAll<HTMLTextAreaElement>('textarea.comments').forEach(autoGrow);
}
