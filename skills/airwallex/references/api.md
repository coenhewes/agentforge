# Airwallex API Reference

Quick reference for the Airwallex API used by the Airwallex tools. Full docs: https://www.airwallex.com/docs/api

## Base URL

- Production: `https://api.airwallex.com`
- Demo: `https://api-demo.airwallex.com`

Set `AIRWALLEX_BASE_URL` to override (e.g. for demo).

## Authentication

POST `/api/v1/authentication/login`  
Headers: `x-client-id`, `x-api-key`, `Content-Type: application/json`  
Response: `{ "token": "..." }`. Use as `Authorization: Bearer <token>` for all other requests.

## Endpoints Used by Tools

| Tool | Method | Path |
|------|--------|------|
| airwallex_balances | GET | `/api/v1/balances/current` |
| airwallex_get_quote | POST | `/api/v1/fx/quotes/create` |
| airwallex_create_transfer | POST | `/api/v1/transfers/create` |
| airwallex_get_transfer | GET | `/api/v1/transfers/{id}` |
| airwallex_create_card | POST | `/api/v1/issuing/cards/create` |

## Quote Request Body (FX)

`buy_amount`, `buy_currency`, `sell_amount`, `sell_currency`, `validity` (e.g. HR_24), optional `conversion_date`.

## Transfer Request Body

`request_id` (UUID), `transfer_amount`, `transfer_currency`, `source_currency`, `transfer_method` (e.g. LOCAL, SWIFT), `reason`, `reference`, `beneficiary` (object with address, bank_details, entity_type, company_name or first_name/last_name).

## Create Card Request Body

`request_id` (UUID), `form_factor` (VIRTUAL), `issue_to` (ORGANISATION), `name_on_card`, `primary_contact_details` (full_name, date_of_birth, mobile_number), optional `authorization_controls` (per_transaction_limits, allowed_merchant_categories, allowed_transaction_count).
