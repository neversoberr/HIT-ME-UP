import type { ToolSpec } from '../llm/types';
import type { Tool, ToolContext } from './types';
import { fail } from './types';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  specs(): ToolSpec[] {
    return [...this.tools.values()].map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  /** Execute a tool by name with JSON-encoded arguments; never throws. */
  async execute(name: string, argsJson: string, ctx: ToolContext): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) return fail(`Unknown tool: ${name}`);
    let args: Record<string, unknown> = {};
    try {
      args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
    } catch {
      return fail(`Invalid JSON arguments for ${name}: ${argsJson.slice(0, 200)}`);
    }
    try {
      return await tool.execute(args, ctx);
    } catch (err) {
      return fail(`Tool ${name} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
