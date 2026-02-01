/**
 * Stripe agent tools: balance, list payouts, create payout.
 * Uses existing getStripeConfig() from stripe-integration; no new env vars.
 * One-time setup: set Airwallex as default payout destination in Stripe (Dashboard or API).
 */

import { Type } from "@sinclair/typebox";

import { getStripeConfig, getStripeBalance } from "../../agentforge/stripe-integration.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

export function createStripeBalanceTool(): AnyAgentTool {
  return {
    label: "Stripe balance",
    name: "stripe_balance",
    description:
      "Return Stripe account balance (available and pending) per currency. Call before planning payouts or to see how much can be withdrawn to Airwallex.",
    parameters: Type.Object({}),
    execute: async () => {
      const config = getStripeConfig();
      if (!config?.enabled || !config.secretKey) {
        return jsonResult({
          status: "error",
          error: "Stripe is not configured or enabled. Set STRIPE_SECRET_KEY and enable Stripe.",
        });
      }
      try {
        const balance = await getStripeBalance();
        return jsonResult({ status: "ok", ...balance });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

const StripeListPayoutsSchema = Type.Object({
  limit: Type.Optional(
    Type.Number({ description: "Number of payouts to return (default 10, max 100)" }),
  ),
  status: Type.Optional(
    Type.String({
      description: "Filter by status: pending, in_transit, paid, failed, canceled",
    }),
  ),
});

export function createStripeListPayoutsTool(): AnyAgentTool {
  return {
    label: "Stripe list payouts",
    name: "stripe_list_payouts",
    description:
      "List Stripe payouts (to external bank, e.g. Airwallex). Optional limit and status filter. Use to see payout history and failure reasons.",
    parameters: StripeListPayoutsSchema,
    execute: async (_toolCallId, args) => {
      const config = getStripeConfig();
      if (!config?.enabled || !config.secretKey) {
        return jsonResult({
          status: "error",
          error: "Stripe is not configured or enabled. Set STRIPE_SECRET_KEY and enable Stripe.",
        });
      }
      const params = args as Record<string, unknown>;
      const limit = readNumberParam(params, "limit") ?? 10;
      const status = readStringParam(params, "status");

      const query = new URLSearchParams();
      query.set("limit", String(Math.min(100, Math.max(1, Math.floor(limit)))));
      if (status?.trim()) query.set("status", status.trim());

      try {
        const res = await fetch(`https://api.stripe.com/v1/payouts?${query.toString()}`, {
          headers: {
            Authorization: `Bearer ${config.secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
        const text = await res.text();
        if (!res.ok) {
          return jsonResult({
            status: "error",
            error: `Stripe API payouts: ${res.status} ${text}`,
          });
        }
        const data = JSON.parse(text) as { data: unknown[]; has_more?: boolean };
        return jsonResult({
          status: "ok",
          payouts: data.data,
          hasMore: data.has_more ?? false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

const StripeCreatePayoutSchema = Type.Object({
  amountCents: Type.Number({
    description: "Amount to payout in cents (e.g. 10000 for $100.00)",
  }),
  currency: Type.Optional(Type.String({ description: "Three-letter currency code (default usd)" })),
  idempotencyKey: Type.Optional(
    Type.String({ description: "Optional idempotency key to avoid duplicate payouts" }),
  ),
});

export function createStripeCreatePayoutTool(): AnyAgentTool {
  return {
    label: "Stripe create payout",
    name: "stripe_create_payout",
    description:
      "Create a payout to the default external bank account (e.g. Airwallex). Amount in cents. One-time setup: set Airwallex as default payout destination in Stripe Dashboard or API.",
    parameters: StripeCreatePayoutSchema,
    execute: async (_toolCallId, args) => {
      const config = getStripeConfig();
      if (!config?.enabled || !config.secretKey) {
        return jsonResult({
          status: "error",
          error: "Stripe is not configured or enabled. Set STRIPE_SECRET_KEY and enable Stripe.",
        });
      }
      const params = args as Record<string, unknown>;
      const amountCents = readNumberParam(params, "amountCents", { required: true });
      const currency = readStringParam(params, "currency")?.toLowerCase() ?? "usd";
      const idempotencyKey = readStringParam(params, "idempotencyKey");

      if (
        amountCents == null ||
        !Number.isFinite(amountCents) ||
        amountCents <= 0 ||
        !Number.isInteger(amountCents)
      ) {
        return jsonResult({
          status: "error",
          error: "amountCents must be a positive integer (cents).",
        });
      }

      const body = new URLSearchParams();
      body.set("amount", String(amountCents));
      body.set("currency", currency);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (idempotencyKey?.trim()) {
        headers["Idempotency-Key"] = idempotencyKey.trim();
      }

      try {
        const res = await fetch("https://api.stripe.com/v1/payouts", {
          method: "POST",
          headers,
          body: body.toString(),
        });
        const text = await res.text();
        if (!res.ok) {
          return jsonResult({
            status: "error",
            error: `Stripe API create payout: ${res.status} ${text}`,
          });
        }
        const payout = JSON.parse(text) as unknown;
        return jsonResult({ status: "ok", payout });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

export function createStripeTools(): AnyAgentTool[] {
  return [createStripeBalanceTool(), createStripeListPayoutsTool(), createStripeCreatePayoutTool()];
}
