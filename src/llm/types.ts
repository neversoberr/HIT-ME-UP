/**
 * Shared LLM abstractions. Both the OpenAI-compatible client and the
 * offline mock brain implement `LLMClient`, so the agent loop never needs
 * to know which one it is talking to.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    /** JSON-encoded arguments. */
    arguments: string;
  };
}

export interface ChatMessage {
  role: Role;
  content: string | null;
  tool_calls?: ToolCall[];
  /** For role === 'tool': the id of the tool call being answered. */
  tool_call_id?: string;
}

export interface ToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMClient {
  /** Returns the next assistant message (possibly containing tool calls). */
  chat(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatMessage>;
}
