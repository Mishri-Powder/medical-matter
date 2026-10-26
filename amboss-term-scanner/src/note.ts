import type { TermData } from "./sources";

export function buildNoteMarkdown(data: TermData, sourceNote?: string): string {
  const title = `amboss - ${data.term}`;
  const lines: string[] = [];

  lines.push(`---`);
  lines.push(`term: "${yamlString(data.term)}"`);
  lines.push(`source: "${yamlString(data.source)}"`);
  lines.push(`url: "${yamlString(data.url)}"`);
  if (sourceNote) lines.push(`origin: "[[${yamlString(sourceNote)}]]"`);
  lines.push(`created: ${new Date().toISOString()}`);
  lines.push(`tags: [amboss, reference]`);
  lines.push(`---`);
  lines.push("");
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`> **${data.term}** — ${data.summary || "(no summary available)"}`);
  lines.push("");

  if (data.details) {
    lines.push(`## Details`);
    lines.push("");
    lines.push(data.details);
    lines.push("");
  }

  if (data.synonyms?.length) {
    lines.push(`## Synonyms / related terms`);
    lines.push("");
    for (const s of data.synonyms) lines.push(`- ${s}`);
    lines.push("");
  }

  if (data.categories?.length) {
    lines.push(`## Categories`);
    lines.push("");
    lines.push(data.categories.map((c) => `\`${c}\``).join(" "));
    lines.push("");
  }

  lines.push(`## Source`);
  lines.push("");
  lines.push(`Retrieved from [${data.source}](${data.url}) on ${new Date().toLocaleDateString()}.`);
  lines.push("");
  return lines.join("\n");
}

function yamlString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Sanitize a term into a valid Obsidian file name. */
export function sanitizeFileName(term: string): string {
  return term.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim();
}
