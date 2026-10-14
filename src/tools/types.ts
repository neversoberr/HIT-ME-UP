import type { ToolSpec } from '../llm/types';
import type { Memory } from '../agent/memory';
import type { Scheduler } from '../automation/scheduler';
import type { Notifications } from '../automation/notifications';
import type { WebhookStore } from '../automation/webhooks';

export interface ToolContext {
  memory: Memory;
  scheduler: Scheduler;
  notifications: Notifications;
  webhooks: WebhookStore;
}

export interface Tool {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<string> | string;
}

/** Standard envelope every tool returns. */
export interface ToolResult {
  ok: boolean;
  message: string;
  [key: string]: unknown;
}

export function ok(message: string, data: Record<string, unknown> = {}): string {
  return JSON.stringify({ ok: true, message, ...data } as ToolResult);
}

export function fail(message: string): string {
  return JSON.stringify({ ok: false, message } as ToolResult);
}

export type { ToolSpec };
