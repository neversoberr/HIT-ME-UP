import type { ChatMessage, LLMClient } from '../llm/types';
import type { Tool, ToolContext } from '../tools/types';
import type { ToolRegistry } from '../tools/registry';
import { buildSystemPrompt } from './systemPrompt';

export interface AgentOptions {
  llm: LLMClient;
  registry: ToolRegistry;
  ctx: ToolContext;
  maxIterations?: number;
  /** Max messages kept per chat session (user + assistant turns). */
  maxHistory?: number;
}

/**
 * The agent: a tool-calling loop over an LLM client, with per-session
 * conversation memory. `chat()` is the conversational entry point;
 * `runTask()` executes an automation task in a one-shot session.
 */
export class Agent {
  private readonly llm: LLMClient;
  private readonly registry: ToolRegistry;
  private readonly ctx: ToolContext;
  private readonly maxIterations: number;
  private readonly maxHistory: number;
  private systemPrompt: string;
  /** sessionId -> alternating user / final-assistant messages */
  private sessions = new Map<string, ChatMessage[]>();

  constructor(opts: AgentOptions) {
    this.llm = opts.llm;
    this.registry = opts.registry;
    this.ctx = opts.ctx;
    this.maxIterations = opts.maxIterations ?? 8;
    this.maxHistory = opts.maxHistory ?? 40;
    this.systemPrompt = buildSystemPrompt(opts.registry.specs(), new Date().toISOString());
  }

  /** Conversational turn. Keeps history under `sessionId`. */
  async chat(sessionId: string, userMessage: string): Promise<string> {
    const history = this.sessions.get(sessionId) ?? [];
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const finalText = await this.runLoop(messages);

    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: finalText });
    while (history.length > this.maxHistory) history.shift();
    this.sessions.set(sessionId, history);
    return finalText;
  }

  /** One-shot task execution (used by the scheduler and webhooks). */
  async runTask(task: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `[automated task] ${task}` },
    ];
    return this.runLoop(messages);
  }

  /** Runs the tool-calling loop until the model produces a final answer. */
  private async runLoop(messages: ChatMessage[]): Promise<string> {
    for (let i = 0; i < this.maxIterations; i++) {
      const assistant = await this.llm.chat(messages, this.registry.specs());
      messages.push(assistant);

      if (assistant.tool_calls && assistant.tool_calls.length > 0) {
        for (const call of assistant.tool_calls) {
          const result = await this.registry.execute(
            call.function.name,
            call.function.arguments,
            this.ctx
          );
          messages.push({ role: 'tool', tool_call_id: call.id, content: result });
        }
        continue;
      }

      return (assistant.content ?? '').trim() || 'Done.';
    }
    return 'I hit my tool-call limit before finishing. Try breaking the request into smaller steps.';
  }

  listSessions(): string[] {
    return [...this.sessions.keys()];
  }

  /** Registers an extra tool at runtime (updates the system prompt too). */
  registerTool(tool: Tool): void {
    this.registry.register(tool);
    this.systemPrompt = buildSystemPrompt(this.registry.specs(), new Date().toISOString());
  }
}
