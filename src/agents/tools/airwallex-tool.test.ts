import { describe, expect, it, vi } from "vitest";

import { createAirwallexBalancesTool, createAirwallexTools } from "./airwallex-tool.js";

function parseJsonResult(result: { content?: Array<{ type: string; text?: string }> }): unknown {
  const text = result.content?.[0]?.text;
  if (!text) return undefined;
  return JSON.parse(text);
}

describe("airwallex_balances", () => {
  it("returns error when Airwallex not configured", async () => {
    const origClientId = process.env.AIRWALLEX_CLIENT_ID;
    const origApiKey = process.env.AIRWALLEX_API_KEY;
    delete process.env.AIRWALLEX_CLIENT_ID;
    delete process.env.AIRWALLEX_API_KEY;
    try {
      const tool = createAirwallexBalancesTool();
      const result = await tool.execute("1", {});
      const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
      expect(out).toMatchObject({
        status: "error",
        error: expect.stringContaining("AIRWALLEX"),
      });
    } finally {
      if (origClientId !== undefined) process.env.AIRWALLEX_CLIENT_ID = origClientId;
      if (origApiKey !== undefined) process.env.AIRWALLEX_API_KEY = origApiKey;
    }
  });
});

describe("createAirwallexTools", () => {
  it("returns five tools with expected names", () => {
    const tools = createAirwallexTools();
    expect(tools).toHaveLength(5);
    const names = tools.map((t) => t.name);
    expect(names).toContain("airwallex_balances");
    expect(names).toContain("airwallex_get_quote");
    expect(names).toContain("airwallex_create_transfer");
    expect(names).toContain("airwallex_get_transfer");
    expect(names).toContain("airwallex_create_card");
  });
});
