import chalk from "chalk";
import os from "node:os";
import path from "node:path";
import { Container, ProcessTerminal, Text, TUI } from "@mariozechner/pi-tui";

import { encryptCardData, getOrGenerateEncryptionKey } from "../../agentforge/card-encryption.js";
import { openVentureStateStore, resolveVentureDbPath } from "../../agentforge/venture-state.js";
import { theme } from "../theme/theme.js";
import { CardFormContainer } from "./components/card-form.js";
import { LogsView } from "./views/logs-view.js";
import { SettingsView } from "./views/settings-view.js";
import { VenturesView } from "./views/ventures-view.js";
import { WorkersView } from "./views/workers-view.js";

type TabId = "overview" | "ventures" | "workers" | "logs" | "settings";

interface PortalState {
  activeTab: TabId;
  workspaceDir: string;
  store: ReturnType<typeof openVentureStateStore>;
  showCardForm: boolean;
  cardFormRef: CardFormContainer | null;
}

/**
 * Main entry point for Investment Portal TUI
 */
export async function runInvestmentPortal(options?: {
  workspaceDir?: string;
  ventureId?: string;
}): Promise<void> {
  const workspace =
    options?.workspaceDir || path.join(os.homedir(), ".moltbot", "ventures", "default");
  const dbPath = resolveVentureDbPath({ workspaceDir: workspace });
  const store = openVentureStateStore({ dbPath });

  const state: PortalState = {
    activeTab: "overview",
    workspaceDir: workspace,
    store,
    showCardForm: false,
    cardFormRef: null,
  };

  const tui = new TUI(new ProcessTerminal());
  const root = new Container();

  const header = new Text(chalk.bold(theme.accent("💼 AgentForge Investment Portal")), 1, 0);
  const tabBar = new Text("", 1, 0);
  const contentContainer = new Container();
  const footer = new Text(chalk.gray("Tab: Next | 1-5: Jump | Ctrl+C: Exit"), 1, 0);

  root.addChild(header);
  root.addChild(tabBar);
  root.addChild(contentContainer);
  root.addChild(footer);

  const renderTabBar = () => {
    const tabs: Array<{ id: TabId; label: string }> = [
      { id: "overview", label: "1. Overview" },
      { id: "ventures", label: "2. Ventures" },
      { id: "workers", label: "3. Workers" },
      { id: "logs", label: "4. Logs" },
      { id: "settings", label: "5. Settings" },
    ];

    let line = "  ";
    for (const tab of tabs) {
      const isActive = state.activeTab === tab.id;
      const label = isActive ? chalk.cyan.bold(tab.label) : chalk.gray(tab.label);
      line += label + "   ";
    }

    tabBar.setText(line);
  };

  const renderContent = () => {
    contentContainer.clear();
    state.cardFormRef = null;

    let view: Container;

    if (state.showCardForm && state.activeTab === "settings") {
      const cardForm = new CardFormContainer(
        (data) => {
          getOrGenerateEncryptionKey();
          const number = data.number.replace(/\s/g, "");
          const encrypted = encryptCardData({
            number,
            cvv: data.cvv,
            expiry: data.expiry,
            name: data.name.trim(),
          });
          store.addPaymentCard({
            cardLast4: number.slice(-4),
            cardName: data.name.trim(),
            cardLimitUsd: data.limit,
            cardSpentUsd: 0,
            isActive: true,
            encryptedData: JSON.stringify(encrypted),
          });
          state.showCardForm = false;
          renderContent();
        },
        () => {
          state.showCardForm = false;
          renderContent();
        },
      );
      state.cardFormRef = cardForm;
      view = cardForm;
    } else {
      switch (state.activeTab) {
        case "overview":
          view = new OverviewContainer(store);
          break;
        case "ventures":
          view = new VenturesView(store);
          break;
        case "workers":
          view = new WorkersView();
          break;
        case "logs":
          view = new LogsView(store);
          break;
        case "settings":
          view = new SettingsView(store);
          break;
        default:
          view = new Container();
      }
    }

    contentContainer.addChild(view);
    renderTabBar();
    tui.invalidate();
  };

  // Initial render
  renderContent();

  // Handle input
  // Create an input handler container
  class InputHandler extends Container {
    handleInput(keyData: string): void {
      if (state.showCardForm && state.cardFormRef) {
        if (state.cardFormRef.handleInput(keyData)) return;
      }

      if (
        state.activeTab === "settings" &&
        (keyData === "c" || keyData === "C") &&
        !state.showCardForm
      ) {
        state.showCardForm = true;
        renderContent();
        return;
      }

      if (keyData === "\t") {
        const tabs: TabId[] = ["overview", "ventures", "workers", "logs", "settings"];
        const currentIndex = tabs.indexOf(state.activeTab);
        state.activeTab = tabs[(currentIndex + 1) % tabs.length];
        renderContent();
      } else if (keyData === "\x1b[Z") {
        const tabs: TabId[] = ["overview", "ventures", "workers", "logs", "settings"];
        const currentIndex = tabs.indexOf(state.activeTab);
        state.activeTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
        renderContent();
      } else if (keyData >= "1" && keyData <= "5") {
        const tabs: TabId[] = ["overview", "ventures", "workers", "logs", "settings"];
        const index = Number.parseInt(keyData, 10) - 1;
        if (index >= 0 && index < tabs.length) {
          state.activeTab = tabs[index];
          state.showCardForm = false;
          renderContent();
        }
      } else if (keyData === "\x03") {
        process.exit(0);
      }
    }
  }

  const inputHandler = new InputHandler();
  root.addChild(inputHandler);

  tui.addChild(root);
  tui.setFocus(inputHandler);

  // Start the TUI (blocks until stopped; Ctrl+C is handled by InputHandler)
  tui.start();
}

