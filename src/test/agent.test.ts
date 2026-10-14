import { test } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

import { MockLLM } from '../llm/mock';
import { createRegistry } from '../tools/builtins';
import { Memory } from '../agent/memory';
import { Scheduler } from '../automation/scheduler';
import { Notifications } from '../automation/notifications';
import { WebhookStore } from '../automation/webhooks';
import { Agent } from '../agent/agent';
import type { ToolContext } from '../tools/types';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hmu-test-'));
}

function makeAgent(): { agent: Agent; ctx: ToolContext; scheduler: Scheduler; ran: string[] } {
  const dir = tmpDir();
  const memory = new Memory(path.join(dir, 'memory.json'));
  const notifications = new Notifications(path.join(dir, 'notifications.json'));
  const webhooks = new WebhookStore(path.join(dir, 'webhooks.json'));
  const ran: string[] = [];
  const ctx: ToolContext = { memory, scheduler: undefined as unknown as Scheduler, notifications, webhooks };
  const agent = new Agent({ llm: new MockLLM(), registry: createRegistry(), ctx });
  const scheduler = new Scheduler(path.join(dir, 'jobs.json'), async (job) => {
    ran.push(job.task);
  });
  ctx.scheduler = scheduler;
  return { agent, ctx, scheduler, ran };
}

test('remember and recall round-trip', async () => {
  const { agent, ctx } = makeAgent();
  const saved = await agent.chat('t1', 'remember that the deploy window is Fridays at 6pm');
  assert.match(saved, /remembered/i);
  const facts = ctx.memory.all();
  assert.strictEqual(facts.length, 1);
  assert.match(facts[0].text, /deploy window/);

  const recalled = await agent.chat('t1', 'what do you remember');
  assert.match(recalled, /deploy window/);
});

test('schedule, list, and cancel a job', async () => {
  const { agent, scheduler } = makeAgent();
  const sched = await agent.chat('t2', 'schedule a job every 30 seconds to check the status page');
  assert.match(sched, /scheduled/i);

  const jobs = scheduler.list();
  assert.strictEqual(jobs.length, 1);
  assert.strictEqual(jobs[0].everyMs, 30_000);
  assert.match(jobs[0].task, /status page/);

  const listed = await agent.chat('t2', 'list jobs');
  assert.match(listed, /check the status page/);

  const cancelled = await agent.chat('t2', `cancel job ${jobs[0].name}`);
  assert.match(cancelled, /cancelled/i);
  assert.strictEqual(scheduler.list().length, 0);
});

test('one-off schedule via "in N minutes"', async () => {
  const { agent, scheduler } = makeAgent();
  await agent.chat('t3', 'remind me in 10 minutes to stretch');
  const jobs = scheduler.list();
  assert.strictEqual(jobs.length, 1);
  assert.ok(jobs[0].runAtMs && jobs[0].runAtMs > Date.now());
  assert.match(jobs[0].task, /stretch/);
});

test('send notification', async () => {
  const { agent, ctx } = makeAgent();
  const res = await agent.chat('t4', 'notify me that the build finished');
  assert.match(res, /notification sent/i);
  assert.strictEqual(ctx.notifications.list().length, 1);
  assert.match(ctx.notifications.list()[0].body, /build finished/);
});

test('register webhook', async () => {
  const { agent, ctx } = makeAgent();
  const res = await agent.chat('t5', 'register webhook deploy to summarize what shipped');
  assert.match(res, /deploy/);
  const def = ctx.webhooks.get('deploy');
  assert.ok(def);
  assert.match(def!.task, /summarize/);
});

test('runTask and scheduler tick', async () => {
  const { agent, scheduler, ran } = makeAgent();
  const out = await agent.runTask('say hello');
  assert.ok(out.length > 0);

  const job = scheduler.add({ name: 'tick', task: 'ping', everyMs: 1000 });
  // Force a first run by rewinding createdAt 2 seconds.
  const stored = scheduler.get(job.id)!;
  stored.createdAt = new Date(Date.now() - 2500).toISOString();
  // tick is private; simulate by calling the internal timer path once via start + wait
  scheduler.start(50);
  await new Promise((r) => setTimeout(r, 300));
  scheduler.stop();
  assert.ok(ran.includes('ping'), `expected scheduler to run task, ran=${JSON.stringify(ran)}`);
});

test('memory recall is keyword-scored', () => {
  const dir = tmpDir();
  const memory = new Memory(path.join(dir, 'memory.json'));
  memory.remember('the API key lives in vault/prod', ['secrets']);
  memory.remember('standup is at 9:30', ['calendar']);
  const hits = memory.recall('standup time');
  assert.strictEqual(hits.length, 1);
  assert.match(hits[0].text, /standup/);
});

test('stacked automation markers do not hijack intents (webhook trigger path)', async () => {
  const { agent, ctx } = makeAgent();
  // This is exactly what the server's webhook handler feeds runTask():
  // runTask wraps it again with [automated task].
  const result = await agent.runTask('[webhook "standup"] notify me that it is standup time');
  assert.match(result, /notification sent/i);
  assert.strictEqual(ctx.notifications.list().length, 1, 'expected a notification, not a webhook registration');
  assert.strictEqual(ctx.webhooks.get('standup'), undefined, 'should not have registered a webhook');
});
