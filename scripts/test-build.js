import { execSync } from "child_process";

try {
  const output = execSync("cd /vercel/share/v0-project && npx next build 2>&1", {
    encoding: "utf-8",
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 10,
  });
  console.log("BUILD OUTPUT:");
  console.log(output);
} catch (e) {
  console.log("BUILD FAILED:");
  console.log(e.stdout || "");
  console.log(e.stderr || "");
  console.log("Exit code:", e.status);
}
