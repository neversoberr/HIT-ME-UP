import type { ChatMessage, LLMClient, ToolSpec, ToolCall } from './types';

/**
 * Offline rule-based "brain". It implements the same tool-calling protocol as
 * a real LLM, so the agent, tools, scheduler and memory are fully exercisable
 * without an API key or network access. When OPENAI_API_KEY is configured the
 * real model takes over automatically.
 */

const UNIT_MS: Record<string, number> = {
  second: 1000,
  sec: 1000,
  minute: 60_000,
  min: 60_000,
  hour: 3_600_000,
  hr: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
};

function normalizeUnit(raw: string): string {
  const u = raw.toLowerCase().replace(/s$/, '');
  return u === 'secs' ? 'sec' : u === 'mins' ? 'min' : u === 'hrs' ? 'hr' : u;
}

interface ScheduleSpec {
  everyMs?: number;
  runAtMs?: number;
  label: string;
}

function parseSchedule(text: string): ScheduleSpec | null {
  const t = text.toLowerCase();

  let m = t.match(/\bin\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?)\b/);
  if (m) {
    const unit = normalizeUnit(m[2]);
    return { runAtMs: Date.now() + Number(m[1]) * UNIT_MS[unit], label: `in ${m[1]} ${unit}(s)` };
  }

  m = t.match(/\bevery\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?)\b/);
  if (m) {
    const unit = normalizeUnit(m[2]);
    return { everyMs: Number(m[1]) * UNIT_MS[unit], label: `every ${m[1]} ${unit}(s)` };
  }

  m = t.match(/\bevery\s+(second|minute|hour|day|week)\b/);
  if (m) {
    const unit = normalizeUnit(m[1]);
    return { everyMs: UNIT_MS[unit], label: `every ${unit}` };
  }

  if (/\bhourly\b/.test(t)) return { everyMs: UNIT_MS.hour, label: 'hourly' };
  if (/\bdaily\b/.test(t)) return { everyMs: UNIT_MS.day, label: 'daily' };
  if (/\bweekly\b/.test(t)) return { everyMs: UNIT_MS.week, label: 'weekly' };

  return null;
}

function extractTask(text: string): string {
  // "… to <task>" (take the last "to …" segment) wins.
  const toMatch = text.match(/\bto\s+(.+)$/is);
  if (toMatch && toMatch[1].trim().length > 2) return toMatch[1].trim();

  // Otherwise strip scheduling keywords and use what's left.
  let task = text
    .replace(/\b(please\s+)?(schedule|set\s+up|create|add|start)\s+(a\s+|an\s+)?(job|task|reminder)?\b/gi, ' ')
    .replace(/\bremind\s+me\s+to\b/gi, ' ')
    .replace(/\bremind\s+me\b/gi, ' ')
    .replace(/\bevery\s+\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?)\b/gi, ' ')
    .replace(/\bevery\s+(second|minute|hour|day|week)\b/gi, ' ')
    .replace(/\b(hourly|daily|weekly)\b/gi, ' ')
    .replace(/\bin\s+\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?)\b/gi, ' ')
    .replace(/\bthat\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return task || 'check in and report status';
}

function call(id: number, name: string, args: Record<string, unknown>): ChatMessage {
  const toolCall: ToolCall = {
    id: `call_${id}`,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  };
  return { role: 'assistant', content: null, tool_calls: [toolCall] };
}

function reply(text: string): ChatMessage {
  return { role: 'assistant', content: text, tool_calls: undefined };
}

function helpText(tools: ToolSpec[]): string {
  const names = tools.map((t) => `  • ${t.function.name} — ${t.function.description}`).join('\n');
  return (
    `I'm the HIT-ME-UP automation agent. Things I can do:\n${names}\n\n` +
    `Try: "remember that the deploy window is Fridays at 6pm", ` +
    `"schedule a job every 30 seconds to say hi", "list jobs", ` +
    `"what do you remember", or "notify me that the build finished".`
  );
}

/**
 * Summarize tool results into a final assistant answer.
 * Tool results are JSON envelopes: { ok, message, ...data }.
 */
function summarizeToolResults(messages: ChatMessage[]): ChatMessage {
  const toolMsgs = messages.filter((m) => m.role === 'tool');
  const lines: string[] = [];
  for (const t of toolMsgs) {
    let text = t.content ?? '';
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      text = typeof parsed.message === 'string' ? parsed.message : text;
      const extras = Object.entries(parsed)
        .filter(([k, v]) => k !== 'ok' && k !== 'message' && v != null)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
      if (extras.length > 0) text += ` (${extras.join(', ')})`;
    } catch {
      /* keep raw text */
    }
    lines.push(text);
  }
  return reply(lines.join('\n') || 'Done.');
}

