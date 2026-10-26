/**
 * Medical-term detection.
 *
 * Two layers:
 *  1. Curated dictionary (terms.ts) – exact multi-word & single-word terms.
 *  2. Heuristic morphology detector – words that *look* medical based on
 *     Greek/Latin suffixes/prefixes commonly found in medicine
 *     (-itis, -ectomy, -oma, hyper-, brady- …). This is what makes the
 *     plugin automatically underline terms beyond the small built-in list.
 */

import { TERM_SET } from "./terms";

/** Suffixes that strongly suggest a medical/scientific term. */
const SUFFIXES = [
  // diseases / conditions
  "osis", "opathy", "pathy", "aemia", "uria", "algia",
  "plegia", "paresis", "trophy", "megaly", "malacia", "sclerosis",
  "stenosis", "thrombosis", "embolism", "hemorrhage", "haemorrhage",
  "edema", "oedema", "necrosis", "fibrosis", "cirrhosis", "sclerosis",
  // procedures / specialties
  "ectomy", "otomy", "ostomy", "plasty", "scopy", "stasis", "poiesis",
  "genesis", "lysis", "centesis", "tomy", "plasia", "ectasis", "globulinemia", "therapia",
  // pathology / oncology
  "sarcoma", "carcinoma", "blastoma", "adenoma", "myxoma",
  "cytoma", "globulin", "pepsia", "phagia", "pnea", "rrhea", "rrhoea",
  "oma", "emia", "itis",
  // physiology / pharmacology / biochem
  "drome", "phobia", "toxin", "ase", "azine",
  "cillin", "pril", "sartan", "statin", "azole", "terol", "caine",
  "mab", "nib", "parin", "etine", "cycline", "prazole", "tidine",
  "idine", "barbital", "zepam", "zolam", "xacin", "floxacin",
  // anatomy / histology / general med vocab
  "arteriole", "venule", "capillary",
  "ganglion",
  "receptor", "hormone", "enzyme", "protein", "antibody", "antigen",
  "villus", "follicle", "alveolus", "alveoli", "lobule", "sinus",
  "fossa", "tubercle", "sphincter", "ventricle", "atrium", "valve",
  "aneurysm", "granuloma", "abscess", "fistula", "ulcer", "polyp",
  "calculi", "calculus", "lithiasis", "ptosis", "prolapse", "hypertrophy",
  "atrophy", "dystrophy", "metaplasia", "dysplasia", "neoplasia",
  "hyperplasia", "aneurysm", "lymphadenopathy",
];

/** Prefixes that strongly suggest a medical term when combined w/ a body word. */
const PREFIX_WORDS = new Set([
  "hyper", "hypo", "brady", "tachy", "poly", "oligo", "an", "dys",
  "macro", "micro", "neo", "pseudo", "auto", "allo", "iso", "anti",
  "pro", "post", "pre", "sub", "super", "supra", "infra", "inter",
  "intra", "extra", "peri", "para", "epi", "endo", "exo", "trans",
  "bi", "tri", "quad", "multi", "pan", "omni", "hemato", "haemo",
  "hemo", "melena", "pyelo", "nephro", "hepato", "cardio", "neuro",
  "myelo", "osteo", "dermato", "gastro", "entero", "colono", "duodeno",
  "jejuno", "ileo", "esophago", "oesophago", "pulmono", "pneumo",
  "thoraco", "abdomino", "cranio", "spino", "vertebro", "costo",
  "sterno", "pelvio", "uro", "nephro", "cysto", "urethro", "vagino",
  "hyster", "metro", "oophoro", "salpingo", "andro", "gyneco",
  "obsetric", "neo", "ferro", "calcio", "kalio", "natrio", "glyko",
  "lipо", "lipo", "proteo", "amino", "nucleo", "cyto", "histo",
  "morpho", "physio", "patho", "immuno", "sero", "viro", "bacterio",
  "myco", "proto", "helminth", "onco", "radio", "thermo", "chrono",
]);

