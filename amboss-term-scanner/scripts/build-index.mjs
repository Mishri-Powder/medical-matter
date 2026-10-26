/**
 * Offline term-index builder.
 *
 * Downloads free/open medical term lists and writes src/index-data.json,
 * which is bundled into main.js at build time (esbuild json loader).
 *
 * Sources:
 *  - NCBI Gene symbols        (ftp.ncbi.nlm.nih.gov, public domain)
 *  - WHO INN stem list        (who.int, CC BY-NC-SA) via pdftotext if available
 *  - OpenMDR device names     (api.openmdr.org, open data; optional, slow)
 *  - OLS4 ontology labels     (www.ebi.ac.uk/ols4/api, EMBL-EBI, CC BY)
 *  - built-in curated dictionary (src/terms.ts)
 * Noise filter: UC Berkeley English words + OBO weasel words.
 *
 * Usage:
 *   node scripts/build-index.mjs [--full] [--no-openmdr] [--no-ncbi] [--no-ols]
 */

import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src", "index-data.json");

const args = process.argv.slice(2);
const FULL = args.includes("--full");

async function getText(url, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    console.log("GET", url);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "ats-index-builder/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------- noise word lists ---------------------------- */

async function englishWords() {
  const set = new Set();
  try {
    const buf = await getText("https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt", 120000);
    for (const w of buf.toString("utf8").split("\n")) {
      const x = w.trim().toLowerCase();
      if (/^[a-z]{3,}$/.test(x)) set.add(x);
    }
  } catch (e) { console.warn("english words failed:", e.message); }
  try {
    const buf = await getText("https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa.txt", 30000);
    for (const w of buf.toString("utf8").split("\n")) set.add(w.trim().toLowerCase());
  } catch (e) { console.warn("google 10k failed:", e.message); }
  console.log("common english words:", set.size);
  return set;
}

async function weaselWords() {
  const set = new Set();
  try {
    const buf = await getText("https://raw.githubusercontent.com/OBOAcademy/obo-permission-explanation/main/src/weasel-words.md", 30000);
    for (const m of buf.toString("utf8").matchAll(/^\|\s*([^|]+?)\s*\|/gm)) {
      const w = m[1].toLowerCase().trim();
      if (/^[a-z][a-z\- ]{2,}$/.test(w)) set.add(w);
    }
  } catch (e) { console.warn("weasel words failed:", e.message); }
  console.log("weasel words:", set.size);
  return set;
}

/* ----------------------------- sources --------------------------------- */

async function ncbiGeneSymbols() {
  // Homo sapiens gene_info.gz — tab-separated; column 3 = Symbol.
  let buf;
  try {
    buf = await getText("https://ftp.ncbi.nlm.nih.gov/gene/DATA/GENE_INFO/Mammalia/Homo_sapiens.gene_info.gz", 180000);
  } catch (e) { console.warn("NCBI gene download failed:", e.message); return []; }
  const zlib = await import("node:zlib");
  const text = zlib.gunzipSync(buf).toString("utf8");
  const out = new Set();
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) continue;
    const f = line.split("\t");
    if (f.length < 10) continue;
    const sym = (f[2] || "").trim();
    const name = (f[3] || "").trim();
    const type = f[9] || "";
    if (!/^--$/ && /protein-coding/i.test(type) === false) continue;
    if (/^[A-Z][A-Z0-9\-]{1,19}$/.test(sym)) {
      // skip RNA-family prefixes that are noisy
      if (/^(SI|SC|LINC|MIR|SN|RN7S|RN5S|VTR|RNU|SCARNA)/.test(sym)) continue;
      out.add(sym.toLowerCase());
    }
    // full names like "superoxide dismutase 2" are useful multi-word terms
    if (/^[a-z][a-z\s\-\'()]{6,60}$/.test(name.toLowerCase()) && !/\d/.test(name)) {
      out.add(name.toLowerCase());
    }
  }
  console.log("NCBI gene entries:", out.size);
  return [...out];
}

