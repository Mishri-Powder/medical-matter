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

const UA = { "User-Agent": "Obsidian-AMBOSS-Term-Scanner/1.0 (personal study tool)" };

/* ---------------------------- Wikipedia (free) ---------------------------- */

export async function fetchWikipedia(term: string): Promise<TermData | null> {
  // Use the REST summary endpoint first: one request, clean lead paragraph.
  const sumUrl =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(term.replace(/ /g, "_"));
  try {
    const s = await requestJson<any>(sumUrl);
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
  const searchRes = await requestJson<any>(searchUrl);
  const hit = searchRes?.query?.search?.[0];
  if (!hit) return null;

  const title = hit.title;
  // Extract lead section + categories
  const extractUrl =
    "https://en.wikipedia.org/w/api.php?action=query&prop=extracts|categories&explaintext=1" +
    "&exsectionformat=plain&titles=" + encodeURIComponent(title) + "&cclimit=20&format=json";
  const extRes = await requestJson<any>(extractUrl);
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
