import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { DatabaseSync } from "node:sqlite";

import { requireNodeSqlite } from "../memory/sqlite.js";

export type VentureEvent = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
};

export type VentureKpi = {
  name: string;
  value: unknown;
  updatedAt: number;
};

export type VentureKillSwitch = {
  id: string;
  condition: string;
  action: string;
  windowDays: number;
  enabled: boolean;
};

export type VentureInvestment = {
  id: string;
  ventureName: string;
  category: string;
  boardDecisionDate: number;
  budgetUsd: number;
  spentUsd: number;
  revenueUsd: number;
  status: "active" | "completed" | "killed";
  killThreshold: string;
  daysRemaining: number;
  createdAt: number;
  completedAt: number | null;
};

export type VentureTransaction = {
  id: string;
  investmentId: string;
  type: "expense" | "revenue";
  amountUsd: number;
  description: string;
  createdAt: number;
};

export type VentureCapital = {
  key: "available" | "earned_lifetime" | "spent_lifetime";
  amountUsd: number;
  updatedAt: number;
};

export type VenturePaymentCard = {
  id: string;
  cardLast4: string;
  cardName: string;
  cardLimitUsd: number;
  cardSpentUsd: number;
  isActive: boolean;
  encryptedData: string; // JSON: {number, cvv, expiry}
  createdAt: number;
};

/** Remaining balance for a payment card (initial balance minus spent). */
export function getCardRemainingUsd(card: VenturePaymentCard): number {
  return Math.max(0, card.cardLimitUsd - card.cardSpentUsd);
}

