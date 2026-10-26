import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, TermScannerSettings, TermScannerSettingTab } from "./settings";
import {
  registerDecorations,
  registerClickHandler,
  collectTermsFromText,
  createNoteForTerm,
  refreshDecorations,
} from "./scanner";
import { findTerms, normalizeTerm } from "./detect";

export default class TermScannerPlugin extends Plugin {
  settings!: TermScannerSettings;

  /** Cached term matches for the active editor (used by click handling). */
  private lastScan: { text: string; matches: ReturnType<typeof findTerms> } | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCssStyles();
    registerDecorations(this);
    registerClickHandler(this);

    this.addSettingTab(new TermScannerSettingTab(this.app, this));

    // Keep the cached match list fresh for Ctrl/Cmd-click in live preview.
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        if (!info.file || info.file.extension !== "md") return;
        const text = editor.getValue();
        this.lastScan = { text, matches: this.scanText(text) };
      })
    );

    // Command: create a note for the selected text or word at cursor
    this.addCommand({
      id: "create-note-for-current-term",
      name: "Create amboss note for selection / word at cursor",
      editorCallback: async (editor) => {
        let term = editor.getSelection().trim();
        if (!term) {
          // grab the word around the cursor by temporarily selecting it
          const cur = editor.getCursor();
          const line = editor.getLine(cur.line);
          let start = cur.ch, end = cur.ch;
          const isWord = (c: string) => /[A-Za-z0-9\-']/.test(c);
          while (start > 0 && isWord(line[start - 1])) start--;
          while (end < line.length && isWord(line[end])) end++;
          term = line.slice(start, end).trim();
        }
        if (!term) {
          new Notice("Select a term or place the cursor inside one first.");
          return;
        }
        const sourceNote = this.app.workspace.getActiveFile()?.basename;
        const clean = normalizeTerm(term);
        // linkify every occurrence of that same term in the document
        const occ = this.occurrencesOf(clean);
        await createNoteForTerm(
          this,
          clean,
          sourceNote,
          occ.map((o) => ({ start: o.start, end: o.end })),
          occ.map((o) => o.term)
        );
      },
    });

    // Command: scan whole document and create notes for every found term
    this.addCommand({
      id: "scan-document-create-notes",
      name: "Scan document and create notes for all found terms",
      callback: async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return new Notice("No active markdown file.");
        const text = view.editor.getValue();
        const terms = collectTermsFromText(text, this.detectOptions());
        if (!terms.length) return new Notice("No known medical terms found in this note.");
        new Notice(`Found ${terms.length} terms — creating notes…`);
        const src = view.file?.basename;

        // Collect all occurrences per term BEFORE editing the document, then
        // apply replacements back-to-front so offsets remain valid.
        const edits: { start: number; end: number; display: string; noteName: string }[] = [];
        for (const t of terms) {
          try {
            const occ = this.occurrencesOf(t.normalized, text);
            const file = await createNoteForTerm(
              this,
              t.normalized,
              src,
              [],
              []
            );
            if (file && this.settings.linkifyTerms) {
              for (const o of occ) {
                edits.push({ start: o.start, end: o.end, display: o.term, noteName: file.basename });
              }
            }
          } catch (e: any) {
            new Notice(`Failed for "${t.normalized}": ${e?.message ?? e}`);
          }
        }

        if (edits.length) {
          edits.sort((a, b) => b.start - a.start);
          const editor = view.editor;
          let doc = editor.getValue();
          for (const e of edits) {
            doc = doc.slice(0, e.start) + `[[${e.noteName}|${e.display}]]` + doc.slice(e.end);
          }
          editor.setValue(doc);
          new Notice(`Linked ${edits.length} term occurrences.`);
        }
      },
    });

    // Re-scan when a file is opened (auto underline handled by decorations,
    // but we also refresh reading-mode views)
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        if (this.settings.autoScan) {
          this.app.workspace.iterateAllLeaves((leaf) => {
            const v = leaf.view;
            if (v instanceof MarkdownView) v.previewMode.rerender(true);
          });
        }
      })
    );
  }

  detectOptions() {
    return {
      minLength: this.settings.minTermLength,
      useHeuristics: this.settings.heuristicDetect,
      extraTerms: this.settings.extraTerms.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean),
      blockTerms: this.settings.blockTerms.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean),
    };
  }

  scanText(text: string) {
    return findTerms(text, this.detectOptions());
  }

  /** All non-overlapping occurrences of a normalized term in the active doc. */
  occurrencesOf(normalized: string, text?: string): { start: number; end: number; term: string }[] {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const doc = text ?? view?.editor.getValue() ?? "";
    return this.scanText(doc)
      .filter((m) => m.normalized === normalized)
      .map((m) => ({ start: m.start, end: m.end, term: m.term }));
  }

  /** Used by the live-preview click handler: which term covers this offset? */
  termAtDocOffset(offset: number): string | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const doc = view?.editor.getValue() ?? "";
    if (!this.lastScan || this.lastScan.text !== doc) {
      this.lastScan = { text: doc, matches: this.scanText(doc) };
    }
    for (const m of this.lastScan.matches) {
      if (offset >= m.start && offset <= m.end) return m.normalized;
    }
    return null;
  }

  /** Public helper used by the click handler. */
  async createTermNote(term: string): Promise<void> {
    const clean = normalizeTerm(term);
    if (!clean) return;
    const sourceNote = this.app.workspace.getActiveFile()?.basename;
    const occ = this.occurrencesOf(clean);
    await createNoteForTerm(
      this,
      clean,
      sourceNote,
      occ.map((o) => ({ start: o.start, end: o.end })),
      occ.map((o) => o.term)
    );
    this.refreshViews();
  }

  /** Force re-render after settings changes. */
  refreshViews(): void {
    refreshDecorations(this);
    this.app.workspace.iterateAllLeaves((leaf) => {
      const v = leaf.view;
      if (v instanceof MarkdownView) v.previewMode.rerender(true);
    });
  }

  addCssStyles(): void {
    const css = `
.ats-underline, u.ats-term {
  text-decoration: underline wavy var(--text-accent, #7f5af0);
  text-underline-offset: 3px;
  cursor: pointer;
}
u.ats-term:hover { background: var(--background-modifier-hover); border-radius: 3px; }
`;
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    this.register(() => el.remove());
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
