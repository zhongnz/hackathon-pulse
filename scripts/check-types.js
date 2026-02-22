import { execSync, spawnSync } from "child_process";
import { existsSync, readdirSync } from "fs";

// Find the project root
const possibleRoots = [
  "/vercel/share/v0-project",
  "/home/v0-project",
  process.cwd(),
];

let root = process.cwd();
for (const r of possibleRoots) {
  if (existsSync(r + "/package.json")) {
    root = r;
    break;
  }
}

console.log("Project root:", root);
console.log("Files in root:", readdirSync(root).join(", "));

// Try running tsc via the local node_modules
const tscPath = root + "/node_modules/.bin/tsc";
const hasTsc = existsSync(tscPath);
console.log("Local tsc exists:", hasTsc);

if (hasTsc) {
  try {
    const result = spawnSync(tscPath, ["--noEmit"], {
      encoding: "utf-8",
      timeout: 120000,
      cwd: root,
    });
    console.log("STDOUT:", result.stdout);
    console.log("STDERR:", result.stderr);
    console.log("Exit code:", result.status);
  } catch (e) {
    console.log("Error:", e.message);
  }
} else {
  // Try pnpm
  try {
    const result = spawnSync("pnpm", ["exec", "tsc", "--noEmit"], {
      encoding: "utf-8",
      timeout: 120000,
      cwd: root,
    });
    console.log("STDOUT:", result.stdout);
    console.log("STDERR:", result.stderr);
    console.log("Exit code:", result.status);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
