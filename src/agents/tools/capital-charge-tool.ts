import os from "node:os";
import path from "node:path";

import { Type } from "@sinclair/typebox";

import type { OpenClawConfig } from "../../config/config.js";
import { loadConfig } from "../../config/config.js";
import { resolveUserPath } from "../../utils.js";
import { decryptCardData } from "../../agentforge/card-encryption.js";
import {
  getCardRemainingUsd,
  openVentureStateStore,
  resolveVentureDbPath,
} from "../../agentforge/venture-state.js";
import { getStripeConfig } from "../../agentforge/stripe-integration.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agent-scope.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const PAYMENT_CARD_INVESTMENT_ID = "payment-card";

const CapitalChargeToolSchema = Type.Object({
  amountUsd: Type.Number({
    description: "Amount to charge in USD (e.g. 19.99)",
  }),
  description: Type.String({
    description: "Short description of the charge (e.g. domain renewal)",
  }),
});

function resolveWorkspaceDir(config: OpenClawConfig | undefined): string {
  const cfg = config ?? loadConfig();
  return resolveUserPath(
    resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg)) ??
      path.join(os.homedir(), ".openclaw", "workspace"),
  );
}

function ensurePaymentCardInvestment(store: ReturnType<typeof openVentureStateStore>): void {
  if (store.getInvestment(PAYMENT_CARD_INVESTMENT_ID)) return;
  store.createInvestment({
    id: PAYMENT_CARD_INVESTMENT_ID,
    ventureName: "Payment Card",
    category: "card",
    boardDecisionDate: Date.now(),
    budgetUsd: 0,
    spentUsd: 0,
    revenueUsd: 0,
    status: "active",
    killThreshold: "n/a",
    daysRemaining: 0,
    completedAt: null,
  });
}

function parseExpiry(mmYy: string): { exp_month: number; exp_year: number } {
  const [mm, yy] = mmYy.split("/").map((s) => s.trim());
  const exp_month = Math.max(1, Math.min(12, Number.parseInt(mm, 10) || 1));
  const y = Number.parseInt(yy, 10) || 0;
  const exp_year = y < 100 ? 2000 + y : y;
  return { exp_month, exp_year };
}

