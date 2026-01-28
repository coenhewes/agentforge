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
| Date | Type | Category | Description | Amount | Balance | Investment ID |
|------|------|----------|-------------|--------|---------|---------------|
| 2024-01-15 | expense | hosting | Vercel Pro | -20.00 | 980.00 | |
| 2024-01-16 | revenue | subscription | Customer A | 29.00 | 1009.00 | INV-20240110-001 |
| 2024-01-17 | investment | ad_platform | Reddit Ads | -100.00 | 909.00 | INV-20240117-001 |

**Sheet 2: Summary**
| Metric | Value |
|--------|-------|
| Total Revenue | =SUMIF(Transactions!B:B,"revenue",Transactions!E:E) |
| Total Expenses | =SUMIF(Transactions!B:B,"expense",Transactions!E:E) |
| Total Investments | =SUMIF(Transactions!B:B,"investment",Transactions!E:E) |
| Net Profit | =B1+B2+B3 |
| MRR | [manual or calculated] |
| Investment ROI | =B1/ABS(B3) |

**Sheet 3: Investments**
| Investment ID | Date | Channel | Amount | Expected ROI | Revenue | Actual ROI | Status |
|---------------|------|---------|--------|--------------|---------|------------|--------|
| INV-20240110-001 | 2024-01-10 | newsletter | 150.00 | 3.0x | 450.00 | 3.0x | successful |
| INV-20240117-001 | 2024-01-17 | ad_platform | 100.00 | 2.5x | 0.00 | 0.0x | active |

**Sheet 4: Revenue Streams**
| Source | Type | This Month | Last Month | MoM Change | Notes |
|--------|------|------------|------------|------------|-------|
| Stripe | subscription | 500.00 | 350.00 | +43% | Growing |
| Gumroad | one-time | 200.00 | 180.00 | +11% | Stable |
| Affiliate | commission | 50.00 | 30.00 | +67% | New channel |

**Sheet 5: Accounts**
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

## P/L Calculation

### Real-Time Profit/Loss

Calculate net position at any moment:

```bash
#!/bin/bash
# get-pl.sh - Get current P/L
SHEET_ID="${FINANCE_SHEET_ID:-your-default-sheet-id}"
TOKEN=$(gcloud auth print-access-token)

# Get totals from Summary sheet
curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Summary!A:B" \
  -H "Authorization: Bearer $TOKEN" | jq -r '
  .values | 
  map({key: .[0], value: .[1]}) | 
  from_entries |
  "Revenue: \(.["Total Revenue"])
Expenses: \(.["Total Expenses"])
Investments: \(.["Total Investments"])
Net P/L: \(.["Net Profit"])
Investment ROI: \(.["Investment ROI"])"'
```

### Investment-Attributed Revenue

Track which investments generate revenue:

```bash
# Get revenue by investment ID
SHEET_ID="${FINANCE_SHEET_ID}"
TOKEN=$(gcloud auth print-access-token)
INV_ID="$1"  # e.g., INV-20240117-001

# Sum revenue where Investment ID matches
curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:G" \
  -H "Authorization: Bearer $TOKEN" | jq -r --arg inv "$INV_ID" '
  .values | 
  map(select(.[6] == $inv and .[1] == "revenue")) |
  map(.[4] | tonumber) |
  add // 0 |
  "Revenue from \($inv): $\(.)"'
```

### Calculate ROI for Investment

```bash
#!/bin/bash
# calc-roi.sh <investment_id>
SHEET_ID="${FINANCE_SHEET_ID}"
TOKEN=$(gcloud auth print-access-token)
INV_ID="$1"

# Get investment amount
INVESTED=$(curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!A:D" \
  -H "Authorization: Bearer $TOKEN" | jq -r --arg inv "$INV_ID" '
  .values | map(select(.[0] == $inv)) | .[0][3] // 0')

# Get attributed revenue
REVENUE=$(curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:G" \
  -H "Authorization: Bearer $TOKEN" | jq -r --arg inv "$INV_ID" '
  .values | map(select(.[6] == $inv and .[1] == "revenue")) |
  map(.[4] | tonumber) | add // 0')

# Calculate ROI
echo "Investment: $INV_ID"
echo "Amount Invested: $INVESTED"
echo "Revenue Generated: $REVENUE"
echo "ROI: $(echo "scale=2; $REVENUE / $INVESTED" | bc)x"
```

