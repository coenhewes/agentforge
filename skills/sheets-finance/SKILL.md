---
name: sheets-finance
description: "Track finances in Google Sheets. Read/append data via Google Sheets API with gcloud auth or service accounts."
metadata: {"moltbot":{"emoji":"📊","requires":{"bins":["gcloud"]}}}
---

# Google Sheets Financial Tracking

Use Google Sheets as a simple financial database for tracking expenses, revenue, and cash flow.

## Prerequisites

1. Google Cloud project with Sheets API enabled
2. `gcloud` CLI authenticated (`gcloud auth login`)
3. A Google Sheet created with the right structure

## Authentication

### Option 1: User Account (Interactive)

```bash
gcloud auth login
gcloud auth application-default login
```

### Option 2: Service Account (Automation)

```bash
# Create service account
gcloud iam service-accounts create sheets-bot --display-name="Sheets Bot"

# Download key
gcloud iam service-accounts keys create ~/sheets-key.json \
  --iam-account=sheets-bot@PROJECT_ID.iam.gserviceaccount.com

# Set environment
export GOOGLE_APPLICATION_CREDENTIALS=~/sheets-key.json
```

Then share your Google Sheet with the service account email.

## Sheet Structure

### Recommended Financial Sheet Layout

**Sheet 1: Transactions**
| Date | Type | Category | Description | Amount | Balance |
|------|------|----------|-------------|--------|---------|
| 2024-01-15 | expense | hosting | Vercel Pro | -20.00 | 980.00 |
| 2024-01-16 | revenue | subscription | Customer A | 29.00 | 1009.00 |

**Sheet 2: Summary**
| Metric | Value |
|--------|-------|
| Total Revenue | =SUMIF(Transactions!B:B,"revenue",Transactions!E:E) |
| Total Expenses | =SUMIF(Transactions!B:B,"expense",Transactions!E:E) |
| Net Profit | =B1+B2 |
| MRR | [manual or calculated] |

**Sheet 3: Accounts**
| Account | Type | Balance | Updated |
|---------|------|---------|---------|
| Stripe | revenue | 500.00 | 2024-01-15 |
| Bank | checking | 2500.00 | 2024-01-15 |

## Reading Data

### Using curl with gcloud auth

```bash
# Get access token
TOKEN=$(gcloud auth print-access-token)

# Read a range
curl -s "https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Transactions!A:F" \
  -H "Authorization: Bearer $TOKEN" | jq '.values'
```

### Read Specific Range

```bash
SHEET_ID="your-spreadsheet-id"
RANGE="Transactions!A2:F100"
TOKEN=$(gcloud auth print-access-token)

curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/$RANGE" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.values[] | @tsv'
```

### Get Latest Balance

```bash
# Read last row of Transactions sheet
curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:F" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.values[-1]'
```

## Writing Data

### Append a Transaction

```bash
SHEET_ID="your-spreadsheet-id"
TOKEN=$(gcloud auth print-access-token)

# Append expense
curl -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:F:append?valueInputOption=USER_ENTERED" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "values": [
      ["2024-01-20", "expense", "software", "GitHub Pro", "-4.00", "=F1+E2"]
    ]
  }'
```

### Append Revenue Entry

```bash
curl -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:F:append?valueInputOption=USER_ENTERED" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "values": [
      ["2024-01-20", "revenue", "subscription", "New customer signup", "29.00", "=F1+E2"]
    ]
  }'
```

## Helper Scripts

### Add Transaction Script

Create `~/scripts/add-transaction.sh`:

```bash
#!/bin/bash
# Usage: add-transaction.sh <type> <category> <description> <amount>
# Example: add-transaction.sh expense hosting "Vercel Pro" -20.00

SHEET_ID="${FINANCE_SHEET_ID:-your-default-sheet-id}"
TOKEN=$(gcloud auth print-access-token)
DATE=$(date +%Y-%m-%d)

TYPE="$1"
CATEGORY="$2"
DESC="$3"
AMOUNT="$4"

curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:F:append?valueInputOption=USER_ENTERED" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"values\": [[\"$DATE\", \"$TYPE\", \"$CATEGORY\", \"$DESC\", \"$AMOUNT\", \"=INDIRECT(\\\"F\\\"&ROW()-1)+E\"&ROW()]]
  }"

echo "Added: $DATE | $TYPE | $CATEGORY | $DESC | $AMOUNT"
```

### Get Summary Script

Create `~/scripts/finance-summary.sh`:

```bash
#!/bin/bash
# Get financial summary from Google Sheet

SHEET_ID="${FINANCE_SHEET_ID:-your-default-sheet-id}"
TOKEN=$(gcloud auth print-access-token)

echo "=== Financial Summary ==="
curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Summary!A:B" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.values[] | "\(.[0]): \(.[1])"'

echo ""
echo "=== Recent Transactions ==="
curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:F" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.values[-5:][] | @tsv'
```

## Integration with 1Password

Store sensitive financial data securely:

```bash
# Store credit card for automated payments
op item create --category="Credit Card" --title="Business Card" \
  --vault="Business" \
  number="4111111111111111" \
  expiry="12/25" \
  cvv="123"

# Retrieve when needed
CARD_NUM=$(op read "op://Business/Business Card/number")
CARD_EXP=$(op read "op://Business/Business Card/expiry")
CARD_CVV=$(op read "op://Business/Business Card/cvv")
```

## Common Workflows

### Daily Financial Check

```bash
# Run as part of CEO heartbeat
~/scripts/finance-summary.sh
```

### Log a New Expense

```bash
~/scripts/add-transaction.sh expense software "Claude API credits" -50.00
```

### Log Revenue

```bash
~/scripts/add-transaction.sh revenue subscription "Customer upgrade" 49.00
```

### End of Day Reconciliation

```bash
# Get today's transactions
SHEET_ID="your-sheet-id"
TOKEN=$(gcloud auth print-access-token)
TODAY=$(date +%Y-%m-%d)

curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:F" \
  -H "Authorization: Bearer $TOKEN" | jq -r ".values[] | select(.[0]==\"$TODAY\") | @tsv"
```

## Alternative: Node.js Script

For more complex operations, use the Google Sheets API directly:

```javascript
// finance-tracker.js
const { google } = require('googleapis');

async function appendTransaction(type, category, desc, amount) {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const date = new Date().toISOString().split('T')[0];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.FINANCE_SHEET_ID,
    range: 'Transactions!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[date, type, category, desc, amount, `=INDIRECT("F"&ROW()-1)+E`+`&ROW()`]]
    }
  });
}

// Usage: node finance-tracker.js expense hosting "Vercel" -20
const [,, type, category, desc, amount] = process.argv;
appendTransaction(type, category, desc, parseFloat(amount));
```

## Environment Variables

Set these in your shell profile:

```bash
export FINANCE_SHEET_ID="1abc123def456..."  # Your Google Sheet ID
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/sheets-key.json"  # For service account
```

## Tips

1. **Keep it simple:** Start with a single Transactions sheet; add complexity only when needed
2. **Use formulas:** Let Google Sheets calculate running balances and summaries
3. **Backup regularly:** Export to CSV monthly as backup
4. **Secure access:** Use service accounts with minimal permissions for automation
5. **Categorize consistently:** Use a fixed set of categories for better reporting

## Sheet Template

Create a new Google Sheet with this structure:

1. **Transactions** sheet: Date, Type, Category, Description, Amount, Balance
2. **Summary** sheet: Key metrics with formulas referencing Transactions
3. **Accounts** sheet: Track different accounts/sources

Share the sheet with your service account email if using automation.
