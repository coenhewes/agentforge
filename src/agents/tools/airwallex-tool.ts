/**
 * Airwallex API client and agent tools: balances, FX quotes, transfers, virtual cards.
 * Credentials: AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY; optional AIRWALLEX_BASE_URL (default production).
 */

import { Type } from "@sinclair/typebox";

import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const DEFAULT_BASE_URL = "https://api.airwallex.com";
const TOKEN_CACHE_TTL_MS = 50 * 60 * 1000; // 50 min

type AirwallexConfig = {
  clientId: string;
  apiKey: string;
  baseUrl: string;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function getAirwallexConfig(): AirwallexConfig | null {
  const clientId = process.env.AIRWALLEX_CLIENT_ID?.trim();
  const apiKey = process.env.AIRWALLEX_API_KEY?.trim();
  if (!clientId || !apiKey) return null;
  const baseUrl = process.env.AIRWALLEX_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return { clientId, apiKey, baseUrl };
}

async function getToken(config: AirwallexConfig): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  const res = await fetch(`${config.baseUrl}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.clientId,
      "x-api-key": config.apiKey,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airwallex auth failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { token?: string };
  const token = data?.token;
  if (!token) throw new Error("Airwallex auth: no token in response");
  tokenCache = {
    token,
    expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
  };
  return token;
}

async function apiGet(config: AirwallexConfig, path: string): Promise<unknown> {
  const token = await getToken(config);
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Airwallex API ${path}: ${res.status} ${text}`);
  }
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

