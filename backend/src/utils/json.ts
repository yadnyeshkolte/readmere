export function safeJsonParse(text: string): any {
  // Pre-clean: strip markdown code fences the LLM may have wrapped around JSON
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // ── Strategy 1: extract JSON from code blocks inside larger text ──
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch { /* fall through */ }
    }

    // ── Strategy 2: find the outermost { … } or [ … ] ──
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

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
        return JSON.parse(cleaned.substring(start, end + 1));
      } catch { /* fall through */ }
    }

    // ── Strategy 3: repair truncated JSON (e.g. unterminated strings) ──
    // This happens when Gemini hits maxOutputTokens mid-response
    if (start !== -1) {
      let partial = cleaned.substring(start, end !== -1 && end > start ? end + 1 : undefined);
      try {
        return repairAndParseJSON(partial);
      } catch { /* fall through */ }
    }

    throw firstError;
  }
}

/**
 * Attempt to repair truncated JSON that was cut off mid-generation.
 * Handles: unterminated strings, missing closing braces/brackets, trailing commas.
 */
function repairAndParseJSON(raw: string): any {
  let s = raw;

  // Remove trailing incomplete key-value pairs (e.g. `, "key": "unterminated...`)
  // Step 1: close any unterminated strings by counting quotes
  let inString = false;
  let escaped = false;
  let lastGoodIndex = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') {
      inString = !inString;
      if (!inString) lastGoodIndex = i; // end of a complete string
    }
    if (!inString) lastGoodIndex = i;
  }

  // If we ended inside a string, truncate to last good position and close the string
  if (inString) {
    s = s.substring(0, lastGoodIndex + 1);
    // If the last good char was the opening quote of a value, remove the dangling key
    // Otherwise close the string we were inside
  }

  // Remove trailing commas before we add closing braces
  s = s.replace(/,\s*$/, '');

  // Count open vs close braces and brackets
  let braces = 0;
  let brackets = 0;
  inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  // Remove trailing incomplete entries (trailing commas, partial keys)
  s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
  s = s.replace(/,\s*$/, '');

  // Re-count after cleanup
  braces = 0; brackets = 0; inString = false; escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  // Close any remaining open brackets/braces
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }

  return JSON.parse(s);
}
