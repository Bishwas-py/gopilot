import * as fs from "node:fs";
import * as path from "node:path";
/**
 * Fetch the OpenAPI spec from a running Go backend and cache it.
 */
export async function fetchOpenApi(backendUrl, outputPath) {
    let spec;
    let source;
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
        spec = (await res.json());
        source = "live";
    }
    catch {
        // Fall back to cached file
        if (fs.existsSync(outputPath)) {
            const cached = fs.readFileSync(outputPath, "utf-8");
            spec = JSON.parse(cached);
            source = "cache";
        }
        else {
            throw new Error(`Cannot reach backend at ${backendUrl}/openapi.json and no cached spec at ${outputPath}`);
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
export function loadSpec(specPath) {
    const raw = fs.readFileSync(specPath, "utf-8");
    return JSON.parse(raw);
}
/**
 * Resolve a $ref string to its schema name.
 * e.g., "#/components/schemas/Item" → "Item"
 */
export function resolveRefName(ref) {
    const parts = ref.split("/");
    return parts[parts.length - 1];
}
/**
 * Get all unique tags from the spec's operations.
 */
export function getAllTags(spec) {
    const tags = new Set();
    for (const pathItem of Object.values(spec.paths)) {
        for (const op of Object.values(pathItem)) {
            const operation = op;
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
export function getOperationsByTag(spec) {
    const grouped = new Map();
    for (const [pathStr, pathItem] of Object.entries(spec.paths)) {
        for (const [method, op] of Object.entries(pathItem)) {
            const operation = op;
            const tags = operation.tags ?? ["Default"];
            for (const tag of tags) {
                if (!grouped.has(tag)) {
                    grouped.set(tag, []);
                }
                grouped.get(tag).push({ method, path: pathStr, operation });
            }
        }
    }
    return grouped;
}
//# sourceMappingURL=openapi.js.map