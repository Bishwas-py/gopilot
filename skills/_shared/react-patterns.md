# Next.js Frontend Patterns

Reference document for Next.js Server Functions and SDK consumption patterns.

## Next.js Server Functions (App Router)

Server Functions run on the server and can be called from client components via RPC. They use the `'use server'` directive.

### File Convention
Server functions live in files with `'use server'` at the top, typically in `src/_sdk/remotes/*.server.ts`.

### Function Types

#### Data Fetching (Server Components)
In Next.js, Server Components fetch data directly — no special wrapper needed:

```typescript
// src/_sdk/remotes/items.server.ts
"use server";

import { goApi } from "@/lib/go-client";
import { ListItemsOutputBody } from "../schemas";

export async function listItems(params?: {
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<ListItemsOutputBody> {
  return goApi.get<ListItemsOutputBody>("/api/v1/items", { params });
}
```

Usage in Server Components:
```tsx
import { listItems } from "@/_sdk/remotes/items.server";

export default async function ItemsPage() {
  const { items } = await listItems({ page: 1 });
  return (
    <div>
      {items.map(item => <h2 key={item.id}>{item.title}</h2>)}
    </div>
  );
}
```

#### Mutations (Server Actions)
```typescript
"use server";

import { z } from "zod";
import { goApi } from "@/lib/go-client";
import { CreateItemInputBody } from "../schemas";

export async function createItem(input: z.infer<typeof CreateItemInputBody>) {
  const body = CreateItemInputBody.parse(input);
  return goApi.post("/api/v1/items", body);
}

export async function deleteItem(id: string) {
  return goApi.del(`/api/v1/items/${id}`);
}
```

#### Form Actions
```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function createItemAction(formData: FormData) {
  const result = CreateItemInputBody.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  await goApi.post("/api/v1/items", result.data);
  revalidatePath("/items");
}
```

Usage:
```tsx
<form action={createItemAction}>
  <input name="title" />
  <textarea name="description" />
  <button type="submit">Create</button>
</form>
```

### Validation Library: Zod

Next.js convention is Zod for schema validation.

```typescript
import { z } from "zod";

// String with constraints
z.string().min(3).max(200)

// Optional field
z.string().optional()

// Number with range
z.number().min(0).max(1000)

// Object
z.object({
  title: z.string().min(1),
  price: z.number().optional(),
})

// Array
z.array(z.string())

// Enum
z.enum(["draft", "published", "archived"])

// Infer TypeScript type from schema
type Item = z.infer<typeof ItemSchema>;
```

### SDK File Structure
```
src/_sdk/
├── schemas.ts              # Zod schemas (generated)
├── remotes/
│   ├── items.server.ts     # Item endpoints
│   ├── bookings.server.ts  # Booking endpoints
│   ├── index.ts            # Barrel exports
│   └── GUIDE.md            # Function reference table
└── index.ts                # Root barrel export
```

### go-client.ts Pattern
```typescript
// src/lib/go-client.ts
const BASE = process.env.GO_API_URL ?? 'http://localhost:8080';

export const goApi = {
  async get<T>(path: string, opts?: { params?: Record<string, any> }): Promise<T> {
    const url = new URL(path, BASE);
    if (opts?.params) {
      Object.entries(opts.params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },
  // post, put, patch, del similarly
};
```

### Key Rules
- `'use server'` functions are RPC calls — treat inputs as untrusted
- Always validate with Zod `.parse()` or `.safeParse()` before using input
- Use `revalidatePath()` or `revalidateTag()` after mutations to refresh data
- Server Components can call server functions directly (no 'use server' needed for reads)
- Generated `_sdk/` files should never be manually edited