/** Common English words that end like medical terms but aren't. */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "they", "them",
  "then", "than", "when", "where", "which", "while", "what", "who",
  "how", "why", "all", "any", "some", "such", "into", "onto", "over",
  "under", "again", "also", "only", "just", "very", "more", "most",
  "less", "least", "much", "many", "each", "other", "another", "same",
  "so", "as", "if", "but", "or", "nor", "yet", "van", "von", "de",
  "sign", "design", "signal", "resign", "align", "assign", "benign",
  "malign", "condign", "ensign", "campaign", "domain", "urban",
  "suburban", "octogenarian", "vegetarian", "librarian", "historian",
  "politician", "guardian", "blood", "shield", "field", "yield",
  "child", "wild", "build", "guilt", "skull", "full", "tool", "ball",
  "toll", "call", "fall", "well", "will", "mill", "bill", "kill",
  "still", "fill", "pill", "doll", "poll", "bull", "pool", "cool",
  "school", "fool", "rule", "file", "mile", "tile", "virile", "ductile",
  "febrile", "juvenile", "senile", "textile", "penile", "bile", "pile",
  "isle", "aisle", "smile", "style", "typhoon", "monsoon", "lozenge",
  "challenge", "college", "knowledge", "marriage", "coverage", "voyage",
  "package", "message", "passage", "average", "heritage", "patient",
  "ratio", "via", "area", "data", "media", "remedy", "study", "body",
  "history", "theory", "therapy-free", "entry", "country", "industry",
  "battery", "injury", "library", "summary", "salary", "secondary",
  "primary", "single", "angle", "eagle", "maple", "sample", "simple",
  "temple", "example", "double", "noble", "able", "table", "video",
  "audio", "radio", "studio", "photo", "piano", "zero", "hero",
  "imago", "info", "logo", "echo", "auto", "demo", "silo", "folio",
  "stereo", "retro", "intro", "provo", "mongo", "django",
  "machine", "magazine", "gasoline", "baseline", "deadline", "online",
  "offline", "pipeline", "routine", "vaccine", "bovine", "equine",
  "canine", "feline", "bovine", "assassin", "origin", "protein-ok",
  "logic", "magic", "public", "topic", "arabic", "basic", "music",
  "classic", "organic", "hydraulic", "pediatric", "cosmetic",
  "enthusiastic", "dynamic", "systematic", "pragmatic", "thematic",
  "problem", "extremum", "medium", "maximum", "minimum", "optimum",
  "forum", "auditorium", "sanatorium", "empire", "seminar", "calendar",
  "vocals", "focus", "virus-ok", "genus-ok", "bonus-ok", "status-ok",
  "campus-ok", "corpus-ok", "novus", "minus", "primus", "ultra",
  "extra-small", "manila", "vanilla", "gorilla", "illa",
  "analysis-ok", "parenthesis-ok", "basis-ok", "crisis-ok", "thesis-ok",
  "poison", "reason", "season", "raisin", "captain", "mountain",
  "curtain", "certain", "fortran", "restraint", "constraint",
  "sustain", "attain", "contain", "maintain", "domain-ok", "explain",
  "again-ok", "refrain", "strain", "train-ok", "grain", "plain",
  "plan", "span", "scan", "fan", "clan", "flam", "program",
  "telegram", "diagram", "plasma", "schema", "trauma-ok", "drama",
  "stigma", "dogma", "magma-ok", "lama", "panorama", "karma",
  "dharma", "sutra", "mantra", "yoga", "ninja", "vega",
  "omega", "alphabet", "delhi", "delta", "vitamin", "maximum-ok",
  "chromatin", "keratin", "glutamin", "gelatin", "melanin", "tannin",
  "salin", "halin", "valin", "palin",
]);

/** Words we never want to flag even if they match morphology. */
const EXACT_BLOCK = new Set([
  "trauma", "plasma", "schema", "dogma", "stigma", "magma", "drama",
  "aroma", "panorama", "sarcasm", "exorcism", "mechanism", "organism",
]);

export interface DetectOptions {
  minLength: number;
  useHeuristics: boolean;
  extraTerms: string[];      // user-supplied terms (always flagged)
  blockTerms: string[];      // user-supplied terms (never flagged)
}

