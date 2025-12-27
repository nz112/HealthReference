import { PubMedPaper } from './pubmed';
import { SemanticScholarPaper } from './semanticScholar';
import { GoogleScholarPaper } from './googleScholar';
import { WebContent } from './webCrawler';
import { simplifyMultipleTexts } from './languageSimplifier';
import { generateAIResponse } from './aiProvider';

export interface HealthRecommendation {
  type: 'food' | 'activity';
  name: string;
  category: 'beneficial' | 'risky';
  mechanism?: string; // e.g., "lowers insulin resistance"
  mechanismSimplified?: string; // Simplified version for general audience
  evidence: Evidence[];
  summary: string;
  summarySimplified?: string; // Simplified version for general audience
  technicalTerms?: Array<{
    term: string;
    explanation: string;
  }>;
  // Specific details for activities
  specificExercises?: string[]; // e.g., ["Bench Press", "Squats", "Deadlifts"]
  reps?: string; // e.g., "3 sets of 8-12 reps"
  sets?: string; // e.g., "3 sets"
  duration?: string; // e.g., "30 minutes"
  frequency?: string; // e.g., "3 times per week"
  // Specific details for foods/supplements
  dosage?: string; // e.g., "200mg daily" or "3-4 oz serving"
  servingSize?: string; // e.g., "3-4 oz"
  frequencyOfIntake?: string; // e.g., "daily" or "3 times per week"
}

export interface Evidence {
  paperTitle: string;
  paperUrl: string;
  paperId: string;
  relevantSection?: string;
  quote?: string;
  doi?: string;
  sectionForExercises?: string; // Specific section where exercise details are mentioned
  sectionForDosage?: string; // Specific section where dosage/intake details are mentioned
  exerciseDetailsChunk?: string; // Exact text chunk from paper about exercise details
  dosageDetailsChunk?: string; // Exact text chunk from paper about dosage/intake details
}

export interface HealthAnalysis {
  condition: string;
  recommendations: HealthRecommendation[];
  mechanisms: string[]; // e.g., ["insulin resistance", "inflammation"]
  budgetOptions?: BudgetOption[];
}

export interface BudgetOption {
  name: string;
  description: string;
  source: string;
  sourceUrl: string;
  cost?: string;
}


/**
 * Analyze papers and extract health recommendations using AI
 */
