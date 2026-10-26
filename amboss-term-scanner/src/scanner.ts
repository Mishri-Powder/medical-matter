import { Notice, TFile, MarkdownView, normalizePath } from "obsidian";
import { Range } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
  EditorView,
  Decoration,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

type DecorationSet = ReturnType<typeof Decoration.set>;
import TermScannerPlugin from "./main";
import { findTerms, normalizeTerm, TermMatch } from "./detect";
import {
  fetchWikipedia,
  fetchPubChem,
  fetchMetat2sim,
  fetchAmboss,
  fetchSnomed,
  fetchAnatomy,
  fetchDrugs,
  fetchMetathesaurus,
  fetchFlexikonLink,
  fetchMWMedicalLink,
  fetchWikimedLink,
  fetchMediSearchLink,
  fetchOpenEvidenceLink,
  fetchWithFallback,
  TermData,
} from "./sources";
import { buildNoteMarkdown, sanitizeFileName } from "./note";

/* ------------------------------------------------------------------ */
/* Underline decoration (reading mode + live preview)                  */
/* ------------------------------------------------------------------ */

/** Shared detection options built from the plugin settings. */
function detectOptions(plugin: TermScannerPlugin) {
  return {
    minLength: plugin.settings.minTermLength,
    useHeuristics: plugin.settings.heuristicDetect,
    extraTerms: parseTermList(plugin.settings.extraTerms),
    blockTerms: parseTermList(plugin.settings.blockTerms),
  };
}

export function parseTermList(s: string): string[] {
  return s
    .split(/[,\n;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function registerDecorations(plugin: TermScannerPlugin): void {
  // Reading & preview post-processor: wrap known terms in <u class="ats-term">
  plugin.registerMarkdownPostProcessor((el, ctx) => {
    if (!plugin.settings.autoScan) return;
    highlightElement(el as HTMLElement, plugin);
  });

  // Live-preview editor decoration (CodeMirror 6 ViewPlugin).
  plugin.registerEditorExtension(
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = buildDecos(view, plugin);
        }
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = buildDecos(update.view, plugin);
          }
        }
      },
      { decorations: (v) => v.decorations }
    ) as unknown as Extension
  );
}

/** Re-evaluate decorations in every open editor (call after settings change). */
export function refreshDecorations(plugin: TermScannerPlugin): void {
  plugin.app.workspace.iterateAllLeaves((leaf) => {
    const cm = (leaf.view as any)?.editor?.cm;
    if (cm && typeof cm.requestMeasure === "function") {
      try {
        cm.requestMeasure([]);
        // force the ViewPlugin to rebuild by dispatching an empty transaction
        cm.dispatch({ changes: [] });
      } catch {
        /* view not ready — ignore */
      }
    }
  });
}

