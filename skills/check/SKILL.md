---
name: check
description: Scan the codebase for violations of gopilot conventions. Checks backend architecture, API design, schema patterns, SDK freshness, and frontend consumption patterns. Use after making changes or before committing.
argument-hint: [backend|frontend|sdk|all]
---

# gopilot:check — Code Quality & Philosophy Check

You are auditing the codebase against gopilot's conventions and architecture philosophy. This is not a generic linter — it checks adherence to the Go-first, backend-is-source-of-truth pipeline.

## Before Starting

1. Read `references/conventions.md` for naming and structure rules
2. Read `references/architecture.md` for the pipeline and layer responsibilities
3. Read `skills/_shared/go-patterns.md` for backend conventions
4. Detect frontend: check `frontend/svelte.config.js` (Svelte) or `frontend/next.config.ts` (React)
5. If frontend detected, read the appropriate `skills/_shared/svelte-patterns.md` or `skills/_shared/react-patterns.md`

## Arguments

Parse `$ARGUMENTS` as: `[scope]`
- `backend` — check only Go backend
- `frontend` — check only frontend SDK consumption
- `sdk` — check SDK freshness and correctness
- `all` (default) — check everything

## Check Categories

### 1. Architecture Layer Violations

Scan for layer boundary violations:

| Violation | How to Detect |
|-----------|--------------|
| Handler imports `pgx` | Handler file imports `github.com/jackc/pgx` directly |
| Handler contains SQL | Raw SQL strings in `*_handlers.go` files |
| Service imports `net/http` | Service file imports `net/http` |
| Repository contains business logic | Conditionals beyond null checks in repository methods |
| Domain imports HTTP or SQL | Domain type files importing `net/http` or `pgx` |
| Cross-domain imports | One domain package importing another directly |

**Check:** `backend/internal/api/*_handlers.go` should only import `huma`, `net/http`, and domain packages.
**Check:** `backend/internal/domain/*/service.go` should never import `net/http`.
**Check:** `backend/internal/domain/*/repository.go` should only import `pgx` and its own domain types.

### 2. Huma Tag Completeness

Scan all input/output structs in `*_handlers.go`:

| Issue | What's Wrong |
|-------|-------------|
| Missing `doc:` tag | Every field should have documentation |
| Missing validation tags | String fields without `minLength:`/`maxLength:` |
| Missing `json:` tag | Struct fields without JSON mapping |
| Bare `string` for enums | Should use `enum:"val1,val2"` tag |
| Float for money | Money fields should be `int` (cents) or explicit `NUMERIC` |
| Missing `Tags` in operation | Huma operation without `Tags` means SDK can't group it |
| Missing `OperationID` | Every operation needs a unique kebab-case ID |

**Check:** Every `huma.Register` call has `OperationID`, `Summary`, and `Tags`.
**Check:** Every Body struct field has `json:` and `doc:` tags.

### 3. Naming Convention Violations

| Thing | Expected | Violation Example |
|-------|----------|-------------------|
| Go package | singular lowercase | `items` (should be `item`) |
| OperationID | kebab-case | `listItems` (should be `list-items`) |
| API path | plural nouns | `/api/v1/item` (should be `/api/v1/items`) |
| Handler file | snake_case `_handlers.go` | `itemHandlers.go` |
| DB table | plural snake_case | `Item` (should be `items`) |
| DB column | snake_case | `createdAt` (should be `created_at`) |

### 4. Database Schema Quality

Scan `backend/schema.sql`:

| Issue | What's Wrong |
|-------|-------------|
| Missing `IF NOT EXISTS` | Non-idempotent DDL |
| `SERIAL` or `BIGSERIAL` ID | Should use `TEXT DEFAULT gen_random_uuid()::text` |
| `TIMESTAMP` without timezone | Should use `TIMESTAMPTZ` |
| `FLOAT`/`DOUBLE` for money | Should use `BIGINT` (cents) or `NUMERIC(12,2)` |
| PostgreSQL `ENUM` type | Should use `TEXT` with `CHECK` constraint |
| Foreign key without index | Every FK column needs an index |
| Missing `created_at`/`updated_at` | Every table should have timestamps |

### 5. SDK Freshness

Compare backend and frontend to detect drift:

1. Check if `frontend/openapi.json` exists
2. If backend is running, fetch `/openapi.json` and diff against cached version
3. Check if `frontend/src/_sdk/schemas.ts` exists and has schemas
4. Check if `frontend/src/_sdk/remotes/` has files matching the tags in the OpenAPI spec
5. Check if any `*_handlers.go` files are newer than the SDK files

**Report:** "SDK is stale — X handlers modified since last generation. Run `/gopilot:sdk` to regenerate."

### 6. Frontend Consumption Patterns

#### SvelteKit Checks:
| Issue | What's Wrong |
|-------|-------------|
| Direct `fetch()` to Go API | Should use SDK remote functions |
| `goApi` called outside `_sdk/` | All Go API calls should go through SDK |
| Manually typed API response | Should import types from `_sdk/schemas` |
| `_sdk/` file manually edited | Generated files should never be hand-edited |
| Missing Valibot validation | `command()` without schema argument |

#### Next.js Checks:
| Issue | What's Wrong |
|-------|-------------|
| `'use server'` without Zod validation | Server actions must validate input |
| Client component calling Go API directly | Should go through server functions |
| Manual type definitions matching API | Should import from `_sdk/schemas` |

### 7. Project Structure

| Issue | What's Wrong |
|-------|-------------|
| Missing `docker-compose.yml` | No PostgreSQL setup |
| Missing `backend/Makefile` | No dev commands |
| Missing `backend/schema.sql` | No declarative schema |
| Missing `frontend/src/_sdk/` | No SDK directory |
| Domain without all three files | Each domain needs types, repository, service |
| Handler without registered route | Handler exists but not wired in `router.go` |

## Output Format

Print a structured report:

```
# gopilot:check Report

## Summary
✅ 14 checks passed
⚠️  3 warnings
❌ 2 violations

## Violations (must fix)

❌ **Layer Violation** — `backend/internal/api/item_handlers.go:45`
   Handler contains raw SQL query. Move to repository.

❌ **Missing Huma Tags** — `backend/internal/api/booking_handlers.go:12`
   `CreateBookingInput.Body.StartDate` missing `doc:` tag.

## Warnings (should fix)

⚠️  **SDK Stale** — `item_handlers.go` modified 2h ago, SDK last generated 3d ago.
   Run `/gopilot:sdk` to regenerate.

⚠️  **Naming** — Package `backend/internal/domain/items/` should be singular `item`.

⚠️  **Schema** — Table `bookings` missing index on `user_id` foreign key.

## Passed
✅ Architecture layers clean
✅ All operations have OperationID, Summary, Tags
✅ Database schema uses idempotent DDL
✅ Frontend uses SDK remote functions (no direct fetch)
✅ All domain packages have types + repository + service
... (truncated, show first 5)
```

## Severity Levels

- **❌ Violation**: Breaks gopilot philosophy. Must fix before committing.
- **⚠️ Warning**: Deviates from conventions. Should fix but won't break anything.
- **✅ Passed**: Follows gopilot patterns correctly.

## What NOT to Do
- Do NOT check code style (formatting, indentation) — that's `go fmt`'s job
- Do NOT check for generic bugs — that's tests and `go vet`
- Do NOT suggest refactors unrelated to gopilot conventions
- Do NOT modify any files — this skill only reports, never fixes
- Do NOT hallucinate issues — only report what you actually find in the code
