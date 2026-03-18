# gopilot Architecture

## The Flow

```
Go Structs (Huma tags)
    ↓ automatic
OpenAPI 3.1 Spec (/openapi.json)
    ↓ gopilot-tools MCP server
Typed Frontend SDK
    ├── Validation Schemas (Valibot or Zod)
    ├── Remote Functions (.remote.ts or .server.ts)
    └── WebSocket Client (if applicable)
    ↓ framework-native
Frontend Components
    ↓
User Browser
```

## Single Source of Truth

The Go backend struct tags ARE the API contract. Everything downstream is derived:

1. **Go struct tags** → Huma auto-generates OpenAPI spec
2. **OpenAPI spec** → gopilot-tools generates validation schemas
3. **OpenAPI spec** → gopilot-tools generates remote functions
4. **Validation schemas** → runtime type checking on frontend

No duplication. Change the Go struct, regenerate the SDK.

## Layer Responsibilities

| Layer | Knows About | Does NOT Know About |
|-------|------------|---------------------|
| Handlers (api/) | HTTP, Huma, request/response | SQL, business rules |
| Services (domain/) | Business rules, validation | HTTP, SQL |
| Repositories (domain/) | SQL, pgx | HTTP, business rules |
| Frontend SDK (_sdk/) | API contract, types | Backend internals |
| Frontend UI (routes/) | SDK functions, UI | API details, SQL |

## Frontend Agnostic

The SDK generator outputs framework-specific code:

| | SvelteKit | Next.js |
|---|---|---|
| File extension | `.remote.ts` | `.server.ts` |
| Read pattern | `query()` | Server Component / `'use server'` |
| Write pattern | `command()` / `form()` | Server Action |
| Validation | Valibot | Zod |
| Data loading | `await` in components | `async` Server Components |

The Go backend is identical regardless of frontend choice.

## API Conventions

- All paths: `/api/v1/[resource]s`
- Pagination: `?page=1&per_page=20`
- IDs in path: `/api/v1/items/{id}`
- Actions: `POST /api/v1/items/{id}/[action]`
- Tags group endpoints → become SDK file names
- OperationIDs are kebab-case and unique
