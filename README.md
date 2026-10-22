# Marking Helper — School of Psychology

Client-side single-page app (v4.1.1) for School of Psychology markers to compose structured feedback and copy it into TurnItIn. Built with Vite + TypeScript; no runtime dependencies, no server, no network storage.

## Features

**Feedback composition**
- Template-driven sections, each with one or two text boxes (a "good" and an "improve" box). Boxes auto-grow, and each section shows its own word count.
- Marker name is required before copying (the field shakes, shows an error and a toast otherwise). The name is added at the top of the output.
- Sections with no text are omitted from the output. When both boxes in a section are filled, they get the template's prefixes and a blank line between them; a single filled box gets no prefix.
- Click a section heading to collapse or expand it; the × clears just that section.
- Total word and character counts in the top bar update as you type.

**Copying**
- The red **Copy** tab on the left edge (or Ctrl/Cmd + Enter) copies the feedback. Copy never opens the preview.
- Output is HTML-tagged by default (`<b>Heading</b><br>…`, typed newlines become `<br>`), shown literally in a plain-text editor. The **Include HTML tags** toggle in the preview switches to plain text with real newlines.
- Falls back to `execCommand('copy')` if the Clipboard API is unavailable.

**Preview and reset**
- The **Preview** tab slides out a live preview of exactly what will be copied.
- **Reset all** (trash icon; Ctrl/Cmd + Shift + R) and per-section clear both show a 10-second **Undo** toast.
- On narrow screens (under 720px wide) the *How to use* and *Reset all* buttons collapse to just their icons.

**Templates**
- Templates are data only (`src/data/templates.json`). Add an entry and it appears in the dropdown on page load; no code changes needed.
- Set `"active": false` on a template to hide it from the dropdown. If `active` is missing the template is shown.
- Each template keeps its own draft and collapsed sections. Switching templates updates the title, sections, counts and preview in place.

**Drafts and persistence (localStorage)**
- Drafts auto-save per template. On reload, a dialog offers to restore or discard the draft for the current template.
- Drafts are discarded on load if the template content has changed (hash mismatch) or they are older than `storage.maxDraftAgeDays` (default 5). Marker name, HTML/plain choice, selected template and timer settings are not affected.
- If localStorage is unavailable, the app warns you and prompts before closing the tab with unsaved content.

**Timer**
- A single **Timer** tab at the top-left opens a panel with a count-up timer (Start/Stop, Reset) and optional **Warning** and **Alarm** cues set in min:sec. Each cue fires once per run, plays a tone, and reveals the panel for 3 seconds if it was closed.
- Invalid times (0:00) are highlighted and switch the cue off. Timer settings persist on the device.

**Help**
- The *How to use* dialog explains the workflow and ends with a help contact (name, `mailto:` link and subject) taken from settings.

## Configuration

All tweakable settings are in [`src/data/settings.json`](src/data/settings.json):

| Group | Keys |
| --- | --- |
| `storage` | `prefsKey`, `draftsKey`, `timerKey`, `maxDraftAgeDays`, `autosaveDelayMs` |
| `help` | `contactName`, `contactEmail`, `emailSubject` (clear `contactEmail` to hide the contact line) |
| `ui` | `textareaMaxHeightRatio`, `toastDefaultMs`, `toastWithActionMs`, `toastStorageWarningMs` |
| `timer` | `defaultWarningSec`, `defaultAlarmSec`, `tickIntervalMs`, `panelRevealMs`, `volume`, `warningTone`, `alarmTone` |

Templates are configured separately in [`src/data/templates.json`](src/data/templates.json): `id`, `title`, optional `active`, `prefixes` (`good`, `improve`) and `sections` (`id`, `heading`, optional `consider` and `final`, and `boxes` with `key`, optional `kind` of `good` or `improve`, and `placeholder`). Changing a template's prefixes or sections invalidates existing drafts for it.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # outputs dist/
npm run preview    # serve the production build
```

## Layout

| Path | Purpose |
| --- | --- |
| `index.html` | App shell, dialogs, instructions text |
| `src/data/settings.json` | Tweakable settings (see above) |
| `src/data/templates.json` | Marking templates |
| `src/data/*.ts` | Typed loaders; `templates.ts` works out which templates are active |
| `src/lib/` | Pure logic: `buildFeedback`, text helpers, template hashing |
| `src/state.ts`, `src/storage.ts` | In-memory state; localStorage persistence |
| `src/ui/` | Sections, preview/counts, actions (reset/undo), clipboard, dialogs, toast |
| `src/timer/` | Timer, audio cues, dock panel, warning/alarm settings |
| `src/styles/` | CSS split by area, imported in cascade order from `src/main.ts` |

## Behavioural contract

Don't break these when changing the code:
- Copied HTML mode contains literal `<br>` and `<b>` tags; plain mode uses real newlines.
- Empty sections are omitted; the name is required; copy never opens the preview.
- Every dialog button handler must call `.close()` on its dialog. The restore-draft dialog ignores Escape, so a button without `close()` leaves the app stuck behind a modal.
- Drafts are wiped on template hash mismatch or age; name and timer settings survive.

## Deploy to GitHub Pages

Push to `main`; `.github/workflows/deploy.yml` builds and publishes `dist/`. In the repository settings, set **Pages → Source** to **GitHub Actions**. The build uses a relative base (`./`), so it works under `https://<user>.github.io/<repo>/`.
