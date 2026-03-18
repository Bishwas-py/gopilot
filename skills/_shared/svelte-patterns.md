# SvelteKit Frontend Patterns

Reference document for SvelteKit remote functions and SDK consumption patterns.

## SvelteKit Remote Functions (Experimental, v2.27+)

Remote functions run on the server but can be called from components. They compile into HTTP endpoints with auto-generated fetch wrappers.

### Setup
```js
// svelte.config.js
export default {
  kit: {
    experimental: {
      remoteFunctions: true
    }
  },
  compilerOptions: {
    experimental: {
      async: true  // enables await in components
    }
  }
};
```

### File Convention
Remote functions live in `.remote.ts` files anywhere in `src/` (except `src/lib/server`).

### Function Types

#### query() — Read Data
```typescript
import { query } from "$app/server";
import * as v from "valibot";

export const listItems = query(
  v.optional(v.object({
    search: v.optional(v.string()),
    page: v.optional(v.number()),
  })),
  async (params = {}) => {
    return goApi.get("/api/v1/items", { params });
  }
);
```

Usage in components:
```svelte
{#each await listItems() as item}
  <h2>{item.title}</h2>
{/each}
```

Refresh: `listItems().refresh()`

#### query.batch() — Batch Multiple Calls
```typescript
export const getWeather = query.batch(
  v.string(),
  async (cityIds) => {
    const data = await fetchAll(cityIds);
    const lookup = new Map(data.map(w => [w.id, w]));
    return (id) => lookup.get(id);
  }
);
```

#### command() — Mutations (not tied to forms)
```typescript
import { command } from "$app/server";

export const deleteItem = command(
  v.string(),
  async (id) => {
    return goApi.del(`/api/v1/items/${id}`);
  }
);
```

#### form() — Form Submissions with Progressive Enhancement
```typescript
import { form } from "$app/server";

export const createItem = form(
  v.object({
    title: v.pipe(v.string(), v.nonEmpty()),
    description: v.pipe(v.string(), v.nonEmpty()),
  }),
  async ({ title, description }) => {
    return goApi.post("/api/v1/items", { title, description });
  }
);
```

Usage:
```svelte
<form {...createItem}>
  <input {...createItem.fields.title.as('text')} />
  <textarea {...createItem.fields.content.as('text')}></textarea>
  <button>Submit</button>
</form>
```

#### prerender() — Build-time Static Data
```typescript
import { prerender } from "svelte/remote";

export const getCategories = prerender(async () => {
  return goApi.get("/api/v1/categories");
});
```

### Validation Library: Valibot

SvelteKit remote functions use Valibot for schema validation (first argument).

```typescript
import * as v from "valibot";

// String with constraints
v.pipe(v.string(), v.minLength(3), v.maxLength(200))

// Optional field
v.optional(v.string())

// Number with range
v.pipe(v.number(), v.minValue(0), v.maxValue(1000))

// Object
v.object({
  title: v.pipe(v.string(), v.nonEmpty()),
  price: v.optional(v.number()),
})

// Array
v.array(v.string())

// Enum
v.picklist(["draft", "published", "archived"])

// Infer TypeScript type from schema
type Item = v.InferOutput<typeof ItemSchema>;
```

### SDK File Structure
```
src/_sdk/
├── schemas.ts              # Valibot schemas (generated)
├── remotes/
│   ├── items.remote.ts     # Item endpoints
│   ├── bookings.remote.ts  # Booking endpoints
│   ├── index.ts            # Barrel exports
│   └── GUIDE.md            # Function reference table
└── index.ts                # Root barrel export
```

### go-client.ts Pattern
```typescript
// src/lib/server/go-client.ts
const BASE = process.env.GO_API_URL ?? 'http://localhost:8080';

export const goApi = {
  async get<T>(path: string, opts?: { params?: Record<string, any> }): Promise<T> {
    const url = new URL(path, BASE);
    if (opts?.params) {
      Object.entries(opts.params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url);
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },
  // post, put, patch, del similarly
};
```

### Key Rules
- Remote functions ALWAYS run server-side — safe for secrets
- Never import `$lib/server/*` in client-only code
- Generated `_sdk/` files should never be manually edited
- Use `query()` for GET, `command()` for POST/PUT/PATCH/DELETE, `form()` for form submissions