async function whoInnStems() {
  // PDF with the official INN stem list; needs pdftotext. Optional.
  try {
    execSync("pdftotext -v", { stdio: "ignore" });
  } catch {
    console.log("pdftotext not installed — skipping WHO INN stems");
    return [];
  }
  const urls = [
    "https://www.who.int/publications/m/item/international-nonproprietary-names-in-pharmaceutical-substances-list-of-stem-elements-and-special-treatment-of-stems",
  ];
  let pdfUrl = null;
  try {
    const html = (await getText(urls[0], 30000)).toString("utf8");
    const m = html.match(/href="([^"]+\.pdf[^"]*)"/i);
    if (m) pdfUrl = m[1].startsWith("http") ? m[1] : "https://www.who.int" + m[1];
  } catch (e) { console.warn("WHO page fetch failed:", e.message); }
  if (!pdfUrl) { console.log("No WHO INN PDF found — skipping"); return []; }
  try {
    const buf = await getText(pdfUrl, 60000);
    const text = execSync("pdftotext -enc UTF-8 - -", { input: buf, encoding: "utf8", maxBuffer: 1 << 26 });
    const out = new Set();
    // stem lines look like "-cillin (penicillins)" or "mab (monoclonal antibody)"
    for (const m of text.matchAll(/(-?[a-z]{3,})\s*\(/g)) {
      const s = m[1].toLowerCase().replace(/^-/, "");
      if (s.length >= 4 && /^[a-z]+$/.test(s)) out.add(s);
    }
    console.log("WHO INN stems:", out.size);
    return [...out];
  } catch (e) { console.warn("WHO INN parse failed:", e.message); return []; }
}

async function olsLabels() {
  // Pull a bounded slice of preferred labels from key ontologies via OLS4.
  const ontos = ["mondo", "hp", "fma", "ncit"];
  const perOnto = FULL ? 20 : 4; // pages of 1000 each
  const out = new Map(); // label -> ontology
  for (const o of ontos) {
    for (let p = 0; p < perOnto; p++) {
      try {
        const raw = await getText(`https://www.ebi.ac.uk/ols4/api/ontologies/${o}/terms?rows=1000&start=${p * 1000}`, 60000);
        const j = JSON.parse(raw.toString("utf8"));
        const terms = j?._embedded?.terms ?? [];
        if (!terms.length) break;
        for (const t of terms) {
          if (t.is_obsolete) continue;
          const lbl = (t.label || "").toLowerCase().trim();
          if (/^[a-z][a-z\s\-']{4,60}$/.test(lbl) && !/\d/.test(lbl) && !out.has(lbl)) out.set(lbl, o);
          for (const syn of (t.synonyms || []).slice(0, 2)) {
            const s2 = syn.toLowerCase().trim();
            if (/^[a-z][a-z\s\-']{4,60}$/.test(s2) && !/\d/.test(s2) && !out.has(s2)) out.set(s2, o);
          }
        }
      } catch (e) { console.warn(`OLS ${o} page ${p} failed:`, e.message); break; }
    }
    console.log(`OLS cumulative labels:`, out.size);
  }
  return [...out.entries()].map(([label, onto]) => ({ label, onto }));
}

async function openmdrNames() {
  // Device product names — many requests; keep modest unless --full.
  const queries = FULL
    ? ["stent", "catheter", "graft", "implant", "prosthesis", "valve", "pacemaker",
       "defibrillator", "ventilator", "monitor", "pump", "coil", "balloon", "filter",
       "electrode", "needle", "scalpel", "forceps", "speculum", "scope", "splint",
       "drill", "saw", "clamp", "retractor", "probe", "stimulator", "nebulizer",
       "incubator", "centrifuge", "oximeter", "spirometer", "lithotrite", "microtome"]
    : ["stent", "catheter", "valve", "implant", "monitor", "pump", "scope", "needle"];
  const names = new Set();
  const tokCount = new Map();
  for (const q of queries) {
    try {
      const raw = await getText(`https://api.openmdr.org/get?action=gudids.find&name=${encodeURIComponent(q)}&limit=100`, 30000);
      const j = JSON.parse(raw.toString("utf8"));
      const list = j?.result?.gudids ?? j?.results ?? [];
      for (const d of list) {
        const n = (d.device_name || d.name || "").trim().toLowerCase();
        if (!n || n.length < 6) continue;
        if (/^[a-z][a-z\s\-\/]{5,60}$/.test(n)) names.add(n);
        for (const t of n.split(/\s+/)) {
          if (/^[a-z]{5,}$/.test(t)) tokCount.set(t, (tokCount.get(t) || 0) + 1);
        }
      }
    } catch (e) { console.warn(`openmdr "${q}" failed:`, e.message); }
  }
  // tokens appearing in many distinct device names are likely device nouns
  const freq = [...tokCount.entries()].filter(([, c]) => c >= 15).map(([t]) => t);
  console.log("OpenMDR names:", names.size, "+ frequent tokens:", freq.length);
  return [...new Set([...names, ...freq])];
}

/* ------------------------------ main ----------------------------------- */

async function main() {
  const [english, weasels, termsSrc] = await Promise.all([englishWords(), weaselWords(), readFile(path.join(ROOT, "src", "terms.ts"), "utf8")]);
  const dict = termsSrc.match(/const TERMS = `([\s\S]*?)`;/)?.[1]?.split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [];

  const tasks = [
    ["curated", async () => dict.map((t) => ({ t, s: "curated" }))],
    ["gene", async () => (await ncbiGeneSymbols()).map((t) => ({ t, s: "ncbi-gene" }))],
    ["inn", async () => (await whoInnStems()).map((t) => ({ t, s: "who-inn" }))],
    ["ols", async () => (await olsLabels()).map((x) => ({ t: x.label, s: "ols-" + x.onto }))],
    ["mdr", async () => (await openmdrNames()).map((t) => ({ t, s: "openmdr" }))],
  ];

  const all = [];
  for (const [, fn] of tasks) {
    try { all.push(...(await fn())); } catch (e) { console.warn("source failed:", e.message); }
  }

  // ---- noise filtering ----------------------------------------------------
  // A single word is kept only if it is NOT a common English word, OR it is
  // explicitly curated/INN-derived (curated terms always survive).
  const isEnglish = (w) => english.has(w);
  const keep = (item) => {
    const w = item.t;
    if (!w || w.length < 4) return false;
    if (weasels.has(w)) return false;
    if (item.s === "curated") return true;
    if (item.s.startsWith("who-inn")) return true;
    if (/^[a-z][a-z\-]{3,}$/.test(w)) {
      // single word: must be non-English (technical) OR long/unusual
      if (isEnglish(w)) return false;
      return true;
    }
    if (/^[a-z][a-z\s\-']{4,}$/.test(w)) return true; // multi-word clinical phrase
    return false;
  };

  const byTerm = new Map();
  for (const it of all) {
    if (!keep(it)) continue;
    if (!byTerm.has(it.t)) byTerm.set(it.t, it.s);
  }
  const final = [...byTerm.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([t, s]) => ({ t, s }));

  const json = JSON.stringify({ v: 1, generated: new Date().toISOString().slice(0, 10), terms: final });
  await writeFile(OUT, json);
  console.log(`\nWrote ${final.length} terms to ${path.relative(ROOT, OUT)} (${(json.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
