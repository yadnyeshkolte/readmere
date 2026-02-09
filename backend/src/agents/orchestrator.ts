import { ArchestraService } from "../services/archestra.js";

type ProgressCallback = (step: string, status: "pending" | "running" | "complete" | "error", message?: string) => void;

export class Orchestrator {
  private archestra: ArchestraService;

  constructor() {
    this.archestra = new ArchestraService();
  }

  async generateReadme(repoUrl: string, onProgress: ProgressCallback) {
    try {
      // Step 1: Analysis
      onProgress("analysis", "running", "Connecting to repository...");
      
      const metadataResult = await this.archestra.callTool("get_repo_metadata", { repoUrl });
      // @ts-ignore
      const metadata = JSON.parse(metadataResult.content[0].text);
      
      onProgress("analysis", "running", "Analyzing structure...");
      const analysisResult = await this.archestra.callTool("analyze_repository", { repoUrl });
      // @ts-ignore
      const analysis = JSON.parse(analysisResult.content[0].text);

      onProgress("analysis", "running", "Identifying key files...");
      const importantFilesResult = await this.archestra.callTool("identify_important_files", { fileTree: analysis.tree });
      // @ts-ignore
      const filePaths = JSON.parse(importantFilesResult.content[0].text);

      onProgress("analysis", "complete", "Repository analyzed");

      // Step 2: Reading Code
      onProgress("reading", "running", `Reading ${filePaths.length} files...`);
      const filesResult = await this.archestra.callTool("read_files", { repoUrl, filePaths });
      // @ts-ignore
      const files = JSON.parse(filesResult.content[0].text);

      onProgress("reading", "running", "Extracting code signatures...");
      const signaturesResult = await this.archestra.callTool("extract_signatures", { files });
      // @ts-ignore
      const signatures = JSON.parse(signaturesResult.content[0].text);

      onProgress("reading", "running", "Optimizing context...");
      const chunksResult = await this.archestra.callTool("smart_chunk", { files, maxTokens: 15000 });
      // @ts-ignore
      const chunks = JSON.parse(chunksResult.content[0].text);

      onProgress("reading", "complete", "Code processed");

      // Step 3: Generation
      onProgress("generation", "running", "Drafting documentation...");
      const readmeResult = await this.archestra.callTool("generate_readme", {
        metadata,
        analysis,
        codeSummaries: chunks
      });
      // @ts-ignore
      const readme = readmeResult.content[0].text;

      onProgress("generation", "complete", "Draft generated");

      // Step 4: Quality Check
      onProgress("quality", "running", "Validating content...");
      const validationResult = await this.archestra.callTool("validate_readme", { readme });
      // @ts-ignore
      const validation = JSON.parse(validationResult.content[0].text);

      let finalReadme = readme;
      if (validation.score < 80) {
        onProgress("quality", "running", "Enhancing content...");
        const enhancedResult = await this.archestra.callTool("enhance_readme", { 
            readme, 
            suggestions: validation.suggestions.join(", ") 
        });
        // @ts-ignore
        finalReadme = enhancedResult.content[0].text;
      }

      onProgress("quality", "complete", `Quality Score: ${validation.score}`);

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
}
