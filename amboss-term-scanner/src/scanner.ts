import { Notice, TFile, normalizePath } from "obsidian";
import type { Extension, Range } from "@codemirror/state";
import type { DecorationSet as DecorationSetType } from "@codemirror/view";
import { EditorView, Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import TermScannerPlugin from "./main";
import { termRegex, TERM_SET } from "./terms";
import { fetchWikipedia, fetchPubChem, fetchMetat2sim, fetchAmboss, TermData } from "./sources";
import { buildNoteMarkdown, sanitizeFileName } from "./note";

/* ------------------------------------------------------------------ */
/* Underline decoration (reading mode + live preview)                  */
/* ------------------------------------------------------------------ */

export function registerDecorations(plugin: TermScannerPlugin): void {
  // Reading & preview post-processor: wrap known terms in <u class="ats-term">
  plugin.registerMarkdownPostProcessor((el, ctx) => {
    if (!plugin.settings.autoScan) return;
    highlightElement(el as HTMLElement);
  });

  // Live-preview editor decoration.
  // NOTE: `DecorationSet` exists only as a *type* in @codemirror/view; the
  // runtime factory is attached to it at load time, so we access it through
  // the module namespace object (same pattern used by popular Obsidian plugins).
  const cmView = requireModule("@codemirror/view") as {
    DecorationSet: { create: (doc: unknown, ranges: Range<Decoration>[]) => DecorationSetType };
  };
  plugin.registerEditorExtension(
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSetType;
        constructor(view: EditorView) {
          this.decorations = buildDecos(view, cmView);
        }
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = buildDecos(update.view, cmView);
          }
        }
      },
      { decorations: (v) => v.decorations }
    ) as unknown as Extension
  );
}

/** Resolve an external CommonJS module at runtime (provided by Obsidian's Electron env). */
function requireModule(name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  try { return window.require ? window.require(name) : undefined; } catch { return undefined; }
}

function buildDecos(
  view: EditorView,
  cmView: { DecorationSet: { create: (doc: unknown, ranges: Range<Decoration>[]) => DecorationSetType } }
): DecorationSetType {
  const decos: Range<Decoration>[] = [];
  const doc = view.state.doc;
  const regex = termRegex();
  for (let line = 1; line <= doc.lines; line++) {
    const text = doc.line(line).text;
    // skip code fences / headings crudely
    if (/^\s*(```|~~~|#)/.test(text)) continue;
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(text)) !== null) {
      const from = doc.line(line).from + m.index;
      const to = from + m[0].length;
      decos.push(
        Decoration.mark({ class: "ats-term ats-underline" }).range(from, to)
      );
    }
  }
  // In Obsidian's bundle `require("@codemirror/view")` returns the live module
  // namespace where DecorationSet.create exists; fall back to the ESM import
  // of the namespace object if window.require is unavailable.
  const factory = cmView?.DecorationSet ?? (cmViewFallback as any);
  return factory.create(doc, decos);
}

/** Walk a rendered DOM tree and underline text nodes containing known terms. */
function highlightElement(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest("code, pre, a, .ats-term")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  const regex = termRegex();
  for (const node of nodes) {
    const text = node.textContent ?? "";
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const u = document.createElement("u");
      u.className = "ats-term";
      u.dataset.term = m[0];
      u.title = `Create "amboss - ${m[0]}" note`;
      u.appendChild(document.createTextNode(m[0]));
      frag.appendChild(u);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  }
}

/* ------------------------------------------------------------------ */
/* Click handling: create the note                                     */
/* ------------------------------------------------------------------ */

export function registerClickHandler(plugin: TermScannerPlugin): void {
  const onClick = async (ev: MouseEvent) => {
    const target = (ev.target as HTMLElement).closest?.("u.ats-term, .ats-underline");
    if (!target) return;
    ev.preventDefault();
    ev.stopPropagation();
    const term =
      (target as HTMLElement).dataset?.term ||
      (target as HTMLElement).textContent?.trim() ||
      "";
    if (term) await plugin.createTermNote(term);
  };
  // Capture phase so Obsidian's own handlers don't swallow it first
  plugin.registerDomEvent(document, "click", onClick as any, true);
}

/* ------------------------------------------------------------------ */
/* Command: scan current editor & create notes for all found terms     */
/* ------------------------------------------------------------------ */

export function collectTermsFromText(text: string, minLength: number): string[] {
  const found = new Set<string>();
  const regex = termRegex();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const t = m[0].toLowerCase().trim();
    if (t.length >= minLength && TERM_SET.has(t)) found.add(t);
  }
  return [...found];
}

export async function fetchTermData(plugin: TermScannerPlugin, term: string): Promise<TermData | null> {
  const s = plugin.settings;
  switch (s.source) {
    case "amboss":
      return fetchAmboss(term, s.ambossCookie);
    case "pubchem": {
      const pc = await fetchPubChem(term);
      return pc ?? (await fetchWikipedia(term)); // fallback for non-chemicals
    }
    case "umls": {
      const um = await fetchMetat2sim(term, s.umlsApiKey);
      return um ?? (await fetchWikipedia(term));
    }
    default:
      return fetchWikipedia(term);
  }
}

export async function createNoteForTerm(
  plugin: TermScannerPlugin,
  term: string,
  sourceNote?: string
): Promise<TFile | null> {
  const data = await fetchTermData(plugin, term);
  if (!data) {
    new Notice(`No data found for "${term}" (${plugin.settings.source}).`);
    return null;
  }
  const folder = plugin.settings.noteFolder;
  if (folder && !plugin.app.vault.getAbstractFileByPath(folder)) {
    await plugin.app.vault.createFolder(folder);
  }
  const name = normalizePath(`${folder ? folder + "/" : ""}amboss - ${sanitizeFileName(term)}.md`);
  const existing = plugin.app.vault.getAbstractFileByPath(name);
  const md = buildNoteMarkdown(data, sourceNote);
  if (existing instanceof TFile) {
    await plugin.app.vault.modify(existing, md);
    new Notice(`Updated [[amboss - ${term}]]`);
    return existing;
  }
  const file = await plugin.app.vault.create(name, md);
  new Notice(`Created [[${file.basename}]]`);
  return file;
}
