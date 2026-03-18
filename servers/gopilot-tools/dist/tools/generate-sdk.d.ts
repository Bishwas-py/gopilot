/**
 * Generate validation schemas (Valibot or Zod) from OpenAPI component schemas.
 */
export declare function generateSchemas(openapiPath: string, outputPath: string, framework: "svelte" | "react"): Promise<{
    success: boolean;
    schemaCount: number;
    outputPath: string;
}>;
/**
 * Generate typed remote functions from OpenAPI operations.
 */
export declare function generateRemotes(openapiPath: string, outputDir: string, schemasImportPath: string, framework: "svelte" | "react"): Promise<{
    success: boolean;
    fileCount: number;
    files: string[];
}>;
