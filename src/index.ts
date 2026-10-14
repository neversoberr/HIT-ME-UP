import * as path from 'node:path';
import { loadConfig } from './config';
import { createLLM } from './llm';
import { createRegistry } from './tools/builtins';
import type { ToolContext } from './tools/types';
import { Memory } from './agent/memory';
import { Agent } from './agent/agent';
import { Scheduler } from './automation/scheduler';
import { Notifications } from './automation/notifications';
import { WebhookStore } from './automation/webhooks';
import { createServer } from './server/server';
import { startCli } from './cli';

function buildWorld() {
  const config = loadConfig();
  const dataDir = config.dataDir;

  const memory = new Memory(path.join(dataDir, 'memory.json'));
  const notifications = new Notifications(path.join(dataDir, 'notifications.json'), config.notificationWebhookUrl);
  const webhooks = new WebhookStore(path.join(dataDir, 'webhooks.json'));

  const registry = createRegistry();
  const llm = createLLM(config.llm);
  const llmMode = config.llm.apiKey ? `llm: ${config.llm.model}` : 'llm: offline mock (set OPENAI_API_KEY for a real model)';

  // Mutable tool context: the scheduler is wired in after the agent exists,
  // breaking the agent <-> scheduler construction cycle.
  const ctx: ToolContext = { memory, scheduler: undefined as unknown as Scheduler, notifications, webhooks };
  const agent = new Agent({ llm, registry, ctx });

  const scheduler = new Scheduler(path.join(dataDir, 'jobs.json'), async (job) => {
    const result = await agent.runTask(job.task);
    notifications.push(`Scheduled job "${job.name}"`, result, `job:${job.id}`);
    console.log(`[scheduler] job ${job.id} (${job.name}) ran: ${result.slice(0, 200)}`);
  });
  ctx.scheduler = scheduler;

  return { config, memory, notifications, webhooks, registry, llm, llmMode, agent, scheduler };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const world = buildWorld();
  const { config, agent, scheduler, notifications, memory, webhooks, llmMode } = world;

  if (args.includes('--once')) {
    const idx = args.indexOf('--once');
    const message = args.slice(idx + 1).join(' ').trim() || 'help';
    scheduler.stop();
    const reply = await agent.chat('once', message);
    console.log(reply);
    return;
  }

  if (args.includes('--cli')) {
    scheduler.start();
    await startCli({ agent, scheduler, notifications, memory, llmMode });
    scheduler.stop();
    return;
  }

  // default: HTTP server
  scheduler.start();
  const server = createServer({ agent, scheduler, notifications, webhooks, llmMode, port: config.port, host: config.host });
  server.listen(config.port, config.host, () => {
    console.log(`HIT-ME-UP agent listening on http://${config.host}:${config.port}`);
    console.log(`  mode: ${llmMode}`);
    console.log(`  data: ${config.dataDir}`);
    console.log(`  endpoints: / (chat UI), /chat, /jobs, /notifications, /webhooks/:name, /health`);
  });

  const shutdown = () => {
    console.log('\nShutting down…');
    scheduler.stop();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
