import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchOpenApi } from "./tools/openapi.js";
import { generateSchemas } from "./tools/generate-sdk.js";
import { generateRemotes } from "./tools/generate-sdk.js";
import { scaffoldProject } from "./tools/scaffold.js";

const server = new McpServer({
  name: "gopilot-tools",
  version: "0.1.0",
});

// Tool: Fetch OpenAPI spec from running Go backend
server.tool(
  "fetch_openapi",
  "Fetch the OpenAPI 3.1 spec from the running Go backend and cache it locally",
  {
    backendUrl: z
      .string()
      .default("http://localhost:8080")
      .describe("Go backend URL"),
    outputPath: z
      .string()
      .describe("Path to save the cached openapi.json"),
  },
  async ({ backendUrl, outputPath }) => {
    const result = await fetchOpenApi(backendUrl, outputPath);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: Generate validation schemas from OpenAPI
server.tool(
  "generate_schemas",
  "Generate TypeScript validation schemas (Valibot or Zod) from an OpenAPI spec",
  {
    openapiPath: z
      .string()
      .describe("Path to openapi.json"),
    outputPath: z
      .string()
      .describe("Path to write schemas.ts"),
    framework: z
      .enum(["svelte", "react"])
      .default("svelte")
      .describe("Frontend framework (svelte=Valibot, react=Zod)"),
  },
  async ({ openapiPath, outputPath, framework }) => {
    const result = await generateSchemas(openapiPath, outputPath, framework);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: Generate typed remote functions from OpenAPI
server.tool(
  "generate_remotes",
  "Generate typed remote functions (SvelteKit .remote.ts or Next.js .server.ts) from an OpenAPI spec",
  {
    openapiPath: z
      .string()
      .describe("Path to openapi.json"),
    outputDir: z
      .string()
      .describe("Directory to write remote files"),
    schemasImportPath: z
      .string()
      .default("../schemas")
      .describe("Import path for schemas.ts"),
    framework: z
      .enum(["svelte", "react"])
      .default("svelte")
      .describe("Frontend framework"),
  },
  async ({ openapiPath, outputDir, schemasImportPath, framework }) => {
    const result = await generateRemotes(
      openapiPath,
      outputDir,
      schemasImportPath,
      framework
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: Scaffold a new Go-first project
server.tool(
  "scaffold_project",
  "Scaffold a new Go-first full-stack project with backend and frontend structure",
  {
    projectName: z.string().describe("Project name (kebab-case)"),
    projectDir: z.string().describe("Directory to create the project in"),
    framework: z
      .enum(["svelte", "react"])
      .default("svelte")
      .describe("Frontend framework"),
    goModule: z
      .string()
      .describe("Go module path (e.g., github.com/user/project)"),
  },
  async ({ projectName, projectDir, framework, goModule }) => {
    const result = await scaffoldProject(
      projectName,
      projectDir,
      framework,
      goModule
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
