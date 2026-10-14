import type { ChatMessage, LLMClient, ToolSpec } from './types';

export interface OpenAIClientOptions {
  apiKey: string;
  /** e.g. https://api.openai.com/v1 — any OpenAI-compatible endpoint works. */
  baseUrl: string;
  model: string;
}

/**
 * Minimal OpenAI-compatible chat-completions client using fetch.
 * Works with OpenAI, Azure OpenAI proxies, Ollama, vLLM, LM Studio, etc.
 */
export class OpenAIClient implements LLMClient {
  constructor(private readonly opts: OpenAIClientOptions) {}

  async chat(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatMessage> {
    const payload: Record<string, unknown> = {
      model: this.opts.model,
      messages: messages.map((m) => {
        const out: Record<string, unknown> = { role: m.role };
        out.content = m.content ?? null;
        if (m.tool_calls) out.tool_calls = m.tool_calls;
        if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
        return out;
      }),
    };
    if (tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: ChatMessage['tool_calls'] } }>;
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('LLM response missing choices[0].message');

    return {
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    };
  }
}