export async function analyzeHealthPapers(
  condition: string,
  pubmedPapers: PubMedPaper[],
  semanticPapers: SemanticScholarPaper[],
  googleScholarPapers: GoogleScholarPaper[],
  webContents: WebContent[],
  includeBudget: boolean = false
): Promise<HealthAnalysis> {
  // Combine papers and web content
  const allPapers = [
    ...pubmedPapers.map((p) => ({
      source: 'pubmed' as const,
      title: p.title,
      abstract: p.abstract || '',
      url: p.url,
      id: p.pmid,
      doi: p.doi,
      journal: p.journal,
      year: p.year,
    })),
    ...semanticPapers.map((p) => ({
      source: 'semantic' as const,
      title: p.title,
      abstract: p.abstract || '',
      url: p.url,
      id: p.paperId,
      doi: p.doi,
      journal: p.venue,
      year: p.year?.toString(),
    })),
    ...googleScholarPapers.map((p) => ({
      source: 'googlescholar' as const,
      title: p.title,
      abstract: p.abstract || '',
      url: p.url,
      id: p.url,
      doi: undefined,
      journal: p.venue,
      year: p.year,
    })),
    ...webContents.map((w) => ({
      source: 'web' as const,
      title: w.title,
      abstract: w.snippet || '',
      url: w.url,
      id: w.url,
      doi: undefined,
      journal: w.source,
      year: w.date,
    })),
  ];

  if (allPapers.length === 0) {
    return {
      condition,
      recommendations: [],
      mechanisms: [],
    };
  }

  // Create prompt for AI analysis
  const papersText = allPapers
    .map(
      (p, i) => `
Source ${i + 1}:
Title: ${p.title}
Source: ${p.source === 'pubmed' ? 'PubMed' : p.source === 'googlescholar' ? 'Google Scholar' : p.source === 'web' ? `Web (${p.journal})` : 'Semantic Scholar'}
${p.abstract ? `Content: ${p.abstract.substring(0, 600)}` : 'No content available'}
URL: ${p.url}
${p.doi ? `DOI: ${p.doi}` : ''}
${p.journal ? `Publication: ${p.journal}` : ''}
${p.year ? `Year: ${p.year}` : ''}
`
    )
    .join('\n---\n');

  // Detect if condition includes a cause/context (e.g., "concussion after car accident")
  const conditionParts = condition.toLowerCase().split(/\s+(?:after|from|due to|caused by|following)\s+/i);
  const hasCause = conditionParts.length > 1;
  const baseCondition = hasCause ? conditionParts[0].trim() : condition;
  const cause = hasCause ? conditionParts.slice(1).join(' ').trim() : null;

  const prompt = `You are a medical research analyst. Analyze the following scientific papers related to "${condition}" and extract:

${hasCause ? `NOTE: This query includes both a condition ("${baseCondition}") and a specific cause/context ("${cause}"). 
- PRIORITIZE: Recommendations that address "${condition}" (the specific cause + condition combination)
- ALSO INCLUDE: General recommendations for "${baseCondition}" (the condition alone)
- IGNORE: Recommendations for "${baseCondition}" caused by OTHER unrelated causes (e.g., if cause is "bench pressing", ignore "obesity" or other unrelated causes)
- Focus on the SPECIFIC cause mentioned, not other potential causes` : ''}

CRITICAL: Only extract recommendations that are DIRECTLY relevant to "${condition}". 
- If a paper discusses "${condition}", only extract recommendations that specifically address "${condition}"
- DO NOT extract recommendations from papers about other conditions (e.g., if analyzing "concussion", do NOT extract recommendations about diabetes, insulin, or glucose metabolism unless they specifically relate to concussion recovery)
- Each recommendation's mechanism must explain how it affects "${condition}" specifically
- If a mechanism mentions processes unrelated to "${condition}" (e.g., "insulin sensitivity" for concussion), EXCLUDE that recommendation

1. SPECIFIC foods and activities that are BENEFICIAL for "${condition}" specifically
   ${hasCause ? `   - PRIORITIZE: Recommendations specifically addressing "${condition}" (the cause "${cause}" + condition "${baseCondition}")` : ''}
   ${hasCause ? `   - ALSO INCLUDE: General recommendations for "${baseCondition}" that apply regardless of cause` : ''}
   ${hasCause ? `   - EXCLUDE: Recommendations for "${baseCondition}" caused by OTHER unrelated causes (only include if relevant to "${cause}")` : ''}
   - Extract ALL specific exercises mentioned (e.g., "Running", "Swimming", "Cycling", "Resistance training", "Yoga", "Walking")
   - Extract ALL specific foods mentioned (e.g., "Salmon", "Spinach", "Blueberries", "Olive oil")
   - Create SEPARATE recommendations for EACH specific item - do NOT group them
   - If papers mention multiple exercises, list each one separately
   - Aim for comprehensive coverage: include 10-15+ specific recommendations when possible
2. SPECIFIC foods and activities that are RISKY for "${condition}" specifically
   ${hasCause ? `   - Include risks specific to "${condition}" as well as general risks for "${baseCondition}"` : ''}
   ${hasCause ? `   - Focus on risks related to "${cause}", not unrelated causes` : ''}
3. The biological mechanisms involved that are RELEVANT to "${condition}" (e.g., for concussion: "neuroinflammation", "axonal injury", "cognitive function"; for diabetes: "insulin resistance", "glucose metabolism")
4. For each recommendation, cite specific papers with relevant quotes or section references

CRITICAL REQUIREMENTS FOR RECOMMENDATIONS:
- Each recommendation must be SPECIFIC and ACTIONABLE (e.g., "Running", "Spinach", "Bench Press", NOT "Exercise", "Vegetables", "Lifting Weights")
- Use heuristics to determine specificity:
  * If the name is a broad category (like "Exercise", "Diet", "Physical activity"), it's TOO GENERIC - extract specific examples
  * If the name contains vague qualifiers (like "Submaximal", "Therapeutic", "General") without specifics, it's TOO GENERIC
  * Good examples: "Running", "Swimming", "Cycling", "Resistance training", "Yoga", "Spinach", "Salmon", "Blueberries", "Olive oil"
  * Bad examples: "Submaximal Exercise", "Therapeutic Dietary Interventions", "Dietary Intervention", "Nutritional Intervention", "Exercise (General)", "Physical activity", "Exercise", "Diet", "Nutrition"
  * IMPORTANT: Extract ALL specific exercises/foods mentioned in papers - create separate recommendations for each specific item
  * If a paper mentions "dietary intervention" or "nutritional intervention", extract the SPECIFIC foods mentioned (e.g., "Leafy greens", "Whole grains", "Fish", NOT "Dietary Intervention")

EXTRACT SPECIFIC DETAILS - FOLLOW THIS EXACT WORKFLOW:

STEP 1: FIND THE EXACT TEXT CHUNK IN THE PUBLICATION FIRST
- For ACTIVITIES/EXERCISES:
  * FIRST, search the paper for sections containing exercise details (typically in Methods, Intervention, or Results sections)
  * Find the EXACT TEXT CHUNK from the paper that contains exercise information
  * Copy the relevant paragraph or sentence DIRECTLY from the paper - copy it EXACTLY as written
  * The chunk MUST contain the actual numbers, exercises, reps, sets, duration, frequency mentioned
  * Note the exact location (e.g., "Methods section, page 3", "Table 2")
  * Store this EXACT text in "exerciseDetailsChunk" and location in "sectionForExercises" in the evidence object
  
- For FOODS/SUPPLEMENTS:
  * FIRST, search the paper for sections containing dosage/intake details (typically in Methods or Intervention sections)
  * Find the EXACT TEXT CHUNK from the paper that contains dosage/intake information
  * Copy the relevant paragraph or sentence DIRECTLY from the paper - copy it EXACTLY as written
  * The chunk MUST contain the actual numbers, dosages, serving sizes, frequencies mentioned
  * Note the exact location (e.g., "Methods section, page 4", "Intervention section, Table 1")
  * Store this EXACT text in "dosageDetailsChunk" and location in "sectionForDosage" in the evidence object

STEP 2: EXTRACT STRUCTURED FIELDS FROM THE EXACT CHUNK
- ONLY if you found a chunk in Step 1, then extract structured fields FROM THAT EXACT CHUNK:
  
  For ACTIVITIES/EXERCISES (extract ONLY from the exact chunk you found):
  * Extract exercises, reps, sets, duration, frequency, intensity ONLY if they appear in the exact chunk text
  * The values you extract MUST match what's written in the chunk
  * Example: If chunk says "Participants performed bench press, 3 sets of 8-12 reps, 3 times per week"
    - Extract: specificExercises: ["Bench Press"], reps: "3 sets of 8-12 reps", frequency: "3 times per week"
    - The chunk MUST contain these exact values - user should be able to Ctrl+F and find "3 sets of 8-12 reps" in the chunk
  * DO NOT make up or infer values that aren't explicitly in the chunk
  * DO NOT extract fields if the chunk says "not specified", "not reported", "not mentioned", or similar
  
  For FOODS/SUPPLEMENTS (extract ONLY from the exact chunk you found):
  * Extract dosage, serving size, frequency ONLY if they appear in the exact chunk text
  * The values you extract MUST match what's written in the chunk
  * Example: If chunk says "Participants received 200mg caffeine daily"
    - Extract: dosage: "200mg daily"
    - The chunk MUST contain "200mg" and "daily" - user should be able to Ctrl+F and find these in the chunk
  * DO NOT make up or infer values that aren't explicitly in the chunk
  * DO NOT extract fields if the chunk says "not specified", "not reported", "not mentioned", or similar

CRITICAL RULES - VERIFICATION REQUIREMENT:
- The chunk is the SOURCE - you must find it FIRST before extracting any fields
- Every value in the structured fields MUST appear in the chunk text
- Users must be able to Ctrl+F (search) for each field value in the displayed chunk
- If a value doesn't appear in the chunk, DO NOT include it in the fields
- If you cannot find a chunk with exercise/dosage details in the paper, DO NOT include any exercise/dosage fields or chunks at all
- DO NOT paraphrase, summarize, or modify the chunk text - copy it EXACTLY as written
- DO NOT extract fields that aren't explicitly stated in the chunk

CRITICAL REQUIREMENTS FOR MECHANISM:
- The "mechanism" field must explain HOW the food/activity specifically affects "${condition}"
- The mechanism MUST be relevant to "${condition}" - do NOT use mechanisms from other conditions
- Examples for concussion: "reduces neuroinflammation", "promotes neuroplasticity", "improves cognitive recovery"
- Examples for diabetes: "increases insulin sensitivity", "improves glucose metabolism", "reduces blood sugar"
- DO NOT use diabetes-related mechanisms (insulin, glucose) for non-metabolic conditions like concussion
- DO NOT use concussion-related mechanisms (neuroinflammation, cognitive) for metabolic conditions like diabetes
- It must describe the biological process, NOT vague statements like "acts as a way to help with treatment" or "is beneficial"
- Bad examples: "acts as a way to help with treatment", "is beneficial for the condition", "helps improve health"
- Be specific about the biological pathway or mechanism that relates to "${condition}"

Format your response as JSON with this structure:
{
  "mechanisms": ["mechanism1", "mechanism2"],
  "recommendations": [
    {
      "type": "food" or "activity",
      "name": "SPECIFIC name (must be actionable - e.g., 'Running', 'Spinach', 'Caffeine', NOT 'Exercise' or 'Submaximal Exercise')",
      "category": "beneficial" or "risky",
      "mechanism": "SPECIFIC biological mechanism explaining HOW it works (e.g., 'increases insulin sensitivity by enhancing glucose uptake in muscle cells', NOT 'acts as a way to help with treatment')",
      "summary": "brief explanation with specific details",
      "specificExercises": ["Exercise 1", "Exercise 2"] (ONLY for activities - list all specific exercises mentioned, e.g., ["Bench Press", "Squats", "Deadlifts"]),
      "reps": "reps/sets if mentioned (e.g., '3 sets of 8-12 reps', '10-15 repetitions')",
      "sets": "number of sets if mentioned (e.g., '3 sets')",
      "duration": "duration if mentioned (e.g., '30 minutes', '45-60 minutes')",
      "frequency": "frequency if mentioned (e.g., '3 times per week', 'daily')",
      "dosage": "dosage if mentioned (e.g., '200mg daily', '500mg twice daily')",
      "servingSize": "serving size if mentioned (e.g., '3-4 oz', '1 cup')",
      "frequencyOfIntake": "frequency of intake if mentioned (e.g., 'daily', 'with meals')",
      "evidence": [
        {
          "paperTitle": "title",
          "paperUrl": "url",
          "paperId": "id",
          "quote": "relevant quote or section",
          "doi": "doi if available",
          "sectionForExercises": "exact section/page where exercise details are mentioned (e.g., 'Methods section, page 3', 'Table 2', 'Results paragraph 2') - ONLY include if exercise details are in this paper",
          "exerciseDetailsChunk": "EXACT text chunk from the paper containing exercise details (copy the relevant paragraph or sentence directly from the paper) - ONLY include if exercise details are in this paper",
          "sectionForDosage": "exact section/page where dosage/intake details are mentioned (e.g., 'Methods section, page 4', 'Table 1', 'Results paragraph 3') - ONLY include if dosage/intake details are in this paper",
          "dosageDetailsChunk": "EXACT text chunk from the paper containing dosage/intake details (copy the relevant paragraph or sentence directly from the paper) - ONLY include if dosage/intake details are in this paper"
        }
      ]
    }
  ]
}

VALIDATION: Before including each recommendation, ask:
1. Is the name specific enough that someone could immediately do/eat it? (If no, make it more specific)
2. Does the mechanism explain a concrete biological process that is RELEVANT to "${condition}"? (If no, EXCLUDE it)
3. Would a general audience understand what to do? (If no, specify further)
4. Is this recommendation actually about "${condition}" or is it from a paper about a different condition? (If different condition, EXCLUDE it)
${hasCause ? `5. Does this recommendation address the specific cause ("${cause}") or the general condition ("${baseCondition}")? Include both types.` : ''}

Papers to analyze:
${papersText}

Respond ONLY with valid JSON, no markdown formatting.`;

  try {
    const fullPrompt = `You are a medical research analyst. Extract health recommendations from scientific papers and format them as JSON. Always cite specific papers with quotes or section references.

${prompt}`;

    const systemPrompt = 'You are a medical research analyst. Extract health recommendations from scientific papers and format them as JSON. Always cite specific papers with quotes or section references.';

    const responseText = await generateAIResponse(fullPrompt, systemPrompt);
    
    // Clean up response (remove markdown code blocks if present)
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanedText);

    // Map paper IDs back to actual paper data and validate recommendations using heuristics
    const conditionLower = condition.toLowerCase();
    const isMetabolicCondition = ['diabetes', 'insulin', 'glucose', 'metabolic', 'blood sugar', 'hyperglycemia', 'hypoglycemia'].some(term => conditionLower.includes(term));
    const isNeurologicalCondition = ['concussion', 'brain', 'neurological', 'cognitive', 'neuro', 'tbi', 'traumatic brain'].some(term => conditionLower.includes(term));
    
    const recommendations: HealthRecommendation[] = (analysis.recommendations || [])
      .map((rec: any) => {
        // Remove fields that say "not specified" or similar - don't mention them at all
        const notSpecifiedPatterns = [/not specified/i, /not reported/i, /not mentioned/i, /not available/i, /n\/a/i, /na/i, /unknown/i, /unspecified/i];
        
        if (rec.dosage && notSpecifiedPatterns.some(pattern => pattern.test(rec.dosage))) {
          delete rec.dosage;
        }
        if (rec.servingSize && notSpecifiedPatterns.some(pattern => pattern.test(rec.servingSize))) {
          delete rec.servingSize;
        }
        if (rec.frequencyOfIntake && notSpecifiedPatterns.some(pattern => pattern.test(rec.frequencyOfIntake))) {
          delete rec.frequencyOfIntake;
        }
        if (rec.reps && notSpecifiedPatterns.some(pattern => pattern.test(rec.reps))) {
          delete rec.reps;
        }
        if (rec.sets && notSpecifiedPatterns.some(pattern => pattern.test(rec.sets))) {
          delete rec.sets;
        }
        if (rec.duration && notSpecifiedPatterns.some(pattern => pattern.test(rec.duration))) {
          delete rec.duration;
        }
        if (rec.frequency && notSpecifiedPatterns.some(pattern => pattern.test(rec.frequency))) {
          delete rec.frequency;
        }
        
        // Remove exercise details if no exercise chunks are available (chunk is the source)
        const hasExerciseChunks = rec.evidence?.some((ev: any) => ev.exerciseDetailsChunk);
        if (!hasExerciseChunks) {
          // Remove exercise details - they should only exist if chunk exists
          delete rec.specificExercises;
          delete rec.reps;
          delete rec.sets;
          delete rec.duration;
          delete rec.frequency;
          // Remove exercise chunks from evidence
          if (rec.evidence) {
            rec.evidence = rec.evidence.map((ev: any) => {
              delete ev.sectionForExercises;
              delete ev.exerciseDetailsChunk;
              return ev;
            });
          }
        }
        
        // Remove intake details if no dosage chunks are available (chunk is the source)
        const hasDosageChunks = rec.evidence?.some((ev: any) => ev.dosageDetailsChunk);
        if (!hasDosageChunks) {
          // Remove intake details - they should only exist if chunk exists
          delete rec.dosage;
          delete rec.servingSize;
          delete rec.frequencyOfIntake;
          // Remove dosage chunks from evidence
          if (rec.evidence) {
            rec.evidence = rec.evidence.map((ev: any) => {
              delete ev.sectionForDosage;
              delete ev.dosageDetailsChunk;
              return ev;
            });
          }
        }
        
        return rec;
      })
      .filter((rec: any) => {
        // Heuristic 1: Check if name is missing
        const name = rec.name?.toLowerCase().trim() || '';
        if (!name) {
          return false;
        }
        
        // Heuristic 2: Reject if it's a single generic word without specifics
        const singleGenericWords = ['exercise', 'activity', 'diet', 'nutrition', 'food', 'therapy'];
        if (singleGenericWords.includes(name)) {
          return false;
        }
        
        // Heuristic 3: Reject if it contains generic qualifiers without specifics
        const genericPatterns = [
          /^(submaximal|therapeutic|general|moderate|intensive)\s+(exercise|activity|diet|nutrition)$/i,
          /^exercise\s*\(general\)$/i,
          /^.*\s+\(general\)$/i,
          /^dietary\s+intervention$/i,
          /^dietary\s+interventions$/i,
          /^nutritional\s+intervention$/i,
          /^nutritional\s+interventions$/i,
        ];
        if (genericPatterns.some((pattern) => pattern.test(name))) {
          return false;
        }
        
        // Heuristic 4: Reject if mechanism is too vague
        const mechanism = rec.mechanism?.toLowerCase() || '';
        const vagueMechanisms = [
          'acts as a way',
          'helps with treatment',
          'is beneficial',
          'helps improve',
          'is good for',
          'can help',
        ];
        if (vagueMechanisms.some((vague) => mechanism.includes(vague) && mechanism.length < 50)) {
          return false;
        }
        
        // Heuristic 5: Reject if mechanism is clearly for a different condition type
        const metabolicTerms = ['insulin', 'glucose', 'blood sugar', 'glycemic', 'metabolic', 'diabetes'];
        const neurologicalTerms = ['neuroinflammation', 'neuroplasticity', 'cognitive', 'axonal', 'brain injury', 'concussion'];
        
        if (isNeurologicalCondition && !isMetabolicCondition) {
          // For neurological conditions, reject if mechanism only mentions metabolic terms
          const hasMetabolicOnly = metabolicTerms.some(term => mechanism.includes(term)) && 
                                   !neurologicalTerms.some(term => mechanism.includes(term)) &&
                                   !mechanism.includes(conditionLower);
          if (hasMetabolicOnly) {
            console.log(`Filtered out recommendation "${name}" - mechanism "${mechanism}" is not relevant to ${condition}`);
            return false;
          }
        }
        
        if (isMetabolicCondition && !isNeurologicalCondition) {
          // For metabolic conditions, reject if mechanism only mentions neurological terms (unless it's about metabolic brain effects)
          const hasNeuroOnly = neurologicalTerms.some(term => mechanism.includes(term)) && 
                              !metabolicTerms.some(term => mechanism.includes(term)) &&
                              !mechanism.includes('metabolic') &&
                              !mechanism.includes(conditionLower);
          if (hasNeuroOnly) {
            console.log(`Filtered out recommendation "${name}" - mechanism "${mechanism}" is not relevant to ${condition}`);
            return false;
          }
        }
        
        return true;
      })
      .map((rec: any) => ({
        ...rec,
        evidence: (rec.evidence || []).map((ev: any) => {
          const paper = allPapers.find(
            (p) => p.id === ev.paperId || p.title === ev.paperTitle
          );
          return {
            ...ev,
            paperUrl: paper?.url || ev.paperUrl,
            doi: paper?.doi || ev.doi,
          };
        }),
      }));

    // Simplify language for general audience (paraphrasing)
    const textsToSimplify = recommendations.flatMap((rec) => [
      { text: rec.summary, context: `${rec.type} recommendation` },
      ...(rec.mechanism ? [{ text: rec.mechanism, context: 'biological mechanism' }] : []),
    ]);

    let simplifiedTexts: Array<{ original: string; simplified: string; technicalTerms?: Array<{ term: string; explanation: string }> }> = [];
    if (textsToSimplify.length > 0) {
      try {
        simplifiedTexts = await simplifyMultipleTexts(textsToSimplify);
      } catch (error) {
        console.warn('Language simplification failed:', error);
        // If simplification fails, keep original text
        simplifiedTexts = textsToSimplify.map((t) => ({
          original: t.text,
          simplified: t.text,
          technicalTerms: [],
        }));
      }
    }

    // Map simplified versions back to recommendations
    let simplifiedIndex = 0;
    const recommendationsWithSimplified = recommendations.map((rec) => {
      const summarySimplified = simplifiedTexts[simplifiedIndex];
      simplifiedIndex++;
      const mechanismSimplified = rec.mechanism ? simplifiedTexts[simplifiedIndex] : null;
      if (rec.mechanism) simplifiedIndex++;

      // Collect all technical terms from AI simplification only
      const aiTerms = [
        ...(summarySimplified?.technicalTerms || []),
        ...(mechanismSimplified?.technicalTerms || []),
      ];

      // Remove duplicates
      const uniqueTerms = Array.from(
        new Map(aiTerms.map((t) => [t.term.toLowerCase(), t])).values()
      );

      // Ensure mechanismSimplified is actually different from mechanism
      const finalMechanismSimplified = mechanismSimplified?.simplified && 
                                        mechanismSimplified.simplified !== rec.mechanism
                                        ? mechanismSimplified.simplified
                                        : undefined;

      return {
        ...rec,
        summarySimplified: summarySimplified?.simplified && summarySimplified.simplified !== rec.summary
          ? summarySimplified.simplified
          : undefined,
        mechanismSimplified: finalMechanismSimplified,
        technicalTerms: uniqueTerms.length > 0 ? uniqueTerms : undefined,
      };
    });

    const result: HealthAnalysis = {
      condition,
      recommendations: recommendationsWithSimplified,
      mechanisms: analysis.mechanisms || [],
    };

    // Add budget options if requested
    if (includeBudget) {
      result.budgetOptions = await generateBudgetOptions(condition, recommendations);
    }

    return result;
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      condition,
      recommendations: [],
      mechanisms: [],
    };
  }
}

