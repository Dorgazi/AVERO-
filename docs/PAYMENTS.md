# Payments, delivery and order processing: integration guide

Status: **not configured**. `/checkout` validates the bag against Supabase and shows "Payments are awaiting setup". No order is created and nothing is charged.

## What the owner needs to provide

- A Paystack account (live and test secret keys), with settlement in NGN.
- Delivery rules: zones (e.g. Lagos Island / Mainland / interstate), fees, timelines, and any free-delivery threshold.
- Returns and exchange policy text.

## Where to connect it

1. **Orders schema**: add a migration with `orders` (reference, email, phone, address, delivery_fee_ngn, subtotal_ngn, total_ngn, status: `pending|paid|failed|cancelled|fulfilled`), `order_items` (variant_id, name snapshot, colour, size, unit_price_ngn, qty), and `payment_events` (provider event id **unique**, payload, received_at). Enable RLS with no shopper write access. Writes happen only inside `SECURITY DEFINER` functions called from the server.
2. **Start checkout** (server action next to `src/lib/cart-validation.ts`):
   - Call `validateCart`. Reject if any line has an issue or `isDemo`.
   - Compute the delivery fee on the server from the delivery rules.
   - Create a `pending` order and **reserve stock** atomically, e.g. `update product_variants set stock = stock - qty where id = … and stock >= qty`, and fail if no row is updated.
   - Initialize a Paystack transaction (`amount` in kobo = total × 100, `currency: "NGN"`, `reference` = order reference) and redirect to `authorization_url`.
3. **Verify** on the callback page by calling Paystack `GET /transaction/verify/:reference` from the server. Never trust query parameters.
4. **Webhook** `src/app/api/paystack/webhook/route.ts`:
   - Verify the `x-paystack-signature` HMAC-SHA512 of the raw body with `PAYSTACK_SECRET_KEY`.
   - Insert into `payment_events` and ignore duplicates on the unique event id, so repeated webhooks are safe.
   - In one transaction: if the amount and currency match and the order is still `pending`, mark it `paid`. On `failed` or abandoned (or a timeout job), release the reserved stock.
5. Switch `paymentsConfigured` in `validateCart` to `Boolean(process.env.PAYSTACK_SECRET_KEY)` and enable the Pay button.
6. **Order processing**: add an `/admin/orders` list (owner-only RLS) with fulfilment status updates and customer notifications.

Demo products are rejected at step 2 regardless of configuration.
