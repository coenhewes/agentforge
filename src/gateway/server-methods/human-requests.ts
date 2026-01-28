import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import type { HumanRequest } from "../../agents/tools/human-request-tool.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

const REQUESTS_DIR = path.join(os.homedir(), ".moltbot", "human-requests");

/**
 * Load all human requests from disk
 */
async function loadRequests(): Promise<HumanRequest[]> {
  try {
    await fs.access(REQUESTS_DIR);
  } catch {
    return [];
  }

  const files = await fs.readdir(REQUESTS_DIR);
  const requests: HumanRequest[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    try {
      const content = await fs.readFile(path.join(REQUESTS_DIR, file), "utf-8");
      const request = JSON.parse(content) as HumanRequest;
      requests.push(request);
    } catch {
      // Skip invalid files
    }
  }

  // Sort by timestamp descending (newest first)
  requests.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return requests;
}

/**
 * Load a single request by ID
 */
async function loadRequest(requestId: string): Promise<HumanRequest | null> {
  const requests = await loadRequests();
  return requests.find((r) => r.id === requestId) || null;
}

/**
 * Save a request to disk
 */
async function saveRequest(request: HumanRequest): Promise<void> {
  await fs.mkdir(REQUESTS_DIR, { recursive: true });
  const filename = `${request.timestamp.replace(/:/g, "-")}-${request.id}.json`;
  const filepath = path.join(REQUESTS_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(request, null, 2), "utf-8");
}

export const humanRequestsHandlers: GatewayRequestHandlers = {
  /**
   * List all human requests with optional filtering
   */
  "human.requests.list": async ({ respond, params }) => {
    try {
      const allRequests = await loadRequests();

      // Filter by status if provided
      const statusFilter = params?.status as string | undefined;
      const requests = statusFilter
        ? allRequests.filter((r) => r.status === statusFilter)
        : allRequests;

      respond(true, { requests }, undefined);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.UNAVAILABLE,
          `Failed to load requests: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  /**
   * Get details of a specific request
   */
  "human.requests.get": async ({ respond, params }) => {
    const requestId = params?.requestId as string | undefined;

    if (!requestId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "requestId is required"));
      return;
    }

    try {
      const request = await loadRequest(requestId);

      if (!request) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Request ${requestId} not found`),
        );
        return;
      }

      respond(true, { request }, undefined);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.UNAVAILABLE,
          `Failed to load request: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  /**
   * Respond to a human request (approve/deny/resolve)
   */
  "human.requests.respond": async ({ respond, params }) => {
    const requestId = params?.requestId as string | undefined;
    const action = params?.action as "approved" | "denied" | "resolved" | undefined;
    const response = params?.response as string | undefined;
    const respondedBy = (params?.respondedBy as string | undefined) || "human";

    if (!requestId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "requestId is required"));
      return;
    }

    if (!action || !["approved", "denied", "resolved"].includes(action)) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "action must be one of: approved, denied, resolved"),
      );
      return;
    }

    try {
      const request = await loadRequest(requestId);

      if (!request) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Request ${requestId} not found`),
        );
        return;
      }

      if (request.status !== "pending") {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `Request ${requestId} is already ${request.status}`,
          ),
        );
        return;
      }

      // Update request
      request.status = action;
      request.response = response;
      request.respondedAt = new Date().toISOString();
      request.respondedBy = respondedBy;

      await saveRequest(request);

      respond(true, { success: true, request }, undefined);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.UNAVAILABLE,
          `Failed to respond to request: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  /**
   * Delete a request
   */
  "human.requests.delete": async ({ respond, params }) => {
    const requestId = params?.requestId as string | undefined;

    if (!requestId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "requestId is required"));
      return;
    }

    try {
      const request = await loadRequest(requestId);

      if (!request) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `Request ${requestId} not found`),
        );
        return;
      }

      const filename = `${request.timestamp.replace(/:/g, "-")}-${request.id}.json`;
      const filepath = path.join(REQUESTS_DIR, filename);
      await fs.unlink(filepath);

      respond(true, { success: true }, undefined);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.UNAVAILABLE,
          `Failed to delete request: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },
};
