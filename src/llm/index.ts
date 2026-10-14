import type { LLMClient } from './types';
import { MockLLM } from './mock';
import { OpenAIClient } from './openai';

export * from './types';

export interface LLMConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
}

/**
 * Returns a real OpenAI-compatible client when an API key is present,
 * otherwise the built-in offline brain.
 */
export function createLLM(config: LLMConfig): LLMClient {
  if (config.apiKey && config.apiKey.trim().length > 0) {
    return new OpenAIClient({ apiKey: config.apiKey, baseUrl: config.baseUrl, model: config.model });
  }
  return new MockLLM();
}

export { MockLLM, OpenAIClient };
