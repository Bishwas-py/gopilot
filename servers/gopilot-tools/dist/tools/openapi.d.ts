export interface OpenApiSpec {
    openapi: string;
    info: {
        title: string;
        version: string;
    };
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
        content?: Record<string, {
            schema?: SchemaObject | {
                $ref: string;
            };
        }>;
    };
    responses?: Record<string, {
        content?: Record<string, {
            schema?: SchemaObject | {
                $ref: string;
            };
        }>;
    }>;
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
export declare function fetchOpenApi(backendUrl: string, outputPath: string): Promise<{
    success: boolean;
    source: string;
    schemaCount: number;
    pathCount: number;
}>;
/**
 * Load an OpenAPI spec from a local file.
 */
export declare function loadSpec(specPath: string): OpenApiSpec;
/**
 * Resolve a $ref string to its schema name.
 * e.g., "#/components/schemas/Item" → "Item"
 */
export declare function resolveRefName(ref: string): string;
/**
 * Get all unique tags from the spec's operations.
 */
export declare function getAllTags(spec: OpenApiSpec): string[];
/**
 * Get all operations grouped by tag.
 */
export declare function getOperationsByTag(spec: OpenApiSpec): Map<string, Array<{
    method: string;
    path: string;
    operation: OperationObject;
}>>;
