import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolved = vi.hoisted(() => ({
  requestTimeoutMs: 10_000,
  defaultProfile: "clawd",
  profiles: {
    clawd: { color: "#FF4500", cdpPort: 18800 },
    chrome: { color: "#00AA00", driver: "extension", cdpUrl: "http://127.0.0.1:19004" },
  },
}));

const mockState = vi.hoisted(() => ({ resolved: mockResolved }));

const dispatchMock = vi.hoisted(() => vi.fn());

vi.mock("./control-service.js", () => ({
  createBrowserControlContext: vi.fn(() => ({})),
  getBrowserControlState: vi.fn(() => mockState),
  startBrowserControlServiceFromConfig: vi.fn(async () => mockState),
}));

vi.mock("./routes/dispatcher.js", () => ({
  createBrowserRouteDispatcher: vi.fn(() => ({ dispatch: dispatchMock })),
}));

describe("client-fetch fetchBrowserJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries on timeout and eventually succeeds", async () => {
    dispatchMock
      .mockRejectedValueOnce(new Error("timed out"))
      .mockResolvedValueOnce({ status: 200, body: { data: "ok" } });

    const { fetchBrowserJson } = await import("./client-fetch.js");
    const result = await fetchBrowserJson("/status");

    expect(result).toEqual({ data: "ok" });
    expect(dispatchMock).toHaveBeenCalledTimes(2);
  });

  it("tries alternate profile (clawd → chrome) after transient failure and succeeds", async () => {
    dispatchMock
      .mockRejectedValueOnce(new Error("timed out"))
      .mockRejectedValueOnce(new Error("timed out"))
      .mockRejectedValueOnce(new Error("timed out"))
      .mockResolvedValueOnce({ status: 200, body: { profile: "chrome", ok: true } });

    const { fetchBrowserJson } = await import("./client-fetch.js");
    const result = await fetchBrowserJson("/status");

    expect(result).toEqual({ profile: "chrome", ok: true });
    expect(dispatchMock).toHaveBeenCalledTimes(4);
    const calls = dispatchMock.mock.calls;
    expect(calls[0][0].query?.profile).toBeUndefined();
    expect(calls[3][0].query?.profile).toBe("chrome");
  });
});
