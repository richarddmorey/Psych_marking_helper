export interface Box {
  key: string;
  kind?: 'good' | 'improve';
  placeholder: string;
}

export interface Section {
  id: string;
  heading: string;
  consider?: string;
  final?: boolean;
  boxes: Box[];
}

export interface Template {
  id: string;
  title: string;
  /** Omit or set true to list in the dropdown; false hides it. */
  active?: boolean;
  prefixes: { good: string; improve: string };
  sections: Section[];
}

export type TemplateMap = Record<string, Template>;

/** sectionId -> boxKey -> text */
export type SectionData = Record<string, Record<string, string>>;

export interface Draft {
  sections: SectionData;
  collapsed: Record<string, boolean>;
  savedAt: number;
}

export interface Prefs {
  name: string;
  htmlMode: boolean;
  template: string;
}

export interface TimerSettings {
  warningEnabled: boolean;
  warningSec: number;
  alarmEnabled: boolean;
  alarmSec: number;
}

export interface BuiltFeedback {
  hasName: boolean;
  hasContent: boolean;
  previewHtml: string;
  taggedText: string;
  plainText: string;
}
