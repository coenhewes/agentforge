import { describe, expect, it, vi } from "vitest";

import {
  createStripeBalanceTool,
  createStripeCreatePayoutTool,
  createStripeListPayoutsTool,
  createStripeTools,
} from "./stripe-tool.js";

const getStripeConfigMock = vi.hoisted(() => vi.fn());
vi.mock("../../agentforge/stripe-integration.js", () => ({
  getStripeConfig: (...args: unknown[]) => getStripeConfigMock(...args),
  getStripeBalance: vi.fn().mockResolvedValue({
    available: 100,
    pending: 50,
    currency: "usd",
  }),
}));

function parseJsonResult(result: { content?: Array<{ type: string; text?: string }> }): unknown {
  const text = result.content?.[0]?.text;
  if (!text) return undefined;
  return JSON.parse(text);
}

describe("stripe_balance", () => {
  it("returns error when Stripe not configured", async () => {
    getStripeConfigMock.mockReturnValue(null);
    const tool = createStripeBalanceTool();
    const result = await tool.execute("1", {});
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("Stripe"),
    });
  });

  it("returns balance when configured", async () => {
    getStripeConfigMock.mockReturnValue({
      enabled: true,
      secretKey: "sk_test_xxx",
    });
    const tool = createStripeBalanceTool();
    const result = await tool.execute("1", {});
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "ok",
      available: 100,
      pending: 50,
      currency: "usd",
    });
  });
});

describe("stripe_list_payouts", () => {
  it("returns error when Stripe not configured", async () => {
    getStripeConfigMock.mockReturnValue(null);
    const tool = createStripeListPayoutsTool();
    const result = await tool.execute("1", {});
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("Stripe"),
    });
  });
});

describe("stripe_create_payout", () => {
  it("returns error when Stripe not configured", async () => {
    getStripeConfigMock.mockReturnValue(null);
    const tool = createStripeCreatePayoutTool();
    const result = await tool.execute("1", { amountCents: 1000 });
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("Stripe"),
    });
  });

  it("returns error when amountCents is invalid", async () => {
    getStripeConfigMock.mockReturnValue({ enabled: true, secretKey: "sk_test_xxx" });
    const tool = createStripeCreatePayoutTool();
    const result = await tool.execute("1", { amountCents: -1 });
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("amountCents"),
    });
  });
});

describe("createStripeTools", () => {
  it("returns three tools with expected names", () => {
    const tools = createStripeTools();
    expect(tools).toHaveLength(3);
    const names = tools.map((t) => t.name);
    expect(names).toContain("stripe_balance");
    expect(names).toContain("stripe_list_payouts");
    expect(names).toContain("stripe_create_payout");
  });
});
