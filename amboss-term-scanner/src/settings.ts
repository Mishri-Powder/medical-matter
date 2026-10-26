import { PluginSettingTab, App, Setting } from "obsidian";
import type TermScannerPlugin from "./main";

export type SourceId =
  | "fallback"
  | "wikipedia"
  | "pubchem"
  | "snomed"
  | "anatomy"
  | "drugs"
  | "metathesaurus"
  | "flexikon"
  | "mwmedical"
  | "wikimed"
  | "medisearch"
  | "openevidence"
  | "umls"
  | "amboss";

export interface TermScannerSettings {
  /** Which backend to query for term data. */
  source: SourceId;
  /** Optional AMBOSS session cookie (only useful if you pay for AMBOSS). */
  ambossCookie: string;
  /** Folder where generated notes are stored. Empty = vault root. */
  noteFolder: string;
  /** Minimum length of a candidate term to consider. */
  minTermLength: number;
  /** Underline terms automatically when a note is opened. */
  autoScan: boolean;
  /** Detect terms by medical word morphology, not just the built-in list. */
  heuristicDetect: boolean;
  /** Replace matched terms in the document with wikilinks after note creation. */
  linkifyTerms: boolean;
  /** Extra terms (comma/newline separated) that should always be detected. */
  extraTerms: string;
  /** Terms (comma/newline separated) that should never be detected. */
  blockTerms: string;
  /** UMLS Metat2Sim API key (free registration at metat2sim.nlm.nih.gov). */
  umlsApiKey: string;
}

export const DEFAULT_SETTINGS: TermScannerSettings = {
  source: "fallback",
  ambossCookie: "",
  noteFolder: "AMBOSS",
  minTermLength: 4,
  autoScan: true,
  heuristicDetect: true,
  linkifyTerms: true,
  extraTerms: "",
  blockTerms: "",
  umlsApiKey: "",
};

const SOURCE_DESC =
  "AMBOSS content is paywalled with no public API. Free backends: Smart fallback (PubChem→SNOMED→Wikipedia), Wikipedia, PubChem, SNOMED CT / anatomy (FMA) / drug names (UMDNS-Stedman's) / NCI-Metathesaurus-style mapping via the free EBI OLS4 API. Link-out sources (Flexikon, Merriam-Webster Medical, WikiMed, MediSearch, OpenEvidence) create a note with a direct browser link because those sites block automated fetching.";

export class TermScannerSettingTab extends PluginSettingTab {
  plugin: TermScannerPlugin;

  constructor(app: App, plugin: TermScannerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Data source")
      .setDesc(SOURCE_DESC)
      .addDropdown((drop) =>
        drop
          .addOption("fallback", "Smart fallback (PubChem → SNOMED CT → Wikipedia)")
          .addOption("wikipedia", "Wikipedia (general medical knowledge)")
          .addOption("pubchem", "PubChem — drugs & chemicals")
          .addOption("snomed", "SNOMED CT terminology (via EBI OLS4)")
          .addOption("anatomy", "Anatomy terms — FMA (open TA2Viewer alternative)")
          .addOption("drugs", "Drug terms — DRON drug ontology (via EBI OLS4)")
          .addOption("metathesaurus", "NCI Metathesaurus-style cross-vocab map (MEDGEN)")
          .addOption("flexikon", "DocCheck Flexikon (link-out)")
          .addOption("mwmedical", "Merriam-Webster Medical Dictionary (link-out)")
          .addOption("wikimed", "WikiMed offline encyclopedia (link-out)")
          .addOption("medisearch", "MediSearch AI — cited answers (link-out, free account)")
          .addOption("openevidence", "OpenEvidence AI (link-out, clinician verification)")
          .addOption("umls", "UMLS MetaCat2Sim (free API key required)")
          .addOption("amboss", "AMBOSS (requires paid account + cookie)")
          .setValue(this.plugin.settings.source)
          .onChange(async (value) => {
            this.plugin.settings.source = value as SourceId;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("AMBOSS session cookie (optional)")
      .setDesc(
        "Only needed if you selected the AMBOSS source. Copy the 'sessionid' (or similar) cookie from your browser while logged into www.amboss.com. Warning: scraping AMBOSS may violate their ToS."
      )
      .addText((t) =>
        t
          .setPlaceholder("sessionid=...")
          .setValue(this.plugin.settings.ambossCookie)
          .onChange(async (v) => {
            this.plugin.settings.ambossCookie = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("MetaCat2Sim API key (optional)")
      .setDesc(
        "Free key from https://lhncbc.nlm.nih.gov/MetaMap/webservices/metat2sim-api.html — used when source is UMLS."
      )
      .addText((t) =>
        t
          .setPlaceholder("API key")
          .setValue(this.plugin.settings.umlsApiKey)
          .onChange(async (v) => {
            this.plugin.settings.umlsApiKey = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Note folder")
      .setDesc("Folder for generated 'amboss - {term}' notes. Leave empty for vault root.")
      .addText((t) =>
        t
          .setPlaceholder("AMBOSS")
          .setValue(this.plugin.settings.noteFolder)
          .onChange(async (v) => {
            this.plugin.settings.noteFolder = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Minimum term length")
      .setDesc("Ignore candidate words shorter than this.")
      .addText((t) =>
        t.setValue(String(this.plugin.settings.minTermLength)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.minTermLength = n;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(containerEl)
      .setName("Auto-scan on open")
      .setDesc("Automatically underline recognized terms when a note is opened.")
      .addToggle((tg) =>
        tg.setValue(this.plugin.settings.autoScan).onChange(async (v) => {
          this.plugin.settings.autoScan = v;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        })
      );

    new Setting(containerEl)
      .setName("Heuristic medical-term detection")
      .setDesc(
        "Also flag words that look medical by morphology (-itis, -ectomy, -oma, hyper-, brady- …), not just the built-in dictionary. This is what makes auto-detection cover unfamiliar terms."
      )
      .addToggle((tg) =>
        tg.setValue(this.plugin.settings.heuristicDetect).onChange(async (v) => {
          this.plugin.settings.heuristicDetect = v;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        })
      );

    new Setting(containerEl)
      .setName("Replace terms with wikilinks")
      .setDesc(
        'After creating a note, replace every occurrence of the term in the document with [[amboss - {term}|{term}]].'
      )
      .addToggle((tg) =>
        tg.setValue(this.plugin.settings.linkifyTerms).onChange(async (v) => {
          this.plugin.settings.linkifyTerms = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Extra terms to detect")
      .setDesc("Comma or newline separated. These are always underlined (case-insensitive).")
      .addTextArea((t) => {
        t.setValue(this.plugin.settings.extraTerms).onChange(async (v) => {
          this.plugin.settings.extraTerms = v;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        });
        t.inputEl.rows = 3;
      });

    new Setting(containerEl)
      .setName("Blocked terms")
      .setDesc("Comma or newline separated. These are never flagged (e.g. common false positives).")
      .addTextArea((t) => {
        t.setValue(this.plugin.settings.blockTerms).onChange(async (v) => {
          this.plugin.settings.blockTerms = v;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        });
        t.inputEl.rows = 3;
      });
  }
}
