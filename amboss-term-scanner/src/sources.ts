/**
 * Free knowledge backends used instead of (paywalled) AMBOSS.
 * Each fetcher returns normalized TermData that the note generator renders.
 */

export interface TermData {
  term: string;
  source: string;
  url: string;
  summary: string;          // short definition / lead paragraph
  details?: string;         // longer markdown body
  synonyms?: string[];
  categories?: string[];
}

const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Obsidian-AMBOSS-Term-Scanner/1.0 (personal study tool)" };

/* ---------------------------- Wikipedia (free) ---------------------------- */

export async function fetchWikipedia(term: string): Promise<TermData | null> {
  // Use the REST summary endpoint first: one request, clean lead paragraph.
  const sumUrl =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(term.replace(/ /g, "_"));
  try {
    const s = await requestJson<any>(sumUrl, UA);
    if (s?.type === "standard" && s.extract) {
      return {
        term,
        source: "Wikipedia",
        url: s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title ?? term)}`,
        summary: s.extract,
      };
    }
  } catch { /* fall through to search API */ }

  // Fallback: full-text search for the best matching article title
  const searchUrl =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
    encodeURIComponent(term) + "&srlimit=1&format=json";
  const searchRes = await requestJson<any>(searchUrl, UA);
  const hit = searchRes?.query?.search?.[0];
  if (!hit) return null;

  const title = hit.title;
  // Extract lead section + categories
  const extractUrl =
    "https://en.wikipedia.org/w/api.php?action=query&prop=extracts|categories&explaintext=1" +
    "&exsectionformat=plain&titles=" + encodeURIComponent(title) + "&cclimit=20&format=json";
  const extRes = await requestJson<any>(extractUrl, UA);
  const page: any = Object.values(extRes?.query?.pages ?? {})[0];
  if (!page) return null;

  const extract: string = page.extract ?? "";
  // First paragraph = summary, remainder = details
  const paras = extract.split(/\n{2,}/).filter(Boolean);
  const summary = stripWiki(paras.shift() ?? "").trim();
  const details = paras.map(stripWiki).join("\n\n").trim();

  const categories: string[] = (page.categories ?? []).map((c: any) => c.title.replace("Category:", ""));

  return {
    term,
    source: "Wikipedia",
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    summary,
    details: details || undefined,
    categories: categories.length ? categories : undefined,
  };
}

function stripWiki(s: string): string {
  return s.replace(/\([^\)]*\)/g, (m) => m) // keep parens, plain text already
    .replace(/[{}\[\]#*|]/g, "");
}

/* ----------------------------- PubChem (free) ----------------------------- */

export async function fetchPubChem(term: string): Promise<TermData | null> {
  const nameUrl =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
    encodeURIComponent(term) + "/property/MolecularFormula,MolecularWeight,CanonicalSMILES/JSON";
  try {
    const prop = await requestJson<any>(nameUrl, UA);
    const rec = prop?.PropertyTable?.Properties?.[0];
    if (!rec) return null;

    const cid = rec.CID;
    let description = "";
    try {
      const sumUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`;
      const sum = await requestJson<any>(sumUrl, UA);
      description = sum?.InformationList?.Information?.[0]?.Description ?? "";
    } catch { /* optional */ }

    return {
      term,
      source: "PubChem",
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      summary: description || `Chemical compound ${term}.`,
      details: [
        `- **Molecular formula:** ${rec.MolecularFormula ?? "n/a"}`,
        `- **Molecular weight:** ${rec.MolecularWeight ?? "n/a"} g/mol`,
        `- **Canonical SMILES:** \`${rec.CanonicalSMILES ?? "n/a"}\``,
      ].join("\n"),
    };
  } catch {
    return null; // not a chemical — caller can fall through
  }
}

/* ------------------- UMLS MetaCat2Sim (free with API key) ------------------ */

