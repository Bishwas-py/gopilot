---
name: init
description: Scaffold a new Go-first full-stack project with Huma/Chi backend, PostgreSQL, and SvelteKit or Next.js frontend. Use when starting a new project from scratch.
argument-hint: [project-name] [svelte|react]
---

# gopilot:init — Scaffold a Go-First Full-Stack Project

You are scaffolding a new Go-first project. The Go backend is the source of truth. The frontend consumes it via auto-generated typed SDK.

## Before Starting

1. Read `skills/_shared/go-patterns.md` for Go/Huma conventions
2. Determine frontend from argument: `svelte` (default) or `react`
3. If frontend is `svelte`, read `skills/_shared/svelte-patterns.md`
4. If frontend is `react`, read `skills/_shared/react-patterns.md`

## Arguments

Parse `$ARGUMENTS` as: `[project-name] [svelte|react]`
- If no project name: ask the user
- If no frontend specified: default to `svelte`

## Phase 1: Backend Scaffold

Create the Go backend structure:

```
backend/
├── cmd/server/
│   └── main.go              # Entry point, loads config, starts server
├── internal/
│   ├── api/
│   │   └── router.go        # Central router, wires all handlers
│   ├── config/
│   │   └── config.go        # Env-based config loader
│   └── database/
│       └── database.go       # pgx connection pool
├── Makefile                  # dev, build, test, lint, db-schema
├── schema.sql                # Declarative DB schema (pgschema-style)
├── go.mod
└── .air.toml                 # Hot reload config
```

### main.go Requirements
- Load config from environment
- Create pgx connection pool
- Create Huma API with Chi router
- Register OpenAPI docs at `GET /openapi.json`
- Start HTTP server

### router.go Requirements
- Accept `*pgxpool.Pool` and `huma.API`
- Register health check at `GET /api/v1/health`
- Central place for all future handler registration

### config.go Requirements
- Load from env vars: `DATABASE_URL`, `PORT`, `ENV`
- Sensible defaults for local development

### Makefile Targets
```makefile
dev:          # air hot-reload
build:        # go build -o bin/server ./cmd/server
test:         # go test ./...
lint:         # go vet ./...
db-schema:    # pgschema apply (or manual psql)
```

## Phase 2: Frontend Scaffold

### If SvelteKit:
```
frontend/
├── src/
│   ├── _sdk/                # Will be auto-generated (empty for now)
│   │   └── .gitkeep
│   ├── lib/
│   │   └── server/
│   │       └── go-client.ts # Typed fetch wrapper to Go backend
│   └── routes/
│       └── +page.svelte     # Landing page
├── scripts/
│   └── generate-sdk.ts      # SDK generation script (placeholder)
├── svelte.config.js          # Enable experimental remoteFunctions
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**svelte.config.js must enable:**
```js
experimental: { remoteFunctions: true }
```

### If Next.js:
```
frontend/
├── src/
│   ├── _sdk/                # Will be auto-generated (empty for now)
│   │   └── .gitkeep
│   ├── lib/
│   │   └── go-client.ts    # Typed fetch wrapper to Go backend
│   └── app/
│       ├── layout.tsx
│       └── page.tsx         # Landing page
├── scripts/
│   └── generate-sdk.ts      # SDK generation script (placeholder)
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Phase 3: Root Configuration

```
project-root/
├── docker-compose.yml        # PostgreSQL 16 on port 5731
├── pnpm-workspace.yaml       # Monorepo: [frontend]
├── package.json              # Root scripts: dev, generate-sdk, test
└── README.md
```

### Root package.json scripts:
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm run dev:backend\" \"pnpm run dev:frontend\"",
    "dev:backend": "cd backend && make dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "generate-sdk": "pnpm --filter frontend generate-sdk",
    "build": "pnpm --filter frontend build",
    "test": "cd backend && make test"
  }
}
```

## Phase 4: go-client.ts

This is the bridge between frontend and Go backend. Create a typed HTTP client:

```typescript
const BASE_URL = process.env.GO_API_URL ?? 'http://localhost:8080';

type RequestOptions = {
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
};

export const goApi = {
  async get<T>(path: string, opts?: RequestOptions): Promise<T> { ... },
  async post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> { ... },
  async put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> { ... },
  async patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> { ... },
  async del<T>(path: string, opts?: RequestOptions): Promise<T> { ... },
};
```

## Phase 5: Verify

After scaffolding:
1. Run `cd backend && go mod tidy`
2. Run `cd frontend && pnpm install`
3. Run `docker compose up -d` (start PostgreSQL)
4. Run `pnpm dev` — both servers should start
5. Verify `http://localhost:8080/openapi.json` returns spec
6. Tell the user: "Project scaffolded. Add domains with `/gopilot:domain`, add endpoints with `/gopilot:api`, generate SDK with `/gopilot:sdk`."

## What NOT to Do
- Do NOT add authentication yet — that's a separate domain
- Do NOT create example CRUD — let the user decide their domains
- Do NOT install frontend UI libraries — keep it minimal
- Do NOT add CI/CD — that's project-specific