function buildDecos(view: EditorView, plugin: TermScannerPlugin): DecorationSet {
  const decos: Range<Decoration>[] = [];
  if (!plugin.settings.autoScan) return Decoration.set([], true);
  const doc = view.state.doc;
  const opts = detectOptions(plugin);

  // Scan per-line so offsets stay simple; multi-word terms spanning lines are
  // rare enough to ignore here (the full-document scan command handles those).
  for (let line = 1; line <= doc.lines; line++) {
    const lineObj = doc.line(line);
    const text = lineObj.text;
    // Skip code fences and inline code / links crudely.
    if (/^\s*(```|~~~)/.test(text)) continue;
    for (const mt of findTerms(stripMdSyntax(text), opts)) {
      // Don't decorate terms that are already wikilinks [[...]] or md links.
      const before = text.slice(Math.max(0, mt.start - 2), mt.start);
      if (before.includes("[") || text.slice(mt.end, mt.end + 2).includes("]")) continue;
      if (/[|>(]/.test(before.slice(-1))) continue;
      const from = lineObj.from + mt.start;
      const to = from + mt.term.length;
      decos.push(
        Decoration.mark({
          class: "ats-term ats-underline",
          attributes: { "data-term": mt.normalized },
        }).range(from, to)
      );
    }
  }
  return Decoration.set(decos, true);
}

/** Blank out markdown syntax chars so they can't join term matches. */
function stripMdSyntax(line: string): string {
  return line
    .replace(/```[^`]*```/g, (m) => " ".repeat(m.length))
    .replace(/`[^`]*`/g, (m) => " ".repeat(m.length))
    .replace(/\[\[[^\]]*\]\]/g, (m) => " ".repeat(m.length))
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => " ".repeat(m.length))
    .replace(/^\s{0,3}#{1,6}\s/, (m) => " ".repeat(m.length));
}

/** Walk a rendered DOM tree and underline text nodes containing known terms. */
function highlightElement(root: HTMLElement, plugin: TermScannerPlugin): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Text) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest("code, pre, a, u.ats-term, h1, h2, h3, h4, h5, h6")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  const opts = detectOptions(plugin);
  for (const node of nodes) {
    const text = node.textContent ?? "";
    if (text.trim().length === 0) continue;
    const found = findTerms(text, opts);
    if (!found.length) continue;

    const frag = document.createDocumentFragment();
    let last = 0;
    for (const mt of found) {
      if (mt.start > last) frag.appendChild(document.createTextNode(text.slice(last, mt.start)));
      const u = document.createElement("u");
      u.className = "ats-term";
      u.dataset.term = mt.normalized;
      u.title = `Create "amboss - ${mt.normalized}" note`;
      u.appendChild(document.createTextNode(mt.term));
      frag.appendChild(u);
      last = mt.end;
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
    // Reading mode: <u class="ats-term"> elements
    const domTarget = (ev.target as HTMLElement).closest?.("u.ats-term");
    if (domTarget) {
      ev.preventDefault();
      ev.stopPropagation();
      const term =
        (domTarget as HTMLElement).dataset?.term ||
        (domTarget as HTMLElement).textContent?.trim() ||
        "";
      if (term) await plugin.createTermNote(term);
      return;
    }
    // Live preview: plain CodeMirror decorations have no DOM dataset, so we
    // detect a click inside an underlined span via the event coordinates.
    const cmEl = (ev.target as HTMLElement).closest?.(".cm-content");
    if (!cmEl) return;
    if (!(ev.ctrlKey || ev.metaKey)) return; // require Ctrl/Cmd-click in editor
    const pos = resolveCmPos(ev);
    if (pos == null) return;
    const term = plugin.termAtDocOffset(pos);
    if (term) {
      ev.preventDefault();
      await plugin.createTermNote(term);
    }
  };

  function resolveCmPos(ev: MouseEvent): number | null {
    let view: EditorView | null = null;
    try {
      view = EditorView.findFromDOM(ev.currentTarget as HTMLElement);
    } catch {
      view = null;
    }
    if (!view) return null;
    const coords = { x: ev.clientX, y: ev.clientY };
    const pos = view.posAtCoords(coords, false);
    return typeof pos === "number" ? pos : null;
  }

  // Capture phase so Obsidian's own handlers don't swallow it first
  plugin.registerDomEvent(document, "click", onClick as any, true);
}

/* ------------------------------------------------------------------ */
/* Command: scan current editor & create notes for all found terms     */
/* ------------------------------------------------------------------ */

export function collectTermsFromText(
  text: string,
  opts: { minLength: number; useHeuristics: boolean; extraTerms: string[]; blockTerms: string[] }
): TermMatch[] {
  const seen = new Map<string, TermMatch>();
  for (const mt of findTerms(text, opts)) {
    if (mt.normalized.length < opts.minLength) continue;
    if (!seen.has(mt.normalized)) seen.set(mt.normalized, mt);
  }
  return [...seen.values()];
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
    case "snomed": {
      const sn = await fetchSnomed(term);
      return sn ?? (await fetchWikipedia(term));
    }
    case "anatomy": {
      const an = await fetchAnatomy(term);
      return an ?? (await fetchWikipedia(term));
    }
    case "drugs": {
      const dr = await fetchDrugs(term);
      return dr ?? (await fetchPubChem(term)) ?? (await fetchWikipedia(term));
    }
    case "metathesaurus": {
      const mt = await fetchMetathesaurus(term);
      return mt ?? (await fetchSnomed(term)) ?? (await fetchWikipedia(term));
    }
    // Link-out sources: sites block automated fetching / need accounts, so we
    // create a note with a direct link to look the term up there.
    case "flexikon":
      return fetchFlexikonLink(term);
    case "mwmedical":
      return fetchMWMedicalLink(term);
    case "wikimed":
      return fetchWikimedLink(term);
    case "medisearch":
      return fetchMediSearchLink(term);
    case "openevidence":
      return fetchOpenEvidenceLink(term);
    case "fallback":
    default:
      return fetchWithFallback(term);
  }
}

/**
 * Create the "amboss - {term}" note and (optionally) replace every occurrence
 * of the term in the source document with a wikilink
 * [[amboss - {term}|{term as written}]].
 */
export async function createNoteForTerm(
  plugin: TermScannerPlugin,
  term: string,
  sourceNote?: string,
  occurrences?: { start: number; end: number }[],
  termsAsWritten?: string[]
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
  let file: TFile;
  if (existing instanceof TFile) {
    await plugin.app.vault.modify(existing, md);
    new Notice(`Updated [[amboss - ${term}]]`);
    file = existing;
  } else {
    file = await plugin.app.vault.create(name, md);
    new Notice(`Created [[${file.basename}]]`);
  }

  // Replace occurrences in the active editor with wikilinks.
  if (plugin.settings.linkifyTerms && occurrences?.length && termsAsWritten?.length) {
    await linkifyActiveEditor(plugin, file.basename, occurrences, termsAsWritten);
  }
  return file;
}

/**
 * Rewrite the current editor content replacing [start,end) spans with
 * [[noteName|displayText]]. Spans must be sorted ascending & non-overlapping.
 */
async function linkifyActiveEditor(
  plugin: TermScannerPlugin,
  noteName: string,
  occurrences: { start: number; end: number }[],
  displays: string[]
): Promise<void> {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) return;
  const editor = view.editor;
  const text = editor.getValue();

  const links = occurrences.map((o, i) => `[[${noteName}|${displays[i] ?? text.slice(o.start, o.end)}]]`);

  // Build the new text by walking spans back-to-front (offsets stay valid).
  let out = text;
  for (let i = occurrences.length - 1; i >= 0; i--) {
    const { start, end } = occurrences[i];
    out = out.slice(0, start) + links[i] + out.slice(end);
  }

  // Preserve cursor position roughly at the same absolute offset.
  const cursor = editor.getCursor();
  const cursorOff = editor.posToOffset(cursor);
  let newOff = cursorOff;
  for (let i = 0; i < occurrences.length; i++) {
    const o = occurrences[i];
    if (cursorOff >= o.end) newOff += links[i].length - (o.end - o.start);
    else if (cursorOff > o.start) newOff += links[i].length; // inside span → after link
  }
  editor.setValue(out);
  editor.setCursor(editor.offsetToPos(Math.min(newOff, out.length)));
}
