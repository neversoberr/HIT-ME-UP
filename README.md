# HIT-ME-UP Agent

An automation agent in **TypeScript / Node.js** — chat with tools, scheduled jobs, webhooks, notifications, and long-term memory. Zero runtime dependencies; runs fully offline with a built-in rule-based brain, or plug in any OpenAI-compatible LLM for full tool-calling intelligence.

## Quick start

```bash
npm install
npm run build

# HTTP server (chat UI at /)
npm run server          # http://localhost:3000

# Interactive CLI chat
npm run cli

# One-shot message
npm run once -- "schedule a job every 30 seconds to say hi"
```

## What it can do

| Capability | How |
|---|---|
| **Chat + tool use** | Agent loop that calls tools and summarizes results |
| **Scheduling** | Recurring (`everyMs`) or one-off (`runAtMs`) jobs; the agent *runs the task itself* when due |
| **Webhooks** | `POST /webhooks/:name` triggers an agent task (register with the agent or via API) |
| **Notifications** | Persistent notification log; optional webhook delivery (`WEBHOOK_URL`) |
| **Memory** | `remember` / `recall` facts across sessions, keyword-scored |
| **HTTP tool** | The agent can fetch/call external URLs as part of a task |

### Built-in tools

`get_current_time`, `remember`, `recall`, `schedule_job`, `list_jobs`, `cancel_job`, `send_notification`, `http_request`, `register_webhook`

## Configuration (env vars)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | *(unset)* | If set, uses a real LLM; otherwise the offline mock brain |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint (Ollama, vLLM, …) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address |
| `DATA_DIR` | `./data` | Where jobs/memory/notifications/webhooks persist (JSON files) |
| `WEBHOOK_URL` | *(unset)* | If set, every notification is POSTed as JSON here |

Example with a real model:

```bash
OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o npm run server
```

## HTTP API

| Method & path | Description |
|---|---|
| `GET /` | Tiny chat UI + endpoint reference |
| `GET /health` | Liveness, mode, job count |
| `POST /chat` | `{"message": "...", "sessionId": "optional"}` → `{"reply": "..."}` |
| `GET /jobs` | List scheduled jobs |
| `POST /jobs` | `{"name", "task", "everyMs"?, "runAtMs"?, "maxRuns"?}` |
| `DELETE /jobs/:id` | Cancel a job |
| `GET /notifications` | Recent notifications |
| `POST /webhooks` | `{"name", "task"}` — register a named webhook |
| `POST /webhooks/:name` | Trigger it. `{"task": "..."}` runs ad hoc; `{"wait": true}` runs synchronously (default: 202 async) |

```bash
curl -s localhost:3000/chat -H 'content-type: application/json' \
  -d '{"message":"remember that the deploy window is Fridays at 6pm"}'

curl -s localhost:3000/chat -H 'content-type: application/json' \
  -d '{"message":"schedule a job every 30 seconds to notify me that the site is up"}'

curl -s localhost:3000/jobs
curl -s localhost:3000/webhooks/deploy -H 'content-type: application/json' \
  -d '{"task":"notify me that the deploy finished","wait":true}'
```

## CLI

```
you> help                     # via the agent
you> /help                    # slash commands: /jobs /notifications /memory /exit
you> schedule a job every 2 minutes to check in
```

## Architecture

```
src/
├── index.ts               entry point (server | cli | --once) + wiring
├── config.ts              env-based configuration
├── llm/
│   ├── types.ts           ChatMessage, ToolCall, ToolSpec, LLMClient
│   ├── openai.ts          OpenAI-compatible chat-completions client (fetch)
│   ├── mock.ts            offline rule-based brain (same tool-calling protocol)
│   └── index.ts           factory: real LLM if OPENAI_API_KEY, else mock
├── agent/
│   ├── agent.ts           tool-calling loop + per-session conversation memory
│   ├── systemPrompt.ts    persona + tool descriptions
│   └── memory.ts          long-term facts (persisted, keyword recall)
├── tools/
│   ├── types.ts           Tool interface + ok/fail result envelope
│   ├── registry.ts        tool registry → OpenAI tool specs, safe execution
│   └── builtins.ts        the 9 built-in tools
├── automation/
│   ├── scheduler.ts       recurring / one-off jobs (persisted, overlap-safe)
│   ├── notifications.ts   notification log + optional webhook delivery
│   └── webhooks.ts        named webhook → task registry
├── server/server.ts       node:http API + embedded chat UI
├── cli.ts                 readline chat CLI
└── test/agent.test.ts     node:test suite
```

**The agent loop:** user message → LLM (with tool specs) → tool calls execute → results fed back → … → final answer. Both brains (real LLM and offline mock) implement the same `LLMClient` interface, so everything above the LLM is identical in both modes.

**Automation:** when a job fires (or a webhook hits), `agent.runTask(task)` runs the same loop in a one-shot session, and the result is pushed as a notification.

## Tests

```bash
npm test        # tsc + node --test
```

## Ideas to grow it

- Swap the JSON-file stores for SQLite/Postgres
- Real cron expressions (add `cron-parser`)
- Delivery channels: Slack, email, SMS via the notification webhook
- RAG over documents with an embeddings-backed recall tool
- Human-in-the-loop approvals for risky tools (e.g. `http_request` POSTs)
