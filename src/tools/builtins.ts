import type { Tool, ToolContext } from './types';
import { ok, fail } from './types';
import { ToolRegistry } from './registry';

function str(args: Record<string, unknown>, key: string, fallback = ''): string {
  const v = args[key];
  return typeof v === 'string' ? v : fallback;
}

function num(args: Record<string, unknown>, key: string): number | undefined {
  const v = args[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

const currentTime: Tool = {
  name: 'get_current_time',
  description: 'Get the current date and time (ISO 8601, local timezone).',
  parameters: { type: 'object', properties: {}, required: [] },
  execute() {
    const now = new Date();
    return ok(`It is now ${now.toISOString()} (local: ${now.toString()}).`, {
      iso: now.toISOString(),
      local: now.toString(),
      epochMs: now.getTime(),
    });
  },
};

const remember: Tool = {
  name: 'remember',
  description: 'Store a fact, preference, or note in long-term memory for later recall.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The fact or note to remember.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for grouping.' },
    },
    required: ['text'],
  },
  execute(args, ctx: ToolContext) {
    const text = str(args, 'text').trim();
    if (!text) return fail('Nothing to remember: "text" is empty.');
    const tags = Array.isArray(args.tags) ? (args.tags as unknown[]).filter((t): t is string => typeof t === 'string') : [];
    const fact = ctx.memory.remember(text, tags);
    return ok(`Remembered: "${text}"`, { factId: fact.id });
  },
};

const recall: Tool = {
  name: 'recall',
  description: 'Search long-term memory. Returns facts matching the query (or all facts if the query is empty).',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Keywords to search for. Empty returns everything.' },
    },
    required: ['query'],
  },
  execute(args, ctx: ToolContext) {
    const query = str(args, 'query');
    const facts = ctx.memory.recall(query);
    if (facts.length === 0) {
      return ok(query ? `Nothing in memory matches "${query}".` : 'Memory is empty.', { facts: [] });
    }
    return ok(`Found ${facts.length} matching fact(s).`, {
      facts: facts.map((f) => ({ id: f.id, text: f.text, tags: f.tags, createdAt: f.createdAt })),
    });
  },
};

const scheduleJob: Tool = {
  name: 'schedule_job',
  description:
    'Schedule a recurring job (everyMs) or a one-off job (runAtMs). When due, the agent runs `task` and sends a notification with the result.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Short human name for the job.' },
      task: { type: 'string', description: 'Natural-language task the agent performs when the job fires.' },
      everyMs: { type: 'number', description: 'Repeat interval in milliseconds (recurring job).' },
      runAtMs: { type: 'number', description: 'Epoch ms timestamp to run once (one-off job).' },
      maxRuns: { type: 'number', description: 'Stop after this many runs (recurring jobs).' },
    },
    required: ['name', 'task'],
  },
  execute(args, ctx: ToolContext) {
    const name = str(args, 'name').trim();
    const task = str(args, 'task').trim();
    if (!name || !task) return fail('Both "name" and "task" are required.');
    const everyMs = num(args, 'everyMs');
    const runAtMs = num(args, 'runAtMs');
    const maxRuns = num(args, 'maxRuns');
    if (everyMs == null && runAtMs == null) {
      return fail('Provide everyMs (recurring) or runAtMs (one-off).');
    }
    if (everyMs != null && everyMs < 1000) return fail('everyMs must be at least 1000 (1 second).');
    const job = ctx.scheduler.add({
      name,
      task,
      everyMs,
      runAtMs,
      maxRuns,
    });
    const when = job.everyMs
      ? `every ${Math.round(job.everyMs / 1000)}s`
      : `once at ${new Date(job.runAtMs ?? 0).toISOString()}`;
    return ok(`Scheduled job "${job.name}" (${job.id}) to run ${when}.`, { job });
  },
};

const listJobs: Tool = {
  name: 'list_jobs',
  description: 'List all scheduled jobs with their schedule, run counts, and status.',
  parameters: { type: 'object', properties: {}, required: [] },
  execute(_args, ctx: ToolContext) {
    const jobs = ctx.scheduler.list();
    if (jobs.length === 0) return ok('No jobs scheduled.', { jobs: [] });
    return ok(`${jobs.length} job(s) scheduled.`, {
      jobs: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        task: j.task,
        schedule: j.everyMs
          ? `every ${Math.round(j.everyMs / 1000)}s`
          : `once at ${j.runAtMs ? new Date(j.runAtMs).toISOString() : 'unspecified'}`,
        runs: j.runs,
        enabled: j.enabled,
        lastRunAt: j.lastRunAt,
      })),
    });
  },
};

