---
name: stripe
description: "Stripe CLI reference for payment integration. Use for testing, creating products/prices, and webhook development."
metadata: {"moltbot":{"emoji":"💳","requires":{"bins":["stripe"]},"install":[{"id":"brew","kind":"brew","formula":"stripe/stripe-cli/stripe","bins":["stripe"],"label":"Install Stripe CLI (brew)"}]}}
---

# Stripe CLI Reference

Reference for developers integrating Stripe payments. This is a guide, not a replacement for reading docs and writing code.

## Agent tools (balance and payouts)

Agents have dedicated tools for Stripe balance and payouts (no CLI required):

- **`stripe_balance`** – Return Stripe account balance (available and pending) per currency. Call before planning payouts or to see how much can be withdrawn to Airwallex.
- **`stripe_list_payouts`** – List Stripe payouts to the external bank (e.g. Airwallex). Optional limit and status filter. Use to see payout history and failure reasons.
- **`stripe_create_payout`** – Create a payout to the default external bank account (e.g. Airwallex). Amount in cents, optional currency (default usd) and idempotency key. **One-time setup:** Set Airwallex as the default payout destination in Stripe Dashboard or API; then agents can trigger payouts on demand.

Credentials: use existing Stripe config (`STRIPE_SECRET_KEY` or `humanInterface.agentforge.stripe`). No new env vars.

## Installation & Auth

```bash
# Install (macOS)
brew install stripe/stripe-cli/stripe

# Login (opens browser)
stripe login

# Verify
stripe config --list
```

## Products & Prices

### Create a Product

```bash
stripe products create \
  --name="Pro Plan" \
  --description="Full access to all features"
```

### Create a Price (Subscription)

```bash
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=1900 \
  --currency=usd \
  --recurring[interval]=month
```

### Create a One-Time Price

```bash
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=4900 \
  --currency=usd
```

### List Products

```bash
stripe products list --limit=10
```

### List Prices

```bash
stripe prices list --product="prod_xxx"
```

## Checkout Sessions

### Create a Checkout Session (API Pattern)

In your code (Node.js example):

```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription', // or 'payment' for one-time
  line_items: [{
    price: 'price_xxx',
    quantity: 1,
  }],
  success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yoursite.com/cancel',
});
// Redirect user to session.url
```

### Test Checkout with CLI

```bash
# Trigger a checkout.session.completed event
stripe trigger checkout.session.completed
```

## Webhooks

### Listen for Events (Development)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This prints a webhook signing secret - use it to verify events:

```bash
# Example output:
# Ready! Your webhook signing secret is whsec_xxx
```

### Test Specific Events

```bash
# Payment succeeded
stripe trigger payment_intent.succeeded

# Subscription created
stripe trigger customer.subscription.created

# Invoice paid
stripe trigger invoice.paid

# Checkout completed
stripe trigger checkout.session.completed
```

### Common Webhook Events

| Event | When |
|-------|------|
| `checkout.session.completed` | Customer completes checkout |
| `customer.subscription.created` | New subscription |
| `customer.subscription.updated` | Plan change, cancel, etc. |
| `customer.subscription.deleted` | Subscription ended |
| `invoice.paid` | Payment successful |
| `invoice.payment_failed` | Payment failed |

### Webhook Handler Pattern (Node.js)

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Provision access, send welcome email, etc.
      break;
    case 'customer.subscription.deleted':
      // Revoke access
      break;
  }

  return new Response('OK', { status: 200 });
}
```

## Customers

### Create Customer

```bash
stripe customers create \
  --email="customer@example.com" \
  --name="John Doe"
```

### List Customers

```bash
stripe customers list --limit=10
```

### Search Customers

```bash
stripe customers search --query="email:'customer@example.com'"
```

## Subscriptions

### List Subscriptions

```bash
stripe subscriptions list --customer="cus_xxx"
```

### Cancel Subscription

```bash
stripe subscriptions cancel sub_xxx
```

## Testing

### Test Cards

| Number | Result |
|--------|--------|
| 4242424242424242 | Success |
| 4000000000000002 | Decline |
| 4000002500003155 | Requires 3D Secure |

### Test Mode

Stripe CLI uses test mode by default. All operations are safe.

```bash
# Verify you're in test mode
stripe config --list
# Should show test mode API key
```

## Common Integration Patterns

### SaaS Subscription Flow

1. Create product + price in Stripe Dashboard or CLI
2. Build checkout button that creates session
3. Redirect to Stripe Checkout
4. Handle `checkout.session.completed` webhook
5. Provision user access
6. Handle `customer.subscription.deleted` for cancellations

### One-Time Payment Flow

1. Create product + one-time price
2. Create checkout session with `mode: 'payment'`
3. Handle `checkout.session.completed`
4. Deliver product/access

### Customer Portal

```javascript
// Let customers manage their subscription
const session = await stripe.billingPortal.sessions.create({
  customer: 'cus_xxx',
  return_url: 'https://yoursite.com/account',
});
// Redirect to session.url
```

## Environment Variables

```bash
# Required for your app
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional: price IDs
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_YEARLY=price_xxx
```

## Quick Reference

```bash
# Products
stripe products create --name="Name"
stripe products list

# Prices
stripe prices create --product=prod_xxx --unit-amount=1000 --currency=usd
stripe prices list --product=prod_xxx

# Webhooks (dev)
stripe listen --forward-to localhost:3000/webhook
stripe trigger checkout.session.completed

# Customers
stripe customers list
stripe customers create --email="x@y.com"

# Subscriptions
stripe subscriptions list --customer=cus_xxx
stripe subscriptions cancel sub_xxx

# Logs
stripe logs tail
```

## Tips for Developers

1. **Start in test mode:** All CLI operations default to test mode
2. **Use the Dashboard:** Product/price creation is often easier in UI
3. **Webhook first:** Build webhook handler before checkout flow
4. **Use Stripe Checkout:** Don't build custom payment forms unless necessary
5. **Handle failures:** Always handle `invoice.payment_failed` events
6. **Customer Portal:** Use Stripe's portal for subscription management

## Links

- Dashboard: https://dashboard.stripe.com
- Docs: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Checkout Guide: https://stripe.com/docs/payments/checkout
