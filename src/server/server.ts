import * as http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Agent } from '../agent/agent';
import type { Scheduler, Job } from '../automation/scheduler';
import type { Notifications } from '../automation/notifications';
import type { WebhookStore } from '../automation/webhooks';

export interface ServerDeps {
  agent: Agent;
  scheduler: Scheduler;
  notifications: Notifications;
  webhooks: WebhookStore;
  llmMode: string;
  port: number;
  host: string;
}

const MAX_BODY = 1024 * 1024; // 1 MB

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(body);
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function indexPage(llmMode: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>HIT-ME-UP Agent</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  .badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.75rem; background: #2563eb; color: #fff; }
  #log { border: 1px solid #8884; border-radius: 8px; padding: 0.75rem; height: 320px; overflow-y: auto; white-space: pre-wrap; font-size: 0.9rem; }
  .me { color: #2563eb; } .agent { color: #16a34a; }
  form { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
  input { flex: 1; padding: 0.55rem; border-radius: 6px; border: 1px solid #8886; font-size: 0.95rem; }
  button { padding: 0.55rem 1rem; border-radius: 6px; border: none; background: #2563eb; color: #fff; cursor: pointer; }
  code { background: #8882; padding: 0.1rem 0.35rem; border-radius: 4px; }
  ul { line-height: 1.7; }
</style>
</head>
<body>
  <h1>HIT-ME-UP Agent <span class="badge">${llmMode}</span></h1>
  <p>Automation agent with chat + tools: scheduling, webhooks, notifications, memory.</p>
  <div id="log"></div>
  <form id="f">
    <input id="m" placeholder='Try: "schedule a job every 30 seconds to say hi"' autocomplete="off" />
    <button>Send</button>
  </form>
  <h2 style="font-size:1rem">HTTP API</h2>
  <ul>
    <li><code>POST /chat</code> — <code>{"message": "...", "sessionId": "optional"}</code></li>
    <li><code>GET /jobs</code> · <code>POST /jobs</code> · <code>DELETE /jobs/:id</code></li>
    <li><code>GET /notifications</code></li>
    <li><code>POST /webhooks/:name</code> — trigger a registered webhook</li>
    <li><code>POST /webhooks</code> — <code>{"name": "...", "task": "..."}</code></li>
    <li><code>GET /health</code></li>
  </ul>
<script>
  const log = document.getElementById('log');
  const add = (who, text) => {
    const d = document.createElement('div');
    d.className = who;
    d.textContent = who + ': ' + text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  };
  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('m');
    const message = input.value.trim();
    if (!message) return;
    add('you', message);
    input.value = '';
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, sessionId: 'web' }),
      });
      const data = await res.json();
      add('agent', data.reply || data.error || JSON.stringify(data));
    } catch (err) { add('agent', 'error: ' + err); }
  });
</script>
</body>
</html>`;
}

export function createServer(deps: ServerDeps): http.Server {
  const { agent, scheduler, notifications, webhooks } = deps;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const method = req.method ?? 'GET';

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      res.end();
      return;
    }

    try {
      // ---------- meta ----------
      if (method === 'GET' && url.pathname === '/') return sendHtml(res, indexPage(deps.llmMode));
      if (method === 'GET' && url.pathname === '/health') {
        return send(res, 200, { ok: true, llm: deps.llmMode, jobs: scheduler.list().length, uptime: process.uptime() });
      }

      // ---------- chat ----------
      if (method === 'POST' && url.pathname === '/chat') {
        const raw = await readBody(req);
        let body: { message?: string; sessionId?: string } = {};
        try {
          body = JSON.parse(raw || '{}') as typeof body;
        } catch {
          return send(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        const message = (body.message ?? '').trim();
        if (!message) return send(res, 400, { ok: false, error: 'Field "message" is required' });
        const sessionId = body.sessionId?.trim() || 'default';
        const reply = await agent.chat(sessionId, message);
        return send(res, 200, { ok: true, sessionId, reply });
      }

      // ---------- jobs ----------
      if (method === 'GET' && url.pathname === '/jobs') {
        return send(res, 200, { ok: true, jobs: scheduler.list() });
      }
      if (method === 'POST' && url.pathname === '/jobs') {
        const raw = await readBody(req);
        let body: Partial<Job> & { everyMs?: number; runAtMs?: number; maxRuns?: number } = {};
        try {
          body = JSON.parse(raw || '{}') as typeof body;
        } catch {
          return send(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        const name = (body.name ?? '').trim();
        const task = (body.task ?? '').trim();
        if (!name || !task) return send(res, 400, { ok: false, error: 'Fields "name" and "task" are required' });
        const job = scheduler.add({
          name,
          task,
          everyMs: body.everyMs,
          runAtMs: body.runAtMs ?? (body.everyMs ? undefined : Date.now() + 60_000),
          maxRuns: body.maxRuns,
        });
        return send(res, 201, { ok: true, job });
      }
      const jobMatch = url.pathname.match(/^\/jobs\/([\w\-]+)$/);
      if (method === 'DELETE' && jobMatch) {
        return scheduler.cancel(jobMatch[1])
          ? send(res, 200, { ok: true, cancelled: jobMatch[1] })
          : send(res, 404, { ok: false, error: `No job ${jobMatch[1]}` });
      }

      // ---------- notifications ----------
      if (method === 'GET' && url.pathname === '/notifications') {
        return send(res, 200, { ok: true, notifications: notifications.list() });
      }

      // ---------- webhooks ----------
      if (method === 'POST' && url.pathname === '/webhooks') {
        const raw = await readBody(req);
        let body: { name?: string; task?: string } = {};
        try {
          body = JSON.parse(raw || '{}') as typeof body;
        } catch {
          return send(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        const name = (body.name ?? '').trim().toLowerCase();
        const task = (body.task ?? '').trim();
        if (!/^[\w\-]{1,64}$/.test(name) || !task) {
          return send(res, 400, { ok: false, error: 'Fields "name" (URL-safe) and "task" are required' });
        }
        return send(res, 201, { ok: true, webhook: webhooks.register(name, task) });
      }
      const hookMatch = url.pathname.match(/^\/webhooks\/([\w\-]+)$/);
      if (method === 'POST' && hookMatch) {
        const name = hookMatch[1].toLowerCase();
        const raw = await readBody(req);
        let body: { task?: string; wait?: boolean } = {};
        try {
          body = JSON.parse(raw || '{}') as typeof body;
        } catch {
          /* empty body is fine */
        }
        const def = webhooks.get(name);
        const task = body.task?.trim() || def?.task;
        if (!task) {
          return send(res, 404, {
            ok: false,
            error: `Webhook "${name}" is not registered. Register with POST /webhooks {name, task}, or pass {"task": "..."} in the body.`,
          });
        }
        // Bracketed marker is stripped by the offline brain and read as context by real LLMs.
    const payload = `[webhook "${name}"] ${task}`;
        if (body.wait) {
          const result = await agent.runTask(payload);
          notifications.push(`Webhook "${name}" completed`, result, `webhook:${name}`);
          return send(res, 200, { ok: true, webhook: name, result });
        }
        void agent
          .runTask(payload)
          .then((result) => notifications.push(`Webhook "${name}" completed`, result, `webhook:${name}`))
          .catch((err) => notifications.push(`Webhook "${name}" failed`, String(err), `webhook:${name}`));
        return send(res, 202, { ok: true, webhook: name, accepted: true, hint: 'Set {"wait": true} to run synchronously.' });
      }

      return send(res, 404, { ok: false, error: `No route: ${method} ${url.pathname}` });
    } catch (err) {
      return send(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}
