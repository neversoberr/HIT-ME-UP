import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface Fact {
  id: string;
  text: string;
  tags: string[];
  createdAt: string;
}

/**
 * Long-term memory: a persisted list of facts with keyword recall.
 * Conversation history is kept separately per session by the Agent.
 */
export class Memory {
  private facts: Fact[] = [];

  constructor(private readonly filePath: string) {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.facts = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Fact[];
      }
    } catch {
      /* start fresh on corrupt file */
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.facts, null, 2));
  }

  remember(text: string, tags: string[] = []): Fact {
    const fact: Fact = {
      id: crypto.randomUUID().slice(0, 8),
      text,
      tags,
      createdAt: new Date().toISOString(),
    };
    this.facts.push(fact);
    this.save();
    return fact;
  }

  /** Keyword-scored recall. Empty query returns everything. */
  recall(query: string): Fact[] {
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 1);
    if (terms.length === 0) return [...this.facts];
    return this.facts
      .map((f) => {
        const hay = `${f.text} ${f.tags.join(' ')}`.toLowerCase();
        const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
        return { f, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.f);
  }

  all(): Fact[] {
    return [...this.facts];
  }

  clear(): void {
    this.facts = [];
    this.save();
  }
}