export async function fetchMetat2sim(term: string, apiKey: string): Promise<TermData | null> {
  if (!apiKey) return null;
  const url =
    "https://lhsapp.nlm.nih.gov/MetaCAT2SimServlet/getClosestTerms?format=json&search=" +
    encodeURIComponent(term);
  try {
    const res = await requestJson<any>(url, { ...UA, "Authorization": `Bearer ${apiKey}` });
    const concepts = Array.isArray(res) ? res : res?.concepts ?? [];
    if (!concepts.length) return null;
    const best = concepts[0];
    return {
      term,
      source: "UMLS (MetaCat2Sim)",
      url: "https://uts.nlm.nih.gov/uts/",
      summary: best?.str ?? term,
      synonyms: (concepts.slice(0, 8).map((c: any) => c.str).filter(Boolean)) as string[],
    };
  } catch {
    return null;
  }
}

/* ------------------------ AMBOSS (paid, cookie-based) ---------------------- */

export async function fetchAmboss(term: string, cookie: string): Promise<TermData | null> {
  if (!cookie) throw new Error("No AMBOSS cookie configured. AMBOSS is a paid service — add your session cookie in settings or use a free source.");
  // AMBOSS has no public API; this hits their internal search endpoint with your
  // own session. Use only within the limits of your personal subscription/ToS.
  const url = "https://www.amboss.com/us/api/v1/search?q=" + encodeURIComponent(term) + "&limit=1";
  const res = await requestJson<any>(url, { ...UA, Cookie: cookie });
  const item = res?.results?.[0] ?? res?.data?.[0];
  if (!item) return null;
  return {
    term,
    source: "AMBOSS",
    url: `https://www.amboss.com${item.link ?? ""}`,
    summary: item.teaser ?? item.excerpt ?? "",
    details: item.content ?? undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Free alternatives evaluated for this plugin (Oct 2026):             *
 *                                                                     *
 *  WORKING (programmatic access verified):                            *
 *   - OLS4 / EBI BioOntology (ols4.readthedocs.io) — free REST API    *
 *     that aggregates SNOMED CT, FMA (anatomy), UMDNS (drugs), MeSH,  *
 *     NCIt and many more vocabularies. Covers:                        *
 *       • SNOMED CT Browser  → ontology=snomed                        *
 *       • NCI Metathesaurus  → ontology=medgen (maps synonyms across  *
 *         SNOMED/ICD/RxNorm vocabularies)                             *
 *       • TA2Viewer          → ontology=fma (Foundational Model of    *
 *         Anatomy; Terminologia Anatomica itself is license-gated, so  *
 *         we use FMA as the open anatomy equivalent)                  *
 *       • MediLexicon/Stedman's drug data → ontology=dron (Drug Ontology;
 *         UMDNS itself is on OLS but its records are not searchable)            *
 *   - Wikipedia OpenSearch (used by the "fallback" chain)             *
 *                                                                     *
 *  NOT usable programmatically from the plugin (verified Oct 2026):   *
 *   - DocCheck Flexikon (~80k articles): now behind Cloudflare        *
 *     (hub.huge-index.com / flexikon.doccheck.com are blocked for     *
 *     non-browser clients). The old offline Farlex mirror at          *
 *     theodora.com/wisonline_new returns 404s. We link to the article *
 *     instead (fetchFlexikonLink).                                    *
 *   - Merriam-Webster Medical: suggestions endpoint returns HTTP 403  *
 *     (Cloudflare bot protection). Link-out only.                     *
 *   - WikiMed (wikimed.eu): Cloudflare challenge; offline app must be *
 *     downloaded separately — link-out only.                          *
 *   - MediSearch: AI answer requires an account token                 *
 *     (medisearch.io/en/health-education); link-out prefilled query.  *
 *   - OpenEvidence: clinician verification required; link-out only.   *
 * ------------------------------------------------------------------ */

/* --------------------- OLS4 (EBI Bioontology) core ----------------------- */

interface OlsDoc {
  iri?: string;
  label?: string;
  description?: string[];
  synonym?: string[];
  related_synonyms?: string[];
  obo_id?: string;
  short_form?: string;
  ontology_name?: string;
}

async function olsSearch(term: string, ontology: string, rows = 5): Promise<OlsDoc[]> {
  const url =
    "https://www.ebi.ac.uk/ols4/api/search?q=" + encodeURIComponent(term) +
    `&ontology=${ontology}&rows=${rows}`;
  try {
    const res = await requestJson<any>(url, UA);
    const docs: OlsDoc[] = res?.response?.docs ?? [];
    // exact-label matches first, then keep API order
    const norm = term.trim().toLowerCase();
    docs.sort((a, b) => {
      const am = (a.label ?? "").toLowerCase() === norm ? 0 : 1;
      const bm = (b.label ?? "").toLowerCase() === norm ? 0 : 1;
      return am - bm;
    });
    return docs;
  } catch {
    return [];
  }
}

/** Fetch full term record (synonyms/annotations) for one OLS doc. */
async function olsTermDetail(doc: OlsDoc): Promise<any | null> {
  const onto = doc.ontology_name;
  if (!onto || !doc.iri) return null;
  try {
    const url =
      `https://www.ebi.ac.uk/ols4/api/ontologies/${onto}/terms?iri=` +
      encodeURIComponent(doc.iri);
    const res = await requestJson<any>(url, UA);
    return res?._embedded?.terms?.[0] ?? null;
  } catch {
    return null;
  }
}

function olsBrowserUrl(ontology: string, doc: OlsDoc): string {
  if (ontology === "snomed" && doc.iri?.startsWith("http://snomed.info/id/")) {
    const id = doc.iri.split("/").pop();
    return `https://browser.ihtsdotools.org/?perspective=full&conceptId1=${id}&edition=MAIN/SNOMEDCT-US&release=-1&languages=en`;
  }
  if (doc.obo_id) {
    return `https://www.ebi.ac.uk/ols4/ontologies/${ontology}/terms?obo_id=${encodeURIComponent(doc.obo_id)}`;
  }
  return `https://www.ebi.ac.uk/ols4/search?q=${encodeURIComponent(doc.label ?? "")}`;
}

async function fetchOls(term: string, ontology: string, sourceLabel: string): Promise<TermData | null> {
  const docs = await olsSearch(term, ontology);
  const best = docs[0];
  if (!best?.label) return null;
  const detail = await olsTermDetail(best);
  const synonyms: string[] = Array.from(
    new Set<string>([
      ...(detail?.synonyms ?? []),
      ...(best.related_synonyms ?? []),
      ...(detail?.annotation?.["alternative label"] ?? []),
    ])
  ).filter((s) => s.toLowerCase() !== best.label!.toLowerCase()).slice(0, 10);
  const desc = (best.description ?? []).join("\n\n");
  return {
    term,
    source: sourceLabel,
    url: olsBrowserUrl(ontology, best),
    summary: desc || best.label,
    details: desc && desc !== best.label ? undefined : `Matched concept: **${best.label}** (${best.obo_id ?? best.short_form ?? ""})`,
    synonyms: synonyms.length ? synonyms : undefined,
  };
}

/** SNOMED CT via EBI OLS4 — official clinical terminology, free API. */
export async function fetchSnomed(term: string): Promise<TermData | null> {
  return fetchOls(term, "snomed", "SNOMED CT (via EBI OLS4)");
}

/** Anatomy terms via FMA through OLS4 (open stand-in for TA2Viewer). */
export async function fetchAnatomy(term: string): Promise<TermData | null> {
  return fetchOls(term, "fma", "FMA anatomy (via EBI OLS4)");
}

/** Drug terms via DRON (Drug Ontology) through OLS4 — free drug lookup. */
export async function fetchDrugs(term: string): Promise<TermData | null> {
  return fetchOls(term, "dron", "Drug Ontology DRON (via EBI OLS4)");
}

/**
 * NCI Metathesaurus-style cross-vocabulary mapping via MEDGEN on OLS4.
 * Returns the matched concept plus which vocabularies contain it (annot field).
 */
export async function fetchMetathesaurus(term: string): Promise<TermData | null> {
  const url =
    "https://www.ebi.ac.uk/ols4/api/search?q=" + encodeURIComponent(term) +
    "&ontology=medgen&rows=1&select=label,description,synonym,annot,obo_id,iri";
  try {
    const res = await requestJson<any>(url, UA);
    const doc = res?.response?.docs?.[0];
    if (!doc?.label) return null;
    const annot: any = doc.annot?.[0] ?? {};
    const sources: string[] = Object.keys(annot).filter((k) => annot[k]);
    const desc = (doc.description ?? []).join("\n\n");
    const oboId: string = doc.obo_id ?? "";
    return {
      term,
      source: "NCI Metathesaurus (MEDGEN via EBI OLS4)",
      url: oboId
        ? `https://www.ebi.ac.uk/ols4/ontologies/medgen/terms?obo_id=${encodeURIComponent(oboId)}`
        : `https://ncim.nlm.nih.gov/NCIM/index.jsp#/semanticNetwork/concept_retrieval?id=${encodeURIComponent(term)}`,
      summary: desc || doc.label,
      details: sources.length
        ? `Appears in ${sources.length} biomedical vocabularies, e.g.: ${sources.slice(0, 12).map((s) => `\`${s}\``).join(", ")}`
        : undefined,
      synonyms: (doc.synonym ?? []).filter((s: string) => s.toLowerCase() !== doc.label.toLowerCase()).slice(0, 10),
    };
  } catch {
    return null;
  }
}

/* --------------------------- Link-out sources ---------------------------- */
/* These sites block programmatic access (Cloudflare/account walls), so we   *
 * create a note containing a direct link (+ snippet if available).          */

export function fetchFlexikonLink(term: string): TermData {
  const slug = term.trim().replace(/\s+/g, "_");
  return {
    term,
    source: "DocCheck Flexikon (link-out — site blocks automated fetching)",
    url: `https://www.flexikon.doccheck.com/en/${encodeURIComponent(slug)}`,
    summary: `Encyclopedia article for "${term}" on DocCheck Flexikon (~80,000 medical articles). Click the source link to read it in your browser.`,
  };
}