const cancelJob: Tool = {
  name: 'cancel_job',
  description: 'Cancel a scheduled job by its id or name.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Job id (preferred).' },
      name: { type: 'string', description: 'Job name (used if id is not given).' },
    },
    required: [],
  },
  execute(args, ctx: ToolContext) {
    const id = str(args, 'id').trim();
    const name = str(args, 'name').trim();
    if (id) {
      return ctx.scheduler.cancel(id)
        ? ok(`Cancelled job ${id}.`)
        : fail(`No job with id "${id}".`);
    }
    if (name) {
      const target = ctx.scheduler.list().find((j) => j.name.toLowerCase() === name.toLowerCase());
      if (!target) return fail(`No job named "${name}". Try list_jobs.`);
      return ctx.scheduler.cancel(target.id)
        ? ok(`Cancelled job "${target.name}" (${target.id}).`)
        : fail(`Could not cancel job "${name}".`);
    }
    return fail('Provide a job id or name to cancel.');
  },
};

const sendNotification: Tool = {
  name: 'send_notification',
  description: 'Send a notification (stored in the log and delivered to the configured webhook, if any).',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Notification title.' },
      body: { type: 'string', description: 'Notification body.' },
      source: { type: 'string', description: 'Where this notification came from (default: agent).' },
    },
    required: ['title', 'body'],
  },
  execute(args, ctx: ToolContext) {
    const title = str(args, 'title').trim() || 'Notification';
    const body = str(args, 'body').trim();
    if (!body) return fail('Notification "body" is required.');
    const n = ctx.notifications.push(title, body, str(args, 'source', 'agent'));
    return ok(`Notification sent: "${title}"`, { notificationId: n.id });
  },
};

const httpRequest: Tool = {
  name: 'http_request',
  description: 'Make an HTTP request (GET/POST/PUT/DELETE) to a URL and return status + truncated body.',
  parameters: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method (default GET).' },
      url: { type: 'string', description: 'Absolute http(s) URL.' },
      body: { type: 'string', description: 'Optional request body (sent as text, e.g. JSON).' },
      headers: { type: 'object', description: 'Optional headers as key/value pairs.' },
    },
    required: ['url'],
  },
  async execute(args) {
    const url = str(args, 'url').trim();
    if (!/^https?:\/\//i.test(url)) return fail('URL must start with http:// or https://');
    const method = (str(args, 'method', 'GET') || 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    const rawHeaders = args.headers;
    if (rawHeaders && typeof rawHeaders === 'object') {
      for (const [k, v] of Object.entries(rawHeaders as Record<string, unknown>)) {
        headers[k] = String(v);
      }
    }
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: method === 'GET' || method === 'DELETE' ? undefined : str(args, 'body'),
      });
      const text = (await res.text()).slice(0, 2000);
      return ok(`HTTP ${res.status} from ${url}`, { status: res.status, bodyPreview: text });
    } catch (err) {
      return fail(`Request to ${url} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const registerWebhook: Tool = {
  name: 'register_webhook',
  description: 'Register a named webhook: POST /webhooks/<name> will make the agent run the given task.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'URL-safe webhook name (letters, digits, dashes).' },
      task: { type: 'string', description: 'Natural-language task the agent runs when the webhook fires.' },
    },
    required: ['name', 'task'],
  },
  execute(args, ctx: ToolContext) {
    const name = str(args, 'name').trim().toLowerCase();
    const task = str(args, 'task').trim();
    if (!/^[\w\-]{1,64}$/.test(name)) return fail('Webhook name must be URL-safe: letters, digits, dashes (max 64).');
    if (!task) return fail('Webhook "task" is required.');
    ctx.webhooks.register(name, task);
    return ok(`Webhook "${name}" registered. POST to /webhooks/${name} to trigger: ${task}`, { name, task });
  },
};

export function createRegistry(): ToolRegistry {
  return new ToolRegistry()
    .register(currentTime)
    .register(remember)
    .register(recall)
    .register(scheduleJob)
    .register(listJobs)
    .register(cancelJob)
    .register(sendNotification)
    .register(httpRequest)
    .register(registerWebhook);
}
