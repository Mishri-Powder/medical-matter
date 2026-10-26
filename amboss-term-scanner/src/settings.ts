import { PluginSettingTab, App, Setting } from "obsidian";
import type TermScannerPlugin from "./main";

export interface TermScannerSettings {
  /** Which backend to query for term data. */
  source: "wikipedia" | "pubchem" | "umls" | "amboss";
  /** Optional AMBOSS session cookie (only useful if you pay for AMBOSS). */
  ambossCookie: string;
  /** Folder where generated notes are stored. Empty = vault root. */
  noteFolder: string;
  /** Minimum length of a candidate term to consider. */
  minTermLength: number;
  /** Underline terms automatically when a note is opened. */
  autoScan: boolean;
  /** UMLS Metat2Sim API key (free registration at metat2sim.nlm.nih.gov). */
  umlsApiKey: string;
}

export const DEFAULT_SETTINGS: TermScannerSettings = {
  source: "wikipedia",
  ambossCookie: "",
  noteFolder: "AMBOSS",
  minTermLength: 4,
  autoScan: true,
  umlsApiKey: "",
};

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
      .setDesc(
        "AMBOSS content is behind a paywall and has no public API. Choose a free alternative: Wikipedia (general medical knowledge), PubChem (drugs & chemicals), or UMLS MetaCat2Sim (controlled medical vocabulary lookup)."
      )
      .addDropdown((drop) =>
        drop
          .addOption("wikipedia", "Wikipedia (free, default)")
          .addOption("pubchem", "PubChem – drugs/chemicals (free)")
          .addOption("umls", "UMLS MetaCat2Sim (free API key required)")
          .addOption("amboss", "AMBOSS (requires paid account + cookie)")
          .setValue(this.plugin.settings.source)
          .onChange(async (value) => {
            this.plugin.settings.source = value as TermScannerSettings["source"];
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
        })
      );
  }
}
