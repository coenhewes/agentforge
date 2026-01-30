import { formatCliCommand } from "../cli/command-format.js";
import {
  createBrowserControlContext,
  getBrowserControlState,
  startBrowserControlServiceFromConfig,
} from "./control-service.js";
import {
  DEFAULT_BROWSER_DEFAULT_PROFILE_NAME,
  DEFAULT_CLAWD_BROWSER_PROFILE_NAME,
} from "./constants.js";
import { createBrowserRouteDispatcher } from "./routes/dispatcher.js";

const DEFAULT_LOOPBACK_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [500, 1000];

function isAbsoluteHttp(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function isTransientError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("aborted") ||
    lower.includes("abort") ||
    lower.includes("aborterror") ||
    lower.includes("can't reach") ||
    lower.includes("econnrefused")
  );
}

function enhanceBrowserFetchError(url: string, err: unknown, timeoutMs: number): Error {
  const hint = isAbsoluteHttp(url)
    ? "If this is a sandboxed session, ensure the sandbox browser is running and try again."
    : `Start (or restart) the Moltbot gateway (Moltbot.app menubar, or \`${formatCliCommand("moltbot gateway")}\`) and try again.`;
  const msg = String(err);
  const msgLower = msg.toLowerCase();
  const looksLikeTimeout =
    msgLower.includes("timed out") ||
    msgLower.includes("timeout") ||
    msgLower.includes("aborted") ||
    msgLower.includes("abort") ||
    msgLower.includes("aborterror");
  if (looksLikeTimeout) {
    return new Error(
      `Can't reach the clawd browser control service (timed out after ${timeoutMs}ms). ${hint}`,
    );
  }
  return new Error(`Can't reach the clawd browser control service. ${hint} (${msg})`);
}

async function fetchHttpJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init.timeoutMs ?? 5000;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

type DispatchRequest = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  query: Record<string, unknown>;
  body: unknown;
};

async function runOneLoopbackAttempt(
  request: DispatchRequest,
  timeoutMs: number,
): Promise<{ status: number; body: unknown }> {
  const dispatcher = createBrowserRouteDispatcher(createBrowserControlContext());
  const dispatchPromise = dispatcher.dispatch(request);
  const result = await (timeoutMs
    ? Promise.race([
        dispatchPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timed out")), timeoutMs),
        ),
      ])
    : dispatchPromise);
  return result;
}

function getAlternateProfile(
  currentProfile: string,
  profiles: Record<string, { cdpPort?: number; cdpUrl?: string; driver?: string; color: string }>,
): string | null {
  if (
    currentProfile === DEFAULT_CLAWD_BROWSER_PROFILE_NAME &&
    profiles[DEFAULT_BROWSER_DEFAULT_PROFILE_NAME]
  )
    return DEFAULT_BROWSER_DEFAULT_PROFILE_NAME;
  if (
    currentProfile === DEFAULT_BROWSER_DEFAULT_PROFILE_NAME &&
    profiles[DEFAULT_CLAWD_BROWSER_PROFILE_NAME]
  )
    return DEFAULT_CLAWD_BROWSER_PROFILE_NAME;
  return null;
}

export async function fetchBrowserJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 5000;
  try {
    if (isAbsoluteHttp(url)) {
      return await fetchHttpJson<T>(url, { ...init, timeoutMs });
    }
    const started = await startBrowserControlServiceFromConfig();
    if (!started) {
      throw new Error("browser control disabled");
    }
    const resolved = getBrowserControlState()?.resolved;
    const loopbackTimeoutMs =
      init?.timeoutMs ?? resolved?.requestTimeoutMs ?? DEFAULT_LOOPBACK_TIMEOUT_MS;

    const parsed = new URL(url, "http://localhost");
    const query: Record<string, unknown> = {};
    for (const [key, value] of parsed.searchParams.entries()) {
      query[key] = value;
    }
    let body = init?.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // keep as string
      }
    }

    const method =
      init?.method?.toUpperCase() === "DELETE"
        ? "DELETE"
        : init?.method?.toUpperCase() === "POST"
          ? "POST"
          : "GET";

    const runWithRetries = async (
      req: DispatchRequest,
      timeout: number,
    ): Promise<{ status: number; body: unknown }> => {
      let lastErr: unknown;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          return await runOneLoopbackAttempt(req, timeout);
        } catch (err) {
          lastErr = err;
          const msg = String(err instanceof Error ? err.message : err);
          if (!isTransientError(msg)) throw err;
          if (attempt < MAX_RETRIES - 1) {
            const delay = RETRY_BACKOFF_MS[attempt] ?? 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
      throw lastErr;
    };

    let result: { status: number; body: unknown };
    try {
      result = await runWithRetries(
        { method, path: parsed.pathname, query, body },
        loopbackTimeoutMs,
      );
    } catch (firstErr) {
      const msg = String(firstErr instanceof Error ? firstErr.message : firstErr);
      if (!isTransientError(msg) || !resolved) throw firstErr;

      const bodyObj =
        body && typeof body === "object" && !Array.isArray(body)
          ? (body as unknown as Record<string, unknown>)
          : null;
      const currentProfile =
        (typeof query.profile === "string" ? query.profile.trim() : null) ??
        (bodyObj && typeof bodyObj.profile === "string" ? bodyObj.profile.trim() : null) ??
        resolved.defaultProfile;
      const alternate = getAlternateProfile(currentProfile, resolved.profiles);
      if (!alternate) throw firstErr;

      const altQuery = { ...query, profile: alternate };
      const altBody = bodyObj ? { ...bodyObj, profile: alternate } : body;
      result = await runWithRetries(
        { method, path: parsed.pathname, query: altQuery, body: altBody },
        loopbackTimeoutMs,
      );
    }

    if (result.status >= 400) {
      const message =
        result.body && typeof result.body === "object" && "error" in result.body
          ? String((result.body as { error?: unknown }).error)
          : `HTTP ${result.status}`;
      throw new Error(message);
    }
    return result.body as T;
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    // Don't wrap server-side validation/errors (4xx from act route); preserve so model sees real message.
    if (
      /fields are required|ref is required|required for fill|HTTP 4\d{2}/.test(msg) ||
      msg.includes("ref and values") ||
      msg.includes("width and height")
    ) {
      throw err instanceof Error ? err : new Error(msg);
    }
    const effectiveTimeout =
      init?.timeoutMs ??
      getBrowserControlState()?.resolved?.requestTimeoutMs ??
      DEFAULT_LOOPBACK_TIMEOUT_MS;
    throw enhanceBrowserFetchError(url, err, effectiveTimeout);
  }
}
