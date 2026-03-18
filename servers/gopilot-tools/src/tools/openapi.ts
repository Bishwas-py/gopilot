import * as fs from "node:fs";
import * as path from "node:path";

export interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OperationObject>>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

export interface OperationObject {
  operationId?: string;
  summary?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: {
    content?: Record<
      string,
      { schema?: SchemaObject | { $ref: string } }
    >;
  };
  responses?: Record<
    string,
    {
      content?: Record<
        string,
        { schema?: SchemaObject | { $ref: string } }
      >;
    }
  >;
}

export interface ParameterObject {
  name: string;
  in: "query" | "path" | "header";
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
}

export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  $ref?: string;
  enum?: string[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  description?: string;
  default?: unknown;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean | SchemaObject;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  nullable?: boolean;
}

/**
 * Fetch the OpenAPI spec from a running Go backend and cache it.
 */
export async function fetchOpenApi(
  backendUrl: string,
  outputPath: string
): Promise<{ success: boolean; source: string; schemaCount: number; pathCount: number }> {
  let spec: OpenApiSpec;
  let source: string;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${backendUrl}/openapi.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    spec = (await res.json()) as OpenApiSpec;
    source = "live";
  } catch {
    // Fall back to cached file
    if (fs.existsSync(outputPath)) {
      const cached = fs.readFileSync(outputPath, "utf-8");
      spec = JSON.parse(cached) as OpenApiSpec;
      source = "cache";
    } else {
      throw new Error(
        `Cannot reach backend at ${backendUrl}/openapi.json and no cached spec at ${outputPath}`
      );
    }
  }

  // Write/update cache
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  const schemaCount = spec.components?.schemas
    ? Object.keys(spec.components.schemas).length
    : 0;
  const pathCount = Object.keys(spec.paths).length;

  return { success: true, source, schemaCount, pathCount };
}

/**
 * Load an OpenAPI spec from a local file.
 */
export function loadSpec(specPath: string): OpenApiSpec {
  const raw = fs.readFileSync(specPath, "utf-8");
  return JSON.parse(raw) as OpenApiSpec;
}

/**
 * Resolve a $ref string to its schema name.
 * e.g., "#/components/schemas/Item" → "Item"
 */
export function resolveRefName(ref: string): string {
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

/**
 * Get all unique tags from the spec's operations.
 */
export function getAllTags(spec: OpenApiSpec): string[] {
  const tags = new Set<string>();
  for (const pathItem of Object.values(spec.paths)) {
    for (const op of Object.values(pathItem)) {
      const operation = op as OperationObject;
      if (operation.tags) {
        for (const tag of operation.tags) {
          tags.add(tag);
        }
      }
    }
  }
  return [...tags].sort();
}

/**
 * Get all operations grouped by tag.
 */
export function getOperationsByTag(
  spec: OpenApiSpec
): Map<string, Array<{ method: string; path: string; operation: OperationObject }>> {
  const grouped = new Map<
    string,
    Array<{ method: string; path: string; operation: OperationObject }>
  >();

  for (const [pathStr, pathItem] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(pathItem)) {
      const operation = op as OperationObject;
      const tags = operation.tags ?? ["Default"];

      for (const tag of tags) {
        if (!grouped.has(tag)) {
          grouped.set(tag, []);
        }
        grouped.get(tag)!.push({ method, path: pathStr, operation });
      }
    }
  }

  return grouped;
}
