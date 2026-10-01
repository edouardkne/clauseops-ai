// Use the existing TypeScript compiler and Node test runner; no test framework.
import ts from "typescript";
import { mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const files = (await readdir("tests")).filter(name => name.endsWith(".test.ts"));
await mkdir(".qa/test-build", { recursive: true });
const program = ts.createProgram(files.map(name => resolve("tests", name)), {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  rootDir: resolve("."),
  outDir: resolve(".qa/test-build"),
  esModuleInterop: true,
  strict: true,
  skipLibCheck: true,
  noEmitOnError: true,
  types: ["node"],
});
const result = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(),
    getCanonicalFileName: name => name,
    getNewLine: () => "\n",
  }));
  process.exitCode = 1;
} else {
  const run = spawnSync(process.execPath, ["--test", ...files.map(name => resolve(".qa/test-build/tests", name.replace(/\.ts$/, ".js")))], { stdio: "inherit" });
  process.exitCode = run.status ?? 1;
}