const WORD_RE = /[A-Za-z][A-Za-z'’\-]{2,}/g;

/** Normalize a candidate for dictionary lookup. */
export function normalizeTerm(raw: string): string {
  return raw.toLowerCase().replace(/[‘’]/g, "'").trim();
}

/** True if a single word looks like a medical term by morphology. */
export function looksMedical(word: string): boolean {
  const w = normalizeTerm(word);
  if (w.length < 5) return false;
  if (STOPWORDS.has(w) || EXACT_BLOCK.has(w)) return false;

  for (const suf of SUFFIXES) {
    if (w.endsWith(suf) && w.length >= suf.length + 3) return true;
  }

  // prefix + stem heuristics: e.g. "hyperglycemia" already caught by suffix,
  // but "bradycardia" -> ends in "cardia"
  const CARDIA = ["cardia", "cardium", "metacarpal", "phalanx", "epididymis", "peritoneum", "mediastinum", "reticulum", "canaliculus"];
  for (const suf of CARDIA) {
    if (w.endsWith(suf) && w.length > suf.length + 3) return true;
  }

  // Strong combining prefixes must ALSO end in a medical-looking stem:
  // e.g. bradycardia/tachycardia (-cardia), pericardium, myocardium,
  // epididymis, metacarpal — handled by targeted suffix checks below.
  return false;
}

/**
 * Find all occurrences of known/heuristic medical terms in plain text.
 * Returns non-overlapping spans sorted by position; longer (multi-word)
 * dictionary terms win over shorter single-word matches.
 */
export interface TermMatch {
  term: string;       // as written in the document
  normalized: string; // lower-cased for lookups/note titles
  start: number;      // absolute char offset in text
  end: number;
}

/** Build a regex for the curated dictionary (multi-word aware). */
let dictReCache: { re: RegExp; key: string } | null = null;
function dictRegex(extra: string[]): RegExp {
  const key = extra.join("|");
  if (dictReCache && dictReCache.key === key) return dictReCache.re;
  const all = [...TERM_SET, ...extra.map((t) => normalizeTerm(t))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const escaped = all.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s\\u00A0]+")
  );
  const re = new RegExp(`(?<![A-Za-z0-9])(${escaped.join("|")})(?![A-Za-z0-9])`, "gi");
  dictReCache = { re, key };
  return re;
}

export function findTerms(rawText: string, opts: DetectOptions): TermMatch[] {
  // Treat newlines as soft spaces so multi-word terms survive markdown line-wrap.
  const text = rawText.replace(/\r?\n/g, " ");

  // Mask existing wikilinks / md links / inline code so their display text is
  // never re-matched (we must not linkify something that is already linked).
  const maskedRanges: [number, number][] = [];
  const maskRe = /\[\[[^\]\n]*\]\]|\[[^\]\n]*\]\([^)\n]*\)|`[^`\n]*`/g;
  let mm: RegExpExecArray | null;
  while ((mm = maskRe.exec(text)) !== null) maskedRanges.push([mm.index, mm.index + mm[0].length]);
  const isMasked = (s: number, e: number) =>
    maskedRanges.some(([ms, me]) => s < me && e > ms);

  const matches: TermMatch[] = [];
  const blocked = new Set(opts.blockTerms.map(normalizeTerm));

  // Pass 1: curated dictionary (handles multi-word terms)
  const re = dictRegex(opts.extraTerms);
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const norm = normalizeTerm(m[0]);
    if (blocked.has(norm)) continue;
    if (isMasked(m.index, m.index + m[0].length)) continue;
    matches.push({ term: m[0], normalized: norm, start: m.index, end: m.index + m[0].length });
  }

  // Pass 2: heuristic single words (only where pass 1 didn't already match)
  if (opts.useHeuristics) {
    const taken = matches.map((x) => [x.start, x.end] as const);
    const overlaps = (s: number, e: number) =>
      taken.some(([ts, te]) => s < te && e > ts);

    WORD_RE.lastIndex = 0;
    let wm: RegExpExecArray | null;
    while ((wm = WORD_RE.exec(text)) !== null) {
      const start = wm.index;
      const end = start + wm[0].length;
      if (end - start < Math.max(5, opts.minLength)) continue;
      if (overlaps(start, end)) continue;
      if (isMasked(start, end)) continue;
      const norm = normalizeTerm(wm[0]);
      if (norm.length < opts.minLength) continue;
      if (blocked.has(norm)) continue;
      if (looksMedical(wm[0])) {
        matches.push({ term: wm[0], normalized: norm, start, end });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);
  // strip any accidental overlaps (dictionary wins because pushed first)
  const out: TermMatch[] = [];
  let lastEnd = -1;
  for (const mt of matches) {
    if (mt.start >= lastEnd) {
      out.push(mt);
      lastEnd = mt.end;
    }
  }
  return out;
}
