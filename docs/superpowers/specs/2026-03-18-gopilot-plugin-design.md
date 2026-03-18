# gopilot Plugin Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Author:** Bishwas Bhandari

## Summary

gopilot is a Claude Code plugin for Go-first full-stack development. It scaffolds Go backends (Huma/Chi/pgx), generates typed frontend SDKs, and guides the backend-to-frontend flow for SvelteKit and Next.js.

## Architecture

### Approach: Hybrid (Skills + MCP Tools)

- **Skills** (markdown) guide workflow — what to do, in what order, with what conventions
- **MCP server** (TypeScript) handles deterministic operations — OpenAPI parsing, schema generation, remote function generation, project scaffolding
- **Hooks** notify when Go handlers change, prompting SDK regeneration
- **LSP** provides Go intelligence via gopls

### The Pipeline

```
Go Structs (Huma tags)
    ↓ automatic
OpenAPI 3.1 Spec (/openapi.json)
    ↓ gopilot-tools MCP
Typed Frontend SDK
    ├── Validation Schemas (Valibot for Svelte, Zod for React)
    ├── Remote Functions (.remote.ts for Svelte, .server.ts for React)
    └── Barrel exports + GUIDE.md
    ↓ framework-native
SvelteKit query()/command()/form() OR Next.js 'use server' functions
```

### Single Source of Truth

Go struct tags ARE the API contract. Everything downstream is derived. No duplication.

## Plugin Structure

```
gopilot/
├── .claude-plugin/plugin.json     # Identity: name, version, author
├── .mcp.json                      # Bundled MCP server config
├── .lsp.json                      # gopls for Go intelligence
├── settings.json                  # Default agent
├── skills/
│   ├── init/SKILL.md              # /gopilot:init — scaffold project
│   ├── api/SKILL.md               # /gopilot:api — add endpoints
│   ├── sdk/SKILL.md               # /gopilot:sdk — generate SDK
│   ├── domain/SKILL.md            # /gopilot:domain — add business domain
│   ├── schema/SKILL.md            # /gopilot:schema — manage DB schema
│   ├── ws/SKILL.md                # /gopilot:ws — WebSocket support
│   └── _shared/                   # Reference docs for skills
│       ├── go-patterns.md
│       ├── svelte-patterns.md
│       └── react-patterns.md
├── agents/sdk-generator.md        # Orchestrates SDK generation
├── hooks/hooks.json               # Post-edit notifications
├── servers/gopilot-tools/         # TypeScript MCP server
│   └── src/
│       ├── index.ts               # 4 tools: fetch_openapi, generate_schemas,
│       │                          #           generate_remotes, scaffold_project
│       └── tools/
│           ├── openapi.ts         # Spec fetching, parsing, utilities
│           ├── generate-sdk.ts    # Schema + remote generation (Valibot/Zod)
│           └── scaffold.ts        # Full project scaffolding
└── references/
    ├── architecture.md
    └── conventions.md
```

## Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `/gopilot:init` | Scaffold full Go+frontend project | Starting a new project |
| `/gopilot:domain` | Add business domain (types, repo, service) | Adding a feature area |
| `/gopilot:api` | Add REST endpoints with Huma | Adding HTTP handlers |
| `/gopilot:sdk` | Generate typed frontend SDK | After API changes |
| `/gopilot:schema` | Manage PostgreSQL schema | Adding tables/columns |
| `/gopilot:ws` | Add WebSocket support | Real-time features |

## MCP Tools

| Tool | Purpose |
|------|---------|
| `fetch_openapi` | Fetch OpenAPI spec from running backend, cache locally |
| `generate_schemas` | OpenAPI → Valibot (Svelte) or Zod (React) schemas |
| `generate_remotes` | OpenAPI → typed remote functions per tag |
| `scaffold_project` | Create full project structure with boilerplate |

## Frontend Framework Support

| Feature | SvelteKit | Next.js |
|---------|-----------|---------|
| Remote functions | Native `query()`/`command()`/`form()` | `'use server'` functions |
| Validation | Valibot (built into remote functions) | Zod (manual safeParse) |
| File convention | `.remote.ts` | `.server.ts` |
| SDK import | `$_sdk/remotes` | `@/_sdk/remotes` |
| Data loading | `await` in components | Server Components |

## Backend Stack

- Go 1.22+ with Huma/v2 (auto OpenAPI)
- Chi/v5 router
- pgx/v5 connection pooling
- Declarative schema.sql (no migrations)
- Domain-driven architecture: handler → service → repository

## Design Decisions

1. **Skills-first, tools-second**: Skills guide the developer through workflow; MCP tools handle repetitive generation
2. **Frontend-agnostic core**: Backend is identical regardless of frontend; only the SDK output adapter changes
3. **Declarative schema**: Single schema.sql file, not migration files — simpler for the target audience
4. **Native framework features**: Use SvelteKit remote functions and Next.js Server Functions natively, not custom wrappers
5. **Valibot for Svelte, Zod for React**: Follow each ecosystem's conventions

## Learned From

- **rentgara-services**: Backend-first Go architecture, SDK generation pipeline, domain-driven design, OpenAPI-as-source-of-truth
- **webmatrices-skills**: Plugin structure, SKILL.md format, _shared references, marketplace.json
- **mako-skills**: Layered references, phased procedures, guardrails, read-before-execute pattern
