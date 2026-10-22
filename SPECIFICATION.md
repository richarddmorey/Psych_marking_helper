# Marking Helper (School of Psychology) — Reimplementation Specification

**Version 4.2** — multi-template app with a single-tab timer dock, hash-guarded drafts, auto-save, native `<dialog>`, no jQuery. Now a Vite + TypeScript single-page app (see §3) with templates and settings in JSON.

A client-side web app for university markers to compose structured feedback and copy it into TurnItIn. This document is written so that an LLM (or a developer) can rebuild it from scratch and reproduce both its behaviour and its look, including the traps discovered while iterating on it.

---

## 0. Version history

- **v4.2** — Restructured from a single HTML file into a **Vite + TypeScript** project deployed to GitHub Pages (§3). Behaviour is unchanged except for the following: (a) the title block (`[template title] · School of Psychology` plus the "C" badge) is a full-width, right-aligned row at the very top of the sticky bar, above the controls; (b) templates live in `src/data/templates.json`, the dropdown is **built from them on page load**, and a template with `"active": false` is hidden (missing key = shown); (c) all tweakable constants live in `src/data/settings.json` (§5, "Settings"); (d) **Reset all** is a pill button with a trash icon matching **How to use**, and both collapse to icon-only below 720px; (e) the help dialog ends with a configurable **help contact** with a `mailto:` link (§12).

- **v4.1.1** — Restore-draft dialog fix. Both buttons (`Restore draft` / `Start fresh`) now call `restoreDialog.close()` as their first statement. In v4.1, the `close()` calls were accidentally dropped during the timer-dock rewrite, leaving the modal stuck on screen and the app unusable. The invariant "every dialog button handler must call `.close()` on its dialog" is recorded in the header comment and in §13. No other behaviour changed.
- **v4.1** — Timer dock simplified to a **single horizontal tab** in the top-left of the viewport that opens/closes the whole timer + settings panel together. The panel slides down from the top edge (via a `max-height` reveal on a wrap element) and overlaps the sticky top bar (z-index 90 vs 80), which is intentional and covered in the help modal. Hover-to-peek and the separate Settings tab were removed. Warning/Alarm still auto-reveal the panel for three seconds if it was closed when they fire.
- **v4.0** — Adds a Timer/Settings slide-out dock (initially two tabs), counting-up timer with Start/Stop and Reset, configurable Warning and Alarm times with audio cues. Drafts are stored per template with a **template hash** and **timestamp**; drafts whose hash doesn't match or whose `savedAt` is older than `MAX_DRAFT_AGE_DAYS` (default 5) are wiped silently on load. Collapsed state moves into the draft object.
- **v3.0** — Unified Practical and Essay templates in one app, switchable from a `<select>`. Per-template drafts and collapsed state. `buildFeedback` takes the template in its input; prefixes come from the template's `prefixes` object.
- **v2.0** — Data-driven sections, pure `buildFeedback(state)`, native `<dialog>`, no jQuery, auto-save with draft-restore prompt, undo on reset (per-section and global), per-section reset and collapse, auto-grow textareas, remembered name and HTML/plain toggle, character count, per-section word counts, keyboard shortcuts.
- **v1.x** — Original single-file app with jQuery, custom modal, manual textarea injection, HTML/plain toggle, no persistence.

---

## 1. Purpose and scope

The app presents one of its configured **marking templates** at a time (chosen from a dropdown that lists every template not marked `active: false`). Each template is a list of feedback sections; each section contains one or more textareas, optionally with a "good" or "improve" kind that drives prefixing. The marker types feedback, enters their name, and clicks a copy button. The app assembles a formatted string and writes it to the clipboard.

A **timer** in the top-left counts up from 0:00 while the marker works, with optional Warning and Alarm cues at user-configured times. Both cues play audio and reveal the timer panel for three seconds if it was not already open.

There is no server and no network storage. The source is a Vite + TypeScript project that builds to static files (HTML, one JS bundle, one CSS bundle) which load Google Fonts. `localStorage` (when available) is used for per-template draft persistence (with invalidation guards), user preferences, and timer settings.

**Templates shipped (more can be added as data, see §5):**
- **Practical** — 5 sections: Introduction, Method, Results, Discussion, Key point. Sections 1–4 have two boxes (good + improve); the final section has one box.
- **Essay** — 6 sections: Addressing the question, Knowledge and use of evidence, Analysis and critical judgement, Synthesis/originality, Inclusivity/generalisability, Overall feedback. Sections 1–5 have one box; the final section has two boxes (good + improve).

Template differences are **entirely data**: number of sections, box counts, box kinds, prefix labels, and headings. No code paths differ.

---

## 2. Non-negotiable behaviours

These are the contract. A reimplementation that gets the visuals right but breaks any of these is wrong.

1. **The copied text must contain literal HTML tags** (`<b>Heading</b><br>…`) when in HTML mode. A plain-text editor (Notepad, VS Code) must show the tags. The tags must **not** be silently converted to rendered formatting by the clipboard layer.
2. **Newlines typed inside a feedback box are preserved** in the output, as `<br>` tags in HTML mode and as real `\n` in plain-text mode.
3. **When both boxes in a section are filled**, the two comments are separated by a blank line (`<br><br>` in HTML, `\n\n` in plain text). The second comment is prefixed with the template's `prefixes.improve` and the first with `prefixes.good`. With only one box filled, there is **no prefix** and a single separator.
4. **Sections with no filled boxes are omitted entirely** from the output.
5. **The marker name is required**. Copy is blocked if the name field is empty (after trim). The field shows `Your name` as a *placeholder*, not a value. Attempting to copy without a name shakes the field, shows an inline error bubble, focuses the field, and shows a toast.
6. **A live preview panel** slides out from the left and shows exactly what will be copied. It has a format toggle: **Include HTML tags**, ticked by default. Unticking it makes both the preview and the copied payload plain text (real newlines, no tags).
7. **Clicking Copy never opens the preview panel.** Copy lives on a vertical side tab that is always visible.
8. **The top bar is sticky** and contains the title, template selector, word/char counts, name field, help button, and reset button. Only the feedback cards scroll beneath it.
9. **Total feedback word count and character count** are shown in the top bar and update on every keystroke. They include the final section but exclude the marker name. Each section header also shows its own word count.
10. **Cardiff colour palette and typography**: Cardiff red `#d3374a` for primary actions, Cardiff black `#22211f` for text, Cardiff grey `#d3d3d2` for borders, Fraunces serif headings, Inter sans body.
11. **Per-template draft persistence**: The working draft and collapsed sections are saved per-template. Switching templates preserves each template's draft. On reload with a non-empty draft for the **current** template, a native `<dialog>` asks whether to restore it.
12. **Undo on reset**: Both reset actions show a toast with an Undo button (default 10 s window, `ui.toastWithActionMs`) so a mis-click is recoverable.
13. **Template switching** updates the `<title>`, brand heading, sections, loaded draft, collapsed state, word counts, and preview — atomically, without a reload.
14. **Timer counts up from 0:00 in `min:sec`**. Start/Stop toggles between running and paused. Reset zeros the count and clears fired flags. The timer continues to count when the panel is closed.
15. **Warning and Alarm fire once each per run** (until Reset or a settings change). Warning: two 1-second tones with a 0.25 s gap. Alarm: a rapid triple-beep every 1.5 s for 6 cycles (tone parameters come from `settings.timer`). Both reveal the timer panel for three seconds (`timer.panelRevealMs`) if it was not already open. Both are optional and gated by their toggles.
16. **Drafts are invalidated on template change or age**. Drafts whose stored hash does not match the current template's hash, or whose `savedAt` exceeds `storage.maxDraftAgeDays`, are wiped on load and not offered for restore. Marker name, HTML/plain toggle, active template, and timer settings are **not** affected.
17. **Every dialog button handler must call `.close()` on its dialog.** The restore-draft dialog, in particular, has a `cancel` listener that calls `preventDefault()` on Escape, so a button without a `close()` call leaves the modal permanently stuck and the app unusable. This invariant caused the v4.1 regression fixed in v4.1.1.
18. **The timer dock is a single tab at the top-left** that toggles the whole timer + settings panel. No hover reveal. The panel overlaps the sticky top bar (deliberately).
19. **The dropdown is data-driven.** Templates listed come from `templates.json` on page load; `active: false` hides one, a missing `active` key shows it. No code or HTML change is needed to add a template.
20. **Tweakable constants live in `settings.json`**, not in code (draft age, storage keys, timings, tones, help contact).
21. **The title block is the first row of the sticky bar**, right-aligned, reading `[template title] · School of Psychology`.

---

## 3. Tech stack and file shape

