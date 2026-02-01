import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createCapitalChargeTool } from "./capital-charge-tool.js";

const fetchMock = vi.hoisted(() => vi.fn());
const getStripeConfigMock = vi.hoisted(() => vi.fn());

vi.mock("../../agentforge/stripe-integration.js", () => ({
  getStripeConfig: (...args: unknown[]) => getStripeConfigMock(...args),
}));
vi.stubGlobal("fetch", fetchMock);

function parseJsonResult(result: { content?: Array<{ type: string; text?: string }> }): unknown {
  const text = result.content?.[0]?.text;
  if (!text) return undefined;
  return JSON.parse(text);
}

describe("capital_charge_active_card", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "capital-charge-test-"));
  const workspaceDir = path.join(tmpDir, "workspace");
  const opsDir = path.join(workspaceDir, "ops");
  fs.mkdirSync(opsDir, { recursive: true });

  it("returns error when no active payment card configured", async () => {
    getStripeConfigMock.mockReturnValue({ enabled: true, secretKey: "sk_test_xxx" });
    const tool = createCapitalChargeTool({ workspaceDir });
    const result = await tool.execute("1", { amountUsd: 10, description: "test" });
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("No active payment card"),
    });
  });

  it("returns error when Stripe not configured", async () => {
    getStripeConfigMock.mockReturnValue(null);
    const { openVentureStateStore, resolveVentureDbPath } =
      await import("../../agentforge/venture-state.js");
    const dbPath = resolveVentureDbPath({ workspaceDir });
    const store = openVentureStateStore({ dbPath });
    store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 100,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: JSON.stringify({ encrypted: "a", iv: "b", authTag: "c" }),
    });

    const tool = createCapitalChargeTool({ workspaceDir });
    const result = await tool.execute("1", { amountUsd: 10, description: "test" });
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("Stripe"),
    });
  });

  it("returns error when amountUsd > remaining balance", async () => {
    getStripeConfigMock.mockReturnValue({ enabled: true, secretKey: "sk_test_xxx" });
    const { openVentureStateStore, resolveVentureDbPath } =
      await import("../../agentforge/venture-state.js");
    const dbPath = path.join(workspaceDir, "ops", "venture.sqlite");
    const store = openVentureStateStore({ dbPath });
    store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 5,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: JSON.stringify({ encrypted: "a", iv: "b", authTag: "c" }),
    });

    const tool = createCapitalChargeTool({ workspaceDir });
    const result = await tool.execute("1", { amountUsd: 10, description: "test" });
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("Insufficient balance"),
      remainingUsd: 5,
    });
  });

  it("returns error when encryptedData is invalid JSON", async () => {
    getStripeConfigMock.mockReturnValue({ enabled: true, secretKey: "sk_test_xxx" });
    const { openVentureStateStore, resolveVentureDbPath } =
      await import("../../agentforge/venture-state.js");
    const dbPath = resolveVentureDbPath({ workspaceDir });
    const store = openVentureStateStore({ dbPath });
    store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 100,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: "not-json",
    });

    const tool = createCapitalChargeTool({ workspaceDir });
    const result = await tool.execute("1", { amountUsd: 10, description: "test" });
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "error",
      error: expect.stringContaining("invalid encryption"),
    });
  });

  it("on Stripe success: recordCardSpend, addTransaction, returns remainingUsd", async () => {
    getStripeConfigMock.mockReturnValue({ enabled: true, secretKey: "sk_test_xxx" });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "pm_xxx" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "pi_xxx",
          charges: { data: [{ receipt_url: "https://receipt.stripe.com/xxx" }] },
        }),
      } as Response);

    const { openVentureStateStore, resolveVentureDbPath } =
      await import("../../agentforge/venture-state.js");
    const { encryptCardData, getOrGenerateEncryptionKey } =
      await import("../../agentforge/card-encryption.js");
    getOrGenerateEncryptionKey();
    const encrypted = encryptCardData({
      number: "4242424242424242",
      cvv: "123",
      expiry: "12/30",
      name: "Test",
    });

    const dbPath = resolveVentureDbPath({ workspaceDir });
    const store = openVentureStateStore({ dbPath });
    const cardId = store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 100,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: JSON.stringify(encrypted),
    });

    const tool = createCapitalChargeTool({ workspaceDir });
    const result = await tool.execute("1", { amountUsd: 15.5, description: "domain" });
    const out = parseJsonResult(result as { content?: Array<{ type: string; text?: string }> });
    expect(out).toMatchObject({
      status: "ok",
      chargeId: "pi_xxx",
      amountUsd: 15.5,
      remainingUsd: 84.5,
    });

    const card = store.getActivePaymentCard();
    expect(card?.cardSpentUsd).toBe(15.5);
    const txns = store.listTransactions("payment-card");
    expect(txns.length).toBe(1);
    expect(txns[0]?.amountUsd).toBe(15.5);
    expect(txns[0]?.description).toContain("domain");
    expect(txns[0]?.description).toContain("pi_xxx");

    fetchMock.mockClear();
  });

  it("response never contains raw card number or cvv", async () => {
    getStripeConfigMock.mockReturnValue({ enabled: true, secretKey: "sk_test_xxx" });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "pm_xxx" }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "pi_xxx" }),
      } as Response);

    const { openVentureStateStore, resolveVentureDbPath } =
      await import("../../agentforge/venture-state.js");
    const { encryptCardData, getOrGenerateEncryptionKey } =
      await import("../../agentforge/card-encryption.js");
    getOrGenerateEncryptionKey();
    const encrypted = encryptCardData({
      number: "4242424242424242",
      cvv: "999",
      expiry: "12/30",
      name: "Test",
    });
    const dbPath = resolveVentureDbPath({ workspaceDir });
    const store = openVentureStateStore({ dbPath });
    store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 100,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: JSON.stringify(encrypted),
    });

    const tool = createCapitalChargeTool({ workspaceDir });
    const result = await tool.execute("1", { amountUsd: 1, description: "test" });
    const text = (result as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? "";
    expect(text).not.toContain("4242424242424242");
    expect(text).not.toContain("999");
    expect(JSON.parse(text).status).toBe("ok");

    fetchMock.mockClear();
  });
});
