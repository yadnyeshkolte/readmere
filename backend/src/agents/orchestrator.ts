import { ArchestraService } from "../services/archestra.js";
import { safeJsonParse } from "../utils/json.js";

type ProgressCallback = (step: string, status: "pending" | "running" | "complete" | "error", message?: string) => void;

// Safely extract text from MCP tool result
function extractToolText(result: any): string {
  if (!result?.content?.[0]?.text) {
    throw new Error("Empty response from MCP tool");
  }
  const text = result.content[0].text;
  if (result.isError) {
    throw new Error(`MCP tool error: ${text}`);
  }
  return text;
}

// Style configurations
const STYLE_CONFIG: Record<string, { maxTokens: number; label: string }> = {
  minimal: { maxTokens: 1500, label: "Minimal" },
  standard: { maxTokens: 3000, label: "Standard" },
  detailed: { maxTokens: 4000, label: "Detailed" },
};

export class Orchestrator {
  private archestra: ArchestraService;

  constructor() {
    this.archestra = new ArchestraService();
  }

  async generateReadme(repoUrl: string, onProgress: ProgressCallback, userPrompt?: string, style: string = "standard") {
    // Validate style
    const styleKey = STYLE_CONFIG[style] ? style : "standard";

    // Partial data collected for fallback
    let metadata: any = null;
    let analysis: any = null;
    let insights: any = {};
    let files: any[] = [];
    let signatures: any[] = [];
    let chunks: any[] = [];
    let verifiedCommands: any = {};
    let originalReadme: string = "";

    try {
      // Step 1: Analysis
      onProgress("analysis", "running", "Fetching repository metadata...");

      const metadataResult = await this.archestra.callTool("get_repo_metadata", { repoUrl });
      metadata = safeJsonParse(extractToolText(metadataResult));

      onProgress("analysis", "running", `Analyzing ${metadata.name || 'repository'} structure...`);
      const analysisResult = await this.archestra.callTool("analyze_repository", { repoUrl });
      analysis = safeJsonParse(extractToolText(analysisResult));

      onProgress("analysis", "running", `Found ${analysis.fileCount || '?'} files, identifying key ones...`);
      const importantFilesResult = await this.archestra.callTool("identify_important_files", { fileTree: analysis.tree });
      const filePaths = safeJsonParse(extractToolText(importantFilesResult));

      onProgress("analysis", "complete", `Analyzed ${analysis.fileCount || '?'} files across ${Object.keys(analysis.languageBreakdown || {}).length} languages`);

      // Step 1.5: Gather Insights
      onProgress("insights", "running", "Fetching issues, PRs, contributors...");
      try {
        const insightsResult = await this.archestra.callTool("get_repo_insights", { repoUrl });
        insights = safeJsonParse(extractToolText(insightsResult));
        const issueCount = insights.recentIssues?.length || 0;
        const prCount = insights.recentPRs?.length || 0;
        const contributorCount = insights.topContributors?.length || 0;
        const releaseCount = insights.latestReleases?.length || 0;
        onProgress("insights", "complete", `Found ${issueCount} issues, ${prCount} PRs, ${contributorCount} contributors, ${releaseCount} releases`);
      } catch (e: any) {
        console.warn("Insights fetch failed (non-fatal):", e.message);
        onProgress("insights", "complete", "Insights partially available");
      }

      // Step 2: Reading Code
      onProgress("reading", "running", `Reading ${filePaths.length} important files...`);
      const filesResult = await this.archestra.callTool("read_files", { repoUrl, filePaths });
      files = safeJsonParse(extractToolText(filesResult));

      // Extract existing README from files for diff view
      const readmeFile = files.find((f: any) =>
        f.path.toLowerCase() === 'readme.md' || f.path.toLowerCase() === 'readme'
      );
      if (readmeFile && !readmeFile.content.startsWith('Error')) {
        originalReadme = readmeFile.content;
      }

      onProgress("reading", "running", "Extracting function signatures...");
      const signaturesResult = await this.archestra.callTool("extract_signatures", { files });
      signatures = safeJsonParse(extractToolText(signaturesResult));

      onProgress("reading", "running", "Extracting verified commands...");
      try {
        const commandsResult = await this.archestra.callTool("extract_commands", { files });
        verifiedCommands = safeJsonParse(extractToolText(commandsResult));
      } catch (e: any) {
        console.warn("Command extraction failed (non-fatal):", e.message);
      }

      onProgress("reading", "running", "Optimizing context for LLM...");
      const chunksResult = await this.archestra.callTool("smart_chunk", { files, maxTokens: 12000 });
      chunks = safeJsonParse(extractToolText(chunksResult));

      const sigCount = signatures.reduce((a: number, s: any) => a + (s.signatures?.length || 0), 0);
      onProgress("reading", "complete", `Processed ${files.length} files, ${sigCount} signatures extracted`);

      // Step 3: Generation
      onProgress("generation", "running", `Generating ${STYLE_CONFIG[styleKey].label} README with Llama 3 70B...`);
      const readmeResult = await this.archestra.callTool("generate_readme", {
        metadata,
        analysis,
        codeSummaries: chunks,
        signatures,
        insights,
        verifiedCommands,
        style: styleKey,
        userPrompt
      });
      const readme = extractToolText(readmeResult);

      onProgress("generation", "complete", "README draft generated");

      // Step 4: Quality Check
      onProgress("quality", "running", "Running quality validation...");
      const validationResult = await this.archestra.callTool("validate_readme", { readme });
      const validation = safeJsonParse(extractToolText(validationResult));

      let finalReadme = readme;
      const score = validation.score || 0;
      if (score < 80) {
        onProgress("quality", "running", `Score ${score}/100 — enhancing...`);
        const enhancedResult = await this.archestra.callTool("enhance_readme", {
          readme,
          suggestions: (validation.suggestions || []).join(", ")
        });
        finalReadme = extractToolText(enhancedResult);
      }

      onProgress("quality", "complete", `Quality Score: ${score}/100`);

      return {
        readme: finalReadme,
        metadata,
        quality: validation,
        originalReadme,
        verifiedCommands
      };

    } catch (error: any) {
      console.error("Orchestration error:", error);

      // === FALLBACK: Generate basic README from whatever we have ===
      if (metadata) {
        onProgress("generation", "running", "Full analysis failed — generating basic README from available data...");
        try {
          const fallbackReadme = this.generateFallbackReadme(metadata, analysis, verifiedCommands);
          onProgress("quality", "complete", "Basic README generated (fallback mode)");
          return {
            readme: fallbackReadme,
            metadata,
            quality: { score: 30, categories: {}, suggestions: ["Full analysis failed — this is a basic fallback README. Try again for a more detailed result."] },
            originalReadme,
            verifiedCommands,
            isFallback: true
          };
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }

      onProgress("error", "error", error.message);
      throw error;
    }
  }

  /**
   * Generate a basic README from metadata only — used when the full pipeline fails.
   */
  private generateFallbackReadme(metadata: any, analysis: any, verifiedCommands: any): string {
    const lines: string[] = [];
    lines.push(`# ${metadata.name || 'Project'}`);
    lines.push('');
    if (metadata.description) {
      lines.push(metadata.description);
      lines.push('');
    }
    // Badges
    const badges: string[] = [];
    if (metadata.language) badges.push(`![Language](https://img.shields.io/badge/language-${encodeURIComponent(metadata.language)}-blue)`);
    if (metadata.license && metadata.license !== 'None') badges.push(`![License](https://img.shields.io/badge/license-${encodeURIComponent(metadata.license)}-green)`);
    if (metadata.stars !== undefined) badges.push(`![Stars](https://img.shields.io/github/stars/${metadata.name})`);
    if (badges.length) {
      lines.push(badges.join(' '));
      lines.push('');
    }
    // Stats
    lines.push('## 📊 Stats');
    lines.push('');
    if (metadata.stars !== undefined) lines.push(`- ⭐ **Stars**: ${metadata.stars}`);
    if (metadata.forks !== undefined) lines.push(`- 🍴 **Forks**: ${metadata.forks}`);
    if (metadata.openIssues !== undefined) lines.push(`- 📋 **Open Issues**: ${metadata.openIssues}`);
    if (metadata.language) lines.push(`- 💻 **Primary Language**: ${metadata.language}`);
    lines.push('');
    // Languages
    if (analysis?.languageBreakdown) {
      lines.push('## 🛠 Tech Stack');
      lines.push('');
      for (const [lang, count] of Object.entries(analysis.languageBreakdown).slice(0, 10)) {
        lines.push(`- \`${lang}\`: ${count} files`);
      }
      lines.push('');
    }
    // Commands
    if (verifiedCommands && Object.keys(verifiedCommands).length > 0) {
      lines.push('## 🚀 Quick Start');
      lines.push('');
      if (verifiedCommands.install?.length) {
        lines.push('```bash');
        verifiedCommands.install.forEach((c: string) => lines.push(c));
        lines.push('```');
        lines.push('');
      }
      if (verifiedCommands.run?.length) {
        lines.push('```bash');
        verifiedCommands.run.forEach((c: string) => lines.push(c));
        lines.push('```');
        lines.push('');
      }
    }
    lines.push('## 📄 License');
    lines.push('');
    lines.push(metadata.license && metadata.license !== 'None' ? metadata.license : 'Not specified');
    lines.push('');
    lines.push('---');
    lines.push('*This README was auto-generated in fallback mode. For a complete README, try generating again.*');

    return lines.join('\n');
  }

  async improveReadme(readme: string, suggestions: string, onProgress?: ProgressCallback) {
    try {
      if (onProgress) onProgress("quality", "running", "Enhancing README based on suggestions...");

      const enhancedResult = await this.archestra.callTool("enhance_readme", {
        readme,
        suggestions
      });
      const enhanced = extractToolText(enhancedResult);

      if (onProgress) onProgress("quality", "running", "Re-validating improved README...");

      const validationResult = await this.archestra.callTool("validate_readme", { readme: enhanced });
      const validation = safeJsonParse(extractToolText(validationResult));

      if (onProgress) onProgress("quality", "complete", `New Score: ${validation.score}/100`);

      return {
        readme: enhanced,
        quality: validation
      };
    } catch (error: any) {
      console.error("Improve error:", error);
      throw error;
    }
  }
}