- **Vite + TypeScript** single-page app, no runtime dependencies (dev dependencies: `vite`, `typescript`). Scripts: `dev`, `typecheck`, `build` (`tsc --noEmit && vite build`), `preview`. `vite.config.ts` sets `base: './'` so the build works under a GitHub Pages project URL.
- Deployed by `.github/workflows/deploy.yml` (build, then `actions/deploy-pages`) on push to `main`; repo Pages source must be "GitHub Actions".
- Layout: `index.html` (shell, dialogs, help text); `src/data/` (`templates.json`, `templates.ts`, `settings.json`, `settings.ts`); `src/lib/` (pure builder, text helpers, hashing); `src/state.ts`, `src/storage.ts`; `src/ui/` (sections, preview/counts, actions, clipboard, dialogs, toast, name validation); `src/timer/` (timer, audio, dock, settings); `src/styles/` (CSS by area, imported in cascade order from `src/main.ts`); `public/favicon.svg`.
- Google Fonts: **Fraunces** (600, 700) and **Inter** (400, 500, 600, 700).
- **No jQuery**. All DOM work is vanilla.
- Web Audio API for the timer cues (`AudioContext`, created lazily, unlocked on a user gesture).
- SVG favicon (`public/favicon.svg`: `#d3374a` square with a white serif "C").
- The production build must be served over http(s) (module scripts do not load from `file://` in most browsers). `localStorage` on other origins is separate, so drafts do not carry across hosts (§22.17).

---

## 4. Design system

Define these as CSS custom properties on `:root`:

```
--card:          #ffffff
--ink:           #22211f   /* Cardiff black */
--muted:         #5f5e5c
--line:          #d3d3d2   /* Cardiff grey */
--line-soft:     #e9e8e7
--brand:         #d3374a   /* Cardiff red */
--brand-dark:    #a82c3c
--brand-tint:    #fbeaec
--brand-tint-2:  #f7d9dd
--good:          #418232   /* Cardiff secondary green */
--good-line:     #a0c098
--good-bg:       #f3f8f1
--improve:       #af3769   /* Cardiff secondary pink */
--improve-line:  #d79bb3
--improve-bg:    #fcf2f6
--radius:        16px
--shadow:        0 18px 40px -26px rgba(34, 33, 31, .38)

/* Preview side-tab geometry */
--tab-w:      46px
--tab-h:      116px
--tab-offset: -46px
```

