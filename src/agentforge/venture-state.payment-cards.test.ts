import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getCardRemainingUsd,
  openVentureStateStore,
  resolveVentureDbPath,
  type VenturePaymentCard,
} from "./venture-state.js";

describe("venture-state payment cards", () => {
  it("addPaymentCard persists cardSpentUsd and getCardRemainingUsd returns limit minus spent", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "venture-payment-"));
    const dbPath = path.join(tmp, "venture.sqlite");
    const store = openVentureStateStore({ dbPath });

    const id = store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test Card",
      cardLimitUsd: 100,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: JSON.stringify({ encrypted: "x", iv: "y", authTag: "z" }),
    });
    expect(id).toBeDefined();

    const card = store.getActivePaymentCard();
    expect(card).not.toBeNull();
    expect(card?.cardLimitUsd).toBe(100);
    expect(card?.cardSpentUsd).toBe(0);
    expect(getCardRemainingUsd(card!)).toBe(100);

    store.recordCardSpend(id, 30);
    const after = store.getActivePaymentCard();
    expect(after?.cardSpentUsd).toBe(30);
    expect(getCardRemainingUsd(after!)).toBe(70);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("recordCardSpend clamps to card_limit_usd", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "venture-payment-"));
    const dbPath = path.join(tmp, "venture.sqlite");
    const store = openVentureStateStore({ dbPath });

    const id = store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 50,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: "{}",
    });

    store.recordCardSpend(id, 30);
    let card = store.getActivePaymentCard();
    expect(card?.cardSpentUsd).toBe(30);

    store.recordCardSpend(id, 25);
    card = store.getActivePaymentCard();
    expect(card?.cardSpentUsd).toBe(50);
    expect(getCardRemainingUsd(card!)).toBe(0);

    store.recordCardSpend(id, 10);
    card = store.getActivePaymentCard();
    expect(card?.cardSpentUsd).toBe(50);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("recordCardSpend no-op for unknown cardId", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "venture-payment-"));
    const dbPath = path.join(tmp, "venture.sqlite");
    const store = openVentureStateStore({ dbPath });

    store.addPaymentCard({
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 100,
      cardSpentUsd: 0,
      isActive: true,
      encryptedData: "{}",
    });

    store.recordCardSpend("nonexistent-id", 50);
    const card = store.getActivePaymentCard();
    expect(card?.cardSpentUsd).toBe(0);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("getCardRemainingUsd returns 0 when spent >= limit", () => {
    const card: VenturePaymentCard = {
      id: "x",
      cardLast4: "4242",
      cardName: "Test",
      cardLimitUsd: 20,
      cardSpentUsd: 20,
      isActive: true,
      encryptedData: "",
      createdAt: 0,
    };
    expect(getCardRemainingUsd(card)).toBe(0);
  });
});