async function createStripePaymentIntent(params: {
  secretKey: string;
  amountUsd: number;
  description: string;
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}): Promise<{ chargeId: string; receiptUrl?: string }> {
  const { secretKey, amountUsd, description, cardNumber, expMonth, expYear, cvc } = params;
  const amountCents = Math.round(amountUsd * 100);
  if (amountCents < 50) {
    throw new Error("Stripe minimum charge is $0.50");
  }

  const formBody = new URLSearchParams();
  formBody.set("type", "card");
  formBody.set("card[number]", cardNumber.replace(/\s/g, ""));
  formBody.set("card[exp_month]", String(expMonth));
  formBody.set("card[exp_year]", String(expYear));
  formBody.set("card[cvc]", cvc);

  const pmRes = await fetch("https://api.stripe.com/v1/payment_methods", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  if (!pmRes.ok) {
    const errBody = await pmRes.text();
    let message = `Stripe PaymentMethod failed: ${pmRes.status}`;
    try {
      const err = JSON.parse(errBody) as { error?: { message?: string } };
      if (err?.error?.message) message = err.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const pmData = (await pmRes.json()) as { id: string };
  const paymentMethodId = pmData.id;

  const piBody = new URLSearchParams();
  piBody.set("amount", String(amountCents));
  piBody.set("currency", "usd");
  piBody.set("payment_method", paymentMethodId);
  piBody.set("confirm", "true");
  piBody.set("description", description.slice(0, 500));

  const piRes = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: piBody.toString(),
  });

  if (!piRes.ok) {
    const errBody = await piRes.text();
    let message = `Stripe PaymentIntent failed: ${piRes.status}`;
    try {
      const err = JSON.parse(errBody) as { error?: { message?: string } };
      if (err?.error?.message) message = err.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const piData = (await piRes.json()) as {
    id: string;
    charges?: { data?: Array<{ receipt_url?: string }> };
  };
  const chargeId = piData.id;
  const receiptUrl = piData.charges?.data?.[0]?.receipt_url;

  return { chargeId, receiptUrl };
}

export function createCapitalChargeTool(opts?: {
  config?: OpenClawConfig;
  workspaceDir?: string;
}): AnyAgentTool {
  return {
    label: "Capital charge (active card)",
    name: "capital_charge_active_card",
    description:
      "Charge the active payment card configured in the Investment Portal. Use for expenses; amount is deducted from the card balance. Returns charge ID and remaining balance. Do not ask for raw card details in chat.",
    parameters: CapitalChargeToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const amountUsdRaw = readNumberParam(params, "amountUsd", { required: true });
      const description = readStringParam(params, "description", { required: true });
      if (typeof amountUsdRaw !== "number" || !Number.isFinite(amountUsdRaw) || amountUsdRaw <= 0) {
        return jsonResult({
          status: "error",
          error: "amountUsd must be a positive number",
        });
      }
      const amountUsd: number = amountUsdRaw;

      const workspaceDir = opts?.workspaceDir?.trim() || resolveWorkspaceDir(opts?.config);
      const dbPath = resolveVentureDbPath({ workspaceDir });
      const store = openVentureStateStore({ dbPath });

      const card = store.getActivePaymentCard();
      if (!card) {
        return jsonResult({
          status: "error",
          error:
            "No active payment card configured. Add a card in the Investment Portal (Settings → press 'c').",
        });
      }

      const remainingUsd = getCardRemainingUsd(card);
      if (amountUsd > remainingUsd) {
        return jsonResult({
          status: "error",
          error: `Insufficient balance. Remaining: $${remainingUsd.toFixed(2)}; requested: $${amountUsd.toFixed(2)}`,
          remainingUsd,
        });
      }

      const stripeConfig = getStripeConfig();
      if (!stripeConfig?.enabled || !stripeConfig.secretKey) {
        return jsonResult({
          status: "error",
          error: "Stripe is not configured or enabled. Set STRIPE_SECRET_KEY and enable Stripe.",
        });
      }

      let encrypted: { encrypted: string; iv: string; authTag: string };
      try {
        encrypted = JSON.parse(card.encryptedData) as {
          encrypted: string;
          iv: string;
          authTag: string;
        };
      } catch {
        return jsonResult({
          status: "error",
          error: "Failed to read card data (invalid encryption).",
        });
      }

      let cardData: { number: string; cvv: string; expiry: string; name: string };
      try {
        cardData = decryptCardData(encrypted);
      } catch {
        return jsonResult({
          status: "error",
          error:
            "Failed to decrypt card data. Check encryption key (AGENTFORGE_CARD_KEY or config).",
        });
      }

      const { exp_month, exp_year } = parseExpiry(cardData.expiry);

      try {
        const { chargeId, receiptUrl } = await createStripePaymentIntent({
          secretKey: stripeConfig.secretKey,
          amountUsd,
          description,
          cardNumber: cardData.number.replace(/\s/g, ""),
          expMonth: exp_month,
          expYear: exp_year,
          cvc: cardData.cvv,
        });

        store.recordCardSpend(card.id, amountUsd);
        ensurePaymentCardInvestment(store);
        store.addTransaction(
          "expense",
          amountUsd,
          PAYMENT_CARD_INVESTMENT_ID,
          `${description} (Stripe ${chargeId})`,
        );

        const newRemaining = remainingUsd - amountUsd;

        return jsonResult({
          status: "ok",
          chargeId,
          receiptUrl: receiptUrl ?? undefined,
          amountUsd,
          remainingUsd: newRemaining,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({
          status: "error",
          error: message,
          remainingUsd,
        });
      }
    },
  };
}

/**
 * Tool that returns current venture capital status. Ledger "Available" is the single source of truth for total spendable (card spend is tracked on the card; don't add card to avoid double count).
 * CEO can call this before planning spend to know how much is available.
 */
export function createVentureCapitalStatusTool(opts?: {
  config?: OpenClawConfig;
  workspaceDir?: string;
}): AnyAgentTool {
  return {
    label: "Venture capital status",
    name: "venture_capital_status",
    description:
      "Return current capital: ledger Available (total spendable) and card remaining (for charges via capital_charge_active_card). Call before planning spend.",
    parameters: Type.Object({}),
    execute: async () => {
      const workspaceDir = opts?.workspaceDir?.trim() || resolveWorkspaceDir(opts?.config);
      const dbPath = resolveVentureDbPath({ workspaceDir });
      const store = openVentureStateStore({ dbPath });
      const ledgerAvailable = store.getCapital("available");
      const cards = store.listPaymentCards();
      const cardRemaining = cards.reduce(
        (sum, c) => sum + (c.cardLimitUsd - (c.cardSpentUsd ?? 0)),
        0,
      );
      return jsonResult({
        ledgerAvailable,
        cardRemaining,
        totalSpendable: ledgerAvailable,
      });
    },
  };
}