/**
 * Overview container
 */
class OverviewContainer extends Container {
  constructor(private store: ReturnType<typeof openVentureStateStore>) {
    super();
  }

  render(_width: number): string[] {
    const lines: string[] = [];

    lines.push(theme.bold("\n  💰 Capital Status"));
    lines.push("");
    lines.push(`    Available:        ${chalk.green("$" + this.store.getCapital("available"))}`);
    lines.push(
      `    Earned (Lifetime): ${chalk.green("$" + this.store.getCapital("earned_lifetime"))}`,
    );
    lines.push(
      `    Spent (Lifetime):  ${chalk.yellow("$" + this.store.getCapital("spent_lifetime"))}`,
    );
    const net = this.store.getCapital("earned_lifetime") - this.store.getCapital("spent_lifetime");
    lines.push(
      `    Net Position:      ${net >= 0 ? chalk.green("$" + net) : chalk.red("$" + net)}`,
    );

    lines.push("");
    lines.push(theme.bold("  📊 Investment Summary"));
    lines.push("");

    const active = this.store.listInvestments("active");
    const completed = this.store.listInvestments("completed");
    const killed = this.store.listInvestments("killed");

    lines.push(`    Active ventures:     ${chalk.cyan(active.length.toString())}`);
    lines.push(`    Completed ventures:  ${chalk.green(completed.length.toString())}`);
    lines.push(`    Killed ventures:     ${chalk.red(killed.length.toString())}`);

    const total = active.length + completed.length + killed.length;
    const winRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    lines.push(
      `    Win rate:            ${winRate >= 50 ? chalk.green(winRate + "%") : chalk.yellow(winRate + "%")}`,
    );

    lines.push("");
    lines.push(theme.bold("  💳 Payment Cards"));
    lines.push("");
    const cards = this.store.listPaymentCards();
    if (cards.length === 0) {
      lines.push(chalk.gray("    No payment cards configured"));
      lines.push(chalk.gray("    Press 5 for Settings, then 'c' to add a card"));
    } else {
      for (const card of cards) {
        const masked = `**** **** **** ${card.cardLast4}`;
        const status = card.isActive ? chalk.green("[Active]") : chalk.gray("[Inactive]");
        const remaining = card.cardLimitUsd - (card.cardSpentUsd ?? 0);
        lines.push(
          `    ${masked} ${status} — Limit: $${card.cardLimitUsd}, remaining: $${remaining}`,
        );
        lines.push(chalk.gray(`    ${card.cardName}`));
      }
    }

    lines.push("");
    lines.push(theme.bold("  ⚡ Quick Actions"));
    lines.push("");
    lines.push(chalk.gray("    Press 2 to view all ventures"));
    lines.push(chalk.gray("    Press 3 to view all workers"));
    lines.push(chalk.gray("    Press 4 to view live logs"));
    lines.push(chalk.gray("    Press 5 to access settings"));

    return lines;
  }
}
