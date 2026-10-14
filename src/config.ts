import * as path from 'node:path';

export interface Config {
  port: number;
  host: string;
  dataDir: string;
  llm: {
    apiKey?: string;
    baseUrl: string;
    model: string;
  };
  notificationWebhookUrl?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '0.0.0.0',
    dataDir: env.DATA_DIR ?? path.join(process.cwd(), 'data'),
    llm: {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
    },
    notificationWebhookUrl: env.WEBHOOK_URL,
  };
}
