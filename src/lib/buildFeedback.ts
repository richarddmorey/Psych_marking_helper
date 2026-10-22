import type { BuiltFeedback, SectionData, Template } from '../types';
import { escapeHtml, newlinesToBr, normalizeNewlines } from './text';

interface BuildInput {
  template: Template;
  sections: SectionData;
  name: string;
}

/** Pure: assembles preview HTML, tagged-HTML text and plain text. */
export function buildFeedback(input: BuildInput): BuiltFeedback {
  const { template } = input;
  const sectionData = input.sections || {};
  const prefixes = template.prefixes;

  const blocks: { heading: string; paras: string[] }[] = [];

  template.sections.forEach((section) => {
    const data = sectionData[section.id] || {};
    const filled = section.boxes
      .map((box) => ({ box, value: (data[box.key] || '').trim() }))
      .filter((e) => e.value.length > 0);

    if (!filled.length) return;

    const paras = filled.map((e) => {
      if (filled.length === 1) return e.value;
      const label =
        e.box.kind === 'improve' ? prefixes.improve : e.box.kind === 'good' ? prefixes.good : '';
      return label + e.value;
    });

    blocks.push({ heading: section.heading, paras });
  });

  const name = (input.name || '').trim();
  const textName = 'Marker: ' + (name || '(enter your name)');
  const previewName = name
    ? 'Marker: ' + escapeHtml(name)
    : '<span class="missing-name">Marker: (enter your name)</span>';

  const previewBlocks = [previewName];
  const tagBlocks = [textName];
  const plainBlocks = [textName];

  blocks.forEach((b) => {
    const sep = b.paras.length > 1 ? '<br><br>' : '<br>';
    const plainSep = b.paras.length > 1 ? '\n\n' : '\n';

    previewBlocks.push(
      '<b>' + escapeHtml(b.heading) + '</b><br>' +
        b.paras.map((p) => newlinesToBr(escapeHtml(p))).join(sep)
    );
    tagBlocks.push('<b>' + b.heading + '</b><br>' + b.paras.map(newlinesToBr).join(sep));
    plainBlocks.push(b.heading + '\n' + b.paras.map(normalizeNewlines).join(plainSep));
  });

  return {
    hasName: !!name,
    hasContent: blocks.length > 0,
    previewHtml: previewBlocks.join('<br><br>'),
    taggedText: tagBlocks.join('<br><br>'),
    plainText: plainBlocks.join('\n\n')
  };
}
