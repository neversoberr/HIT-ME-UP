import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface Job {
  id: string;
  name: string;
  /** Natural-language task the agent runs when the job fires. */
  task: string;
  /** Recurring interval in ms (mutually exclusive with runAtMs for scheduling mode). */
  everyMs?: number;
  /** One-off: epoch ms timestamp to run at. */
  runAtMs?: number;
  maxRuns?: number;
  runs: number;
  createdAt: string;
  lastRunAt?: string;
  enabled: boolean;
}

export interface JobInput {
  name: string;
  task: string;
  everyMs?: number;
  runAtMs?: number;
  maxRuns?: number;
}

export type JobHandler = (job: Job) => Promise<void>;

/**
 * Lightweight in-process job scheduler, persisted to JSON.
 *  - recurring: first run at createdAt + everyMs, then every everyMs
 *  - one-off:   runs once at runAtMs, then disables itself
 * Overlapping runs of the same job are skipped.
 */
export class Scheduler {
  private jobs: Job[] = [];
  private running = new Set<string>();
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly filePath: string,
    private readonly onDue: JobHandler
  ) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.jobs = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Job[];
      }
    } catch {
      /* start fresh on corrupt file */
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.jobs, null, 2));
  }

  start(tickMs = 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), tickMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  add(input: JobInput): Job {
    const job: Job = {
      id: crypto.randomUUID().slice(0, 8),
      name: input.name,
      task: input.task,
      everyMs: input.everyMs,
      runAtMs: input.runAtMs,
      maxRuns: input.maxRuns,
      runs: 0,
      createdAt: new Date().toISOString(),
      enabled: true,
    };
    this.jobs.push(job);
    this.save();
    return job;
  }

  list(): Job[] {
    return this.jobs.map((j) => ({ ...j }));
  }

  get(id: string): Job | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  cancel(id: string): boolean {
    const idx = this.jobs.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    this.jobs.splice(idx, 1);
    this.save();
    return true;
  }

  /** True when the job is due at `now`. */
  private isDue(job: Job, now: number): boolean {
    if (!job.enabled) return false;
    if (job.maxRuns != null && job.runs >= job.maxRuns) return false;
    if (job.runAtMs != null && job.everyMs == null) {
      return job.runAtMs <= now;
    }
    const interval = job.everyMs ?? 60_000;
    const base = job.lastRunAt ? Date.parse(job.lastRunAt) : Date.parse(job.createdAt);
    return base + interval <= now;
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const job of this.jobs) {
      if (this.running.has(job.id)) continue;
      if (!this.isDue(job, now)) {
        if (job.maxRuns != null && job.runs >= job.maxRuns && job.enabled) {
          job.enabled = false;
          this.save();
        }
        continue;
      }
      this.running.add(job.id);
      try {
        await this.onDue(job);
        job.runs += 1;
        job.lastRunAt = new Date().toISOString();
        if (job.runAtMs != null && job.everyMs == null) job.enabled = false;
        if (job.maxRuns != null && job.runs >= job.maxRuns) job.enabled = false;
        this.save();
      } catch (err) {
        console.error(`[scheduler] job ${job.id} (${job.name}) failed:`, err);
      } finally {
        this.running.delete(job.id);
      }
    }
  }
}
