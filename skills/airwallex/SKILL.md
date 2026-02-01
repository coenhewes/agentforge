---
name: airwallex
description: "Use Airwallex for balances, FX quotes, transfers, and virtual cards. Use when checking the venture bank account, moving funds, or creating/spending with Airwallex cards. Requires AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY."
metadata: {"moltbot":{"emoji":"🏦","requires":{"env":["AIRWALLEX_CLIENT_ID","AIRWALLEX_API_KEY"]}}}
---

# Airwallex Skill

Use Airwallex as the venture bank account: Stripe withdraws into it; agents use virtual cards for spend. This skill covers balances, FX quotes, transfers, and card creation via tools.

## When to Use

- **Check balance**: Before planning spend or payouts, call `airwallex_balances` to see available and pending amounts per currency.
- **FX quote**: When moving money across currencies, call `airwallex_get_quote` to get a guaranteed rate and then create a transfer with the returned `quote_id` if needed.
- **Create transfer**: Use `airwallex_create_transfer` to send money to a beneficiary (bank details, reference, optional quote for FX). Then use `airwallex_get_transfer` to poll status.
- **Virtual cards**: Use `airwallex_create_card` to create organisation virtual cards (single or multi-use, with optional limits). Card details are retrieved via Airwallex’s PCI endpoint; agents must not ask for raw card numbers in chat.

## Credentials

- `AIRWALLEX_CLIENT_ID` – from Airwallex API menu.
- `AIRWALLEX_API_KEY` – from Airwallex API menu.
- Optional: `AIRWALLEX_BASE_URL` – default production; set to `https://api-demo.airwallex.com` for demo.

Tools return clear errors if credentials are missing or invalid.

## Tool Summary

| Tool | Purpose |
|------|---------|
| `airwallex_balances` | Current balances (available, pending, total) per currency. |
| `airwallex_get_quote` | FX quote for a currency pair; returns quote_id and rate validity window. |
| `airwallex_create_transfer` | Create outbound transfer; provide beneficiary, amount, currency, reference, optional quote_id. |
| `airwallex_get_transfer` | Get transfer status and details by transfer id. |
| `airwallex_create_card` | Create virtual card; optional per-transaction limits and merchant category. |

## Workflows

### Check available funds

1. Call `airwallex_balances`.
2. Use returned `available_amount` / `total_amount` per currency for planning (together with `venture_capital_status` for ledger/card spend).

### Send money (same currency)

1. Call `airwallex_create_transfer` with beneficiary, amount, currency, reference, `request_id` (UUID).
2. Call `airwallex_get_transfer` with the returned transfer id to confirm status.

### Send money (FX)

1. Call `airwallex_get_quote` with sell/buy amounts and currencies, validity (e.g. HR_24).
2. Use returned `quote_id` in `airwallex_create_transfer` when creating the transfer.
3. Poll with `airwallex_get_transfer`.

### Create a card for spend

1. Call `airwallex_create_card` with `name_on_card`, `primary_contact_details`, optional `authorization_controls` (limits, merchant categories).
2. Use the returned card id; retrieve secure card data only via Airwallex’s PCI endpoint (never ask users for full card numbers in chat).
3. Track spend against the card (e.g. via venture ledger or card limits).

## Integration with Venture Capital

- **Ledger**: Use `venture_capital_status` for ledger “Available” and card remaining; use `airwallex_balances` for the actual Airwallex account.
- **Charges**: Use `capital_charge_active_card` for charges with the card stored in the Investment Portal; that card may be an Airwallex-created card.
- **Stripe**: Stripe payouts can be configured to withdraw into the Airwallex account; balances then reflect in `airwallex_balances`.

## References

- API details: [references/api.md](references/api.md)
- Airwallex docs: https://www.airwallex.com/docs/api