export function fetchMWMedicalLink(term: string): TermData {
  return {
    term,
    source: "Merriam-Webster Medical Dictionary (link-out — site blocks automated fetching)",
    url: `https://www.merriam-webster.com/medical/${encodeURIComponent(term.trim().replace(/ /g, "-"))}`,
    summary: `Definition lookup for "${term}" in the Merriam-Webster Medical Dictionary.`,
  };
}

export function fetchWikimedLink(term: string): TermData {
  return {
    term,
    source: "WikiMed (link-out — offline encyclopedia app)",
    url: `https://www.wikimed.eu/en/search.html?s=${encodeURIComponent(term)}`,
    summary: `"${term}" in WikiMed, the offline medical encyclopedia (51,000+ articles). Install the WikiMed app for true offline access.`,
  };
}

export function fetchMediSearchLink(term: string): TermData {
  const q = `${term}: explain the key facts a medical student should know (definition, pathophysiology, diagnosis, treatment).`;
  return {
    term,
    source: "MediSearch (AI, link-out — requires free account)",
    url: `https://medisearch.io/en/health-education?question=${encodeURIComponent(q)}`,
    summary: `Ask MediSearch an evidence-based, cited question about "${term}". Opens the free health-education assistant with the question pre-filled.`,
  };
}

export function fetchOpenEvidenceLink(term: string): TermData {
  return {
    term,
    source: "OpenEvidence (AI, link-out — clinician verification may be required)",
    url: `https://openevidence.com/search/?q=${encodeURIComponent(term)}`,
    summary: `Guideline/literature-grounded answer about "${term}" via OpenEvidence.`,
  };
}

/* ----------------------------- Smart fallback ---------------------------- */

/** Try several free backends in order; first hit wins. */
export async function fetchWithFallback(term: string): Promise<TermData | null> {
  const attempts = [fetchPubChem, fetchSnomed, fetchWikipedia];
  for (const fn of attempts) {
    try {
      const d = await fn(term);
      if (d) return d;
    } catch { /* next */ }
  }
  return null;
}

/* ------------------------------- helpers --------------------------------- */

async function requestJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  // In Obsidian mobile/desktop, useRequestUrl/request from obsidian handles CORS.
  // We dynamically import to keep this module testable outside Obsidian too.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const obsidian = require("obsidian");
    if (obsidian?.requestJson) {
      return (await obsidian.requestJson({ url, headers })) as T;
    }
  } catch { /* running outside Obsidian (tests) */ }
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return (await r.json()) as T;
}
