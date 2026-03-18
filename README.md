# gopilot

Go-first full-stack Claude Code plugin. Scaffolds Go backends, generates typed frontend SDKs, and guides backend-to-frontend development for SvelteKit and Next.js.

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Init | `/gopilot:init [name] [svelte\|react]` | Scaffold a full Go + frontend project |
| Domain | `/gopilot:domain [name]` | Add a business domain (types, repo, service) |
| API | `/gopilot:api [domain] [operation]` | Add REST endpoints with Huma |
| SDK | `/gopilot:sdk` | Generate typed frontend SDK from OpenAPI |
| Schema | `/gopilot:schema [action] [details]` | Manage PostgreSQL schema |
| WebSocket | `/gopilot:ws [feature]` | Add WebSocket support |
| Check | `/gopilot:check [backend\|frontend\|sdk\|all]` | Audit code against gopilot conventions |

## How It Works

```
Go Structs (Huma tags) → OpenAPI Spec → Typed SDK → Frontend
```

1. Define your API in Go with Huma struct tags — validation, docs, constraints all in one place
2. Huma auto-generates an OpenAPI 3.1 spec
3. gopilot generates typed validation schemas and remote functions from the spec
4. Your frontend imports type-safe functions that call the Go backend

**SvelteKit** gets `query()`/`command()` with Valibot schemas in `.remote.ts` files.
**Next.js** gets `'use server'` functions with Zod schemas in `.server.ts` files.

## Install

Add the marketplace, then install:

```
/plugin marketplace add Bishwas-py/gopilot
/plugin install gopilot
```

Or load locally without installing:

```bash
claude --plugin-dir /path/to/gopilot
```

### Team setup

Add to your project's `.claude/settings.json` so team members get prompted automatically:

```json
{
  "extraKnownMarketplaces": {
    "gopilot": {
      "source": {
        "source": "github",
        "repo": "Bishwas-py/gopilot"
      }
    }
  },
  "enabledPlugins": {
    "gopilot@gopilot": true
  }
}
```

## Quick Start

```bash
# Scaffold a new project
/gopilot:init my-app svelte

# Add a domain
/gopilot:domain item

# Add endpoints
/gopilot:api item list
/gopilot:api item create
/gopilot:api item get

# Generate the frontend SDK
/gopilot:sdk
```

## Requirements

- Go 1.22+
- Node.js 20+
- PostgreSQL 16 (via Docker)
- pnpm

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + Huma/v2 + Chi/v5 + pgx/v5 |
| Database | PostgreSQL 16 (declarative schema) |
| Frontend (Svelte) | SvelteKit + Valibot + remote functions |
| Frontend (React) | Next.js + Zod + server functions |
| SDK Generation | TypeScript MCP server |

## Architecture

gopilot uses a **hybrid approach**:

- **Skills** (markdown) guide you through workflows with conventions and guardrails
- **MCP tools** (TypeScript) handle deterministic operations like SDK generation
- **Hooks** notify when Go handlers change
- **LSP** provides Go intelligence via gopls

The Go backend is always the source of truth. No type duplication. Change the struct, regenerate the SDK.

## License

MIT
