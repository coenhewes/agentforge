import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { Type } from "@sinclair/typebox";

import { loadConfig } from "../../config/config.js";
import { callGateway } from "../../gateway/call.js";
import { resolveAgentIdFromSessionKey } from "../../routing/session-key.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";

const HumanRequestToolSchema = Type.Object({
  priority: Type.Union([
    Type.Literal("urgent"),
    Type.Literal("high"),
    Type.Literal("medium"),
    Type.Literal("low"),
  ]),
  category: Type.Union([
    Type.Literal("approval"),
    Type.Literal("access"),
    Type.Literal("blocked"),
    Type.Literal("critical"),
  ]),
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.String({ minLength: 1, maxLength: 2000 }),
  context: Type.Optional(Type.Record(Type.String(), Type.Any())),
  suggestedAction: Type.Optional(Type.String({ maxLength: 500 })),
  timeout: Type.Optional(Type.String({ maxLength: 20 })),
});

export interface HumanRequest {
  id: string;
  timestamp: string;
  agent: string;
  priority: "urgent" | "high" | "medium" | "low";
  category: "approval" | "access" | "blocked" | "critical";
  title: string;
  description: string;
  context?: Record<string, any>;
  suggestedAction?: string;
  timeout?: string;
  status: "pending" | "approved" | "denied" | "resolved" | "expired";
  response?: string;
  respondedAt?: string;
  respondedBy?: string;
}

const REQUESTS_DIR = path.join(os.homedir(), ".moltbot", "human-requests");

/**
 * Ensure requests directory exists
 */
async function ensureRequestsDir(): Promise<void> {
  await fs.mkdir(REQUESTS_DIR, { recursive: true });
}

/**
 * Save a human request to disk
 */
async function saveRequest(request: HumanRequest): Promise<void> {
  await ensureRequestsDir();
  const filename = `${request.timestamp.replace(/:/g, "-")}-${request.id}.json`;
  const filepath = path.join(REQUESTS_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(request, null, 2), "utf-8");
}

/**
 * Send notification to human via configured channels
 */
async function notifyHuman(request: HumanRequest): Promise<void> {
  const cfg = loadConfig();
  const notificationChannel = cfg.humanInterface?.channels?.notifications;

  if (!notificationChannel) {
    // No notification channel configured, skip
    return;
  }

  // Only notify for urgent/high priority
  if (request.priority !== "urgent" && request.priority !== "high") {
    return;
  }

  const priorityIcon = request.priority === "urgent" ? "🔴" : "🟡";
  const categoryLabel = request.category.toUpperCase();

  const message = `${priorityIcon} HUMAN REQUEST [${categoryLabel}]

Agent: ${request.agent}
Title: ${request.title}

${request.description}

${request.suggestedAction ? `Suggested: ${request.suggestedAction}\n` : ""}
Request ID: ${request.id}
Timeout: ${request.timeout || "none"}

Respond via:
- Dashboard: http://localhost:18789/requests/${request.id}
- TUI: node moltbot.mjs tui --session agent:human:main
- Command: node moltbot.mjs human respond ${request.id} "your response"`;

  try {
    // Send to agent:human:main session for centralized view
    await callGateway({
      method: "sessions.send",
      params: {
        sessionKey: "agent:human:main",
        message,
      },
      timeoutMs: 10_000,
    });

    // Also try to send to configured notification channel if it's different
    if (notificationChannel !== "agent:human:main") {
      await callGateway({
        method: "sessions.send",
        params: {
          sessionKey: notificationChannel,
          message,
        },
        timeoutMs: 10_000,
      });
    }
  } catch (err) {
    // Log but don't fail - notification is best-effort
    console.error("Failed to send human request notification:", err);
  }
}

export function createHumanRequestTool(opts?: { agentSessionKey?: string }): AnyAgentTool {
  return {
    label: "Request Human",
    name: "request_human",
    description:
      "Request human help when blocked, need approval, or require access to resources only humans can provide. Use for: spending approvals, API keys, external account access, critical decisions, or when stuck on a task.",
    parameters: HumanRequestToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;

      // Extract agent ID from session key
      const agentId = opts?.agentSessionKey
        ? resolveAgentIdFromSessionKey(opts.agentSessionKey)
        : "unknown";

      // Create request object
      const request: HumanRequest = {
        id: `REQ-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        timestamp: new Date().toISOString(),
        agent: agentId,
        priority: readStringParam(params, "priority", {
          required: true,
        }) as HumanRequest["priority"],
        category: readStringParam(params, "category", {
          required: true,
        }) as HumanRequest["category"],
        title: readStringParam(params, "title", { required: true }) || "",
        description: readStringParam(params, "description", { required: true }) || "",
        context: (params.context as Record<string, any>) || undefined,
        suggestedAction: readStringParam(params, "suggestedAction"),
        timeout: readStringParam(params, "timeout"),
        status: "pending",
      };

      try {
        // Save request to disk
        await saveRequest(request);

        // Send notification to human
        await notifyHuman(request);

        return jsonResult({
          requestId: request.id,
          status: "pending",
          message: `Request ${request.id} created successfully. Human will respond via dashboard or agent:human:main session. Check status with: sessions_history agent:human:main`,
        });
      } catch (err) {
        return jsonResult({
          error: `Failed to create human request: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    },
  };
}