**Typography**
- Headings (`h1`, `h2`, `h3`, word-count value, timer display, section word count number): `'Fraunces', Georgia, 'Times New Roman', serif`.
- Everything else: `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.
- Body font-size 16px, line-height 1.55.
- Page background: two radial gradients (pale red top-left, pale grey top-right) over `linear-gradient(180deg, #ffffff, #f7f7f6)`.

**Section cards**
- White background, `1px solid var(--line-soft)`, `border-radius: var(--radius)`, `box-shadow: var(--shadow)`, `overflow: hidden`.
- `::after` pseudo-element: 4px tall bar at the top, `background: var(--brand)` for non-final sections and `var(--ink)` for the final section (`.section.finalq`).
- Layout: flex column. `.section-body` is a grid (`grid-template-columns: 1fr 1fr`; `.section-body.single` is `1fr`), with `gap: 14px 20px`.

**Comment boxes**
- `textarea.comments`: full width, `min-height: 9.5em`, height capped by `autoGrow` at `window.innerHeight * ui.textareaMaxHeightRatio` (0.4), `border-radius: 10px`, `border: 1.5px solid var(--line)`, `resize: none`, `overflow-y: auto`, transition on border/shadow/background.
- `.goodcomment`: `background: var(--good-bg); border-color: var(--good-line)`. Focus → green + 4px glow.
- `.improvecomment`: `background: var(--improve-bg); border-color: var(--improve-line)`. Focus → pink glow.
- Plain boxes (no `kind`): neutral white; focus ring in brand red when in `.finalq`.
- `spellcheck="true"` on feedback textareas; `spellcheck="false"` on the name field.

**Brand mark in top bar** — a 30px square with `border-radius: 4px`, `background: var(--brand)`, containing a white serif "C". The wordmark reads `[templateTitle] · School of Psychology`, right-aligned, with the badge to its right. The whole brand block is the first, full-width row of `.topbar-inner` (`width: 100%; justify-content: flex-end`), above the controls.

**Timer dock** — anchored at `top: 0; left: 16px; z-index: 90` (above the sticky bar). One horizontal tab, `min-width: 92px; height: 30px; border-radius: 0 0 10px 10px`, dark background, white uppercase label "Timer" with a clock SVG. The panel drops down below it via a `.timer-panel-wrap` whose `max-height` animates from 0 to 720px; the panel itself fades its opacity alongside the reveal.

---

## 5. Data model

### Templates (`templates.json` → `TEMPLATES`)

Templates are JSON (`src/data/templates.json`), typed in `src/types.ts` and exported by `src/data/templates.ts`. The examples below are shown as JS for brevity.

- **`active`** (optional boolean): `false` hides the template from the dropdown; absent or `true` shows it. `ACTIVE_TEMPLATES` (the filtered list, in file order) feeds the dropdown. The default template is the first active one (if none are active, all are shown). A saved `prefs.template` that is missing or inactive falls back to the default, and `switchTemplate` ignores non-selectable ids.
- Dropdown option labels are `title` minus a trailing " Marking Helper".

```js
const TEMPLATES = {
  practical: {
    id: 'practical',
    title: 'Practical Marking Helper',
    prefixes: {
      good:    'What was done well: ',
      improve: 'What could be improved: '
    },
    sections: [
      {
        id: 'intro',
        heading: '1. Introduction:',
        consider: 'coherence of argument, …',
        boxes: [
          { key: 'good',    kind: 'good',    placeholder: 'What was done well?' },
          { key: 'improve', kind: 'improve', placeholder: 'What could be improved?' }
        ]
      },
      // … method, results, discussion …
      {
        id: 'feedforward',
        heading: '5. Key point for your next submission:',
        final: true,
        boxes: [
          { key: 'single', placeholder: 'Provide one specific feedforward priority…' }
        ]
      }
    ]
  },

  essay: {
    id: 'essay',
    title: 'Essay Marking Helper',
    prefixes: {
      good:    'Key strengths: ',
      improve: 'Most important improvements: '
    },
    sections: [
      {
        id: 'question',
        heading: '1. Addressing the question and argument:',
        consider: 'strengths and how improvement can be made …',
        boxes: [
          { key: 'comments', placeholder: 'Add your comments here' }
        ]
      },
      // … knowledge, analysis, synthesis, inclusivity …
      {
        id: 'overall',
        heading: '6. Overall feedback:',
        final: true,
        boxes: [
          { key: 'strengths',    kind: 'good',    placeholder: 'Key strengths' },
          { key: 'improvements', kind: 'improve', placeholder: 'Most important improvements' }
        ]
      }
    ]
  }
};
```

**Per-section fields:**
- `id` — stable key used in `drafts[tid].sections[id]` and `drafts[tid].collapsed[id]`. Must be unique within a template.
- `heading` — displayed h3 text; also the bolded heading in the output.
- `consider` — optional "Marker to consider" paragraph; omitted for the final section.
- `final` — sets `.finalq` class.
- `boxes[].key` — key within the section's draft record.
- `boxes[].kind` — `'good'` / `'improve'` drives the prefix and the CSS class. Absent for plain sections.
- `boxes[].placeholder` — textarea placeholder.

### Settings (`src/data/settings.json`)

All tweakable values except templates live in one JSON file, exposed as `SETTINGS`:

| Group | Keys (defaults) |
| --- | --- |
| `storage` | `prefsKey` (`pmh-prefs-v4`), `draftsKey` (`pmh-drafts-v4`), `timerKey` (`pmh-timer-v1`), `maxDraftAgeDays` (5, formerly `MAX_DRAFT_AGE_DAYS`), `autosaveDelayMs` (500) |
| `help` | `contactName`, `contactEmail`, `emailSubject` |
| `ui` | `textareaMaxHeightRatio` (0.4), `toastDefaultMs` (2400), `toastWithActionMs` (10000), `toastStorageWarningMs` (6000) |
| `timer` | `defaultWarningSec` (120), `defaultAlarmSec` (300), `tickIntervalMs` (200), `panelRevealMs` (3000), `volume` (0.3), `warningTone` (`freqHz` 880, `durationSec` 1, `gapSec` 0.25), `alarmTone` (`freqHz` 660, `beepSec` 0.1, `beepStepSec` 0.15, `beepsPerCycle` 3, `cycleMs` 1500, `cycles` 6) |

Anything referenced elsewhere in this document by a literal number above (draft age, toast timings, tone parameters) is read from these keys. The 0–99 minute / 0–59 second input limits stay in code because they mirror the HTML input attributes. Changing a storage key discards existing stored data.

### Runtime state

State lives in `src/state.ts` (prefs, drafts, timer settings) and in the `ui/` and `timer/` modules (transient state).

```js
prefs = { name: '', htmlMode: true, template: DEFAULT_TEMPLATE_ID }   // first active template

drafts = { [templateId]: { sections: {}, collapsed: {}, savedAt: 0 } } // one entry per template in templates.json

timerSettings = {
  warningEnabled: false, warningSec: settings.timer.defaultWarningSec,
  alarmEnabled:   false, alarmSec:   settings.timer.defaultAlarmSec
}
```

- `prefs.name` — marker name; restored on load and written back on every keystroke.
- `prefs.htmlMode` — copy format; restored on load and written back on toggle.
- `prefs.template` — active template id; restored on load (only if it is still selectable, i.e. exists and is not `active: false`) and written back on switch.
- `drafts[tid].sections` — `{ [sectionId]: { [boxKey]: string } }`.
- `drafts[tid].collapsed` — `{ [sectionId]: bool }`.
- `drafts[tid].savedAt` — epoch ms of the last write.
- `timerSettings` — persisted separately under `storage.timerKey`; **not** affected by draft invalidation.

**Timer runtime state (not persisted)** — in `timer/timer.ts`: `running`, `accumulatedMs`, `startedAt`, `intervalId`, and a shared `fired = { warning, alarm }` object (reset by Reset and by editing the corresponding time). Pending alarm `setTimeout` ids are tracked in `timer/audio.ts`.

**Timer panel visibility state (not persisted)** — in `timer/dock.ts`:
```js
let timerOpen = false;          // user-controlled open state
let forceTimerTimeout = null;   // pending auto-close after Warning/Alarm
let forceCloseOnEnd = false;    // whether that pending close should actually fire
```

Storage keys and the draft age limit come from `settings.storage` (`prefsKey`, `draftsKey`, `timerKey`, `maxDraftAgeDays`), not from constants in code.

Helper accessors:
```js
currentTemplate()  // TEMPLATES[prefs.template], falling back to the default template
currentDraft()     // drafts[prefs.template], created on demand
currentCollapsed() // currentDraft().collapsed, created on demand
```

---

## 6. DOM structure

```html
<header class="topbar" id="topbar">
  <div class="topbar-inner">
    <div class="brand">
      <h1>
        <span id="brandTitleText">Practical Marking Helper</span>
        <span class="brand-suffix">· School of Psychology</span>
      </h1>
      <span class="brand-mark">C</span>
    </div>
    <div class="topbar-controls">
      <div class="template-field">
        <label class="field-label" for="templateSelect">Template</label>
        <select id="templateSelect" class="template-input">
          <!-- options are generated from the active templates on page load -->
        </select>
      </div>
      <div class="word-count">
        <span class="word-count-value" id="wordCountValue">0</span>
        <span class="word-count-label">words</span>
        <span class="word-count-sep" aria-hidden="true">·</span>
        <span class="word-count-value" id="charCountValue">0</span>
        <span class="word-count-label">chars</span>
      </div>
      <div class="name-field">
        <label class="field-label" for="name">Marker name</label>
        <input id="name" class="name-input" type="text"
               placeholder="Your name" autocomplete="name"
               spellcheck="false" aria-describedby="nameError">
        <p class="field-error" id="nameError" role="alert" hidden>…</p>
      </div>
      <button class="howto" id="openInstructions" aria-haspopup="dialog"
              aria-label="How to use this tool">
        <span class="howto-icon">?</span><span>How to use</span>
      </button>
      <button class="howto" id="resetAllBtn" aria-label="Reset all feedback" title="Reset all feedback">
        <span class="howto-icon" aria-hidden="true"><!-- trash-bin SVG --></span>
        <span>Reset all</span>
      </button>
    </div>
  </div>
</header>

<div class="timer-dock" id="timerDock">
  <button type="button" class="timer-tab" id="timerTab"
          title="Open timer" aria-label="Open timer"
          aria-expanded="false" aria-controls="timerPanel">
    <svg>…clock…</svg>
    <span>Timer</span>
  </button>
  <div class="timer-panel-wrap">
    <div class="timer-panel" id="timerPanel">
      <div class="timer-display" id="timerDisplay">0:00</div>
      <div class="timer-buttons">
        <button class="btn btn-primary" id="timerStartStop">Start</button>
        <button class="btn btn-ghost" id="timerReset">Reset</button>
      </div>
      <hr class="timer-divider">
      <div class="settings-group" id="warningGroup">
        <div class="settings-header">
          <span class="settings-label">Warning</span>
          <label class="toggle"><input type="checkbox" id="warningToggle"><span class="toggle-track"></span></label>
        </div>
        <div class="duration-input" id="warningDuration">
          <input type="number" id="warningMin" min="0" max="99" value="2" aria-label="Warning minutes">
          <span class="sep">:</span>
          <input type="number" id="warningSec" min="0" max="59" value="0" aria-label="Warning seconds">
          <span class="unit">min:sec</span>
        </div>
      </div>
      <div class="settings-group" id="alarmGroup">
        <div class="settings-header">
          <span class="settings-label">Alarm</span>
          <label class="toggle"><input type="checkbox" id="alarmToggle"><span class="toggle-track"></span></label>
        </div>
        <div class="duration-input" id="alarmDuration">
          <input type="number" id="alarmMin" min="0" max="99" value="5" aria-label="Alarm minutes">
          <span class="sep">:</span>
          <input type="number" id="alarmSec" min="0" max="59" value="0" aria-label="Alarm seconds">
          <span class="unit">min:sec</span>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="page">
  <main id="content" aria-label="Feedback sections"></main>
</div>

<aside class="preview-dock" id="previewDock">
  <!-- preview panel with format toggle and side tabs -->
</aside>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

<dialog class="app-dialog instr-dialog" id="instrDialog">…</dialog>
<dialog class="app-dialog restore-dialog" id="restoreDialog">…</dialog>

<textarea id="contentTA" aria-hidden="true" tabindex="-1"></textarea>
```

Each rendered section (from `currentTemplate().sections`):

```html
<section class="section" data-section-id="intro">
  <div class="section-head" role="button" tabindex="0"
       aria-expanded="true" aria-controls="body-intro">
    <h3>1. Introduction:</h3>
    <span class="section-word-count"></span>
    <span class="section-chevron" aria-hidden="true">▾</span>
  </div>
  <button class="section-reset" aria-label="Clear this section">×</button>
  <div class="section-body" id="body-intro">
    <p class="consider"><em>Marker to consider:</em> …</p>
    <textarea class="comments goodcomment" data-section-id="intro" data-box-key="good" spellcheck="true"></textarea>
    <textarea class="comments improvecomment" data-section-id="intro" data-box-key="improve" spellcheck="true"></textarea>
  </div>
</section>
```

Key IDs used by JS: `topbar`, `brandTitleText`, `templateSelect`, `content`, `name`, `nameError`, `wordCountValue`, `charCountValue`, `resetAllBtn`, `openInstructions`, `instrDialog`, `closeInstructions`, `closeInstructionsBtn`, `helpContact`, `helpContactName`, `helpContactLink`, `restoreDialog`, `restoreSummary`, `restoreAccept`, `restoreDiscard`, `previewDock`, `previewPanel`, `previewPanelInner`, `previewTab`, `copyTab`, `previewBody`, `previewSubtitle`, `previewBoxLabel`, `previewWarning`, `htmlModeToggle`, `toast`, `contentTA`, `timerDock`, `timerTab`, `timerPanel`, `timerDisplay`, `timerStartStop`, `timerReset`, `warningToggle`, `warningMin`, `warningSec`, `warningDuration`, `alarmToggle`, `alarmMin`, `alarmSec`, `alarmDuration`.

---

## 7. The feedback builder (pure function)

`buildFeedback(input)` takes state as an argument and returns three parallel outputs. **No DOM reads.** The template is passed in, so the same algorithm serves every template.

Input shape:
```js
{
  template: { sections: [...], prefixes: { good, improve } },
  sections: { [sectionId]: { [boxKey]: string } },
  name: string
}
```

```
Algorithm:
  blocks = []
  for each section in input.template.sections:
    data  = input.sections[section.id] || {}
    boxes = section.boxes
              .map(box => ({ box, value: (data[box.key] || '').trim() }))
              .filter(entry => entry.value.length > 0)
    if boxes.length == 0: skip section

    paras = boxes.map(entry => {
      if boxes.length == 1: return entry.value                    // no prefix
      label = entry.box.kind === 'improve' ? input.template.prefixes.improve
            : entry.box.kind === 'good'    ? input.template.prefixes.good
            : ''
      return label + entry.value
    })

    blocks.push({ heading: section.heading, paras })

  name = (input.name || '').trim()

  previewName = name
    ? 'Marker: ' + escapeHtml(name)
    : '<span class="missing-name">Marker: (enter your name)</span>'
  textName    = 'Marker: ' + (name || '(enter your name)')

  previewBlocks = [previewName]
  tagBlocks     = [textName]
  plainBlocks   = [textName]

  for each block b in blocks:
    sep      = b.paras.length > 1 ? '<br><br>' : '<br>'
    plainSep = b.paras.length > 1 ? '\n\n'    : '\n'

    previewBlocks.push(
      '<b>' + escapeHtml(b.heading) + '</b><br>' +
      b.paras.map(p => newlinesToBr(escapeHtml(p))).join(sep)
    )

    tagBlocks.push(
      '<b>' + b.heading + '</b><br>' +
      b.paras.map(newlinesToBr).join(sep)
    )

    plainBlocks.push(
      b.heading + '\n' +
      b.paras.map(normalizeNewlines).join(plainSep)
    )

  return {
    hasName:     !!name,
    hasContent:  blocks.length > 0,
    previewHtml: previewBlocks.join('<br><br>'),
    taggedText:  tagBlocks.join('<br><br>'),
    plainText:   plainBlocks.join('\n\n')
  }
```

Helpers:

```
escapeHtml(s)         = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
newlinesToBr(s)       = s.replace(/\r\n/g,'\n').replace(/\n/g,'<br>')
normalizeNewlines(s)  = s.replace(/\r\n/g,'\n')
```

**Important**: in `taggedText` the user's text is **not** escaped. The preview *is* escaped. See gotcha 22.4.

The `.consider` paragraph and the `h3`'s `::before` decoration must not appear in any output. `buildFeedback` naturally excludes them because it reads only the template and the state object.

---

## 8. Copy to clipboard

```
function copyToClipboard():
  try:
    name = nameInput.value.trim()
    if (!name): flagNameRequired(); return
    clearNameError()

    built = buildFeedback({ template: currentTemplate(), sections: currentDraft().sections, name })
    if (!built.hasContent): showToast('Nothing to copy yet…'); return

    htmlMode = htmlModeToggle.checked
    payload  = htmlMode ? built.taggedText : built.plainText

    copyArea.value = payload
    copyArea.focus({ preventScroll: true })
    copyArea.select()
    copyArea.setSelectionRange(0, 99999)

    wordCount = total words across currentDraft().sections
    done = () => showToast('Copied N words (HTML|plain text) — ready to paste')

    execCommandCopy = () => { … document.execCommand('copy') … }

    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(payload).then(done).catch(execCommandCopy)
    else
      execCommandCopy()
  catch (err):
    console.error('Copy failed:', err)
    showToast('Copy failed — please try again')
```

**Do not** use `ClipboardItem` with a `text/html` flavour. See gotcha 22.1.

---

## 9. Marker-name validation

The input has **no `value` attribute** — only `placeholder="Your name"`. On load, `nameInput.value` is set from `prefs.name` (empty on first use).

```
clearNameError():
  nameError.hidden = true
  nameInput.classList.remove('invalid')
  nameInput.removeAttribute('aria-invalid')

flagNameRequired():
  nameError.hidden = false
  nameInput.setAttribute('aria-invalid', 'true')
  nameInput.classList.remove('invalid')
  void nameInput.offsetWidth            // force reflow to restart animation
  nameInput.classList.add('invalid')
  nameInput.focus({ preventScroll: true })
  len = nameInput.value.length
  try { nameInput.setSelectionRange(len, len) } catch {}
  showToast('Please enter your name before copying')

nameInput.addEventListener('input', () => {
  prefs.name = nameInput.value
  savePrefs()
  clearNameError()
  updatePreview()
})
```

The `.invalid` class applies a pale-red background, red border, red ring, and `animation: shake .42s ease`. `void offsetWidth` is essential — without it, repeated clicks do not re-trigger the animation (gotcha 22.5).

The error bubble is `position: absolute; top: calc(100% + 8px); left: 0` so it floats below the input without shifting the sticky bar (gotcha 22.9).

There is **no** check against the literal string `"Your name"` in the input value. Any non-empty trimmed value is accepted.

---

## 10. Word and character counts

```
function refreshCounts():
  totalWords = 0; totalChars = 0
  template = currentTemplate()
  data     = currentDraft().sections

  for each section in template.sections:
    sectionWords = 0
    sectionData  = data[section.id] || {}
    for each box in section.boxes:
      text = (sectionData[box.key] || '').trim()
      if (!text) continue
      w = text.split(/\s+/).length
      sectionWords += w; totalWords += w; totalChars += text.length
    // write sectionWords into the section header's .section-word-count
    // ('' when zero; "1 word" / "N words")

  wordCountValue.textContent = totalWords
  charCountValue.textContent = totalChars.toLocaleString()
```

- Includes the final section's textareas.
- Excludes the marker name input.
- Call `refreshCounts()` on every input, on template switch, on reset, and on load.

---

## 11. Preview panel and format toggle

Panel mechanics:

- `.preview-dock` is `position: fixed; left: 0; top: 0; width: 0; height: 100vh; pointer-events: none`.
- `.preview-panel` is `position: absolute; top: 50%; left: 0; transform: translate(-100%, -50%)` closed, `translate(0, -50%)` open.
- `.side-tabs` sits at `right: var(--tab-offset); top: 50%; transform: translateY(-50%)`.
- `#previewTab` toggles the dock; `#copyTab` calls `copyToClipboard()` and **never** opens the panel.

`updatePreview()` renders `built.previewHtml` via `innerHTML` when HTML mode is on, or `built.plainText` via `textContent` with `.plain-mode` (`white-space: pre-wrap`) when off. Preserve `scrollTop` across re-renders. The warning banner (`#previewWarning`) is shown only when content exists but the name is empty.

Call `updatePreview()` on: panel open, any input in `#name` or a `.comments` textarea, format-toggle change, template switch, and reset.

Format toggle markup:

```html
<div class="format-toggle">
  <label class="format-toggle-label" for="htmlModeToggle">
    <input type="checkbox" id="htmlModeToggle" checked>
    <span class="format-toggle-switch" aria-hidden="true"></span>
    <span class="format-toggle-text">Include HTML tags</span>
  </label>
  <span class="hint-icon" tabindex="0" role="button"
        aria-label="What does this option do?"
        data-tooltip="Untick to copy plain text with real line breaks instead of HTML tags.">?</span>
</div>
```

The native checkbox is visually hidden (clip-rect). The switch graphic is a `<span>` sibling, styled via `:checked + .format-toggle-switch`. `:focus-visible` on the checkbox draws a ring on the switch.

**The hint is a tooltip**, not inline text. `.hint-icon::after { content: attr(data-tooltip); … }` shows on `:hover` and `:focus-visible`, dark background, 220px wide, positioned above the icon.

---

## 12. Instructions dialog

Uses a **native `<dialog>`** opened with `showModal()`. Focus trapping, Escape, `::backdrop` styling, and `inert`-ing of the background come for free.

- Trigger: `#openInstructions` (pill button, becomes icon-only below 720px via `display: none` on its text span; `#resetAllBtn` shares the same `.howto` pill style and collapse; `aria-label` keeps it accessible).
- Backdrop: `.app-dialog::backdrop { background: rgba(34,33,31,.5); backdrop-filter: blur(5px); }`.
- `.app-dialog-inner` wrapper for padding and internal scrolling (`max-height: 82vh; overflow-y: auto`).
- **Help contact**: a paragraph (`#helpContact`, with `#helpContactName` and `#helpContactLink`) above "Got it". Name, email and subject come from `settings.help`; the link is `mailto:<email>?subject=<encodeURIComponent(subject)>`. Defaults: Richard Morey, moreyr@cardiff.ac.uk, "Marking helper app". An empty `contactEmail` hides the paragraph; an empty subject omits the `?subject=` part.
- Closing: X button, "Got it" button, or Escape. A click outside the dialog's bounding rect also closes it.

Content order — **this matters**: pedagogical/non-technical points first, technical points last.

Current order:

1. Intro paragraph (workflow: enter name, choose template, add text, click Copy).
2. "Not expected to comment on every section…" tip (yellow-left callout).
3. Bulleted list, in this order (the help contact paragraph follows the list, above "Got it"):
   1. One box → no prefix.
   2. Both boxes → blank line separates them.
   3. Blank sections omitted.
   4. Marker name required and attributed.
   5. Paragraphs via Enter survive the paste.
   6. Section collapse and per-section reset.
   7. **Timer** — the Timer button in the top-left opens/closes the whole panel; Start/Stop; Reset.
   8. **Settings** — same panel; nested sub-bullets describe the Warning (two tones) and Alarm (repeating triple beep), including the three-second timer reveal for each.
   9. **Warning/Alarm settings** — `min:sec` format, invalid-time auto-disable, per-device persistence.
   10. Auto-save per template; hash invalidation on template change; age-based wipe on return.
   11. Word and character counts in the top bar.
   12. Preview tab behaviour; Copy never opens the preview; `Ctrl/Cmd+Enter` copies.
   13. **Include HTML tags** checkbox.
   14. Copied HTML contains `<br>` and `<b>` tags; plain editors show them.
   15. Each newline encoded as `<br>` in HTML output.

The nested list (Warning / Alarm) uses a slightly smaller size and a muted diamond marker via:
```css
.app-dialog li > ul { margin: 8px 0 0; gap: 6px; }
.app-dialog li > ul li { padding-left: 24px; font-size: 0.88rem; }
.app-dialog li > ul li::before {
  background: var(--muted); opacity: 0.6;
  width: 7px; height: 7px; top: 8px; left: 4px;
}
```

Help text must be **template-neutral**: "the practical" → "the submission"; "Key point for your next submission" → "the final section".

---

## 13. Draft persistence (per template, hash + age guarded)

**Availability check** (runs at module load, before anything else):
```
try { localStorage.setItem('__pmh_test__','1'); localStorage.removeItem('__pmh_test__'); }
catch { storageAvailable = false }
```

**Preferences** (key `storage.prefsKey`, default `pmh-prefs-v4`):
- `prefs = { name, htmlMode, template }`
- Loaded via `loadPrefs()` at boot.
- Written via `savePrefs()` on every name keystroke, every toggle change, and every template switch.
- **Never** wiped by draft invalidation.

**Drafts** (key `storage.draftsKey`, default `pmh-drafts-v4`):

Stored shape (one entry per template id, e.g. `practical`, `essay`):
```js
{
  [templateId]: { hash: '…', sections: {…}, collapsed: {…}, savedAt: 1234567890 }
}
```

The `hash` is a `cyrb53` of `JSON.stringify({ prefixes, sections })` for that template's data.

**Hash helper:**
```js
function cyrb53(str, seed) {
  seed = seed || 0;
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
```

**Load validation** (`loadDrafts()`):

```
now       = Date.now()
maxAgeMs  = SETTINGS.storage.maxDraftAgeDays * 86400 * 1000
for each tid in TEMPLATES:
  stored = parsed[tid]
  if !stored or typeof !== 'object': skip

  currentHash = templateHash(TEMPLATES[tid])

  if stored.hash !== currentHash:
    drafts[tid] = { sections: {}, collapsed: {}, savedAt: 0 }
    continue

  if stored.savedAt and (now - stored.savedAt) > maxAgeMs:
    drafts[tid] = { sections: {}, collapsed: {}, savedAt: 0 }
    continue

  drafts[tid] = {
    sections:  stored.sections  || {},
    collapsed: stored.collapsed || {},
    savedAt:   stored.savedAt   || 0
  }
```

**Save** (`saveDrafts()`):

```
for each tid in drafts:
  isActive = (tid === prefs.template)
  toStore[tid] = {
    hash:      templateHash(TEMPLATES[tid]),
    sections:  drafts[tid].sections,
    collapsed: drafts[tid].collapsed,
    savedAt:   isActive ? Date.now() : (drafts[tid].savedAt || 0)
  }
localStorage.setItem(SETTINGS.storage.draftsKey, JSON.stringify(toStore))
```

Only the active template's `savedAt` is refreshed on each save.

**Debounced save** — `scheduleDraftsSave()` on every textarea input (`storage.autosaveDelayMs`, default 500). Synchronous save on `beforeunload`.

**Restore prompt** (boot, for the **current** template only):

```
loadPrefs(); loadDrafts()
if draftHasContent(currentDraft()):
  savedSnapshot = deep clone of currentDraft()
  currentDraft().sections  = {}
  currentDraft().collapsed = {}
  restoreSummary = "A <template title minus ' Marking Helper'> draft with N words from <time> …"
  restoreDialog.showModal()

  restoreAccept.addEventListener('click', () => {
    restoreDialog.close();                             // <-- MUST run first
    currentDraft().sections  = savedSnapshot.sections
    currentDraft().collapsed = savedSnapshot.collapsed
    populateTextareasFromDraft()
    applyCollapsedState()
    refreshUI()
    showToast('Draft restored')
  }, { once: true })

  restoreDiscard.addEventListener('click', () => {
    restoreDialog.close();                             // <-- MUST run first
    currentDraft().sections  = {}
    currentDraft().collapsed = {}
    currentDraft().savedAt   = 0
    saveDrafts()
    refreshUI()
    showToast('Started fresh')
  }, { once: true })

  refreshUI()
```

**The `.close()` calls are not optional.** The restore dialog attaches a `cancel` listener that calls `preventDefault()` on Escape (see below), so nothing else can dismiss the modal. If a button handler forgets `restoreDialog.close()`, the app is stuck behind an unremovable overlay. This is exactly the v4.1 regression fixed in v4.1.1.

The restore dialog cannot be dismissed except by choosing a button:
```
restoreDialog.addEventListener('cancel', function (e) { e.preventDefault(); });
```
There is no X button. Only the **active** template's draft is offered on boot.

**Before-unload handler** — always flushes the pending save and stops timers; the confirmation prompt applies only when `storageAvailable === false` and there is content:

```
window.addEventListener('beforeunload', e => {
  clearTimeout(saveTimer)
  saveDrafts()
  clearInterval(timerIntervalId)
  clearAlarmTimeouts()
  if (!storageAvailable && currentDraft has content):
    e.preventDefault(); e.returnValue = ''
})
```

---

## 14. Template switching

```
function switchTemplate(newTemplateId):
  if !isSelectableTemplate(newTemplateId): return   // must exist and not be active:false
  if newTemplateId === prefs.template: return

  saveDrafts()                    // persist current template before switching
  prefs.template = newTemplateId
  savePrefs()

  applyTemplateChrome()           // document.title and #brandTitleText
  renderSections()
  populateTextareasFromDraft()
  refreshUI()
```

`applyTemplateChrome()`:
```
template = currentTemplate()
document.title = template.title
brandTitleText.textContent = template.title
```

The restore prompt is **not** shown on switch — only on page load. The dropdown options are generated once at boot (§5, `active`), before the saved template is selected.

---

## 15. Reset and undo

### Global reset (`#resetAllBtn`)

Snapshot `currentDraft().sections`, clear it, save, clear all textareas, `refreshUI()`, and show a toast with an Undo action (10 s). Undo writes the snapshot back to `currentDraft().sections`, saves, repopulates, and refreshes.

### Per-section reset (× in each section header)

Same shape, scoped to one section's data on the current template. Captures a snapshot of only that section's boxes, clears them, writes the draft, offers Undo.

### Undo toast

`showToast(message, opts)` accepts `opts.action = { label, onClick }` and `opts.timeout` (defaults to `ui.toastWithActionMs` (10 s) when there is an action, `ui.toastDefaultMs` (2.4 s) otherwise). The toast gains `.has-action` which enables pointer events, adds a rounded-rect shape, and renders a `<button class="toast-action">`.

Undo resolves `currentDraft()` at click time, not at reset time — if the marker switches template within the undo window, the snapshot is applied to the new template's draft. Acceptable given the 10-second window; see gotcha 22.28.

---

## 16. Collapse and auto-grow

### Collapse

Each `.section-head` is `role="button" tabindex="0" aria-expanded aria-controls`. Click or `Enter`/`Space` toggles `.collapsed` on the section. When collapsed, `.section-body { display: none }` and the chevron rotates -90°. State is written to `currentCollapsed()[sid]` and `saveDrafts()` is called. When expanding, all textareas inside are re-auto-grown.

Collapsed state lives in the draft, so it is invalidated along with the sections when the template hash changes or the draft ages out.

### Auto-grow

`resize: none` on textareas; `autoGrow(ta)` sets `height: auto` then `height: min(scrollHeight, window.innerHeight * ui.textareaMaxHeightRatio) + 'px'`. Called on every input, on expand, on draft restore, and on template switch.

---

## 17. Timer / Settings dock

### Structure and positioning

A single `.timer-dock` at `position: fixed; top: 0; left: 16px; z-index: 90`. It contains:

- `#timerTab` — a horizontal button (`min-width: 92px; height: 30px; border-radius: 0 0 10px 10px`) with a clock SVG and the text "Timer". `aria-expanded` reflects the panel state.
- `.timer-panel-wrap` — a `max-height: 0` wrapper that expands to `max-height: 720px` when `.timer-dock.open` is set. `transition: max-height .4s`.
- `.timer-panel` — the panel itself, width 300px, opacity animates alongside the reveal.

The dock has `pointer-events: none` and the tab and panel each opt back in with `pointer-events: auto`, so the empty dock region does not block clicks on the top bar underneath.

The panel overlaps the sticky top bar (`z-index: 90` vs `80`). This is intentional: the user accepted that the tab covers part of the title bar, and it means the dock does not need to reposition itself when the sticky bar wraps or shrinks.

### Visibility state machine

Two booleans, both module-scoped:

| Variable | Meaning |
|---|---|
| `timerOpen` | User-controlled open state; toggled by `#timerTab` |
| `forceTimerTimeout` / `forceCloseOnEnd` | Pending auto-close state after a Warning/Alarm reveal |

`setTimerOpen(open)`:
```js
timerOpen = open;
timerDock.classList.toggle('open', open);
timerTab.setAttribute('aria-expanded', String(open));
timerTab.setAttribute('aria-label', open ? 'Close timer' : 'Open timer');
timerTab.setAttribute('title',     open ? 'Close timer' : 'Open timer');
```

**Tab click handler:**
```js
if (forceTimerTimeout) {
  clearTimeout(forceTimerTimeout);
  forceTimerTimeout = null;
  forceCloseOnEnd = false;
}
setTimerOpen(!timerOpen);
```
The marker's explicit click always wins over a pending auto-close: clicking the tab during the three-second reveal cancels the close and performs a normal toggle (which happens to be a close, so the effective result is close either way — but the state is now under explicit control).

**`forceTimerOpenFor(ms)`:**
```js
if (forceTimerTimeout) clearTimeout(forceTimerTimeout);
forceCloseOnEnd = false;

if (!timerOpen) {
  setTimerOpen(true);
  forceCloseOnEnd = true;
}

forceTimerTimeout = setTimeout(function () {
  if (forceCloseOnEnd) setTimerOpen(false);
  forceTimerTimeout = null;
  forceCloseOnEnd = false;
}, ms);
```

If the panel was already open when the cue fired, the timeout does nothing (`forceCloseOnEnd` stays `false`), so the marker's open state is preserved. If the panel was closed, it opens and the pending timeout closes it after `ms`.

### Timer count

**State:**
```js
let timerRunning = false;
let timerAccumulatedMs = 0;
let timerStartedAt = 0;
let timerIntervalId = null;
```

**`getElapsedMs()`** = `timerAccumulatedMs + (timerRunning ? Date.now() - timerStartedAt : 0)`.

**Display** via `formatTime(ms)`:
```js
const totalSec = Math.floor(ms / 1000);
const min = Math.floor(totalSec / 60);
const sec = totalSec % 60;
return min + ':' + String(sec).padStart(2, '0');
```
No hour rollover — minutes grow unbounded.

**Start:** unlocks audio via `getAudioContext()`, sets `timerStartedAt = Date.now()`, sets `timerRunning = true`, changes the button label to "Stop" and the style from `btn-primary` to `btn-ghost`, starts `setInterval(tick, timer.tickIntervalMs)` (default 200 ms).

**Stop:** accumulates the elapsed run into `timerAccumulatedMs`, sets `timerRunning = false`, restores the button, clears the interval.

**Reset:** if running, resets `timerStartedAt = Date.now()` (the run continues from zero). Zeroes `timerAccumulatedMs`, clears the `fired` flags, clears any pending alarm `setTimeout` IDs, updates the display. **Does not** stop the timer.

**Tick:**
```
updateTimerDisplay()
elapsedSec = Math.floor(getElapsedMs() / 1000)
if !fired.warning && timerSettings.warningEnabled && elapsedSec >= warningSec:
  fired.warning = true; fireWarning()
if !fired.alarm && timerSettings.alarmEnabled && elapsedSec >= alarmSec:
  fired.alarm = true; fireAlarm()
```

Fired flags reset on Reset or on a settings change.

### Audio

Lazy `AudioContext`:
```js
function getAudioContext() {
  if (!audioContext) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioContext = new AC();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}
```

**`getAudioContext()` must be called from a user gesture** (Start, or toggling either setting) at least once, or `AudioContext` stays suspended and all tones are silent. See gotcha 22.26.

**`playTone(freq, durationSec, startOffsetSec)`** — sine wave, gain envelope from 0.0001 → `timer.volume` (0.3, over ≤20 ms) → 0.0001.

**`fireWarning()`** (defaults shown; values come from `settings.timer.warningTone`):
```js
playTone(880, 1.0, 0);       // one second at 880 Hz
playTone(880, 1.0, 1.25);    // one second, 1.25 s later (0.25 s gap)
forceTimerOpenFor(3000);   // timer.panelRevealMs
```

**`fireAlarm()`** (defaults shown; values come from `settings.timer.alarmTone`):
```js
for (let i = 0; i < 6; i++) {
  setTimeout(() => {
    playTone(660, 0.1, 0);
    playTone(660, 0.1, 0.15);
    playTone(660, 0.1, 0.3);
  }, i * 1500);
}
forceTimerOpenFor(3000);
```
Each cycle is three short 660 Hz tones. Six cycles at 1.5 s intervals → ~9 seconds. Each `setTimeout` id is pushed to `alarmTimeouts`; `clearAlarmTimeouts()` runs on Reset and `beforeunload`.

### Settings UI

**`readDuration(minInput, secInput)`** clamps and returns `min * 60 + sec` (0–6039).

**`writeDuration(minInput, secInput, totalSec)`** splits back into min/sec for display.

**`updateDurationValidity(minInput, secInput, durEl, toggleEl)`:**
- Reads the total; if `<= 0`, adds `.invalid` to `durEl`.
- If invalid **and** the toggle is checked, unchecks the toggle and updates `timerSettings`. Auto-disable is deliberate: an invalid duration cannot produce a cue.
- Returns the total.

**Warning handlers** (`warningMin`, `warningSec`, `warningToggle`) and **Alarm handlers** (`alarmMin`, `alarmSec`, `alarmToggle`) follow the same pattern:
- `input`: update `timerSettings`, reset the corresponding `fired` flag, save settings.
- `blur`: clamp the value to `[0, 99]` or `[0, 59]` and re-run the validity check.
- `change` on the toggle: unlock audio, refuse to enable if the current total is 0, otherwise store the new enabled state.

**Persistence:** every change calls `saveTimerSettings()` which writes `{ warningEnabled, warningSec, alarmEnabled, alarmSec }` under `storage.timerKey`.

---

## 18. Keyboard shortcuts

- **`Ctrl/Cmd + Enter`** — copy.
- **`Ctrl/Cmd + Shift + R`** — reset all (with undo toast).
- **`Escape`** — closes the preview dock if open. The instructions and restore dialogs are native `<dialog>`s and handle their own Escape (the restore dialog cancels it via `preventDefault`).
- **`Enter` / `Space` on a focused `.section-head`** — toggles collapse.

No keyboard shortcuts for the timer; it is a mouse- or touch-driven utility.

---

## 19. Sticky top bar

```css
.topbar { position: sticky; top: 0; z-index: 80;
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(16px) saturate(150%);
          border-bottom: 1px solid var(--line); }
.topbar.stuck { background: rgba(255,255,255,.96);
                box-shadow: 0 16px 36px -26px rgba(34,33,31,.48); }
```

```js
function syncTopbarShadow() {
  topbar.classList.toggle('stuck', window.scrollY > 4)
}
window.addEventListener('scroll', syncTopbarShadow, { passive: true })
```

`.topbar-inner` is a flex-wrapping row with `flex-wrap: wrap`, `align-items: flex-end`, `justify-content: flex-end`, max-width 1000px, padding `10px 20px`. The brand block is its own full-width row (`width: 100%`), right-aligned.

Below the brand row, the controls group holds the template select, word count, name field, How to use button and Reset all button, sharing the `.field-label` treatment with the name field.

---

## 20. Responsive rules

Target: half a typical screen, roughly **683–960px wide**.

- **≤ 800px** — sections become single-column; controls take full width; `.name-field { flex: 1 1 140px }`.
- **≤ 720px** — `.howto` buttons (How to use, Reset all) collapse to icon-only (`padding: 6px`, text span hidden, icon 24px); page padding `22px 14px 110px`; bar padding `9px 14px`; section padding `22px 18px`; textarea `min-height: 8em`; toast `bottom: 96px`; preview panel `min(360px, 90vw)`; `--tab-w: 40px; --tab-h: 100px; --tab-offset: -40px`; timer tab `height: 28px`, `font-size: 0.66rem`, `min-width: 84px`; timer display 1.9rem.
- **≤ 480px** — compact type; brand mark 26px; word-count labels smaller; section heading 1.12rem; textarea 0.9rem / 6.5em; preview panel `min(320px, 88vw)`; `--tab-w: 34px; --tab-h: 84px; --tab-offset: -34px`; timer tab `height: 26px`, `font-size: 0.62rem`, `min-width: 76px`; timer panel 280px; timer display 1.7rem.
- **≤ 380px** — preview panel `85vw`; `--tab-w: 30px; --tab-h: 76px; --tab-offset: -30px`; word-count labels hidden (numbers only).

Tokenising the side-tab geometry means the responsive tiers are a two- or three-variable edit. `.preview-body.plain-mode` must be preserved at every breakpoint.

There is **no** `.page` left-padding shift any more. In v4.0, the timer dock occupied a column on the left at narrow widths, but in v4.1 the tab is small enough to overlap the top bar safely and the panel opens over the content; no gutter is needed.

---

## 21. Accessibility checklist

- `#name` has `aria-describedby="nameError"` and `aria-invalid="true"` while invalid.
- `#nameError` has `role="alert"`.
- `#toast` has `role="status" aria-live="polite"`.
- `#openInstructions` has `aria-haspopup="dialog"` and an `aria-label`; `#resetAllBtn` has an `aria-label` and `title`, which keep both buttons accessible when collapsed to icons.
- Dialogs use `showModal()` for native focus trapping and `inert` background.
- `#previewTab` has `aria-expanded` and `aria-controls`.
- `#copyTab` has an `aria-label` and a `title` mentioning the shortcut.
- `#timerTab` has `aria-expanded` and `aria-controls="timerPanel"`, and its `aria-label` / `title` swap between "Open timer" and "Close timer" alongside `aria-expanded`.
- `.section-head` has `role="button" tabindex="0" aria-expanded aria-controls`.
- The format checkbox is a real `<input type="checkbox">`; the switch graphic is `aria-hidden`.
- The `.hint-icon` has `role="button" tabindex="0" aria-label` and a `data-tooltip`.
- Timer toggles are native `<input type="checkbox">` with an associated `<label class="toggle">`; the track graphic is `aria-hidden`.
- Duration inputs are `<input type="number">` with `aria-label` ("Warning minutes", etc.).
- `.side-tab`, `.howto`, `.timer-tab`, and the template select all have visible `:focus-visible` rings.
- `prefers-reduced-motion: reduce` kills all animations and transitions.

---

## 22. Gotchas — things that bit us

### 22.1 The clipboard flavour trap

**Wrong:** `new ClipboardItem({ 'text/html': …, 'text/plain': … })`.
**Right:** `navigator.clipboard.writeText(taggedString)` where `taggedString` literally contains `<br>` and `<b>`. No `text/html` flavour.

### 22.2 Internal newlines vs. between-textarea newlines

Call `newlinesToBr(value)` on **each** textarea's value before joining.

### 22.3 Two-box separator

`sep = paras.length > 1 ? '<br><br>' : '<br>'` (or `'\n\n'` / `'\n'` in plain mode).

### 22.4 Asymmetric escaping

`taggedText` is **not** escaped; `previewHtml` **is**. Do not "fix" one without the other.

### 22.5 Restarting the shake animation

`el.classList.remove('invalid'); void el.offsetWidth; el.classList.add('invalid')`.

### 22.6 The preview must not open on copy

Copy lives on the tab, outside the panel; the checkbox state is read at click time.

### 22.7 Section rendering is driven by data

`TEMPLATES[tid].sections` is the only source of section structure. Prefixing depends on `box.kind === 'good'` / `'improve'`; plain boxes have no `kind`.

### 22.8 Escape and the two dialog types

Native `<dialog>` handles Escape itself. The document keydown listener only closes the preview.

### 22.9 The sticky bar and the error bubble

The error bubble is `position: absolute` beneath the input so the sticky bar's height never changes.

### 22.10 Counts scope

Iterate `currentTemplate().sections` and `currentDraft().sections`, not `document.querySelectorAll('textarea')`.

### 22.11 Do not include `.consider` in output

`buildFeedback` reads only the template and the state object.

### 22.12 Clipboard fallback ordering

`navigator.clipboard.writeText(payload).then(done).catch(execCommandCopy)` — not `try/catch` around `writeText`.

### 22.13 Order of help content

Pedagogical first, technical last.

### 22.14 Half-screen sizing

800–950px is the most common half-screen target. Below 800px, drop to one column.

### 22.15 Side-tab overflow at narrow widths

At ≤ 380px, `panel width + tab offset` can exceed the viewport. The tiered `--tab-offset` reductions keep the tabs on-screen.

### 22.16 jQuery removal

v2.0+ has no jQuery.

### 22.17 `localStorage` is per-origin and can be unavailable

- Each host (e.g. `localhost:5173` vs the GitHub Pages URL) has its own storage, so drafts, name and timer settings do not carry between them.
- Private browsing modes and some locked-down browsers reject `localStorage`.
- The built app does not work from `file://` (module scripts), so serve `dist/` over http(s) (`npm run preview`, or GitHub Pages).

The app guards with a `try/catch` test write. When `storageAvailable === false`, all persistence features are skipped, the user sees "Auto-save unavailable in this browser — close the tab with care", and the `beforeunload` guard activates.

### 22.18 Restore dialog cannot be dismissed except by choice

`restoreDialog.addEventListener('cancel', e => e.preventDefault())`. No X button. **And every button handler in the restore dialog must call `restoreDialog.close()` as its first statement** — otherwise nothing can dismiss the modal and the app is stuck. This exact bug shipped in v4.1 and was fixed in v4.1.1. See gotcha 22.37.

### 22.19 Auto-grow and `max-height`

`autoGrow` uses `window.innerHeight * 0.4` as the cap.

### 22.20 `Ctrl/Cmd + Enter` and the caret

`e.preventDefault()` must run first in the handler.

### 22.21 Template switch is not a page reload

Use the accessor functions (`currentTemplate()`, `currentDraft()`, `currentCollapsed()`); do not cache them at module scope.

### 22.22 Storing template-specific state in the right slot

`currentDraft()` reads `prefs.template` at call time.

### 22.23 The word count is per-template

`refreshCounts()` totals the **current** template's draft.

### 22.24 All templates' drafts are saved together

`saveDrafts()` writes the whole `drafts` object.

### 22.25 Migration / invalidation ordering

The dropdown must be populated first, then `loadPrefs()` / `loadDrafts()`, all before `renderSections()` and the boot-time restore prompt. `loadPrefs()` rejects a saved template that is missing or inactive, so a template hidden via `active: false` silently falls back to the default.

### 22.26 Audio must be unlocked by a user gesture

`AudioContext` starts suspended until a gesture. Call `getAudioContext()` on Start and on toggling either setting.

### 22.27 Single-tab timer dock state

The state is now two variables — `timerOpen` and `forceTimerTimeout`/`forceCloseOnEnd` — not the four-boolean machine used in v4.0. `forceTimerOpenFor(ms)` opens the panel only if it was closed and marks it for auto-close; a click on the tab during those three seconds clears the pending timeout so the marker's explicit click wins. Do not reintroduce hover-to-peek: hover has no meaning for a `max-height` reveal that drops below the tab.

### 22.28 Undo and template switch

`showToast`'s Undo resolves `currentDraft()` at click time, not at reset time.

### 22.29 Draft invalidation is silent

A marker whose draft is wiped by the hash or age check sees empty textareas and no restore prompt. No notification is shown. This is deliberate; a one-line toast would be a valid alternative.

### 22.30 Hash covers placeholders and consider text

`templateHash()` uses `JSON.stringify({ prefixes, sections })`. Any change to headings, placeholders, consider text, prefix labels, or box order invalidates drafts for that template. This is the safer default.

### 22.31 Timer keeps running when the panel is closed

Closing the panel does not stop the timer. `timerRunning` and `timerAccumulatedMs` are independent of panel visibility. Alarms and Warning fires continue to trigger and call `forceTimerOpenFor(3000)`.

### 22.32 Warning and Alarm fire once per run

`fired.warning` and `fired.alarm` reset on Reset and on settings change. They do not reset on Stop/Start.

### 22.33 Reset preserves the running state

`resetTimer()` zeroes `timerAccumulatedMs` and, if running, sets `timerStartedAt = Date.now()`. The Start/Stop button label is not changed by Reset.

### 22.34 Background tab throttling

`setInterval(tick, 200)` is throttled in background tabs. Because elapsed time is computed from `Date.now()`, cue timing is within one throttle period (≤1 s) of the intended moment.

### 22.35 Nested list styling in the help modal

The Warning/Alarm sub-bullets use `.app-dialog li > ul` rules to render smaller and with a muted diamond.

### 22.36 The timer panel overlaps the sticky bar

The dock is at `z-index: 90` vs the top bar's `80`. This is intentional — the tab sits at the top-left while the title block is right-aligned, so overlap is minimal — and means the dock does not need to reposition itself on resize or template switch. Do not add a `positionTimerDock()` helper that reads `topbar.offsetHeight`; it is unnecessary now.

### 22.37 The restore-dialog close() regression (v4.1 → v4.1.1)

When the timer dock was rewritten for v4.1, the `init` block was edited and the `restoreDialog.close()` calls in the two restore-button handlers were dropped. Because the restore dialog also `preventDefault()`s Escape, there was no other way to dismiss it, and the app became unusable behind the modal. The fix is a single line at the top of each handler:

```js
restoreAccept.addEventListener('click', function () {
  restoreDialog.close();          // <-- required
  // …state updates…
}, { once: true });

restoreDiscard.addEventListener('click', function () {
  restoreDialog.close();          // <-- required
  // …state updates…
}, { once: true });
```

Order matters: `close()` runs before the state updates so the modal dismisses cleanly and focus restores before the DOM is rewritten underneath it, which avoids a flicker of stale textareas. Add a mental check to any future edit that touches `init`: **every button inside a modal must call `.close()` on that modal**, and this invariant is now in the header contract list.

---

## 23. Test checklist

Manually verify each of these after a rebuild:

**Basics**
1. Load fresh. Template select lists every template not marked `active: false` and shows the first one ("Practical"). Five sections render. Word count 0.
2. Type "hello world". Word count 2, char count 11.
3. Type multiple lines with a blank line. Open preview: rendered view shows the gap. Copy (HTML on). Paste into a plain-text editor: `<br><br>` appears where the blank line was.
4. Fill both boxes in a practical section. Copy. Prefixes read "What was done well: " / "What could be improved: ".
5. Leave a section empty. Copy. It does not appear in the paste.
6. Click Copy with the name empty. Field shakes, red border, error bubble appears, cursor lands in field, toast fires.
7. With a name, click Copy. Toast says `Copied N words (HTML) — ready to paste`.
8. Open preview. Untick "Include HTML tags". Body shows real newlines. Copy. Paste — no tags.

**Template switching**
9. Fill practical section 1. Switch to "Essay". Sections re-render; word count 0. Brand title and `document.title` update.
10. Switch back to "Practical". Practical draft is restored.
11. Fill essay section 6's both boxes. Copy. Prefixes read "Key strengths: " / "Most important improvements: ".
12. Reload in Essay mode. Restore prompt reads "An Essay draft with N words …". Accept → essay draft restores.
13. Collapse a practical section, switch to Essay, collapse a different essay section, switch back: both are independent.

**Restore dialog (v4.1.1 fix)**
14. Type a draft, reload. Restore prompt appears. Click **Restore draft**. The modal closes, the textareas repopulate with the draft, and a "Draft restored" toast appears. Repeat, clicking **Start fresh**: modal closes, textareas stay empty, draft is cleared.
15. Type a draft, reload. Press Escape while the restore dialog is open. Nothing happens (cancelled). Click either button — the dialog closes.
16. Type a draft, reload. Click outside the restore dialog (on the backdrop). Nothing happens. Click a button — the dialog closes.
17. Confirm the instructions dialog still closes on X, on "Got it", on Escape, and on backdrop click.

**Draft invalidation**
18. Type into a practical section. In devtools, change the `storage.draftsKey` entry (`pmh-drafts-v4`) so `practical.hash` is `"0"`. Reload. Practical draft is wiped; restore prompt does not appear. Marker name is still populated.
19. Set `practical.savedAt` to `Date.now() - (6 * 86400 * 1000)`. Reload. Wiped.
20. Change a placeholder in the practical template's `sections`, reload. The practical draft is wiped; the essay draft is not.
21. With `storage.maxDraftAgeDays = 5`, set `savedAt` to 4 days ago. Reload. Draft survives.

**Timer**
22. Click the Timer tab. Panel drops down with "0:00" and Start/Stop. Click Start. Display counts up. Click Stop. Display freezes. Click Reset. Display returns to "0:00"; the button still says "Start".
23. Click Start, then Reset while running. Display returns to "0:00" and continues counting.
24. Click the Timer tab again. Panel retracts. Click once more. Panel drops down again.
25. Confirm there is no hover behaviour on the tab.

**Warning / Alarm**
26. In the timer panel, set Warning to 0:05 and enable it. Start. After ~5 s, two tones play; the timer panel stays open (it was already open).
27. Close the panel, then Start again with Warning enabled at 0:10. After ~10 s, two tones play; the panel drops open for three seconds and closes again. During those three seconds, click the tab: the panel closes and stays closed (the marker's explicit click wins).
28. Set Alarm to 0:10. Start. After ~10 s, six triple-beep cycles play at 1.5 s intervals; the panel reveals for 3 s at the start.
29. Click Reset while the alarm is firing. Remaining cycles stop.
30. Set Warning to 0:00. Red border; toggle auto-disables.
31. Clear the Warning minutes and seconds entirely. Same auto-disable.
32. Type `-1` into Warning minutes. Clamps to 0 on blur. Type `70` into Warning seconds. Clamps to 59 on blur.
33. Reload. Warning and Alarm values and toggles are restored from `localStorage`.

**State and persistence**
34. Type a draft, close the tab, reopen. Restore prompt appears.
35. With `localStorage` blocked (e.g. some private modes), load the app. A toast warns auto-save is unavailable; the beforeunload guard appears.

**Reset and undo**
36. Type into two sections. Click **Reset all**. Both clear; toast offers Undo. Click Undo: both restored.
37. Type into section 1. Click its ×. Only section 1 clears; toast offers Undo. Click Undo: text restored.

**Keyboard and accessibility**
38. `Ctrl/Cmd + Enter` in a textarea: Copy fires.
39. `Ctrl/Cmd + Shift + R`: Reset fires; undo toast appears.
40. `Escape` with preview open: closes. With instructions open: closes. With restore open: nothing.
41. Tab through the top bar. Every control has a visible focus ring, including the template select and the timer toggles.
42. Tab to the timer tab. `aria-expanded` reflects the current state as you toggle.
43. Hover (or Tab to) the `?` hint next to the format toggle. Tooltip appears; no extra height.

**Layout**
44. Scroll down. Top bar stays pinned. Timer tab stays at the very top-left of the viewport.
45. Resize to 900px wide. Title stays right-aligned on its own row; timer tab shrinks slightly; sections still two-column. Below 720px the How to use and Reset all buttons show only their icons.
46. Resize to 750px wide. Sections single-column; name field stretches.
47. Resize to 460px wide. How to use and Reset all are icon-only; timer display shrinks; side tabs still visible.
48. Resize to 340px wide. Nothing overflows; timer tab and side tabs stay inside.

**Templates, settings and help**
49. Add a third template to `templates.json` (no other change). Reload: it appears in the dropdown and works.
50. Set `"active": false` on a template. Reload: it is not in the dropdown. Remove the key: it reappears. If it was the saved template, the app loads the default instead.
51. Change `storage.maxDraftAgeDays` or a timer default in `settings.json`, rebuild: behaviour follows the new value.
52. Open How to use. The contact line shows the configured name and email; the link opens a mail draft with subject "Marking helper app". Clearing `help.contactEmail` hides the line.
53. Title row: `[template title] · School of Psychology` is right-aligned at the very top of the bar and the title updates on template switch.

---

## 24. Known deferred items

- **Help text is one long block.** An accordion (pedagogical / practical / technical) would let a returning marker jump to what they need.
- **The "Marker to consider" guidance is not editable from the UI.** Each template's `consider` strings in `templates.json` are the only place to change them (doing so invalidates stored drafts for that template).
- **Reset-undo resolves the template at click time.** See 22.28.
- **Drafts are stored per origin.** Moving the app to a different host or URL loses all drafts.
- **The undo timeout is a deployment setting** (`ui.toastWithActionMs` in `settings.json`), not a per-user preference.
- **No dark mode.**
- **Adding a template** needs only a new entry in `templates.json`; the dropdown is generated on load. Set `"active": false` to hide one.
- **Timer settings are not synced across tabs.**
- **Timer state is not persisted.** Reloading resets the counter to 0:00.
- **Warning and Alarm fire once per run.** See 22.32.
- **No overtime tracking.** The timer counts up indefinitely.
- **The timer panel overlaps the top bar.** Intentional per user request; see 22.36.