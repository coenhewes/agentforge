import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { resolveConfigDir, resolveHomeDir, resolveUserPath } from "../utils.js";

export function loadDotEnv(opts?: { quiet?: boolean }) {
  const quiet = opts?.quiet ?? true;

  // Load from process CWD first (dotenv default).
  dotenv.config({ quiet });

  // Then load global fallback: ~/.openclaw/.env (or OPENCLAW_STATE_DIR/.env),
  // without overriding any env vars already present.
  const globalEnvPath = path.join(resolveConfigDir(process.env), ".env");
  if (fs.existsSync(globalEnvPath)) {
    dotenv.config({ quiet, path: globalEnvPath, override: false });
  }

  // Then load agentforge env file: AGENTFORGE_ENV if set, else ~/.agentforge-env.
  // Used by VPS/systemd docs; loading here so manual CLI runs see the same vars.
  const agentforgeEnvPath = resolveAgentforgeEnvPath(process.env);
  if (agentforgeEnvPath && fs.existsSync(agentforgeEnvPath)) {
    dotenv.config({ quiet, path: agentforgeEnvPath, override: false });
  }
}

function resolveAgentforgeEnvPath(env: NodeJS.ProcessEnv): string | undefined {
  const explicit = env.AGENTFORGE_ENV?.trim();
  if (explicit) return resolveUserPath(explicit);
  const home = resolveHomeDir();
  if (!home) return undefined;
  return path.join(home, ".agentforge-env");
}
