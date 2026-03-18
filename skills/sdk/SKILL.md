---
name: sdk
description: Generate typed frontend SDK from the Go backend's OpenAPI spec. Produces validation schemas and remote functions for SvelteKit or Next.js. Use after adding or changing API endpoints.
---

# gopilot:sdk — Generate Frontend SDK

You are generating a typed frontend SDK from the Go backend's OpenAPI spec. This is the bridge between backend and frontend.

## Before Starting

1. Determine the frontend framework:
   - Check if `frontend/svelte.config.js` exists → SvelteKit
   - Check if `frontend/next.config.ts` exists → Next.js
2. Read the appropriate pattern file:
   - SvelteKit: `skills/_shared/svelte-patterns.md`
   - Next.js: `skills/_shared/react-patterns.md`

## Phase 1: Fetch OpenAPI Spec

Use the `gopilot-tools.fetch_openapi` MCP tool to get the spec:
- Try `http://localhost:8080/openapi.json` first
- Fall back to cached `frontend/openapi.json`
- Save the fetched spec to `frontend/openapi.json` (cache)

If the MCP tool is unavailable, read the spec manually via curl or fetch.

## Phase 2: Generate Validation Schemas

Use the `gopilot-tools.generate_schemas` MCP tool to produce `frontend/src/_sdk/schemas.ts`.

This file contains:
- One `export const` + `export type` per OpenAPI schema
- Valibot validators (SvelteKit) or Zod validators (Next.js)
- All OpenAPI constraints mapped: minLength, maxLength, minimum, maximum, pattern, enum

### SvelteKit Example:
```typescript
import * as v from "valibot";

export type CreateItemInputBody = v.InferOutput<typeof CreateItemInputBody>;
export const CreateItemInputBody = v.object({
  title: v.pipe(v.string(), v.minLength(3), v.maxLength(200)),
  description: v.optional(v.pipe(v.string(), v.maxLength(2000))),
});
```

### Next.js Example:
```typescript
import { z } from "zod";

export type CreateItemInputBody = z.infer<typeof CreateItemInputBody>;
export const CreateItemInputBody = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
});
```

## Phase 3: Generate Remote Functions

Use the `gopilot-tools.generate_remotes` MCP tool to produce one file per API tag in `frontend/src/_sdk/remotes/`.

### SvelteKit Output (.remote.ts):
```typescript
import { query, command } from "$app/server";
import * as v from "valibot";
import { goApi } from "$lib/server/go-client";
import type { ListItemsOutputBody, CreateItemInputBody } from "../schemas";

export const listItems = query(
  v.optional(v.object({
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    per_page: v.optional(v.number()),
  })),
  async ({ search, page, per_page } = {}) => {
    return goApi.get<ListItemsOutputBody>("/api/v1/items", {
      params: { search, page, per_page },
    });
  }
);

export const createItem = command(
  CreateItemInputBody,
  async (body) => {
    return goApi.post<Item>("/api/v1/items", body);
  }
);
```

### Next.js Output (.server.ts):
```typescript
"use server";

import { z } from "zod";
import { goApi } from "@/lib/go-client";
import { CreateItemInputBody, type ListItemsOutputBody } from "../schemas";

export async function listItems(params?: {
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<ListItemsOutputBody> {
  return goApi.get<ListItemsOutputBody>("/api/v1/items", { params });
}

export async function createItem(input: z.infer<typeof CreateItemInputBody>) {
  const body = CreateItemInputBody.parse(input);
  return goApi.post("/api/v1/items", body);
}
```

## Phase 4: Generate Barrel Index

Create `frontend/src/_sdk/remotes/index.ts`:
```typescript
export * from "./items.remote";
export * from "./bookings.remote";
// ... one export per tag
```

Create `frontend/src/_sdk/index.ts`:
```typescript
export * from "./schemas";
export * from "./remotes";
```

## Phase 5: Generate Guide

Create `frontend/src/_sdk/remotes/GUIDE.md` — a table of all generated functions:

```markdown
| Function | Method | Path | Tag |
|----------|--------|------|-----|
| listItems | GET | /api/v1/items | Items |
| createItem | POST | /api/v1/items | Items |
```

## Verify

1. Check TypeScript compilation: `cd frontend && npx tsc --noEmit`
2. Tell user the SDK is generated and ready to use

## What NOT to Do
- Do NOT manually write SDK files — always generate from OpenAPI
- Do NOT modify generated files — they will be overwritten
- Do NOT generate for auth/system/internal endpoints — skip those tags
