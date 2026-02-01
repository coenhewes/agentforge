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
| airwallex_create_beneficiary | POST | `/api/v1/beneficiaries/create` |
| airwallex_list_beneficiaries | GET | `/api/v1/beneficiaries` |
| airwallex_get_beneficiary | GET | `/api/v1/beneficiaries/{id}` |
| airwallex_create_transfer | POST | `/api/v1/transfers/create` |
| airwallex_get_transfer | GET | `/api/v1/transfers/{id}` |
| airwallex_list_transfers | GET | `/api/v1/transfers` |
| airwallex_create_card | POST | `/api/v1/issuing/cards/create` |
| airwallex_list_cards | GET | `/api/v1/issuing/cards` |
| airwallex_get_card | GET | `/api/v1/issuing/cards/{id}` |

## Quote Request Body (FX)

`buy_amount`, `buy_currency`, `sell_amount`, `sell_currency`, `validity` (e.g. HR_24), optional `conversion_date`.

## Create Beneficiary Request Body

`beneficiary` (object with type BANK_ACCOUNT/DIGITAL_WALLET, bank_details or digital_wallet, address, entity_type PERSONAL/COMPANY, transfer_methods SWIFT/LOCAL, company_name or first_name/last_name).

## Transfer Request Body

`request_id` (UUID), `transfer_amount`, `transfer_currency`, `source_currency`, `transfer_method` (e.g. LOCAL, SWIFT), `reason`, `reference`, and either `beneficiary_id` (saved beneficiary) or `beneficiary` (object with address, bank_details, entity_type, company_name or first_name/last_name). Optional `quote_id` for FX.

## Create Card Request Body

`request_id` (UUID), `form_factor` (VIRTUAL), `issue_to` (ORGANISATION), `name_on_card`, `primary_contact_details` (full_name, date_of_birth, mobile_number), optional `authorization_controls` (per_transaction_limits, allowed_merchant_categories, allowed_transaction_count).
