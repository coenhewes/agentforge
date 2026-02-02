import crypto from "node:crypto";

import type { OpenClawConfig } from "../config/types.js";
import { loadConfig, writeConfigFile } from "../config/config.js";

/**
 * AES-256-GCM encryption for payment card data
 * Provides secure storage of card numbers, CVV, and expiry dates
 */

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

interface CardData {
  number: string;
  cvv: string;
  expiry: string; // MM/YY format
  name: string;
}

interface EncryptedCardData {
  encrypted: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

/**
 * Get or generate encryption key from config
 * Key is stored in config as base64 string
 */
export function getOrGenerateEncryptionKey(): Buffer {
  const cfg = loadConfig();

  // Check config first
  const keyId = cfg.humanInterface?.agentforge?.capitalManagement?.cardEncryptionKeyId;

  if (keyId) {
    // Key is stored as base64 in config
    try {
      return Buffer.from(keyId, "base64");
    } catch {
      // Invalid key, generate new one
    }
  }

  // Check environment variable
  const envKey = process.env.AGENTFORGE_CARD_KEY;
  if (envKey) {
    try {
      return Buffer.from(envKey, "base64");
    } catch {
      // Invalid key, generate new one
    }
  }

  // Generate new key and persist to config so portal and gateway (and cron) share it
  const key = crypto.randomBytes(KEY_LENGTH);
  const keyBase64 = key.toString("base64");
  process.env.AGENTFORGE_CARD_KEY = keyBase64;

  if (typeof process.env.VITEST === "undefined") {
    (async () => {
      try {
        const cfg = loadConfig();
        const next: OpenClawConfig = {
          ...cfg,
          humanInterface: {
            ...cfg.humanInterface,
            agentforge: {
              ...cfg.humanInterface?.agentforge,
              capitalManagement: {
                ...cfg.humanInterface?.agentforge?.capitalManagement,
                cardEncryptionKeyId: keyBase64,
              },
            },
          },
        };
        await writeConfigFile(next);
      } catch (err) {
        console.error("[card-encryption] Failed to persist key to config:", err);
      }
    })();
  }

  return key;
}

/**
 * Encrypt card data using AES-256-GCM
 */
export function encryptCardData(cardData: CardData): EncryptedCardData {
  const key = getOrGenerateEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(cardData);

  let encrypted = cipher.update(plaintext, "utf-8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt card data
 */
export function decryptCardData(encryptedData: EncryptedCardData): CardData {
  const key = getOrGenerateEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, "base64");
  const authTag = Buffer.from(encryptedData.authTag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, "base64", "utf-8");
  decrypted += decipher.final("utf-8");

  return JSON.parse(decrypted) as CardData;
}

/**
 * Mask card number for display (show last 4 digits only)
 */
export function maskCardNumber(cardNumber: string): string {
  if (cardNumber.length < 4) return "****";
  const last4 = cardNumber.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Validate card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): boolean {
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, "");

  // Check if all digits
  if (!/^\d+$/.test(cleaned)) return false;

  // Check length (13-19 digits for most cards)
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate expiry date (MM/YY format)
 */
export function validateExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const month = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[2], 10);

  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear() % 100; // Get last 2 digits
  const currentMonth = now.getMonth() + 1;

  // Check if expired
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
}

/**
 * Validate CVV (3-4 digits)
 */
export function validateCVV(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

/**
 * Create card access audit log entry
 */
export interface CardAccessAudit {
  timestamp: number;
  agentId: string;
  cardId: string;
  action: "decrypt" | "view" | "use";
  reason: string;
  success: boolean;
}

let auditLog: CardAccessAudit[] = [];

/**
 * Log card access for audit trail
 */
export function logCardAccess(entry: Omit<CardAccessAudit, "timestamp">): void {
  auditLog.push({
    ...entry,
    timestamp: Date.now(),
  });

  // Keep only last 1000 entries in memory
  if (auditLog.length > 1000) {
    auditLog = auditLog.slice(-1000);
  }

  // In production, this should also write to persistent storage (venture-state events table)
  console.log(
    `[card-access-audit] ${entry.action} by ${entry.agentId} for card ${entry.cardId}: ${entry.reason} (${entry.success ? "success" : "failed"})`,
  );
}

/**
 * Get card access audit log
 */
export function getCardAccessAudit(limit = 100): CardAccessAudit[] {
  return auditLog.slice(-limit).reverse();
}

/**
 * Clear audit log (use with caution!)
 */
export function clearCardAccessAudit(): void {
  auditLog = [];
}
