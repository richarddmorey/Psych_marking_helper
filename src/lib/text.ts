import type { SectionData } from '../types';

export function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function newlinesToBr(str: string): string {
  return String(str).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
}

export function normalizeNewlines(str: string): string {
  return String(str).replace(/\r\n/g, '\n');
}

export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function sectionsHaveContent(sections: SectionData | undefined): boolean {
  return Object.values(sections ?? {}).some((boxes) =>
    Object.values(boxes ?? {}).some((v) => (v || '').trim().length > 0)
  );
}

export function sectionsWordCount(sections: SectionData | undefined): number {
  let n = 0;
  Object.values(sections ?? {}).forEach((boxes) =>
    Object.values(boxes ?? {}).forEach((v) => {
      n += countWords(v || '');
    })
  );
  return n;
}
