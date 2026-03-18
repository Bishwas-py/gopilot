---
name: api
description: Add API endpoints (handlers) for a domain using Huma framework with automatic OpenAPI generation. Use when adding REST endpoints like list, get, create, update, delete.
argument-hint: [domain-name] [list|get|create|update|delete|action-name]
---

# gopilot:api — Add API Endpoints

You are adding HTTP handlers for a domain. Handlers use the Huma framework which auto-generates OpenAPI from Go struct tags.

## Before Starting

1. Read `skills/_shared/go-patterns.md` for Huma conventions
2. Read the domain's types at `backend/internal/domain/[name]/[name].go`
3. Read the domain's service at `backend/internal/domain/[name]/service.go`
4. Read `backend/internal/api/router.go` to see registration pattern

## Arguments

Parse `$ARGUMENTS` as: `[domain-name] [operation]`
- domain-name: existing domain (e.g., `item`, `booking`)
- operation: `list`, `get`, `create`, `update`, `delete`, or a custom action name
- If not provided: ask the user

## Handler File

Create or update `backend/internal/api/[name]_handlers.go`:

### Input/Output Structs (Huma Pattern)

Every endpoint needs input and output structs with Huma tags:

```go
// List
type List[Name]sInput struct {
    Page    int    `query:"page" default:"1" minimum:"1" doc:"Page number"`
    PerPage int    `query:"per_page" default:"20" minimum:"1" maximum:"100" doc:"Items per page"`
    Search  string `query:"search,omitempty" doc:"Search query"`
}

type List[Name]sOutput struct {
    Body struct {
        Items []domain.[Name] `json:"items" doc:"List of [name]s"`
        Total int             `json:"total" doc:"Total count"`
        Page  int             `json:"page" doc:"Current page"`
    }
}

// Get by ID
type Get[Name]Input struct {
    ID string `path:"id" doc:"[Name] ID"`
}

type Get[Name]Output struct {
    Body domain.[Name]
}

// Create
type Create[Name]Input struct {
    Body struct {
        // Fields with validation tags
        Title       string `json:"title" minLength:"3" maxLength:"200" doc:"Title"`
        Description string `json:"description,omitempty" maxLength:"2000" doc:"Description"`
    }
}

type Create[Name]Output struct {
    Body domain.[Name]
}

// Update
type Update[Name]Input struct {
    ID string `path:"id" doc:"[Name] ID"`
    Body struct {
        Title       *string `json:"title,omitempty" minLength:"3" maxLength:"200" doc:"Title"`
        Description *string `json:"description,omitempty" maxLength:"2000" doc:"Description"`
    }
}

// Delete
type Delete[Name]Input struct {
    ID string `path:"id" doc:"[Name] ID"`
}
```

### Handler Functions

```go
func register[Name]Handlers(api huma.API, svc *domain.Service) {
    huma.Register(api, huma.Operation{
        OperationID: "list-[name]s",
        Method:      http.MethodGet,
        Path:        "/api/v1/[name]s",
        Summary:     "List [name]s",
        Tags:        []string{"[Name]s"},
    }, func(ctx context.Context, input *List[Name]sInput) (*List[Name]sOutput, error) {
        items, total, err := svc.List(ctx, input.Page, input.PerPage, input.Search)
        if err != nil {
            return nil, huma.Error500InternalServerError("failed to list [name]s")
        }
        return &List[Name]sOutput{Body: struct{ ... }{Items: items, Total: total, Page: input.Page}}, nil
    })

    // ... register get, create, update, delete similarly
}
```

### Key Huma Tags for Validation (these become OpenAPI constraints)

| Tag | Purpose | Example |
|-----|---------|---------|
| `doc:` | OpenAPI description | `doc:"User email address"` |
| `format:` | Format validation | `format:"email"` |
| `minLength:` | Min string length | `minLength:"3"` |
| `maxLength:` | Max string length | `maxLength:"200"` |
| `minimum:` | Min number value | `minimum:"0"` |
| `maximum:` | Max number value | `maximum:"1000"` |
| `pattern:` | Regex validation | `pattern:"^[a-z]+$"` |
| `enum:` | Allowed values | `enum:"draft,published,archived"` |
| `default:` | Default value | `default:"1"` |

## Register in Router

Add to `backend/internal/api/router.go`:
```go
register[Name]Handlers(api, [name]Svc)
```

## Verify

1. Run `go vet ./...`
2. Run `go build ./...`
3. Start the server and check `http://localhost:8080/openapi.json` includes the new endpoints
4. Tell user: "Endpoints added. Run `/gopilot:sdk` to generate the frontend SDK."

## REST Conventions
- `GET    /api/v1/[name]s`           → List (paginated)
- `GET    /api/v1/[name]s/{id}`      → Get one
- `POST   /api/v1/[name]s`           → Create
- `PUT    /api/v1/[name]s/{id}`      → Full update
- `PATCH  /api/v1/[name]s/{id}`      → Partial update
- `DELETE /api/v1/[name]s/{id}`      → Delete
- `POST   /api/v1/[name]s/{id}/[action]` → Custom action

## What NOT to Do
- Do NOT put business logic in handlers — call the service
- Do NOT access the database directly — go through the service/repository
- Do NOT skip Huma tags — they ARE the OpenAPI spec
- Do NOT use `any` or `interface{}` in input/output — always typed structs
