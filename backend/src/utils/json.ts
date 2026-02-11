export function safeJsonParse(text: string): any {
  try {
    // Attempt standard parse
    return JSON.parse(text);
  } catch (e) {
    // Attempt to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (innerError) {
        throw new Error(`Failed to parse extracted JSON: ${innerError}`);
      }
    }
    
    // If no code blocks, try to find the first '{' or '[' and last '}' or ']'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');

    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = lastBrace;
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
        try {
            return JSON.parse(text.substring(start, end + 1));
        } catch (innerError) {
            // Fall through to original error
        }
    }

    throw e;
  }
}
