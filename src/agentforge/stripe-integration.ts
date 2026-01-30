import { loadConfig } from "../config/config.js";
import { openVentureStateStore, resolveVentureDbPath } from "./venture-state.js";

/**
 * Stripe integration for revenue tracking and balance sync
 * Fetches revenue data from Stripe API and syncs to venture-state
 */

interface StripeConfig {
  secretKey: string;
  publicKey?: string;
  enabled: boolean;
}

/**
 * Get Stripe configuration from config or env vars
 */
export function getStripeConfig(): StripeConfig | null {
  const cfg = loadConfig();

  const secretKey =
    cfg.humanInterface?.agentforge?.stripe?.secretKey ||
    cfg.env?.vars?.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  const publicKey =
    cfg.humanInterface?.agentforge?.stripe?.publicKey ||
    cfg.env?.vars?.STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY;

  const enabled = cfg.humanInterface?.agentforge?.stripe?.enabled !== false;

  return {
    secretKey,
    publicKey,
    enabled,
  };
}

/**
 * Fetch revenue for a venture from Stripe
 * Queries charges/payments and returns total revenue
 */
export async function fetchRevenueForVenture(params: {
  ventureId: string;
  stripeAccountId?: string;
  since?: number; // timestamp
}): Promise<{
  total: number;
  count: number;
  transactions: Array<{
    id: string;
    amount: number;
    description: string;
    created: number;
  }>;
}> {
  const config = getStripeConfig();

  if (!config || !config.enabled) {
    throw new Error("Stripe is not configured or enabled");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.secretKey}`,
    "Content-Type": "application/json",
  };

  // If venture has a connected account, use Stripe-Account header
  if (params.stripeAccountId) {
    headers["Stripe-Account"] = params.stripeAccountId;
  }

  // Query Stripe API for charges
  const queryParams = new URLSearchParams();
  queryParams.set("limit", "100");
  if (params.since) {
    queryParams.set("created[gte]", Math.floor(params.since / 1000).toString());
  }

  const url = `https://api.stripe.com/v1/charges?${queryParams.toString()}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Stripe API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    data: Array<{
      id: string;
      amount: number; // in cents
      description: string | null;
      created: number;
      status: string;
    }>;
  };

  const transactions = data.data
    .filter((charge) => charge.status === "succeeded")
    .map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100, // convert cents to dollars
      description: charge.description || `Stripe charge ${charge.id}`,
      created: charge.created * 1000, // convert to ms
    }));

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return {
    total,
    count: transactions.length,
    transactions,
  };
}

/**
 * Sync Stripe revenue to venture-state for a specific investment
 */
export async function syncStripeRevenue(params: {
  ventureId: string;
  investmentId: string;
  workspaceDir?: string;
  stripeAccountId?: string;
}): Promise<{
  synced: number;
  newTransactions: number;
}> {
  const dbPath = params.workspaceDir
    ? resolveVentureDbPath({ workspaceDir: params.workspaceDir })
    : resolveVentureDbPath({ workspaceDir: `/tmp/ventures/${params.ventureId}` });

  const store = openVentureStateStore({ dbPath });

  // Get investment to find last sync time
  const investment = store.getInvestment(params.investmentId);
  if (!investment) {
    throw new Error(`Investment ${params.investmentId} not found`);
  }

  const lastSyncTime = (store.getKv("stripe_last_sync") as number) || investment.createdAt;

  // Fetch revenue from Stripe since last sync
  const stripeData = await fetchRevenueForVenture({
    ventureId: params.ventureId,
    stripeAccountId: params.stripeAccountId,
    since: lastSyncTime,
  });

  // Add new transactions to database
  let newCount = 0;
  for (const transaction of stripeData.transactions) {
    // Check if transaction already exists
    const existing = store
      .listTransactions(params.investmentId)
      .find((t) => t.description.includes(transaction.id));
    if (!existing) {
      store.addTransaction(
        "revenue",
        transaction.amount,
        params.investmentId,
        transaction.description,
      );
      newCount++;
    }
  }

  // Update last sync time
  store.setKv("stripe_last_sync", Date.now());

  // Append sync event
  store.appendEvent("stripe.revenue_sync", {
    investmentId: params.investmentId,
    synced: stripeData.total,
    newTransactions: newCount,
    timestamp: Date.now(),
  });

  return {
    synced: stripeData.total,
    newTransactions: newCount,
  };
}

/**
 * Get total Stripe balance across all ventures
 */
export async function getStripeBalance(): Promise<{
  available: number;
  pending: number;
  currency: string;
}> {
  const config = getStripeConfig();

  if (!config || !config.enabled) {
    throw new Error("Stripe is not configured or enabled");
  }

  const headers = {
    Authorization: `Bearer ${config.secretKey}`,
    "Content-Type": "application/json",
  };

  const response = await fetch("https://api.stripe.com/v1/balance", { headers });

  if (!response.ok) {
    throw new Error(`Stripe API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    available: Array<{ amount: number; currency: string }>;
    pending: Array<{ amount: number; currency: string }>;
  };

  const usdAvailable = data.available.find((b) => b.currency === "usd")?.amount || 0;
  const usdPending = data.pending.find((b) => b.currency === "usd")?.amount || 0;

  return {
    available: usdAvailable / 100, // cents to dollars
    pending: usdPending / 100,
    currency: "usd",
  };
}

/**
 * Test Stripe connection
 */
export async function testStripeConnection(): Promise<{
  connected: boolean;
  error?: string;
  accountId?: string;
}> {
  try {
    const config = getStripeConfig();

    if (!config || !config.enabled) {
      return {
        connected: false,
        error: "Stripe is not configured or enabled",
      };
    }

    const headers = {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json",
    };

    const response = await fetch("https://api.stripe.com/v1/account", { headers });

    if (!response.ok) {
      return {
        connected: false,
        error: `Stripe API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as { id: string };

    return {
      connected: true,
      accountId: data.id,
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
