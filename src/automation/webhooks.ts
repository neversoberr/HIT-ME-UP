import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WebhookDef {
  name: string;
  /** Natural-language task the agent runs when this webhook fires. */
  task: string;
  createdAt: string;
}

/**
 * Named webhooks: POST /webhooks/<name> triggers the agent to run `task`.
 * Persisted to a JSON file so registrations survive restarts.
 */
export class WebhookStore {
  private hooks = new Map<string, WebhookDef>();

  constructor(private readonly filePath: string) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as WebhookDef[];
        for (const h of raw) this.hooks.set(h.name, h);
      }
    } catch {
      /* start fresh on corrupt file */
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify([...this.hooks.values()], null, 2));
  }

  register(name: string, task: string): WebhookDef {
    const def: WebhookDef = { name, task, createdAt: new Date().toISOString() };
    this.hooks.set(name, def);
    this.save();
    return def;
  }

  get(name: string): WebhookDef | undefined {
    return this.hooks.get(name.toLowerCase());
  }

  list(): WebhookDef[] {
    return [...this.hooks.values()];
  }

  remove(name: string): boolean {
    const deleted = this.hooks.delete(name.toLowerCase());
    if (deleted) this.save();
    return deleted;
  }
}
