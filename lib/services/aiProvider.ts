import Groq from 'groq-sdk';
import axios from 'axios';

/**
 * Unified AI provider that supports multiple models
 */
export type AIModel = 'groq-llama' | 'openai-gpt-oss' | 'together-ai' | 'openrouter';

export interface AIProviderConfig {
  model: AIModel;
  apiKey: string;
  baseUrl?: string; // For custom endpoints
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

/**
 * Generate content using the configured AI provider
 */
export async function generateAIResponse(
  prompt: string,
  systemPrompt: string,
  config?: Partial<AIProviderConfig>
): Promise<string> {
  const model = config?.model || (process.env.AI_MODEL as AIModel) || 'groq-llama';
  const apiKey = config?.apiKey || process.env[getApiKeyEnvVar(model)] || '';

  if (!apiKey) {
    throw new Error(`API key required for ${model}. Set ${getApiKeyEnvVar(model)} in .env`);
  }

  switch (model) {
    case 'groq-llama':
      return generateWithGroq(prompt, systemPrompt, apiKey);
    
    case 'openai-gpt-oss':
      return generateWithOpenAIGPTOSS(prompt, systemPrompt, apiKey);
    
    case 'together-ai':
      return generateWithTogetherAI(prompt, systemPrompt, apiKey);
    
    case 'openrouter':
      return generateWithOpenRouter(prompt, systemPrompt, apiKey);
    
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

/**
 * Generate with Groq (Llama 3.1 70B)
 */
async function generateWithGroq(
  prompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const groqClient = new Groq({ apiKey });
  
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const completion = await groqClient.chat.completions.create({
    messages,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', // Updated: llama-3.1-70b-versatile was decommissioned
    temperature: 0.3,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * Generate with OpenAI GPT-OSS-120B (via Together AI or similar)
 * Note: GPT-OSS-120B may be available through Together AI, OpenRouter, or self-hosted
 */
async function generateWithOpenAIGPTOSS(
  prompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  // Try Together AI first (they often host open models)
  try {
    return await generateWithTogetherAI(prompt, systemPrompt, apiKey, 'meta-llama/Llama-3.1-70B-Instruct-Turbo');
  } catch {
    // Fallback to OpenRouter if Together AI fails
    return await generateWithOpenRouter(prompt, systemPrompt, apiKey, 'openai/gpt-oss-120b');
  }
}

/**
 * Generate with Together AI (supports many open models including GPT-OSS-120B)
 */
async function generateWithTogetherAI(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  modelName: string = 'meta-llama/Llama-3.1-70B-Instruct-Turbo'
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await axios.post(
    'https://api.together.xyz/v1/chat/completions',
    {
      model: modelName,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0]?.message?.content || '';
}

/**
 * Generate with OpenRouter (aggregates many models including GPT-OSS-120B)
 */
async function generateWithOpenRouter(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  modelName: string = 'openai/gpt-oss-120b'
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: modelName,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Health References',
      },
    }
  );

  return response.data.choices[0]?.message?.content || '';
}

function getApiKeyEnvVar(model: AIModel): string {
  switch (model) {
    case 'groq-llama':
      return 'GROQ_API_KEY';
    case 'openai-gpt-oss':
      return 'TOGETHER_API_KEY'; // or OPENROUTER_API_KEY
    case 'together-ai':
      return 'TOGETHER_API_KEY';
    case 'openrouter':
      return 'OPENROUTER_API_KEY';
    default:
      return 'AI_API_KEY';
  }
}

