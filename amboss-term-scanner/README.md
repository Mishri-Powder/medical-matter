# AMBOSS Term Scanner (Obsidian plugin)

Scans the text of your current note, **underlines medical terms** it recognizes,
and — when you click an underlined term — downloads reference data for it and
creates a note titled **`amboss - {term}`**.

## ⚠️ About AMBOSS itself

AMBOSS (amboss.com) is a **paid subscription service** with no public API, and
scraping its content would violate its terms of use. This plugin therefore
ships with **free alternatives** as the default data sources:

| Source | Cost | Best for |
|---|---|---|
| **Wikipedia REST API** (default) | Free, no key | Diseases, syndromes, anatomy, physiology |
| **PubChem** (NIH) | Free, no key | Drugs & chemicals (formula, weight, SMILES, description) |
| **UMLS MetaCat2Sim** (NIH LHS) | Free API key | Controlled-vocabulary / synonym lookup |
| **AMBOSS** (optional) | Requires *your* paid account + session cookie | Only if you already subscribe; may violate ToS |

If you have an AMBOSS subscription you can paste your session cookie in the
settings and select "AMBOSS" as the source — but the free sources are fully
functional and recommended.

## Features

- **Auto-underlining** of medical terms in both reading mode and live preview
  (wavy accent underline). Detection has two layers:
  1. a built-in dictionary (~870 disease, drug, anatomy & procedure terms), and
  2. a morphology heuristic that flags words that *look* medical even when they
     are not in the dictionary (`-itis`, `-ectomy`, `-oma`, `hyper-…-emia`,
     `brady-…-cardia`, `-thrombosis`, `-centesis`, …) — with an English-word
     stoplist to avoid false positives.
  Skips code blocks, existing links, and headings. Terms split across wrapped
  lines are still matched.
- **Click an underlined term** (or Ctrl/Cmd-click in live preview) → fetches
  data from the selected source and creates/updates `amboss - {term}.md` in
  your chosen folder, with frontmatter, summary, details, synonyms/categories,
  and a source link back.
- **Wikilink replacement**: after a note is created, every occurrence of the
  term in the document is replaced with `[[amboss - {term}|{term as written}]]`
  (toggleable; already-linked text and inline code are never touched, so the
  operation is idempotent).
- **Commands** (Ctrl/Cmd+P):
  - *Create amboss note for selection / word at cursor* (also linkifies all
    occurrences of that term)
  - *Scan document and create notes for all found terms* (batch mode + bulk
    linkify)
- Settings: data source, note folder, minimum term length, auto-scan toggle,
  heuristic detection toggle, wikilink-replacement toggle, extra/blocked term
  lists, optional AMBOSS cookie / UMLS key.

## Install (development / manual)

1. `npm install`
2. `npm run build` → produces `main.js`
3. Copy the whole folder into your vault's plugin directory:
   `<vault>/.obsidian/plugins/amboss-term-scanner/`
   (must contain `manifest.json`, `main.js`)
4. Obsidian → Settings → Community plugins → Enable **"AMBOSS Term Scanner"**.

## Development

```bash
npm run dev     # tsc type-check watch (plus: node esbuild.config.mjs for bundling watch)
npm run build   # production bundle → main.js
```

## Project layout

```
src/
  main.ts       # plugin entry: commands, settings load, CSS
  scanner.ts    # decorations (underline), click handler, note creation
  sources.ts    # Wikipedia / PubChem / UMLS / AMBOSS fetchers
  terms.ts      # offline medical-term dictionary + regex matcher
  note.ts       # markdown note builder + filename sanitizer
  settings.ts   # settings tab & defaults
```

## Extending the term list

Edit the `TERMS` string in `src/terms.ts` (one term per line, lowercase).
Multi-word terms work too — matching prefers longest-first so
"acute myocardial infarction" wins over "myocardial infarction".

## Notes & limitations

- The offline dictionary decides what gets underlined; validation against the
  API happens on click. A term may be underlined but return no article.
- Requests go through Obsidian's `requestJson` (CORS-safe); on desktop this
  works out of the box.
- Batch scanning many terms hits the APIs sequentially to stay rate-limit friendly.
