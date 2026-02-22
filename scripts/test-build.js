import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

console.log("Project root:", projectRoot);

try {
  const output = execSync("npx next build 2>&1", {
    encoding: "utf-8",
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 10,
    cwd: projectRoot,
  });
  console.log("BUILD OUTPUT:");
  console.log(output);
} catch (e) {
  console.log("BUILD FAILED:");
  console.log(e.stdout || "");
  console.log(e.stderr || "");
  console.log("Exit code:", e.status);
}
