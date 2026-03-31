import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function globalSetup() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(currentDir, "..", "..");
  const backendRoot = path.resolve(frontendRoot, "..", "backend");

  execSync("python -m alembic upgrade head", {
    cwd: backendRoot,
    stdio: "inherit",
  });

  execSync("python scripts/seed_platform_e2e.py", {
    cwd: backendRoot,
    stdio: "inherit",
  });
}

export default globalSetup;
