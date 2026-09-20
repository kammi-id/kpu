# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## D1 migrations

STOP before writing a migration that rebuilds a table (`CREATE … _baru` → `INSERT SELECT` → `DROP TABLE` → `RENAME`).

In D1, `DROP TABLE` on the **parent** of an `ON DELETE CASCADE` foreign key silently empties every child table. D1 forces `PRAGMA foreign_keys = 1` and ignores `PRAGMA foreign_keys = OFF`; the `PRAGMA defer_foreign_keys = true` that D1's own migration docs suggest defers violation *checks*, not cascade *actions*, so it does not help.

Rebuilding a cascade parent therefore has to stash child rows in temporary tables and restore them after the rename, in the same migration.

`npm test` enforces this two ways, and CI runs it before every deploy: a static check that flags `DROP TABLE` on a cascade parent, and a replay that seeds an admin account with a password hash before each migration boundary and fails if the hash does not survive. The replay also catches `DROP TABLE "account"`, `DELETE FROM "user"`, and rebuilds that forget to copy `"password"`. See `docs/adr/0002-membangun-ulang-tabel-induk-di-d1.md`.

## Best Practices (conditional)

If the application uses Durable Objects or Workflows, refer to the relevant best practices:

- Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Workflows: https://developers.cloudflare.com/workflows/build/rules-of-workflows/

## Agent skills

### Issue tracker

Issues are tracked as local Markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The canonical labels are `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout. See `docs/agents/domain.md`.
