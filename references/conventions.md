# gopilot Conventions

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Go packages | singular lowercase | `item`, `booking` |
| Go types | PascalCase | `CreateItemInput` |
| Go files | snake_case | `item_handlers.go` |
| OperationID | kebab-case | `list-items` |
| API paths | plural nouns | `/api/v1/items` |
| Huma tags | PascalCase plural | `Items`, `Bookings` |
| DB tables | plural snake_case | `items`, `booking_extensions` |
| DB columns | snake_case | `created_at`, `user_id` |
| TS SDK files | kebab-case + suffix | `items.remote.ts` |
| TS types | PascalCase | `ListItemsOutputBody` |

## Database

- IDs: `TEXT` with `gen_random_uuid()::text`
- Timestamps: `TIMESTAMPTZ NOT NULL DEFAULT now()`
- Money: `BIGINT` (cents) or `NUMERIC(12,2)`
- Enums: `TEXT` with `CHECK` constraints
- No ORM — raw pgx queries
- Declarative schema — single `schema.sql` file

## API Design

- RESTful resource-oriented endpoints
- Consistent pagination: `page` + `per_page` query params
- All validation via Huma struct tags — no manual validation in handlers
- Errors use Huma error helpers: `huma.Error404NotFound()` etc.
- Response bodies are direct JSON — no `{ data: ... }` wrapper

## SDK Generation

- Generated files go in `frontend/src/_sdk/`
- Never manually edit generated files
- One remote file per Huma tag
- Barrel exports via `index.ts`
- Schemas mirror OpenAPI component schemas exactly
- Constraints from OpenAPI map to validator pipes/chains

## Project Structure Rules

- Monorepo: `backend/` + `frontend/` at root
- pnpm workspaces for frontend
- Makefile for backend commands
- Root `package.json` for orchestration scripts
- `docker-compose.yml` for PostgreSQL
- Single `schema.sql` — no migration files