export type VentureStateStore = {
  getKv: (key: string) => unknown;
  setKv: (key: string, value: unknown) => void;
  appendEvent: (type: string, payload: unknown) => string;
  listEvents: (limit: number) => VentureEvent[];
  setKpi: (name: string, value: unknown) => void;
  getKpi: (name: string) => VentureKpi | null;
  listKpis: () => VentureKpi[];
  upsertKillSwitch: (entry: Omit<VentureKillSwitch, "enabled"> & { enabled?: boolean }) => void;
  listKillSwitches: () => VentureKillSwitch[];
  // Financial methods
  createInvestment: (data: Omit<VentureInvestment, "createdAt">) => string;
  updateInvestment: (
    id: string,
    data: Partial<Omit<VentureInvestment, "id" | "createdAt">>,
  ) => void;
  getInvestment: (id: string) => VentureInvestment | null;
  listInvestments: (status?: "active" | "completed" | "killed") => VentureInvestment[];
  addTransaction: (
    type: "expense" | "revenue",
    amountUsd: number,
    investmentId: string,
    description: string,
  ) => string;
  listTransactions: (investmentId?: string) => VentureTransaction[];
  setCapital: (key: "available" | "earned_lifetime" | "spent_lifetime", amountUsd: number) => void;
  getCapital: (key: "available" | "earned_lifetime" | "spent_lifetime") => number;
  addPaymentCard: (data: Omit<VenturePaymentCard, "id" | "createdAt">) => string;
  getActivePaymentCard: () => VenturePaymentCard | null;
  listPaymentCards: () => VenturePaymentCard[];
  updatePaymentCard: (
    id: string,
    data: Partial<Omit<VenturePaymentCard, "id" | "createdAt">>,
  ) => void;
  removePaymentCard: (id: string) => void;
  recordCardSpend: (cardId: string, amountUsd: number) => void;
};

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kpis (
      name TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kill_switches (
      id TEXT PRIMARY KEY,
      condition TEXT NOT NULL,
      action TEXT NOT NULL,
      window_days INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Financial tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      venture_name TEXT NOT NULL,
      category TEXT NOT NULL,
      board_decision_date INTEGER NOT NULL,
      budget_usd REAL NOT NULL,
      spent_usd REAL NOT NULL DEFAULT 0,
      revenue_usd REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      kill_threshold TEXT NOT NULL,
      days_remaining INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      investment_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      description TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (investment_id) REFERENCES investments(id)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_investment ON transactions(investment_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS capital (
      key TEXT PRIMARY KEY,
      amount_usd REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_cards (
      id TEXT PRIMARY KEY,
      card_last4 TEXT NOT NULL,
      card_name TEXT NOT NULL,
      card_limit_usd REAL NOT NULL,
      card_spent_usd REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      encrypted_data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_cards_active ON payment_cards(is_active);`);

  // Migration: add card_spent_usd if table existed without it
  try {
    const info = db.prepare("PRAGMA table_info(payment_cards)").all() as Array<{ name: string }>;
    if (!info.some((c) => c.name === "card_spent_usd")) {
      db.exec("ALTER TABLE payment_cards ADD COLUMN card_spent_usd REAL NOT NULL DEFAULT 0");
    }
  } catch {
    // Table may not exist yet; ensureSchema already created it with the column
  }
}

function now(): number {
  return Date.now();
}

export function openVentureStateStore(params: { dbPath: string }): VentureStateStore {
  const dir = path.dirname(params.dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const sqlite = requireNodeSqlite();
  const db = new sqlite.DatabaseSync(params.dbPath);
  ensureSchema(db);

  const getKv = (key: string): unknown => {
    const row = db.prepare("SELECT value_json FROM kv WHERE key = ?").get(key) as
      | { value_json?: string }
      | undefined;
    if (!row?.value_json) return undefined;
    try {
      return JSON.parse(row.value_json);
    } catch {
      return undefined;
    }
  };

  const setKv = (key: string, value: unknown): void => {
    db.prepare(
      "INSERT INTO kv(key, value_json, updated_at) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at",
    ).run(key, JSON.stringify(value), now());
  };

  const appendEvent = (type: string, payload: unknown): string => {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO events(id, type, payload_json, created_at) VALUES(?, ?, ?, ?)").run(
      id,
      type,
      JSON.stringify(payload),
      now(),
    );
    return id;
  };

  const listEvents = (limit: number): VentureEvent[] => {
    const rows = db
      .prepare(
        "SELECT id, type, payload_json, created_at FROM events ORDER BY created_at DESC LIMIT ?",
      )
      .all(limit) as Array<{ id: string; type: string; payload_json: string; created_at: number }>;
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: (() => {
        try {
          return JSON.parse(r.payload_json);
        } catch {
          return r.payload_json;
        }
      })(),
      createdAt: r.created_at,
    }));
  };

  const setKpi = (name: string, value: unknown): void => {
    db.prepare(
      "INSERT INTO kpis(name, value_json, updated_at) VALUES(?, ?, ?) ON CONFLICT(name) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at",
    ).run(name, JSON.stringify(value), now());
  };

  const getKpi = (name: string): VentureKpi | null => {
    const row = db
      .prepare("SELECT name, value_json, updated_at FROM kpis WHERE name = ?")
      .get(name) as { name: string; value_json: string; updated_at: number } | undefined;
    if (!row) return null;
    return {
      name: row.name,
      value: (() => {
        try {
          return JSON.parse(row.value_json);
        } catch {
          return row.value_json;
        }
      })(),
      updatedAt: row.updated_at,
    };
  };

  const listKpis = (): VentureKpi[] => {
    const rows = db
      .prepare("SELECT name, value_json, updated_at FROM kpis ORDER BY name ASC")
      .all() as Array<{ name: string; value_json: string; updated_at: number }>;
    return rows.map((r) => ({
      name: r.name,
      value: (() => {
        try {
          return JSON.parse(r.value_json);
        } catch {
          return r.value_json;
        }
      })(),
      updatedAt: r.updated_at,
    }));
  };

  const upsertKillSwitch = (
    entry: Omit<VentureKillSwitch, "enabled"> & { enabled?: boolean },
  ): void => {
    const enabled = entry.enabled ?? true;
    db.prepare(
      "INSERT INTO kill_switches(id, condition, action, window_days, enabled) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET condition=excluded.condition, action=excluded.action, window_days=excluded.window_days, enabled=excluded.enabled",
    ).run(entry.id, entry.condition, entry.action, entry.windowDays, enabled ? 1 : 0);
  };

  const listKillSwitches = (): VentureKillSwitch[] => {
    const rows = db
      .prepare(
        "SELECT id, condition, action, window_days, enabled FROM kill_switches ORDER BY id ASC",
      )
      .all() as Array<{
      id: string;
      condition: string;
      action: string;
      window_days: number;
      enabled: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      condition: r.condition,
      action: r.action,
      windowDays: r.window_days,
      enabled: Boolean(r.enabled),
    }));
  };

  // Financial methods
  const createInvestment = (data: Omit<VentureInvestment, "createdAt">): string => {
    db.prepare(
      "INSERT INTO investments(id, venture_name, category, board_decision_date, budget_usd, spent_usd, revenue_usd, status, kill_threshold, days_remaining, created_at, completed_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      data.id,
      data.ventureName,
      data.category,
      data.boardDecisionDate,
      data.budgetUsd,
      data.spentUsd,
      data.revenueUsd,
      data.status,
      data.killThreshold,
      data.daysRemaining,
      now(),
      data.completedAt,
    );
    return data.id;
  };

  const updateInvestment = (
    id: string,
    data: Partial<Omit<VentureInvestment, "id" | "createdAt">>,
  ): void => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.ventureName !== undefined) {
      fields.push("venture_name=?");
      values.push(data.ventureName);
    }
    if (data.category !== undefined) {
      fields.push("category=?");
      values.push(data.category);
    }
    if (data.boardDecisionDate !== undefined) {
      fields.push("board_decision_date=?");
      values.push(data.boardDecisionDate);
    }
    if (data.budgetUsd !== undefined) {
      fields.push("budget_usd=?");
      values.push(data.budgetUsd);
    }
    if (data.spentUsd !== undefined) {
      fields.push("spent_usd=?");
      values.push(data.spentUsd);
    }
    if (data.revenueUsd !== undefined) {
      fields.push("revenue_usd=?");
      values.push(data.revenueUsd);
    }
    if (data.status !== undefined) {
      fields.push("status=?");
      values.push(data.status);
    }
    if (data.killThreshold !== undefined) {
      fields.push("kill_threshold=?");
      values.push(data.killThreshold);
    }
    if (data.daysRemaining !== undefined) {
      fields.push("days_remaining=?");
      values.push(data.daysRemaining);
    }
    if (data.completedAt !== undefined) {
      fields.push("completed_at=?");
      values.push(data.completedAt);
    }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE investments SET ${fields.join(", ")} WHERE id=?`).run(...values);
    }
  };

  const getInvestment = (id: string): VentureInvestment | null => {
    const row = db.prepare("SELECT * FROM investments WHERE id=?").get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      ventureName: row.venture_name,
      category: row.category,
      boardDecisionDate: row.board_decision_date,
      budgetUsd: row.budget_usd,
      spentUsd: row.spent_usd,
      revenueUsd: row.revenue_usd,
      status: row.status,
      killThreshold: row.kill_threshold,
      daysRemaining: row.days_remaining,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  };

  const listInvestments = (status?: "active" | "completed" | "killed"): VentureInvestment[] => {
    const query = status
      ? "SELECT * FROM investments WHERE status=? ORDER BY created_at DESC"
      : "SELECT * FROM investments ORDER BY created_at DESC";
    const rows = (status ? db.prepare(query).all(status) : db.prepare(query).all()) as any[];
    return rows.map((row) => ({
      id: row.id,
      ventureName: row.venture_name,
      category: row.category,
      boardDecisionDate: row.board_decision_date,
      budgetUsd: row.budget_usd,
      spentUsd: row.spent_usd,
      revenueUsd: row.revenue_usd,
      status: row.status,
      killThreshold: row.kill_threshold,
      daysRemaining: row.days_remaining,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  };

  const addTransaction = (
    type: "expense" | "revenue",
    amountUsd: number,
    investmentId: string,
    description: string,
  ): string => {
    const id = crypto.randomUUID();
    db.prepare(
      "INSERT INTO transactions(id, investment_id, type, amount_usd, description, created_at) VALUES(?, ?, ?, ?, ?, ?)",
    ).run(id, investmentId, type, amountUsd, description, now());

    // Update investment totals
    if (type === "expense") {
      db.prepare("UPDATE investments SET spent_usd = spent_usd + ? WHERE id = ?").run(
        amountUsd,
        investmentId,
      );
    } else {
      db.prepare("UPDATE investments SET revenue_usd = revenue_usd + ? WHERE id = ?").run(
        amountUsd,
        investmentId,
      );
    }

    return id;
  };

  const listTransactions = (investmentId?: string): VentureTransaction[] => {
    const query = investmentId
      ? "SELECT * FROM transactions WHERE investment_id=? ORDER BY created_at DESC"
      : "SELECT * FROM transactions ORDER BY created_at DESC";
    const rows = (
      investmentId ? db.prepare(query).all(investmentId) : db.prepare(query).all()
    ) as any[];
    return rows.map((row) => ({
      id: row.id,
      investmentId: row.investment_id,
      type: row.type,
      amountUsd: row.amount_usd,
      description: row.description,
      createdAt: row.created_at,
    }));
  };

  const setCapital = (
    key: "available" | "earned_lifetime" | "spent_lifetime",
    amountUsd: number,
  ): void => {
    db.prepare(
      "INSERT INTO capital(key, amount_usd, updated_at) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET amount_usd=excluded.amount_usd, updated_at=excluded.updated_at",
    ).run(key, amountUsd, now());
  };

  const getCapital = (key: "available" | "earned_lifetime" | "spent_lifetime"): number => {
    const row = db.prepare("SELECT amount_usd FROM capital WHERE key=?").get(key) as
      | { amount_usd: number }
      | undefined;
    return row ? row.amount_usd : 0;
  };

  const addPaymentCard = (data: Omit<VenturePaymentCard, "id" | "createdAt">): string => {
    const id = crypto.randomUUID();
    const spent = data.cardSpentUsd ?? 0;

    // If this card is being set as active, deactivate all others
    if (data.isActive) {
      db.prepare("UPDATE payment_cards SET is_active=0").run();
    }

    db.prepare(
      "INSERT INTO payment_cards(id, card_last4, card_name, card_limit_usd, card_spent_usd, is_active, encrypted_data, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      id,
      data.cardLast4,
      data.cardName,
      data.cardLimitUsd,
      spent,
      data.isActive ? 1 : 0,
      data.encryptedData,
      now(),
    );

    return id;
  };

  const getActivePaymentCard = (): VenturePaymentCard | null => {
    const row = db.prepare("SELECT * FROM payment_cards WHERE is_active=1 LIMIT 1").get() as any;
    if (!row) return null;
    return {
      id: row.id,
      cardLast4: row.card_last4,
      cardName: row.card_name,
      cardLimitUsd: row.card_limit_usd,
      cardSpentUsd: row.card_spent_usd ?? 0,
      isActive: Boolean(row.is_active),
      encryptedData: row.encrypted_data,
      createdAt: row.created_at,
    };
  };

  const listPaymentCards = (): VenturePaymentCard[] => {
    const rows = db.prepare("SELECT * FROM payment_cards ORDER BY created_at DESC").all() as any[];
    return rows.map((row) => ({
      id: row.id,
      cardLast4: row.card_last4,
      cardName: row.card_name,
      cardLimitUsd: row.card_limit_usd,
      cardSpentUsd: row.card_spent_usd ?? 0,
      isActive: Boolean(row.is_active),
      encryptedData: row.encrypted_data,
      createdAt: row.created_at,
    }));
  };

  const updatePaymentCard = (
    id: string,
    data: Partial<Omit<VenturePaymentCard, "id" | "createdAt">>,
  ): void => {
    const fields: string[] = [];
    const values: any[] = [];

    // If setting this card as active, deactivate all others first
    if (data.isActive === true) {
      db.prepare("UPDATE payment_cards SET is_active=0").run();
    }

    if (data.cardLast4 !== undefined) {
      fields.push("card_last4=?");
      values.push(data.cardLast4);
    }
    if (data.cardName !== undefined) {
      fields.push("card_name=?");
      values.push(data.cardName);
    }
    if (data.cardLimitUsd !== undefined) {
      fields.push("card_limit_usd=?");
      values.push(data.cardLimitUsd);
    }
    if (data.cardSpentUsd !== undefined) {
      fields.push("card_spent_usd=?");
      values.push(data.cardSpentUsd);
    }
    if (data.isActive !== undefined) {
      fields.push("is_active=?");
      values.push(data.isActive ? 1 : 0);
    }
    if (data.encryptedData !== undefined) {
      fields.push("encrypted_data=?");
      values.push(data.encryptedData);
    }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE payment_cards SET ${fields.join(", ")} WHERE id=?`).run(...values);
    }
  };

  const removePaymentCard = (id: string): void => {
    const row = db.prepare("SELECT is_active FROM payment_cards WHERE id=?").get(id) as
      | { is_active: number }
      | undefined;
    if (!row) return;
    const wasActive = row.is_active === 1;
    db.prepare("DELETE FROM payment_cards WHERE id=?").run(id);
    if (wasActive) {
      const remaining = db
        .prepare("SELECT id FROM payment_cards ORDER BY created_at DESC LIMIT 1")
        .get() as { id: string } | undefined;
      if (remaining) {
        db.prepare("UPDATE payment_cards SET is_active=1 WHERE id=?").run(remaining.id);
      }
    }
  };

  const recordCardSpend = (cardId: string, amountUsd: number): void => {
    const row = db
      .prepare("SELECT card_limit_usd, card_spent_usd FROM payment_cards WHERE id=?")
      .get(cardId) as { card_limit_usd: number; card_spent_usd?: number } | undefined;
    if (!row) return;
    const currentSpent = row.card_spent_usd ?? 0;
    const newSpent = Math.min(currentSpent + amountUsd, row.card_limit_usd);
    db.prepare("UPDATE payment_cards SET card_spent_usd=? WHERE id=?").run(newSpent, cardId);
  };

  return {
    getKv,
    setKv,
    appendEvent,
    listEvents,
    setKpi,
    getKpi,
    listKpis,
    upsertKillSwitch,
    listKillSwitches,
    // Financial methods
    createInvestment,
    updateInvestment,
    getInvestment,
    listInvestments,
    addTransaction,
    listTransactions,
    setCapital,
    getCapital,
    addPaymentCard,
    getActivePaymentCard,
    listPaymentCards,
    updatePaymentCard,
    removePaymentCard,
    recordCardSpend,
  };
}

export function resolveVentureDbPath(params: { workspaceDir: string }): string {
  return path.join(params.workspaceDir, "ops", "venture.sqlite");
}