/**
 * Generate budget-friendly options using government sources
 */
async function generateBudgetOptions(
  condition: string,
  recommendations: HealthRecommendation[]
): Promise<BudgetOption[]> {
  const budgetPrompt = `Based on the condition "${condition}" and these recommendations, suggest budget-friendly alternatives using government sources (USDA, CDC, NIH, etc.).

Format as JSON:
{
  "options": [
    {
      "name": "option name",
      "description": "description",
      "source": "source name (e.g., USDA, CDC)",
      "sourceUrl": "url to source",
      "cost": "estimated cost if available"
    }
  ]
}

Recommendations: ${JSON.stringify(recommendations.map((r) => r.name))}

Respond ONLY with valid JSON.`;

  try {
    const fullPrompt = `You are a health advisor. Suggest budget-friendly alternatives using government sources. Format as JSON.

${budgetPrompt}`;

    const systemPrompt = 'You are a health advisor. Suggest budget-friendly alternatives using government sources. Format as JSON.';

    const responseText = await generateAIResponse(fullPrompt, systemPrompt);
    
    // Clean up response (remove markdown code blocks if present)
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const responseData = JSON.parse(cleanedText);
    return responseData.options || [];
  } catch (error) {
    console.error('Budget options error:', error);
    return [];
  }
}

