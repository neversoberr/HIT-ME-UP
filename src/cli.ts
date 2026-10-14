import * as readline from 'node:readline';
import type { Agent } from './agent/agent';
import type { Scheduler } from './automation/scheduler';
import type { Notifications } from './automation/notifications';
import type { Memory } from './agent/memory';

export interface CliDeps {
  agent: Agent;
  scheduler: Scheduler;
  notifications: Notifications;
  memory: Memory;
  llmMode: string;
}

const HELP = `Commands:
  /help              show this help
  /jobs              list scheduled jobs
  /notifications     recent notifications
  /memory            show all remembered facts
  /exit              quit (also Ctrl+C)
Anything else is sent to the agent.`;

export async function startCli(deps: CliDeps): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'you> ' });
  let closed = false;

  console.log(`HIT-ME-UP agent CLI (${deps.llmMode}). Type /help for commands.\n`);
  rl.prompt();

  async function handle(line: string): Promise<void> {
    if (!line) return;
    if (line === '/exit' || line === '/quit') {
      closed = true;
      rl.close();
      return;
    }
    if (line === '/help') {
      console.log(HELP + '\n');
      return;
    }
    if (line === '/jobs') {
      const jobs = deps.scheduler.list();
      if (jobs.length === 0) console.log('(no jobs)');
      for (const j of jobs) {
        const when = j.everyMs
          ? `every ${Math.round(j.everyMs / 1000)}s`
          : `once at ${j.runAtMs ? new Date(j.runAtMs).toISOString() : 'unspecified'}`;
        console.log(`  [${j.id}] ${j.name} — ${when} — runs: ${j.runs}${j.enabled ? '' : ' (disabled)'}\n    task: ${j.task}`);
      }
      console.log('');
      return;
    }
    if (line === '/notifications') {
      const items = deps.notifications.list(10);
      if (items.length === 0) console.log('(no notifications)');
      for (const n of items) console.log(`  [${n.createdAt}] (${n.source}) ${n.title}: ${n.body}`);
      console.log('');
      return;
    }
    if (line === '/memory') {
      const facts = deps.memory.all();
      if (facts.length === 0) console.log('(memory is empty)');
      for (const f of facts) console.log(`  [${f.id}] ${f.text}`);
      console.log('');
      return;
    }

    try {
      const reply = await deps.agent.chat('cli', line);
      console.log(`agent> ${reply}\n`);
    } catch (err) {
      console.log(`agent> error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  // Sequential queue: works for both human typing and piped input.
  let queue: Promise<void> = Promise.resolve();
  rl.on('line', (line) => {
    queue = queue
      .then(() => handle(line.trim()))
      .then(() => {
        if (!closed) rl.prompt();
      });
  });

  // Resolve only when the user exits, so the caller keeps the scheduler alive.
  await new Promise<void>((resolve) => {
    rl.on('close', () => {
      closed = true;
      void queue.then(resolve);
    });
  });
}
