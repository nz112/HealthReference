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
 * Generate with Groq (Llama 3.3 70B) with automatic fallback on rate limits
 * Recommended models for health analysis:
 * - llama-3.3-70b-versatile: Best balance (30 RPM, 12K TPM, 100K TPD)
 * - openai/gpt-oss-120b: Strong reasoning (30 RPM, 8K TPM, 200K TPD)
 * - meta-llama/llama-4-scout-17b-16e-instruct: Highest throughput (30 RPM, 30K TPM, 500K TPD)
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

  // Primary model (can override with GROQ_MODEL env var)
  const primaryModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  
  // Fallback models in order of preference
  const fallbackModels = [
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-120b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.1-8b-instant',
  ].filter(m => m !== primaryModel); // Remove primary from fallbacks

  const modelsToTry = [primaryModel, ...fallbackModels];
  const rateLimitedModels: string[] = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      console.log(`Attempting to use model: ${model}`);
      const completion = await groqClient.chat.completions.create({
        messages,
        model,
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      console.log(`Successfully used model: ${model}`);
      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      // Enhanced rate limit detection
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorStatus = error?.status || error?.response?.status || error?.statusCode;
      const errorCode = error?.code || error?.response?.data?.error?.code;
      
      const isRateLimit = 
        errorStatus === 429 ||
        errorCode === 429 ||
        errorCode === 'rate_limit_exceeded' ||
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('rate_limit');

      if (isRateLimit) {
        rateLimitedModels.push(model);
        console.warn(`Rate limit reached for ${model}`);
        
        if (i < modelsToTry.length - 1) {
          // Try next model
          console.warn(`Switching to ${modelsToTry[i + 1]}`);
          continue;
        } else {
          // All models exhausted
          console.error(`Rate limit reached for all Groq models: ${rateLimitedModels.join(', ')}`);
          throw new Error(`Rate limit reached for all Groq models (${rateLimitedModels.join(', ')}). Please try again later.`);
        }
      } else {
        // Log non-rate-limit errors
        const errorStr = errorMessage || error?.toString() || JSON.stringify(error);
        console.error(`Error with model ${model}:`, errorStr);
        
        // Check if it's a recoverable error (model not found, invalid model, etc.)
        const isModelError = 
          errorMessage.includes('model') && 
          (errorMessage.includes('not found') || 
           errorMessage.includes('invalid') || 
           errorMessage.includes('decommissioned') ||
           errorMessage.includes('not available') ||
           errorMessage.includes('does not exist'));
        
        // Check if it's a quota/billing error (should try next model)
        const isQuotaError = 
          errorMessage.includes('quota') ||
          errorMessage.includes('billing') ||
          errorMessage.includes('payment') ||
          errorMessage.includes('subscription');
        
        // If it's a recoverable error and we have more models, try next one
        if ((isModelError || isQuotaError) && i < modelsToTry.length - 1) {
          console.warn(`Model ${model} error (${isModelError ? 'model issue' : 'quota issue'}), switching to ${modelsToTry[i + 1]}`);
          continue;
        }
        
        // For other errors, if we have more models, try them anyway (be resilient)
        if (i < modelsToTry.length - 1) {
          console.warn(`Non-rate-limit error with ${model}, but continuing to try ${modelsToTry[i + 1]}`);
          continue;
        }
        
        // Only throw if this is the last model
        throw error;
      }
    }
  }

  throw new Error('Failed to generate response with any model');
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
 * Automatically switches to fallback models on rate limits
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

  // Fallback models
  const fallbackModels = [
    'meta-llama/Llama-3.1-70B-Instruct-Turbo',
    'meta-llama/Llama-3-70B-Instruct',
    'mistralai/Mixtral-8x7B-Instruct-v0.1',
  ].filter(m => m !== modelName);

  const modelsToTry = [modelName, ...fallbackModels];
  const rateLimitedModels: string[] = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await axios.post(
        'https://api.together.xyz/v1/chat/completions',
        {
          model,
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
    } catch (error: any) {
      const isRateLimit = 
        error?.response?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('too many requests');

      if (isRateLimit) {
        rateLimitedModels.push(model);
        console.warn(`Rate limit reached for ${model}`);
        
        if (i < modelsToTry.length - 1) {
          console.warn(`Switching to ${modelsToTry[i + 1]}`);
          continue;
        } else {
          console.error(`Rate limit reached for all Together AI models: ${rateLimitedModels.join(', ')}`);
          throw new Error(`Rate limit reached for all Together AI models (${rateLimitedModels.join(', ')}). Please try again later.`);
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error('Failed to generate response with any model');
}

/**
 * Generate with OpenRouter (aggregates many models including GPT-OSS-120B)
 * Automatically switches to fallback models on rate limits
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

  // Fallback models
  const fallbackModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'meta-llama/llama-3.1-70b-instruct',
    'anthropic/claude-3.5-sonnet',
  ].filter(m => m !== modelName);

  const modelsToTry = [modelName, ...fallbackModels];
  const rateLimitedModels: string[] = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
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
    } catch (error: any) {
      const isRateLimit = 
        error?.response?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('too many requests');

      if (isRateLimit) {
        rateLimitedModels.push(model);
        console.warn(`Rate limit reached for ${model}`);
        
        if (i < modelsToTry.length - 1) {
          console.warn(`Switching to ${modelsToTry[i + 1]}`);
          continue;
        } else {
          console.error(`Rate limit reached for all OpenRouter models: ${rateLimitedModels.join(', ')}`);
          throw new Error(`Rate limit reached for all OpenRouter models (${rateLimitedModels.join(', ')}). Please try again later.`);
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error('Failed to generate response with any model');
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