async function apiPost(
  config: AirwallexConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const token = await getToken(config);
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Airwallex API ${path}: ${res.status} ${text}`);
  }
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

// --- Balances ---

export function createAirwallexBalancesTool(): AnyAgentTool {
  return {
    label: "Airwallex balances",
    name: "airwallex_balances",
    description:
      "Return current Airwallex account balances (available, pending, total) per currency. Call before planning payouts or spend.",
    parameters: Type.Object({}),
    execute: async () => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      try {
        const data = await apiGet(config, "/api/v1/balances/current");
        return jsonResult({ status: "ok", balances: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- Quote ---

const AirwallexQuoteSchema = Type.Object({
  sellAmount: Type.Number({ description: "Amount to sell (e.g. 100)" }),
  sellCurrency: Type.String({ description: "Sell currency code (e.g. USD)" }),
  buyCurrency: Type.String({ description: "Buy currency code (e.g. AUD)" }),
  buyAmount: Type.Optional(
    Type.Number({ description: "Amount to buy; omit if sell amount is fixed" }),
  ),
  validity: Type.Optional(
    Type.String({
      description: "Quote validity e.g. HR_24",
    }),
  ),
  conversionDate: Type.Optional(Type.String({ description: "Conversion date YYYY-MM-DD" })),
});

export function createAirwallexGetQuoteTool(): AnyAgentTool {
  return {
    label: "Airwallex FX quote",
    name: "airwallex_get_quote",
    description:
      "Get a guaranteed FX quote for a currency pair. Returns quote_id and rate validity. Use quote_id in create_transfer when creating an FX transfer.",
    parameters: AirwallexQuoteSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const sellAmount = readNumberParam(params, "sellAmount", { required: true });
      const sellCurrency = readStringParam(params, "sellCurrency", {
        required: true,
      });
      const buyCurrency = readStringParam(params, "buyCurrency", {
        required: true,
      });
      const buyAmount = readNumberParam(params, "buyAmount");
      const validity = readStringParam(params, "validity") ?? "HR_24";
      const conversionDate = readStringParam(params, "conversionDate");

      const body: Record<string, unknown> = {
        sell_amount: sellAmount,
        sell_currency: sellCurrency,
        buy_currency: buyCurrency,
        validity,
      };
      if (buyAmount != null && Number.isFinite(buyAmount)) {
        body.buy_amount = buyAmount;
      }
      if (conversionDate) body.conversion_date = conversionDate;

      try {
        const data = await apiPost(config, "/api/v1/fx/quotes/create", body);
        return jsonResult({ status: "ok", quote: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- Create beneficiary ---

const AirwallexCreateBeneficiarySchema = Type.Object({
  beneficiaryJson: Type.String({
    description:
      "JSON string: beneficiary object with type (BANK_ACCOUNT or DIGITAL_WALLET), bank_details or digital_wallet, address, entity_type (PERSONAL or COMPANY), transfer_methods (SWIFT/LOCAL), company_name or first_name/last_name",
  }),
});

export function createAirwallexCreateBeneficiaryTool(): AnyAgentTool {
  return {
    label: "Airwallex create beneficiary",
    name: "airwallex_create_beneficiary",
    description:
      "Create a saved beneficiary for reuse in transfers. Provide full beneficiary object as beneficiaryJson. Returns beneficiary id for use in airwallex_create_transfer with beneficiary_id.",
    parameters: AirwallexCreateBeneficiarySchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const beneficiaryJson = readStringParam(params, "beneficiaryJson", {
        required: true,
      });
      let beneficiary: unknown;
      try {
        beneficiary = JSON.parse(beneficiaryJson!) as unknown;
      } catch {
        return jsonResult({
          status: "error",
          error: "beneficiaryJson must be valid JSON",
        });
      }
      try {
        const data = await apiPost(config, "/api/v1/beneficiaries/create", {
          beneficiary,
        });
        return jsonResult({ status: "ok", beneficiary: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- List beneficiaries ---

const AirwallexListBeneficiariesSchema = Type.Object({
  pageNum: Type.Optional(Type.Number({ description: "Page number (default 1)" })),
  pageSize: Type.Optional(Type.Number({ description: "Page size (default 20)" })),
  nickName: Type.Optional(Type.String({ description: "Filter by beneficiary nick name" })),
});

export function createAirwallexListBeneficiariesTool(): AnyAgentTool {
  return {
    label: "Airwallex list beneficiaries",
    name: "airwallex_list_beneficiaries",
    description:
      "List saved beneficiaries. Optional pagination and nick_name filter. Use beneficiary ids in airwallex_create_transfer.",
    parameters: AirwallexListBeneficiariesSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const pageNum = readNumberParam(params, "pageNum") ?? 1;
      const pageSize = readNumberParam(params, "pageSize") ?? 20;
      const nickName = readStringParam(params, "nickName");
      const query = new URLSearchParams();
      query.set("page_num", String(Math.max(1, Math.floor(pageNum))));
      query.set("page_size", String(Math.min(100, Math.max(1, Math.floor(pageSize)))));
      if (nickName?.trim()) query.set("nick_name", nickName.trim());
      const path = `/api/v1/beneficiaries?${query.toString()}`;
      try {
        const data = await apiGet(config, path);
        return jsonResult({ status: "ok", beneficiaries: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- Get beneficiary ---

const AirwallexGetBeneficiarySchema = Type.Object({
  beneficiaryId: Type.String({ description: "Beneficiary ID from create or list" }),
});

export function createAirwallexGetBeneficiaryTool(): AnyAgentTool {
  return {
    label: "Airwallex get beneficiary",
    name: "airwallex_get_beneficiary",
    description: "Get a saved beneficiary by ID.",
    parameters: AirwallexGetBeneficiarySchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const beneficiaryId = readStringParam(params, "beneficiaryId", {
        required: true,
      });
      try {
        const data = await apiGet(
          config,
          `/api/v1/beneficiaries/${encodeURIComponent(beneficiaryId!)}`,
        );
        return jsonResult({ status: "ok", beneficiary: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- Create transfer ---

const AirwallexCreateTransferSchema = Type.Object({
  requestId: Type.String({
    description: "Unique request ID (UUID) for idempotency",
  }),
  transferAmount: Type.String({ description: "Amount e.g. 1000.00" }),
  transferCurrency: Type.String({ description: "Transfer currency e.g. USD" }),
  sourceCurrency: Type.String({ description: "Source currency e.g. USD" }),
  transferMethod: Type.String({
    description: "e.g. LOCAL or SWIFT",
  }),
  reason: Type.String({ description: "Reason for transfer e.g. travel" }),
  reference: Type.String({ description: "Reference e.g. INV-123456" }),
  beneficiaryId: Type.Optional(
    Type.String({
      description:
        "Saved beneficiary ID from airwallex_create_beneficiary or airwallex_list_beneficiaries; use instead of beneficiaryJson",
    }),
  ),
  beneficiaryJson: Type.Optional(
    Type.String({
      description:
        "JSON string: beneficiary object when not using beneficiary_id (address, bank_details, entity_type, company_name or first_name/last_name)",
    }),
  ),
  quoteId: Type.Optional(Type.String({ description: "Quote ID from airwallex_get_quote for FX" })),
});

export function createAirwallexCreateTransferTool(): AnyAgentTool {
  return {
    label: "Airwallex create transfer",
    name: "airwallex_create_transfer",
    description:
      "Create an outbound transfer. Provide either beneficiary_id (saved beneficiary from airwallex_create_beneficiary) or beneficiaryJson (inline beneficiary object). Use quote_id from airwallex_get_quote for FX.",
    parameters: AirwallexCreateTransferSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const requestId = readStringParam(params, "requestId", { required: true });
      const transferAmount = readStringParam(params, "transferAmount", {
        required: true,
      });
      const transferCurrency = readStringParam(params, "transferCurrency", {
        required: true,
      });
      const sourceCurrency = readStringParam(params, "sourceCurrency", {
        required: true,
      });
      const transferMethod = readStringParam(params, "transferMethod", {
        required: true,
      });
      const reason = readStringParam(params, "reason", { required: true });
      const reference = readStringParam(params, "reference", { required: true });
      const beneficiaryId = readStringParam(params, "beneficiaryId");
      const beneficiaryJson = readStringParam(params, "beneficiaryJson");
      const quoteId = readStringParam(params, "quoteId");

      const body: Record<string, unknown> = {
        request_id: requestId,
        transfer_amount: transferAmount,
        transfer_currency: transferCurrency,
        source_currency: sourceCurrency,
        transfer_method: transferMethod,
        reason,
        reference,
      };
      if (beneficiaryId?.trim()) {
        body.beneficiary_id = beneficiaryId.trim();
      } else if (beneficiaryJson?.trim()) {
        let beneficiary: unknown;
        try {
          beneficiary = JSON.parse(beneficiaryJson) as unknown;
        } catch {
          return jsonResult({
            status: "error",
            error: "beneficiaryJson must be valid JSON",
          });
        }
        body.beneficiary = beneficiary;
      } else {
        return jsonResult({
          status: "error",
          error:
            "Provide either beneficiary_id (saved beneficiary) or beneficiaryJson (inline beneficiary object).",
        });
      }
      if (quoteId) body.quote_id = quoteId;

      try {
        const data = await apiPost(config, "/api/v1/transfers/create", body);
        return jsonResult({ status: "ok", transfer: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- Get transfer ---

const AirwallexGetTransferSchema = Type.Object({
  transferId: Type.String({ description: "Transfer ID from create_transfer" }),
});

export function createAirwallexGetTransferTool(): AnyAgentTool {
  return {
    label: "Airwallex get transfer",
    name: "airwallex_get_transfer",
    description: "Get transfer status and details by transfer ID.",
    parameters: AirwallexGetTransferSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const transferId = readStringParam(params, "transferId", {
        required: true,
      });

      try {
        const data = await apiGet(config, `/api/v1/transfers/${encodeURIComponent(transferId)}`);
        return jsonResult({ status: "ok", transfer: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- List transfers ---

const AirwallexListTransfersSchema = Type.Object({
  pageNum: Type.Optional(Type.Number({ description: "Page number (default 1)" })),
  pageSize: Type.Optional(Type.Number({ description: "Page size (default 20)" })),
  status: Type.Optional(
    Type.String({
      description: "Filter by status e.g. PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED",
    }),
  ),
  fromCreatedAt: Type.Optional(
    Type.String({
      description: "Filter transfers created on or after (ISO 8601 date)",
    }),
  ),
  toCreatedAt: Type.Optional(
    Type.String({
      description: "Filter transfers created before (ISO 8601 date)",
    }),
  ),
});

export function createAirwallexListTransfersTool(): AnyAgentTool {
  return {
    label: "Airwallex list transfers",
    name: "airwallex_list_transfers",
    description:
      "List outbound transfers with optional filters (status, date range, pagination). Use to see recent payouts and status.",
    parameters: AirwallexListTransfersSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const pageNum = readNumberParam(params, "pageNum") ?? 1;
      const pageSize = readNumberParam(params, "pageSize") ?? 20;
      const status = readStringParam(params, "status");
      const fromCreatedAt = readStringParam(params, "fromCreatedAt");
      const toCreatedAt = readStringParam(params, "toCreatedAt");
      const query = new URLSearchParams();
      query.set("page_num", String(Math.max(1, Math.floor(pageNum))));
      query.set("page_size", String(Math.min(100, Math.max(1, Math.floor(pageSize)))));
      if (status?.trim()) query.set("status", status.trim());
      if (fromCreatedAt?.trim()) query.set("from_created_at", fromCreatedAt.trim());
      if (toCreatedAt?.trim()) query.set("to_created_at", toCreatedAt.trim());
      const path = `/api/v1/transfers?${query.toString()}`;
      try {
        const data = await apiGet(config, path);
        return jsonResult({ status: "ok", transfers: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- Create card ---

const AirwallexCreateCardSchema = Type.Object({
  requestId: Type.String({
    description: "Unique request ID (UUID) for idempotency",
  }),
  nameOnCard: Type.String({ description: "Name on card" }),
  fullName: Type.String({ description: "Primary contact full name" }),
  dateOfBirth: Type.String({
    description: "Primary contact date of birth YYYY-MM-DD",
  }),
  mobileNumber: Type.String({
    description: "Primary contact mobile number",
  }),
  currency: Type.Optional(Type.String({ description: "Per-transaction limit currency e.g. USD" })),
  perTransactionLimit: Type.Optional(
    Type.Number({
      description: "Per-transaction limit amount; omit for unlimited",
    }),
  ),
  allowedTransactionCount: Type.Optional(
    Type.String({
      description: "SINGLE or MULTI",
    }),
  ),
});

export function createAirwallexCreateCardTool(): AnyAgentTool {
  return {
    label: "Airwallex create card",
    name: "airwallex_create_card",
    description:
      "Create a virtual card for the organisation. Optional per-transaction limit and SINGLE/MULTI use. Secure card data is retrieved via Airwallex PCI endpoint; do not ask for full card numbers in chat.",
    parameters: AirwallexCreateCardSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const requestId = readStringParam(params, "requestId", { required: true });
      const nameOnCard = readStringParam(params, "nameOnCard", {
        required: true,
      });
      const fullName = readStringParam(params, "fullName", { required: true });
      const dateOfBirth = readStringParam(params, "dateOfBirth", {
        required: true,
      });
      const mobileNumber = readStringParam(params, "mobileNumber", {
        required: true,
      });
      const currency = readStringParam(params, "currency");
      const perTransactionLimit = readNumberParam(params, "perTransactionLimit");
      const allowedTransactionCount = readStringParam(params, "allowedTransactionCount");

      const body: Record<string, unknown> = {
        request_id: requestId,
        form_factor: "VIRTUAL",
        issue_to: "ORGANISATION",
        name_on_card: nameOnCard,
        primary_contact_details: {
          full_name: fullName,
          date_of_birth: dateOfBirth,
          mobile_number: mobileNumber,
        },
      };

      const hasLimit = perTransactionLimit != null && Number.isFinite(perTransactionLimit);
      if (allowedTransactionCount || hasLimit || currency) {
        body.authorization_controls = {
          allowed_transaction_count: allowedTransactionCount ?? "SINGLE",
          per_transaction_limits: [
            {
              currency: currency ?? "USD",
              ...(hasLimit
                ? { limit: perTransactionLimit, unlimited: false }
                : { unlimited: true }),
            },
          ],
        };
      }

      try {
        const data = await apiPost(config, "/api/v1/issuing/cards/create", body);
        return jsonResult({ status: "ok", card: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- List cards ---

const AirwallexListCardsSchema = Type.Object({
  pageNum: Type.Optional(Type.Number({ description: "Page number (default 1)" })),
  pageSize: Type.Optional(Type.Number({ description: "Page size (default 20)" })),
  status: Type.Optional(
    Type.String({
      description: "Filter by card status e.g. ACTIVE, INACTIVE, FROZEN",
    }),
  ),
});

export function createAirwallexListCardsTool(): AnyAgentTool {
  return {
    label: "Airwallex list cards",
    name: "airwallex_list_cards",
    description:
      "List issued cards with optional status filter and pagination. Returns card metadata (no PAN/CVV).",
    parameters: AirwallexListCardsSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const pageNum = readNumberParam(params, "pageNum") ?? 1;
      const pageSize = readNumberParam(params, "pageSize") ?? 20;
      const status = readStringParam(params, "status");
      const query = new URLSearchParams();
      query.set("page_num", String(Math.max(1, Math.floor(pageNum))));
      query.set("page_size", String(Math.min(100, Math.max(1, Math.floor(pageSize)))));
      if (status?.trim()) query.set("status", status.trim());
      const path = `/api/v1/issuing/cards?${query.toString()}`;
      try {
        const data = await apiGet(config, path);
        return jsonResult({ status: "ok", cards: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

// --- Get card ---

const AirwallexGetCardSchema = Type.Object({
  cardId: Type.String({ description: "Card ID from create or list" }),
});

export function createAirwallexGetCardTool(): AnyAgentTool {
  return {
    label: "Airwallex get card",
    name: "airwallex_get_card",
    description:
      "Get a card by ID. Returns metadata, status, limits (no PAN/CVV). Secure card details are via Airwallex PCI endpoint.",
    parameters: AirwallexGetCardSchema,
    execute: async (_toolCallId, args) => {
      const config = getAirwallexConfig();
      if (!config) {
        return jsonResult({
          status: "error",
          error: "Airwallex not configured. Set AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY.",
        });
      }
      const params = args as Record<string, unknown>;
      const cardId = readStringParam(params, "cardId", { required: true });
      try {
        const data = await apiGet(config, `/api/v1/issuing/cards/${encodeURIComponent(cardId!)}`);
        return jsonResult({ status: "ok", card: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}

export function createAirwallexTools(): AnyAgentTool[] {
  return [
    createAirwallexBalancesTool(),
    createAirwallexGetQuoteTool(),
    createAirwallexCreateBeneficiaryTool(),
    createAirwallexListBeneficiariesTool(),
    createAirwallexGetBeneficiaryTool(),
    createAirwallexCreateTransferTool(),
    createAirwallexGetTransferTool(),
    createAirwallexListTransfersTool(),
    createAirwallexCreateCardTool(),
    createAirwallexListCardsTool(),
    createAirwallexGetCardTool(),
  ];
}
