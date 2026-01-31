import chalk from "chalk";
import { Container } from "@mariozechner/pi-tui";
import { theme } from "../../theme/theme.js";
import {
  validateCardNumber,
  validateCVV,
  validateExpiry,
  maskCardNumber,
} from "../../../agentforge/card-encryption.js";

/**
 * Card form component for adding payment cards
 * Masked input for sensitive data
 */

interface CardFormData {
  number: string;
  cvv: string;
  expiry: string; // MM/YY
  name: string;
  limit: number;
}

type FormField = "number" | "cvv" | "expiry" | "name" | "limit";

export class CardFormContainer extends Container {
  private data: CardFormData;
  private activeField: FormField;
  private errors: Partial<Record<FormField, string>>;
  private onSubmitCallback: (data: CardFormData) => void;
  private onCancelCallback: () => void;

  constructor(onSubmit: (data: CardFormData) => void, onCancel: () => void) {
    super();
    this.data = {
      number: "",
      cvv: "",
      expiry: "",
      name: "",
      limit: 0,
    };
    this.activeField = "number";
    this.errors = {};
    this.onSubmitCallback = onSubmit;
    this.onCancelCallback = onCancel;
  }

  handleInput(keyData: string): boolean {
    if (keyData === "\x1b") {
      this.onCancelCallback();
      return true;
    }

    if (keyData === "\t") {
      this.moveToNextField();
      this.invalidate();
      return true;
    }

    if (keyData === "\r" || keyData === "\n") {
      if (this.validateAll()) {
        this.onSubmitCallback(this.data);
      }
      return true;
    }

    if (keyData === "\x7f" || keyData === "\x08") {
      const field = this.activeField;
      if (field === "number" || field === "cvv" || field === "expiry" || field === "name") {
        const currentValue = this.data[field];
        if (currentValue.length > 0) {
          this.data[field] = currentValue.slice(0, -1);
          this.invalidate();
        }
      } else if (field === "limit") {
        const budgetStr = this.data.limit.toString();
        if (budgetStr.length > 1) {
          this.data.limit = Number.parseInt(budgetStr.slice(0, -1), 10) || 0;
        } else {
          this.data.limit = 0;
        }
        this.invalidate();
      }
      return true;
    }

    if (keyData.length === 1 && keyData >= " " && keyData <= "~") {
      this.handleCharacterInput(keyData);
      return true;
    }

    return false;
  }

  private handleCharacterInput(char: string): void {
    const field = this.activeField;

    if (field === "number" && /[\d\s]/.test(char)) {
      this.data.number += char;
      this.invalidate();
    } else if (field === "cvv" && /\d/.test(char) && this.data.cvv.length < 4) {
      this.data.cvv += char;
      this.invalidate();
    } else if (field === "expiry" && /\d/.test(char)) {
      const current = this.data.expiry.replace(/\//g, "");
      if (current.length < 4) {
        const updated = current + char;
        if (updated.length === 2) {
          this.data.expiry = updated + "/";
        } else if (updated.length > 2) {
          this.data.expiry = updated.slice(0, 2) + "/" + updated.slice(2, 4);
        } else {
          this.data.expiry = updated;
        }
        this.invalidate();
      }
    } else if (field === "name" && /[a-zA-Z\s.]/.test(char)) {
      this.data.name += char;
      this.invalidate();
    } else if (field === "limit" && /\d/.test(char)) {
      this.data.limit = Number.parseInt(this.data.limit.toString() + char, 10);
      this.invalidate();
    }
  }

  private moveToNextField(): void {
    const fields: FormField[] = ["number", "cvv", "expiry", "name", "limit"];
    const currentIndex = fields.indexOf(this.activeField);
    this.activeField = fields[(currentIndex + 1) % fields.length];
  }

  private validateAll(): boolean {
    this.errors = {};

    if (!this.data.number || !validateCardNumber(this.data.number)) {
      this.errors.number = "Valid card number required";
    }
    if (!this.data.cvv || !validateCVV(this.data.cvv)) {
      this.errors.cvv = "Valid CVV required";
    }
    if (!this.data.expiry || !validateExpiry(this.data.expiry)) {
      this.errors.expiry = "Valid expiry required";
    }
    if (!this.data.name.trim()) {
      this.errors.name = "Cardholder name required";
    }
    if (this.data.limit <= 0) {
      this.errors.limit = "Card limit must be > $0";
    }

    this.invalidate();
    return Object.keys(this.errors).length === 0;
  }

  render(_width: number): string[] {
    const lines: string[] = [];

    lines.push("");
    lines.push(theme.bold("  💳 Add Payment Card"));
    lines.push("");

    const numberActive = this.activeField === "number";
    const maskedNumber = this.data.number ? maskCardNumber(this.data.number) : "";
    lines.push(
      `    ${numberActive ? chalk.cyan.bold("▶") : " "} Card Number: ${maskedNumber || chalk.gray("Enter card number")}`,
    );
    if (this.errors.number) lines.push(`      ${chalk.red("✗ " + this.errors.number)}`);

    const cvvActive = this.activeField === "cvv";
    const maskedCVV = this.data.cvv ? "*".repeat(this.data.cvv.length) : "";
    lines.push(
      `    ${cvvActive ? chalk.cyan.bold("▶") : " "} CVV: ${maskedCVV || chalk.gray("Enter CVV")}`,
    );
    if (this.errors.cvv) lines.push(`      ${chalk.red("✗ " + this.errors.cvv)}`);

    const expiryActive = this.activeField === "expiry";
    lines.push(
      `    ${expiryActive ? chalk.cyan.bold("▶") : " "} Expiry: ${this.data.expiry || chalk.gray("MM/YY")}`,
    );
    if (this.errors.expiry) lines.push(`      ${chalk.red("✗ " + this.errors.expiry)}`);

    const nameActive = this.activeField === "name";
    lines.push(
      `    ${nameActive ? chalk.cyan.bold("▶") : " "} Cardholder: ${this.data.name || chalk.gray("Enter name")}`,
    );
    if (this.errors.name) lines.push(`      ${chalk.red("✗ " + this.errors.name)}`);

    const limitActive = this.activeField === "limit";
    lines.push(
      `    ${limitActive ? chalk.cyan.bold("▶") : " "} Card Limit: $${this.data.limit || chalk.gray("0")}`,
    );
    if (this.errors.limit) lines.push(`      ${chalk.red("✗ " + this.errors.limit)}`);

    lines.push("");
    lines.push(chalk.gray("    Tab: Next field | Enter: Submit | Esc: Cancel"));

    return lines;
  }
}