## Revenue Tracking

### Log Revenue with Investment Attribution

```bash
#!/bin/bash
# add-revenue.sh <source> <amount> <description> [investment_id]
SHEET_ID="${FINANCE_SHEET_ID}"
TOKEN=$(gcloud auth print-access-token)
DATE=$(date +%Y-%m-%d)

SOURCE="$1"       # e.g., "stripe", "gumroad"
AMOUNT="$2"       # e.g., 49.00
DESC="$3"         # e.g., "Customer signup"
INV_ID="${4:-}"   # Optional: INV-20240117-001

curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:G:append?valueInputOption=USER_ENTERED" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"values\": [[\"$DATE\", \"revenue\", \"$SOURCE\", \"$DESC\", \"$AMOUNT\", \"=INDIRECT(\\\"F\\\"&ROW()-1)+E\"&ROW(), \"$INV_ID\"]]
  }"

echo "Logged revenue: $AMOUNT from $SOURCE (Investment: ${INV_ID:-none})"
```

### Sync Stripe Revenue

```bash
#!/bin/bash
# sync-stripe-revenue.sh - Pull recent Stripe payments
# Requires: stripe CLI authenticated

SHEET_ID="${FINANCE_SHEET_ID}"
TOKEN=$(gcloud auth print-access-token)

# Get successful payments from last 24 hours
stripe payments list --limit 100 --created ">$(date -d '24 hours ago' +%s)" \
  --status succeeded -o json | jq -r '.data[] | 
  [
    (.created | strftime("%Y-%m-%d")),
    "revenue",
    "stripe",
    .description // "Stripe payment",
    (.amount / 100),
    "",
    .metadata.investment_id // ""
  ] | @csv' | while read -r line; do
    curl -s -X POST \
      "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:G:append?valueInputOption=USER_ENTERED" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"values\": [[$line]]}"
done

echo "Stripe revenue synced"
```

## Investment Tracking Integration

### Log New Investment

```bash
#!/bin/bash
# log-investment.sh <channel> <amount> <expected_roi> <target>
SHEET_ID="${FINANCE_SHEET_ID}"
TOKEN=$(gcloud auth print-access-token)
DATE=$(date +%Y-%m-%d)

CHANNEL="$1"       # e.g., "newsletter", "ad_platform"
AMOUNT="$2"        # e.g., 100.00
EXPECTED_ROI="$3"  # e.g., 2.5
TARGET="$4"        # e.g., "TechDaily Newsletter"

# Generate investment ID
INV_ID="INV-$(date +%Y%m%d)-$(printf '%03d' $((RANDOM % 1000)))"

# Log to Investments sheet
curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!A:H:append?valueInputOption=USER_ENTERED" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"values\": [[\"$INV_ID\", \"$DATE\", \"$CHANNEL\", \"$AMOUNT\", \"${EXPECTED_ROI}x\", \"0\", \"0.0x\", \"active\"]]
  }"

# Log to Transactions sheet
curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Transactions!A:G:append?valueInputOption=USER_ENTERED" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"values\": [[\"$DATE\", \"investment\", \"$CHANNEL\", \"$TARGET\", \"-$AMOUNT\", \"=INDIRECT(\\\"F\\\"&ROW()-1)+E\"&ROW(), \"$INV_ID\"]]
  }"

echo "Investment logged: $INV_ID - $AMOUNT to $CHANNEL ($TARGET)"
echo "Expected ROI: ${EXPECTED_ROI}x"
```

