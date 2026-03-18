# gopilot

Go-first full-stack Claude Code plugin (v0.1.0).

## Purpose

gopilot scaffolds Go backends, generates typed frontend SDKs, and guides backend-to-frontend development flow for SvelteKit and Next.js. The Go backend is always the source of truth — everything downstream (OpenAPI spec, validation schemas, remote functions) is derived from Go struct tags.

## Dependencies

- **Go 1.22+** — backend language
- **Node.js 20+** — MCP server runtime and frontend tooling
- **PostgreSQL 16** — database (via Docker)
- **pnpm** — frontend package manager
- **gopls** — Go language server (bundled via `.lsp.json`)

No external Claude Code plugins required.

## Repository Structure

```
gopilot/
├── .claude-plugin/
│   ├── plugin.json              # Plugin identity (name, version, author)
│   └── marketplace.json         # Distribution metadata
├── .mcp.json                    # Bundled MCP server (gopilot-tools)
├── .lsp.json                    # Go language server (gopls)
├── settings.json                # Default agent settings
│
├── skills/                      # Workflow guidance (markdown)
│   ├── init/SKILL.md            # /gopilot:init — scaffold full project
│   ├── domain/SKILL.md          # /gopilot:domain — add business domain
│   ├── api/SKILL.md             # /gopilot:api — add REST endpoints
│   ├── sdk/SKILL.md             # /gopilot:sdk — generate frontend SDK
│   ├── schema/SKILL.md          # /gopilot:schema — manage DB schema
│   ├── ws/SKILL.md              # /gopilot:ws — add WebSocket support
│   └── _shared/                 # Reference docs read by skills
│       ├── go-patterns.md       # Go/Huma/Chi/pgx conventions
│       ├── svelte-patterns.md   # SvelteKit remote functions + Valibot
│       └── react-patterns.md    # Next.js server functions + Zod
│
├── agents/
│   └── sdk-generator.md         # Orchestrates SDK generation via MCP tools
│
├── hooks/
│   └── hooks.json               # Notifies when Go handlers change
│
├── servers/
│   └── gopilot-tools/           # TypeScript MCP server
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts          # 4 MCP tools registered here
│           └── tools/
│               ├── openapi.ts        # Fetch/parse OpenAPI specs
│               ├── generate-sdk.ts   # Schema + remote function generation
│               └── scaffold.ts       # Project structure scaffolding
│
├── references/
│   ├── architecture.md          # Pipeline: Go → OpenAPI → SDK → Frontend
│   └── conventions.md           # Naming, DB, API, SDK conventions
│
└── docs/
    └── superpowers/specs/
        └── 2026-03-18-gopilot-plugin-design.md  # Design spec
```

## How the Plugin System Works

### Skills (Markdown)
Skills live in `skills/[name]/SKILL.md` with YAML frontmatter. The folder name becomes the skill command: `skills/init/` → `/gopilot:init`.

**Frontmatter rules:**
- `name` must exactly match the folder name
- `description` must be a single-line string (no YAML multiline `>`, `|`, `>-`, `|-`)

Skills guide Claude through workflows — they describe *what* to do and in *what order*. They reference `_shared/` docs for framework-specific patterns.

### MCP Server (TypeScript)
The MCP server at `servers/gopilot-tools/` provides 4 deterministic tools:

| Tool | Purpose |
|------|---------|
| `fetch_openapi` | Fetch OpenAPI spec from running Go backend |
| `generate_schemas` | OpenAPI → Valibot (Svelte) or Zod (React) schemas |
| `generate_remotes` | OpenAPI → typed `.remote.ts` or `.server.ts` files |
| `scaffold_project` | Create full Go + frontend project structure |

MCP tools handle repetitive, deterministic operations that must produce consistent output.

### Hooks
`hooks/hooks.json` watches for edits to `*_handlers.go` files and reminds to regenerate the SDK.

### LSP
`.lsp.json` configures `gopls` for Go language intelligence.

## Working on This Repository

### Build the MCP server
```bash
cd servers/gopilot-tools
npm install
npx tsc
```

### Test locally
```bash
claude --plugin-dir /path/to/gopilot
```

Then try `/gopilot:init my-app svelte`.

### Version bumps
Update version in `.claude-plugin/plugin.json`.

### Adding a new skill
1. Create `skills/[name]/SKILL.md` with frontmatter
2. Follow the read-before-execute pattern: skills should read relevant `_shared/` docs before acting
3. Include "What NOT to Do" guardrails
4. Add phased procedures for complex skills

### Adding a new MCP tool
1. Create the tool function in `servers/gopilot-tools/src/tools/`
2. Register it in `servers/gopilot-tools/src/index.ts`
3. Rebuild: `npx tsc`

### Frontend framework support
- **SvelteKit**: `query()`/`command()` from `$app/server`, Valibot schemas, `.remote.ts` files
- **Next.js**: `'use server'` functions, Zod schemas, `.server.ts` files

The framework is detected by checking for `svelte.config.js` (Svelte) or `next.config.ts` (React).

## Pipeline

```
Go Structs (Huma tags)     ← source of truth
    ↓ automatic
OpenAPI 3.1 Spec           ← /openapi.json
    ↓ gopilot-tools MCP
Validation Schemas         ← Valibot or Zod
Typed Remote Functions     ← .remote.ts or .server.ts
    ↓ framework-native
SvelteKit / Next.js        ← query(), command(), 'use server'
```
