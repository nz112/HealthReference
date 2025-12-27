/**
 * Dictionary of common technical/medical terms with simple explanations
 * Used as a fallback when AI simplification fails or for quick lookups
 */
export interface TermDefinition {
  term: string;
  explanation: string;
  category: 'medical' | 'exercise' | 'nutrition' | 'general';
}

export const TECHNICAL_TERMS_DICTIONARY: Record<string, TermDefinition> = {
  // Exercise & Physical Activity Terms
  'submaximal exercise': {
    term: 'submaximal exercise',
    explanation: 'Exercise performed at moderate intensity, below your maximum effort level.',
    category: 'exercise',
  },
  'eccentric loading': {
    term: 'eccentric loading',
    explanation: 'The lowering phase of an exercise where muscles lengthen under tension (e.g., lowering a weight).',
    category: 'exercise',
  },
  'concentric contraction': {
    term: 'concentric contraction',
    explanation: 'Muscle contraction where the muscle shortens while generating force (e.g., lifting a weight).',
    category: 'exercise',
  },
  'chain-loaded weights': {
    term: 'chain-loaded weights',
    explanation: 'Weight training equipment where chains are added to a barbell, increasing resistance as you lift.',
    category: 'exercise',
  },
  'resistance training': {
    term: 'resistance training',
    explanation: 'Exercise that uses resistance (weights, bands, or body weight) to strengthen muscles.',
    category: 'exercise',
  },
  'aerobic exercise': {
    term: 'aerobic exercise',
    explanation: 'Cardiovascular exercise that increases heart rate and breathing (e.g., running, swimming, cycling).',
    category: 'exercise',
  },
  'anaerobic exercise': {
    term: 'anaerobic exercise',
    explanation: 'High-intensity exercise performed in short bursts without relying on oxygen (e.g., sprinting, weightlifting).',
    category: 'exercise',
  },
  'VO2 max': {
    term: 'VO2 max',
    explanation: 'The maximum amount of oxygen your body can use during intense exercise, indicating cardiovascular fitness.',
    category: 'exercise',
  },
  'progressive overload': {
    term: 'progressive overload',
    explanation: 'Gradually increasing the difficulty of exercise over time to continue making fitness gains.',
    category: 'exercise',
  },

  // Medical & Biological Terms
  'insulin resistance': {
    term: 'insulin resistance',
    explanation: 'A condition where cells in your body don\'t respond well to insulin, leading to high blood sugar levels.',
    category: 'medical',
  },
  'insulin sensitivity': {
    term: 'insulin sensitivity',
    explanation: 'How well your body responds to insulin. Higher sensitivity means your body uses insulin more effectively.',
    category: 'medical',
  },
  'glucose uptake': {
    term: 'glucose uptake',
    explanation: 'The process by which cells absorb sugar (glucose) from the bloodstream for energy.',
    category: 'medical',
  },
  'glucose metabolism': {
    term: 'glucose metabolism',
    explanation: 'How your body processes and uses sugar (glucose) for energy.',
    category: 'medical',
  },
  'oxidative stress': {
    term: 'oxidative stress',
    explanation: 'An imbalance between harmful molecules (free radicals) and antioxidants in your body, which can damage cells.',
    category: 'medical',
  },
  'inflammation': {
    term: 'inflammation',
    explanation: 'Your body\'s natural response to injury or illness, but chronic inflammation can contribute to disease.',
    category: 'medical',
  },
  'chronic inflammation': {
    term: 'chronic inflammation',
    explanation: 'Long-term inflammation that can damage tissues and contribute to various health conditions.',
    category: 'medical',
  },
  'antioxidant': {
    term: 'antioxidant',
    explanation: 'Compounds that protect cells from damage caused by harmful molecules called free radicals.',
    category: 'medical',
  },
  'free radicals': {
    term: 'free radicals',
    explanation: 'Unstable molecules that can damage cells and contribute to aging and disease.',
    category: 'medical',
  },
  'metabolic syndrome': {
    term: 'metabolic syndrome',
    explanation: 'A group of conditions (high blood pressure, high blood sugar, excess body fat) that increase heart disease and diabetes risk.',
    category: 'medical',
  },
  'cardiovascular': {
    term: 'cardiovascular',
    explanation: 'Relating to the heart and blood vessels (heart and circulatory system).',
    category: 'medical',
  },
  'hypertension': {
    term: 'hypertension',
    explanation: 'High blood pressure, a condition where the force of blood against artery walls is too high.',
    category: 'medical',
  },
  'hypoglycemia': {
    term: 'hypoglycemia',
    explanation: 'Low blood sugar levels, which can cause dizziness, confusion, and other symptoms.',
    category: 'medical',
  },
  'hyperglycemia': {
    term: 'hyperglycemia',
    explanation: 'High blood sugar levels, often associated with diabetes.',
    category: 'medical',
  },
  'glycemic index': {
    term: 'glycemic index',
    explanation: 'A measure of how quickly a food raises blood sugar levels after eating.',
    category: 'nutrition',
  },
  'glycemic load': {
    term: 'glycemic load',
    explanation: 'A measure that considers both how quickly a food raises blood sugar and how much carbohydrate it contains.',
    category: 'nutrition',
  },

  // Nutrition Terms
  'macronutrients': {
    term: 'macronutrients',
    explanation: 'The main nutrients your body needs in large amounts: carbohydrates, proteins, and fats.',
    category: 'nutrition',
  },
  'micronutrients': {
    term: 'micronutrients',
    explanation: 'Vitamins and minerals your body needs in smaller amounts for proper functioning.',
    category: 'nutrition',
  },
  'omega-3 fatty acids': {
    term: 'omega-3 fatty acids',
    explanation: 'Healthy fats found in fish, nuts, and seeds that support heart and brain health.',
    category: 'nutrition',
  },
  'saturated fat': {
    term: 'saturated fat',
    explanation: 'A type of fat found in animal products and some plant oils that can raise cholesterol levels.',
    category: 'nutrition',
  },
  'unsaturated fat': {
    term: 'unsaturated fat',
    explanation: 'Healthy fats found in olive oil, avocados, and nuts that can help lower cholesterol.',
    category: 'nutrition',
  },
  'trans fat': {
    term: 'trans fat',
    explanation: 'Unhealthy artificial fats that raise bad cholesterol and increase heart disease risk.',
    category: 'nutrition',
  },
  'dietary fiber': {
    term: 'dietary fiber',
    explanation: 'Plant material that your body can\'t digest, helping with digestion and blood sugar control.',
    category: 'nutrition',
  },
  'probiotics': {
    term: 'probiotics',
    explanation: 'Beneficial bacteria found in fermented foods that support gut health.',
    category: 'nutrition',
  },
  'prebiotics': {
    term: 'prebiotics',
    explanation: 'Types of fiber that feed beneficial bacteria in your gut.',
    category: 'nutrition',
  },
  'phytochemicals': {
    term: 'phytochemicals',
    explanation: 'Natural compounds in plants that may have health benefits (e.g., antioxidants in fruits and vegetables).',
    category: 'nutrition',
  },
  'polyphenols': {
    term: 'polyphenols',
    explanation: 'Natural compounds in plants (found in tea, berries, dark chocolate) that have antioxidant properties.',
    category: 'nutrition',
  },
  'bioavailability': {
    term: 'bioavailability',
    explanation: 'How well your body can absorb and use a nutrient from food.',
    category: 'nutrition',
  },
};

/**
 * Look up a term in the dictionary (case-insensitive)
 */
export function lookupTerm(term: string): TermDefinition | undefined {
  const normalizedTerm = term.toLowerCase().trim();
  return TECHNICAL_TERMS_DICTIONARY[normalizedTerm];
}

/**
 * Check if a term exists in the dictionary
 */
export function hasTerm(term: string): boolean {
  return lookupTerm(term) !== undefined;
}

/**
 * Get all terms in a specific category
 */
export function getTermsByCategory(category: TermDefinition['category']): TermDefinition[] {
  return Object.values(TECHNICAL_TERMS_DICTIONARY).filter(
    (def) => def.category === category
  );
}

/**
 * Search for terms that contain the search string (case-insensitive)
 */
export function searchTerms(searchString: string): TermDefinition[] {
  const normalizedSearch = searchString.toLowerCase().trim();
  return Object.values(TECHNICAL_TERMS_DICTIONARY).filter(
    (def) => def.term.toLowerCase().includes(normalizedSearch)
  );
}