### Update Investment Status

```bash
#!/bin/bash
# update-investment.sh <inv_id> <status> [revenue]
SHEET_ID="${FINANCE_SHEET_ID}"
TOKEN=$(gcloud auth print-access-token)

INV_ID="$1"      # e.g., INV-20240117-001
STATUS="$2"      # e.g., "successful", "failed", "killed"
REVENUE="${3:-}" # Optional: total revenue if closing

# Find row number for this investment
ROW=$(curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!A:A" \
  -H "Authorization: Bearer $TOKEN" | jq -r --arg inv "$INV_ID" '
  .values | to_entries | map(select(.value[0] == $inv)) | .[0].key + 1')

if [ -n "$REVENUE" ]; then
  # Get original investment amount
  INVESTED=$(curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!D$ROW" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.values[0][0]')
  
  ROI=$(echo "scale=2; $REVENUE / $INVESTED" | bc)
  
  # Update revenue, ROI, and status
  curl -s -X PUT \
    "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!F$ROW:H$ROW?valueInputOption=USER_ENTERED" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"values\": [[\"$REVENUE\", \"${ROI}x\", \"$STATUS\"]]}"
else
  # Just update status
  curl -s -X PUT \
    "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!H$ROW?valueInputOption=USER_ENTERED" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"values\": [[\"$STATUS\"]]}"
fi

echo "Updated $INV_ID: status=$STATUS"
```

### Get Investment Performance Summary

```bash
#!/bin/bash
# investment-summary.sh - Overview of all investments
SHEET_ID="${FINANCE_SHEET_ID}"
TOKEN=$(gcloud auth print-access-token)

echo "=== Investment Performance ==="
curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!A:H" \
  -H "Authorization: Bearer $TOKEN" | jq -r '
  .values[1:] |
  group_by(.[7]) |
  map({
    status: .[0][7],
    count: length,
    total_invested: (map(.[3] | tonumber) | add),
    total_revenue: (map(.[5] | tonumber) | add)
  }) |
  .[] |
  "\(.status): \(.count) investments, $\(.total_invested) invested, $\(.total_revenue) revenue"'

echo ""
echo "=== Active Investments ==="
curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values/Investments!A:H" \
  -H "Authorization: Bearer $TOKEN" | jq -r '
  .values[1:] |
  map(select(.[7] == "active")) |
  .[] |
  "\(.[0]): $\(.[3]) in \(.[2]) (expecting \(.[4]))"'
```

## Tips

1. **Keep it simple:** Start with a single Transactions sheet; add complexity only when needed
2. **Use formulas:** Let Google Sheets calculate running balances and summaries
3. **Backup regularly:** Export to CSV monthly as backup
4. **Secure access:** Use service accounts with minimal permissions for automation
5. **Categorize consistently:** Use a fixed set of categories for better reporting
6. **Link investments:** Always include Investment ID when logging revenue from campaigns
7. **Track attribution:** Use UTM parameters or coupon codes to link revenue to investments

## Sheet Template

Create a new Google Sheet with this structure:

1. **Transactions** sheet: Date, Type, Category, Description, Amount, Balance, Investment ID
2. **Summary** sheet: Key metrics with formulas referencing Transactions
3. **Investments** sheet: Track all capital deployments with ROI
4. **Revenue Streams** sheet: Monthly revenue by source
5. **Accounts** sheet: Track different accounts/sources

Share the sheet with your service account email if using automation.

## Integration with invest-capital Skill

This skill works with the `invest-capital` skill:

1. When deploying capital, use `log-investment.sh` to record the investment
2. When revenue comes in, use `add-revenue.sh` with the Investment ID
3. Use `calc-roi.sh` to check if an investment should be killed
4. Use `update-investment.sh` to close out investments

The CEO agent should run `investment-summary.sh` during each heartbeat to review performance.
