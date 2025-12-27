import { generateAIResponse } from './aiProvider';

export interface SimplifiedText {
  original: string;
  simplified: string;
  technicalTerms?: Array<{
    term: string;
    explanation: string;
  }>;
}

/**
 * Check if simplified text is actually different from original (not just a copy)
 */
function isActuallySimplified(original: string, simplified: string): boolean {
  const orig = original.toLowerCase().trim();
  const simp = simplified.toLowerCase().trim();
  
  // If exactly the same, it's not simplified
  if (orig === simp) return false;
  
  // If very similar (more than 90% similarity), consider it not simplified
  const similarity = calculateSimilarity(orig, simp);
  if (similarity > 0.9) return false;
  
  return true;
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}


/**
 * Analyze text and simplify technical/scientific language for general audience
 * Uses heuristics to detect complexity and automatically simplify
 */
export async function simplifyHealthLanguage(
  text: string,
  context: string = ''
): Promise<SimplifiedText> {
  try {
    const prompt = `You are a health communication expert. Analyze the following text and determine if it contains scientific, medical, or technical terms that a general audience (non-experts) might not understand.

Text to analyze:
${text}

${context ? `Context: ${context}` : ''}

Your task:
1. Identify any technical terms that require explanation (e.g., "submaximal exercise", "insulin resistance", "chain-loaded weights", "eccentric loading")
2. Rewrite the text in simpler, more accessible language while maintaining scientific accuracy
3. For technical terms that must stay, provide brief inline explanations

Return JSON:
{
  "original": "the original text",
  "simplified": "the simplified version with technical terms explained in parentheses or rephrased",
  "technicalTerms": [
    {
      "term": "exact technical term",
      "explanation": "brief explanation (1 sentence)"
    }
  ]
}

Guidelines:
- Keep it scientifically accurate
- Use everyday language when possible
- If a technical term is essential, explain it inline (e.g., "submaximal exercise (moderate-intensity workouts)")
- Don't oversimplify to the point of losing meaning
- Only flag terms that truly need explanation (not common words)

Return ONLY valid JSON, no markdown.`;

    const systemPrompt = 'You are a health communication expert. Simplify technical language for general audiences.';
    const responseText = await generateAIResponse(prompt, systemPrompt);

    // Clean up response
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const simplified = JSON.parse(cleanedText);

    return {
      original: text,
      simplified: simplified.simplified || text,
      technicalTerms: simplified.technicalTerms || [],
    };
  } catch (error) {
    console.error('Error simplifying language:', error);
    return {
      original: text,
      simplified: text,
      technicalTerms: [],
    };
  }
}

/**
 * Simplify multiple texts in batch (more efficient)
 */
export async function simplifyMultipleTexts(
  texts: Array<{ text: string; context?: string }>
): Promise<SimplifiedText[]> {
  const textsWithContext = texts
    .map((t, i) => `Text ${i + 1}:\n${t.context ? `Context: ${t.context}\n` : ''}${t.text}`)
    .join('\n\n---\n\n');

  const prompt = `You are a health communication expert. Your job is to REWRITE technical medical/scientific text into simple, everyday language that a regular person can understand.

Texts to analyze:
${textsWithContext}

CRITICAL INSTRUCTIONS:
1. You MUST rewrite each text using completely different words - this is PARAPHRASING, not copying
2. Replace technical terms with simple explanations
3. Use shorter sentences and everyday language
4. Keep the scientific meaning accurate but make it understandable

Examples of good paraphrasing:
- Original: "Increases insulin sensitivity by enhancing glucose uptake in muscle cells"
- Simplified: "Helps your body respond better to insulin by making muscle cells absorb sugar from your blood more effectively"

- Original: "Reduces neuroinflammation and promotes neuroplasticity"
- Simplified: "Reduces brain inflammation and helps the brain adapt and heal"

- Original: "Improves cardiovascular function through enhanced endothelial cell activity"
- Simplified: "Improves heart and blood vessel health by making the cells that line your blood vessels work better"

Dictionary of common terms (replace these with simpler explanations):
- "insulin sensitivity" → "how well your body responds to insulin"
- "glucose uptake" → "how cells absorb sugar from your blood"
- "neuroinflammation" → "inflammation in the brain"
- "neuroplasticity" → "the brain's ability to change and adapt"
- "oxidative stress" → "an imbalance that can damage cells"
- "eccentric loading" → "the lowering phase of an exercise"
- "resistance training" → "exercise using weights"
- "endothelial" → "cells that line blood vessels"
- "protein synthesis" → "building new proteins/muscle"

Return JSON array:
[
  {
    "original": "original text 1",
    "simplified": "REWRITTEN version using completely different words (MUST be substantially different)",
    "technicalTerms": [{"term": "...", "explanation": "..."}]
  },
  ...
]

Return ONLY valid JSON, no markdown.`;

  try {
    const systemPrompt = 'You are a health communication expert. Simplify technical language for general audiences.';
    const responseText = await generateAIResponse(prompt, systemPrompt);

    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const simplified = JSON.parse(cleanedText);

    // Map back to original texts
    return texts.map((t, i) => ({
      original: t.text,
      simplified: simplified[i]?.simplified || t.text,
      technicalTerms: simplified[i]?.technicalTerms || [],
    }));
  } catch (error) {
    console.error('Error simplifying multiple texts:', error);
    return texts.map((t) => ({
      original: t.text,
      simplified: t.text,
      technicalTerms: [],
    }));
  }
}

