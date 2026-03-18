---
name: domain
description: Add a new business domain to the Go backend with repository, service, and types following domain-driven architecture. Use when adding a new feature area like items, bookings, users, etc.
argument-hint: [domain-name]
---

# gopilot:domain — Add a Business Domain

You are adding a new domain to the Go backend. Domains are isolated business areas with their own types, repository (DB access), and service (business logic).

## Before Starting

1. Read `skills/_shared/go-patterns.md` for conventions
2. Read `references/architecture.md` for the architecture overview
3. Read `backend/internal/api/router.go` to see existing domains

## Arguments

Parse `$ARGUMENTS` as: `[domain-name]`
- Must be singular, lowercase (e.g., `item`, `booking`, `user`)
- If not provided: ask the user what domain to add

## Phase 1: Create Domain Package

Create the domain package at `backend/internal/domain/[name]/`:

### [name].go — Domain Types
```go
package [name]

import "time"

type [Name] struct {
    ID          string    `json:"id"`
    // Add fields based on user's description
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

### repository.go — Database Access
```go
package [name]

import (
    "context"
    "github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
    pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
    return &Repository{pool: pool}
}

// Add methods: List, GetByID, Create, Update, Delete
// Use pgx directly — no ORM
// Always accept context.Context as first parameter
// Return (result, error) tuples
```

### service.go — Business Logic
```go
package [name]

type Service struct {
    repo *Repository
}

func NewService(repo *Repository) *Service {
    return &Service{repo: repo}
}

// Business logic methods that call repository
// Validation, authorization checks, side effects go here
// Services know nothing about HTTP
```

## Phase 2: Add Database Table

Add the table to `backend/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS [name]s (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    -- fields based on domain types
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- Use `TEXT` for IDs (UUIDs stored as text)
- Use `TIMESTAMPTZ` for all timestamps
- Add indexes for frequently queried columns
- Add foreign keys where needed

## Phase 3: Wire into Router

Update `backend/internal/api/router.go`:

1. Instantiate the repository: `[name]Repo := [name].NewRepository(pool)`
2. Instantiate the service: `[name]Svc := [name].NewService([name]Repo)`
3. Comment placeholder for handler registration (handlers come via `/gopilot:api`)

## Phase 4: Verify

1. Run `go vet ./...` in backend
2. Run `go build ./...` to check compilation
3. Tell user: "Domain `[name]` created. Add API endpoints with `/gopilot:api [name] list|get|create|update|delete`."

## Conventions
- Domains know NOTHING about HTTP — no `http.Request`, no status codes
- Repository methods are pure DB operations
- Service methods contain business rules
- One domain per package, no cross-domain imports (use interfaces if needed)
- All errors are returned, never panicked
