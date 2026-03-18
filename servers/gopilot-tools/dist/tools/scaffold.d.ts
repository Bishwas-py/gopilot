/**
 * Scaffold a new Go-first full-stack project.
 * Creates the directory structure, boilerplate files, and config.
 */
export declare function scaffoldProject(projectName: string, projectDir: string, framework: "svelte" | "react", goModule: string): Promise<{
    success: boolean;
    createdFiles: string[];
}>;
