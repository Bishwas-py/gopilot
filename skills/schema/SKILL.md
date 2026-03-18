---
name: schema
description: Manage the PostgreSQL database schema. Add tables, columns, indexes, and foreign keys to the declarative schema.sql file. Use when modifying the database structure.
argument-hint: [add-table|add-column|add-index] [details]
---

# gopilot:schema — Manage Database Schema

You are managing the declarative PostgreSQL schema. All DDL lives in a single `backend/schema.sql` file.

## Before Starting

1. Read `backend/schema.sql` to understand existing schema
2. Read the domain types to ensure schema matches Go structs

## Approach: Declarative Schema (Terraform-style)

The schema file is the single source of truth. It uses idempotent DDL:
- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`

NOT migration files. One file. Always represents the current desired state.

## Adding a Table

```sql
-- ============================================================
-- [Name]s
-- ============================================================
CREATE TABLE IF NOT EXISTS [name]s (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    -- domain fields here
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_[name]s_created_at ON [name]s(created_at DESC);
```

## Adding a Column

```sql
ALTER TABLE [name]s ADD COLUMN IF NOT EXISTS [column] [TYPE] [CONSTRAINTS];
```

## Adding a Foreign Key

```sql
ALTER TABLE [name]s ADD COLUMN IF NOT EXISTS [ref]_id TEXT REFERENCES [ref]s(id);
CREATE INDEX IF NOT EXISTS idx_[name]s_[ref]_id ON [name]s([ref]_id);
```

## Conventions

- IDs: `TEXT` with UUID default
- Timestamps: `TIMESTAMPTZ` always
- Money: `BIGINT` (cents) or `NUMERIC(12,2)` — never float
- Enums: `TEXT` with CHECK constraints, not PostgreSQL enums
- Booleans: `BOOLEAN NOT NULL DEFAULT false`
- Arrays: avoid — use junction tables
- JSON: `JSONB` only when truly schemaless

## Apply Schema

```bash
psql -h localhost -p 5731 -U postgres -d [dbname] -f backend/schema.sql
```

Or via Makefile: `make db-schema`

## What NOT to Do
- Do NOT create migration files — use declarative schema
- Do NOT use PostgreSQL enums — use TEXT with CHECK
- Do NOT use SERIAL — use TEXT with gen_random_uuid()
- Do NOT forget indexes on foreign keys
