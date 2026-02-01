import os from "node:os";
import path from "node:path";

import { loadConfig } from "../config/config.js";
import { resolveUserPath } from "../utils.js";
import { openVentureStateStore, resolveVentureDbPath } from "../agentforge/venture-state.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";

export type VentureListStatus = "active" | "completed" | "killed";

export async function ventureListCommand(params: {
  status?: VentureListStatus;
  /** If true, print only IDs one per line (for shell scripts). */
  idsOnly?: boolean;
}): Promise<void> {
  const cfg = loadConfig();
  const defaultAgentId = resolveDefaultAgentId(cfg);
  const workspaceDir =
    resolveAgentWorkspaceDir(cfg, defaultAgentId) ??
    path.join(os.homedir(), ".openclaw", "workspace");
  const resolvedWorkspace = resolveUserPath(workspaceDir);
  const dbPath = resolveVentureDbPath({ workspaceDir: resolvedWorkspace });
  const store = openVentureStateStore({ dbPath });

  const status = params.status;
  const list = store.listInvestments(status);

  if (params.idsOnly) {
    for (const inv of list) {
      console.log(inv.id);
    }
    return;
  }

  // Human-readable table or JSON could go here; for now idsOnly is the main use case for scripts
  for (const inv of list) {
    console.log(inv.id);
  }
}
