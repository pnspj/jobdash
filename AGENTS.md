# AGENTS.md

JobDash: a local-only, single-user web app for managing job applications. npm workspaces monorepo.

- `packages/shared`: zod schemas (the single source of types and validation), pure logic, sample data
- `backend`: Hono API on DynamoDB Local (`routes/` → `services/` → `repositories/`)
- `frontend`: Next.js App Router, TanStack Query, Tailwind CSS (`features/<feature>/`)
  - `frontend/AGENTS.md` is written by `next dev` (Next.js docs pointer); commit it as is, including updates after upgrading Next.js

Specs and agreed decisions: [docs/design.md](docs/design.md). Setup: [README.md](README.md).

## Commands (run at the repository root)

```bash
docker compose up -d   # DynamoDB Local, needed by backend tests
npm test
npm run typecheck
npm run lint           # npm run format to fix
npm run sample:check   # after changing the sample generator
```

## Rules

- UI text and docs are in Japanese (use 「企業」, not 「会社」); code comments and commit messages are in English.
- Never use real company names or their URLs (code, tests, docs, samples). See design.md 2.1.
- Define types in `packages/shared` and reuse them; do not duplicate them in backend/frontend.
- Updates use PATCH with `version` (optimistic locking, 409 on mismatch).
- Edit `packages/shared/scripts/generate-sample-data.ts`, then run `npm run sample:generate -w @jobdash/shared`; do not edit the sample JSON by hand.
- When stored data changes shape, keep old data and backups readable (migrate on read or via `backend/scripts/`).
- Update `docs/design.md` when specs change.
