import * as fs from "node:fs";
import * as path from "node:path";
/**
 * Scaffold a new Go-first full-stack project.
 * Creates the directory structure, boilerplate files, and config.
 */
export async function scaffoldProject(projectName, projectDir, framework, goModule) {
    const createdFiles = [];
    function writeFile(relativePath, content) {
        const fullPath = path.join(projectDir, relativePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content);
        createdFiles.push(relativePath);
    }
    // ─── Backend ──────────────────────────────────────────────────────
    writeFile("backend/go.mod", `module ${goModule}

go 1.22

require (
\tgithub.com/danielgtaylor/huma/v2 v2.27.0
\tgithub.com/go-chi/chi/v5 v5.2.1
\tgithub.com/jackc/pgx/v5 v5.7.4
)
`);
    writeFile("backend/cmd/server/main.go", `package main

import (
\t"context"
\t"fmt"
\t"log"
\t"net/http"

\t"${goModule}/internal/api"
\t"${goModule}/internal/config"
\t"${goModule}/internal/database"
\t"github.com/danielgtaylor/huma/v2"
\t"github.com/danielgtaylor/huma/v2/adapters/humachi"
\t"github.com/go-chi/chi/v5"
\t"github.com/go-chi/chi/v5/middleware"
)

func main() {
\tcfg := config.Load()

\tpool, err := database.Connect(context.Background(), cfg.DatabaseURL)
\tif err != nil {
\t\tlog.Fatalf("Failed to connect to database: %v", err)
\t}
\tdefer pool.Close()

\tr := chi.NewRouter()
\tr.Use(middleware.Logger)
\tr.Use(middleware.Recoverer)
\tr.Use(middleware.RealIP)

\thumaAPI := humachi.New(r, huma.DefaultConfig("${projectName} API", "0.1.0"))

\tapi.RegisterRoutes(humaAPI, pool)

\taddr := fmt.Sprintf(":%s", cfg.Port)
\tlog.Printf("Starting server on %s", addr)
\tif err := http.ListenAndServe(addr, r); err != nil {
\t\tlog.Fatalf("Server failed: %v", err)
\t}
}
`);
    writeFile("backend/internal/config/config.go", `package config

import "os"

type Config struct {
\tDatabaseURL string
\tPort        string
\tEnv         string
}

func Load() *Config {
\treturn &Config{
\t\tDatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5731/${projectName.replace(/-/g, "_")}_dev?sslmode=disable"),
\t\tPort:        getEnv("PORT", "8080"),
\t\tEnv:         getEnv("ENV", "development"),
\t}
}

func getEnv(key, fallback string) string {
\tif v := os.Getenv(key); v != "" {
\t\treturn v
\t}
\treturn fallback
}
`);
    writeFile("backend/internal/database/database.go", `package database

import (
\t"context"
\t"fmt"

\t"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
\tpool, err := pgxpool.New(ctx, databaseURL)
\tif err != nil {
\t\treturn nil, fmt.Errorf("unable to create connection pool: %w", err)
\t}

\tif err := pool.Ping(ctx); err != nil {
\t\tpool.Close()
\t\treturn nil, fmt.Errorf("unable to ping database: %w", err)
\t}

\treturn pool, nil
}
`);
    writeFile("backend/internal/api/router.go", `package api

import (
\t"context"
\t"net/http"

\t"github.com/danielgtaylor/huma/v2"
\t"github.com/jackc/pgx/v5/pgxpool"
)

type HealthOutput struct {
\tBody struct {
\t\tStatus string \`json:"status" doc:"Service status"\`
\t}
}

func RegisterRoutes(api huma.API, pool *pgxpool.Pool) {
\t// Health check
\thuma.Register(api, huma.Operation{
\t\tOperationID: "health-check",
\t\tMethod:      http.MethodGet,
\t\tPath:        "/api/v1/health",
\t\tSummary:     "Health check",
\t\tTags:        []string{"System"},
\t}, func(ctx context.Context, input *struct{}) (*HealthOutput, error) {
\t\treturn &HealthOutput{Body: struct {
\t\t\tStatus string \`json:"status" doc:"Service status"\`
\t\t}{Status: "ok"}}, nil
\t})

\t// Register domain handlers below:
\t// registerItemHandlers(api, itemSvc)
}
`);
    writeFile("backend/schema.sql", `-- ${projectName} Database Schema
-- Declarative schema managed by gopilot.
-- Apply with: psql -h localhost -p 5731 -U postgres -d ${projectName.replace(/-/g, "_")}_dev -f schema.sql

-- Add tables below using /gopilot:schema
`);
    writeFile("backend/Makefile", `.PHONY: dev build test lint db-schema clean

dev:
\tair

build:
\tgo build -o bin/server ./cmd/server

test:
\tgo test ./...

test-verbose:
\tgo test -v ./...

lint:
\tgo vet ./...

db-schema:
\tpsql -h localhost -p 5731 -U postgres -d ${projectName.replace(/-/g, "_")}_dev -f schema.sql

clean:
\trm -rf bin/ tmp/
`);
    writeFile("backend/.air.toml", `root = "."
tmp_dir = "tmp"

[build]
  cmd = "go build -o ./tmp/server ./cmd/server"
  bin = "./tmp/server"
  include_ext = ["go"]
  exclude_dir = ["tmp", "bin"]
  delay = 1000

[log]
  time = false

[misc]
  clean_on_exit = true
`);
    // ─── Frontend ─────────────────────────────────────────────────────
    const goClientContent = `const BASE = process.env.GO_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(\`API Error \${status}: \${detail}\`);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions
): Promise<T> {
  const url = new URL(path, BASE);
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...opts?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}

export const goApi = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, body, opts),
  del: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, undefined, opts),
};
`;
    if (framework === "svelte") {
        writeFile("frontend/src/lib/server/go-client.ts", goClientContent);
        writeFile("frontend/src/_sdk/.gitkeep", "");
        writeFile("frontend/src/routes/+page.svelte", `<h1>Welcome to ${projectName}</h1>
<p>Go backend running at <a href="http://localhost:8080/openapi.json">OpenAPI Spec</a></p>
`);
        writeFile("frontend/svelte.config.js", `import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true,
    },
  },
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
};

export default config;
`);
        writeFile("frontend/package.json", JSON.stringify({
            name: `${projectName}-frontend`,
            version: "0.1.0",
            private: true,
            type: "module",
            scripts: {
                dev: "vite dev",
                build: "vite build",
                preview: "vite preview",
                "generate-sdk": "tsx scripts/generate-sdk.ts",
            },
            dependencies: {
                "@sveltejs/adapter-node": "^5.0.0",
                "@sveltejs/kit": "^2.27.0",
                "@sveltejs/vite-plugin-svelte": "^5.0.0",
                svelte: "^5.0.0",
                valibot: "^1.0.0",
                vite: "^6.0.0",
            },
            devDependencies: {
                tsx: "^4.0.0",
                typescript: "^5.7.0",
            },
        }, null, 2));
    }
    else {
        writeFile("frontend/src/lib/go-client.ts", goClientContent);
        writeFile("frontend/src/_sdk/.gitkeep", "");
        writeFile("frontend/src/app/page.tsx", `export default function Home() {
  return (
    <main>
      <h1>Welcome to ${projectName}</h1>
      <p>
        Go backend running at{" "}
        <a href="http://localhost:8080/openapi.json">OpenAPI Spec</a>
      </p>
    </main>
  );
}
`);
        writeFile("frontend/src/app/layout.tsx", `export const metadata = {
  title: "${projectName}",
  description: "Go-first full-stack application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`);
        writeFile("frontend/package.json", JSON.stringify({
            name: `${projectName}-frontend`,
            version: "0.1.0",
            private: true,
            scripts: {
                dev: "next dev",
                build: "next build",
                start: "next start",
                "generate-sdk": "tsx scripts/generate-sdk.ts",
            },
            dependencies: {
                next: "^15.0.0",
                react: "^19.0.0",
                "react-dom": "^19.0.0",
                zod: "^3.24.0",
            },
            devDependencies: {
                "@types/node": "^22.0.0",
                "@types/react": "^19.0.0",
                tsx: "^4.0.0",
                typescript: "^5.7.0",
            },
        }, null, 2));
        writeFile("frontend/next.config.ts", `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
};

export default nextConfig;
`);
    }
    writeFile("frontend/tsconfig.json", JSON.stringify({
        compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            isolatedModules: true,
            paths: {
                "$lib/*": ["./src/lib/*"],
                "$_sdk/*": ["./src/_sdk/*"],
                "@/*": ["./src/*"],
            },
        },
        include: ["src"],
        exclude: ["node_modules"],
    }, null, 2));
    // ─── Root ─────────────────────────────────────────────────────────
    writeFile("docker-compose.yml", `services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5731:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${projectName.replace(/-/g, "_")}_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`);
    writeFile("pnpm-workspace.yaml", "packages:\n  - frontend\n");
    writeFile("package.json", JSON.stringify({
        name: projectName,
        version: "0.1.0",
        private: true,
        scripts: {
            dev: 'concurrently "pnpm run dev:backend" "pnpm run dev:frontend"',
            "dev:backend": "cd backend && make dev",
            "dev:frontend": "pnpm --filter frontend dev",
            "generate-sdk": "pnpm --filter frontend generate-sdk",
            build: "pnpm --filter frontend build",
            "build:backend": "cd backend && make build",
            test: "cd backend && make test",
            lint: "cd backend && make lint",
        },
        devDependencies: {
            concurrently: "^9.0.0",
        },
    }, null, 2));
    return { success: true, createdFiles };
}
//# sourceMappingURL=scaffold.js.map