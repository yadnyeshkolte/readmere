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

export class Orchestrator {
  private archestra: ArchestraService;

  constructor() {
    this.archestra = new ArchestraService();
  }

  async generateReadme(repoUrl: string, onProgress: ProgressCallback, userPrompt?: string) {
    try {
      // Step 1: Analysis
      onProgress("analysis", "running", "Fetching repository metadata...");

      const metadataResult = await this.archestra.callTool("get_repo_metadata", { repoUrl });
      const metadata = safeJsonParse(extractToolText(metadataResult));

      onProgress("analysis", "running", `Analyzing ${metadata.name || 'repository'} structure...`);
      const analysisResult = await this.archestra.callTool("analyze_repository", { repoUrl });
      const analysis = safeJsonParse(extractToolText(analysisResult));

      onProgress("analysis", "running", `Found ${analysis.fileCount || '?'} files, identifying key ones...`);
      const importantFilesResult = await this.archestra.callTool("identify_important_files", { fileTree: analysis.tree });
      const filePaths = safeJsonParse(extractToolText(importantFilesResult));

      onProgress("analysis", "complete", `Analyzed ${analysis.fileCount || '?'} files across ${Object.keys(analysis.languageBreakdown || {}).length} languages`);

      // Step 2: Reading Code
      onProgress("reading", "running", `Reading ${filePaths.length} important files...`);
      const filesResult = await this.archestra.callTool("read_files", { repoUrl, filePaths });
      const files = safeJsonParse(extractToolText(filesResult));

      onProgress("reading", "running", "Extracting function signatures...");
      const signaturesResult = await this.archestra.callTool("extract_signatures", { files });
      const signatures = safeJsonParse(extractToolText(signaturesResult));

      onProgress("reading", "running", "Optimizing context for LLM...");
      const chunksResult = await this.archestra.callTool("smart_chunk", { files, maxTokens: 12000 });
      const chunks = safeJsonParse(extractToolText(chunksResult));

      const sigCount = signatures.reduce((a: number, s: any) => a + (s.signatures?.length || 0), 0);
      onProgress("reading", "complete", `Processed ${files.length} files, ${sigCount} signatures extracted`);

      // Step 3: Generation
      onProgress("generation", "running", "Generating README with Llama 3 70B...");
      const readmeResult = await this.archestra.callTool("generate_readme", {
        metadata,
        analysis,
        codeSummaries: chunks,
        signatures,
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
        quality: validation
      };

    } catch (error: any) {
      console.error("Orchestration error:", error);
      onProgress("error", "error", error.message);
      throw error;
    }
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
