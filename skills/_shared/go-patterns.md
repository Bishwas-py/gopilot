# Go/Huma Backend Patterns

Reference document for Go backend conventions used across all gopilot skills.

## Tech Stack
- **Go 1.22+** with standard library
- **Huma/v2** — OpenAPI-first REST framework
- **Chi/v5** — HTTP router (used by Huma)
- **pgx/v5** — PostgreSQL driver with connection pooling
- **gorilla/websocket** — WebSocket support (when needed)

## Project Layout

```
backend/
├── cmd/server/main.go          # Entry point only — no logic
├── internal/
│   ├── api/                    # HTTP layer
│   │   ├── router.go           # Central wiring
│   │   └── *_handlers.go       # One file per domain
│   ├── domain/                 # Business layer
│   │   └── [name]/
│   │       ├── [name].go       # Types
│   │       ├── repository.go   # DB access
│   │       └── service.go      # Business logic
│   ├── auth/                   # Auth (when added)
│   ├── config/                 # Env config loader
│   ├── database/               # Connection pool
│   └── ws/                     # WebSocket hub (when added)
├── schema.sql                  # Declarative DB schema
├── Makefile                    # Dev commands
└── go.mod
```

## Huma Framework Conventions

### Registering Endpoints
```go
huma.Register(api, huma.Operation{
    OperationID: "list-items",      // kebab-case, unique
    Method:      http.MethodGet,
    Path:        "/api/v1/items",
    Summary:     "List items",       // Short description
    Tags:        []string{"Items"},  // Groups in OpenAPI (becomes SDK file name)
}, handlerFunc)
```

### Input Structs — Source of Truth for OpenAPI
```go
type CreateItemInput struct {
    Body struct {
        Title       string   `json:"title" minLength:"3" maxLength:"200" doc:"Item title"`
        Description string   `json:"description,omitempty" maxLength:"2000" doc:"Description"`
        Price       float64  `json:"price" minimum:"0" doc:"Price in dollars"`
        Tags        []string `json:"tags,omitempty" doc:"Tags" maxItems:"10"`
    }
}
```

### Available Huma Tags
| Tag | OpenAPI | Example |
|-----|---------|---------|
| `json:"name"` | Property name | `json:"title"` |
| `doc:"text"` | description | `doc:"Item title"` |
| `format:"fmt"` | format | `format:"email"` |
| `minLength:"n"` | minLength | `minLength:"3"` |
| `maxLength:"n"` | maxLength | `maxLength:"200"` |
| `minimum:"n"` | minimum | `minimum:"0"` |
| `maximum:"n"` | maximum | `maximum:"1000"` |
| `pattern:"re"` | pattern | `pattern:"^[a-z]+$"` |
| `enum:"a,b,c"` | enum | `enum:"draft,published"` |
| `default:"v"` | default | `default:"draft"` |
| `minItems:"n"` | minItems | `minItems:"1"` |
| `maxItems:"n"` | maxItems | `maxItems:"10"` |

### Parameter Sources
| Tag | Location | Example |
|-----|----------|---------|
| `path:"name"` | URL path | `path:"id"` |
| `query:"name"` | Query string | `query:"page"` |
| `header:"name"` | HTTP header | `header:"Authorization"` |

### Error Responses
```go
return nil, huma.Error404NotFound("item not found")
return nil, huma.Error400BadRequest("invalid input")
return nil, huma.Error500InternalServerError("internal error")
return nil, huma.Error403Forbidden("not allowed")
```

## Architecture Rules

1. **Handlers** know about HTTP (Huma structs, status codes)
2. **Services** know about business rules (validation, authorization)
3. **Repositories** know about SQL (pgx queries)
4. **Domains** know nothing about HTTP or SQL

Flow: `Handler → Service → Repository → Database`

Never skip layers. Never import `net/http` in a service. Never import `pgx` in a handler.

## Database Patterns

### pgx Usage
```go
// Query multiple rows
rows, err := pool.Query(ctx, "SELECT id, title FROM items WHERE user_id = $1", userID)
if err != nil {
    return nil, err
}
defer rows.Close()

var items []Item
for rows.Next() {
    var item Item
    if err := rows.Scan(&item.ID, &item.Title); err != nil {
        return nil, err
    }
    items = append(items, item)
}

// Query single row
var item Item
err := pool.QueryRow(ctx, "SELECT id, title FROM items WHERE id = $1", id).Scan(&item.ID, &item.Title)
if errors.Is(err, pgx.ErrNoRows) {
    return nil, ErrNotFound
}
```

### Pagination
```go
func (r *Repository) List(ctx context.Context, page, perPage int, search string) ([]Item, int, error) {
    offset := (page - 1) * perPage

    var total int
    err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM items WHERE title ILIKE $1", "%"+search+"%").Scan(&total)
    if err != nil {
        return nil, 0, err
    }

    rows, err := r.pool.Query(ctx,
        "SELECT id, title, created_at FROM items WHERE title ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        "%"+search+"%", perPage, offset,
    )
    // ...
}
```

## Naming Conventions

- Package names: singular, lowercase (`item`, not `items`)
- Types: PascalCase (`CreateItemInput`)
- Functions: PascalCase for exported, camelCase for unexported
- Variables: camelCase (`itemSvc`, `bookingRepo`)
- Files: snake_case (`item_handlers.go`)
- OperationID: kebab-case (`list-items`, `create-booking`)
- API paths: plural nouns (`/api/v1/items`, `/api/v1/bookings`)
- Tags: PascalCase plural (`Items`, `Bookings`) — becomes SDK file name
