import raw from './templates.json';
import type { Template, TemplateMap } from '../types';

export const TEMPLATES = raw as TemplateMap;

/** Templates shown in the dropdown: everything unless `active` is explicitly false. */
export const ACTIVE_TEMPLATES: Template[] = (() => {
  const active = Object.values(TEMPLATES).filter((t) => t.active !== false);
  return active.length ? active : Object.values(TEMPLATES);
})();

export const DEFAULT_TEMPLATE_ID = ACTIVE_TEMPLATES[0].id;

export function isSelectableTemplate(id: unknown): id is string {
  return typeof id === 'string' && ACTIVE_TEMPLATES.some((t) => t.id === id);
}
