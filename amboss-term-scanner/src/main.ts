import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, TermScannerSettings, TermScannerSettingTab } from "./settings";
import {
  registerDecorations,
  registerClickHandler,
  collectTermsFromText,
  createNoteForTerm,
} from "./scanner";

export default class TermScannerPlugin extends Plugin {
  settings!: TermScannerSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCssStyles();
    registerDecorations(this);
    registerClickHandler(this);

    this.addSettingTab(new TermScannerSettingTab(this.app, this));

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
        await createNoteForTerm(this, term.toLowerCase(), sourceNote);
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
        const terms = collectTermsFromText(text, this.settings.minTermLength);
        if (!terms.length) return new Notice("No known medical terms found in this note.");
        new Notice(`Found ${terms.length} terms — creating notes…`);
        const src = view.file?.basename;
        for (const t of terms) {
          try {
            await createNoteForTerm(this, t, src);
          } catch (e: any) {
            new Notice(`Failed for "${t}": ${e?.message ?? e}`);
          }
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

  /** Public helper used by the click handler. */
  async createTermNote(term: string): Promise<void> {
    const clean = term.trim().toLowerCase();
    if (!clean) return;
    const sourceNote = this.app.workspace.getActiveFile()?.basename;
    await createNoteForTerm(this, clean, sourceNote);
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