export class MockLLM implements LLMClient {
  private counter = 0;

  async chat(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatMessage> {
    const last = messages[messages.length - 1];

    // After tool execution, produce the final natural-language answer.
    if (last && last.role === 'tool') {
      return summarizeToolResults(messages);
    }

    const userText = (last?.content ?? '')
      .trim()
      // Strip internal automation markers (scheduler/webhook envelopes).
      // Markers can stack, e.g. "[automated task] [webhook "x"] …".
      .replace(/^(?:\[(?:automated task|webhook[^[\]]*)\]\s*)+/i, '');
    const text = userText.toLowerCase();
    const id = ++this.counter;

    if (!userText) return reply('Say something like "list jobs" or "help" to get started.');

    if (/\b(help|what can you do|capabilities|commands)\b/.test(text)) {
      return reply(helpText(tools));
    }

    // ---- memory ----
    const remember = userText.match(/\bremember(?:\s+that)?\s*[:\-]?\s*(.+)$/is);
    if (remember && !/what do (you|i) remember|do you remember/.test(text)) {
      return call(id, 'remember', { text: remember[1].trim() });
    }
    if (/\b(what do you remember|recall|memories|memory|facts|notes)\b/.test(text)) {
      const about = userText.match(/\babout\s+(.+)$/i);
      return call(id, 'recall', { query: about ? about[1].trim() : '' });
    }

    // ---- time ----
    if (/\b(what(?:'s| is)? the )?(current )?(time|date|today|now)\b/.test(text) && !/\b(schedule|every|remind|notify|job)\b/.test(text)) {
      return call(id, 'get_current_time', {});
    }

    // ---- jobs ----
    if (/\bcancel\s+(?:the\s+)?(?:job\s+|job\s+called\s+)?["']?([\w\s\-]{2,40})["']?\s*$/.test(text)) {
      const name = text.match(/\bcancel\s+(?:the\s+)?(?:job\s+|job\s+called\s+)?["']?([\w\s\-]{2,40})["']?\s*$/)![1].trim();
      return call(id, 'cancel_job', { name });
    }
    if (/\b(list|show|what(?:'s| is)|what are)\b.*\b(jobs?|scheduled?|schedules?|tasks?)\b/.test(text)) {
      return call(id, 'list_jobs', {});
    }

    // ---- webhooks (strong signal: handle before scheduling) ----
    const webhook = userText.match(/\bwebhook\b(?:\s+(?:named|called))?\s+["']?([\w\-]+)["']?[\s:,]*\s*(?:to\s+)?(.+)$/is);
    if (webhook && webhook[2] && webhook[2].trim().length > 1) {
      return call(id, 'register_webhook', { name: webhook[1].trim(), task: webhook[2].trim() });
    }
    if (/\bwebhook/.test(text)) {
      return reply(
        'I can register webhooks: `register webhook "deploy" to summarize the release notes`. ' +
          'Once registered, POST to /webhooks/deploy to trigger the task. You can also POST /webhooks/:name ' +
          'with {"task": "..."} to run any task ad hoc.'
      );
    }

    // ---- scheduling ----
    const schedule = parseSchedule(userText);
    const looksLikeSchedule =
      schedule != null ||
      /\b(schedule|remind me|set up a job|create a job|cron)\b/.test(text);
    if (looksLikeSchedule) {
      const spec = schedule ?? { everyMs: 60_000, label: 'every 1 minute (default)' };
      return call(id, 'schedule_job', {
        name: extractTask(userText).slice(0, 60) || 'scheduled task',
        task: extractTask(userText),
        ...(spec.everyMs ? { everyMs: spec.everyMs } : {}),
        ...(spec.runAtMs ? { runAtMs: spec.runAtMs } : {}),
      });
    }

    // ---- notifications ----
    if (/\b(notify|notification|alert|tell me when)\b/.test(text)) {
      const body = userText.replace(/^.*?\b(notify me(?: that)?|notify|alert me(?: that)?|alert)\b/i, '').trim();
      return call(id, 'send_notification', {
        title: 'Notification from HIT-ME-UP agent',
        body: body || userText,
      });
    }

    // ---- http fetch ----
    const url = userText.match(/https?:\/\/\S+/);
    if (url && /\b(get|fetch|request|call|check|hit|open|load)\b/.test(text)) {
      return call(id, 'http_request', { method: 'GET', url: url[0] });
    }

    return reply(
      `I'm not sure how to do that yet (offline brain). I can schedule jobs, remember/recall facts, ` +
        `list or cancel jobs, send notifications, fetch URLs, register webhooks, and tell the time. ` +
        `Type "help" for examples, or set OPENAI_API_KEY to plug in a full LLM.`
    );
  }
}
