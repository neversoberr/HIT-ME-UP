import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface Notification {
  id: string;
  title: string;
  body: string;
  source: string;
  createdAt: string;
  delivered: boolean;
}

/**
 * Notification log with optional webhook delivery (fire-and-forget).
 * Set WEBHOOK_URL to have every notification POSTed as JSON to that URL.
 */
export class Notifications {
  private items: Notification[] = [];

  constructor(
    private readonly filePath: string,
    private readonly webhookUrl?: string,
    private readonly maxItems = 500
  ) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.items = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Notification[];
      }
    } catch {
      /* start fresh on corrupt file */
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.items.slice(-this.maxItems), null, 2));
  }

  push(title: string, body: string, source = 'agent'): Notification {
    const n: Notification = {
      id: crypto.randomUUID().slice(0, 8),
      title,
      body,
      source,
      createdAt: new Date().toISOString(),
      delivered: false,
    };
    this.items.push(n);
    this.save();
    if (this.webhookUrl) void this.deliver(n);
    return n;
  }

  private async deliver(n: Notification): Promise<void> {
    try {
      const res = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(n),
      });
      n.delivered = res.ok;
      this.save();
    } catch (err) {
      console.error('[notifications] webhook delivery failed:', err instanceof Error ? err.message : err);
    }
  }

  list(limit = 50): Notification[] {
    return this.items.slice(-limit).reverse();
  }
}
