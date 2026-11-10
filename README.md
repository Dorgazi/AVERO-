# AVÉRO storefront and owner dashboard

Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage). Quiet-luxury storefront for AVÉRO's structured, boxy-fit menswear, with a private owner dashboard.

- **Storefront**: home (editorial hero, featured collection, silhouette), filterable catalog `/shop`, product pages `/shop/[slug]` (gallery, colour/size, sold-out states, NGN), persistent bag `/cart`, checkout review `/checkout`.
- **Owner dashboard** `/admin`: create, edit, preview, publish, unpublish and archive products. Whole-naira pricing, stock by colour × size, image upload, alt text, reordering, cover image and removal.
- **Security**: Supabase Auth plus an `owners` allowlist. Every admin action is re-authorized on the server and enforced again by Row Level Security. No service-role key exists in the app.

## Run locally

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local      # then fill in values
npm run dev                     # http://localhost:3000
```

Production build:

```bash
npm run build && npm run start
```

### Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / host | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` / host | Publishable (anon) key. Safe for browsers; RLS enforces access |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` / host | Public origin, e.g. `https://avero.ng` |
| `PAYSTACK_SECRET_KEY` | host only (server) | Not used yet. See [docs/PAYMENTS.md](docs/PAYMENTS.md) |
| `TEST_OWNER_EMAIL` / `TEST_OWNER_PASSWORD` | `.env.test.local` | Owner credentials for seeding and owner tests |
| `TEST_SHOPPER_EMAIL` / `TEST_SHOPPER_PASSWORD` | `.env.test.local` | Optional non-owner account for access tests |

## Database

Migrations live in [supabase/migrations](supabase/migrations). They are additive and already applied to the hosted project.

| Migration | What it does |
| --- | --- |
| `…010320_avero_catalog` | `owners`, `products`, `product_variants`, `product_images`, RLS, owner RPCs, private `product-images` bucket (8 MB, JPEG/PNG/WebP/AVIF), storage policies |
| `…010347_avero_invoker_helpers` | Helper predicates switched to `SECURITY INVOKER` |
| `…012613_authorize_store_owner` | Placeholder recording that the owner was authorized (no personal data in repo) |
| `…012646_split_owner_write_policies` | Per-action owner policies (same access, faster reads) |

To apply them to a new project: `supabase link --project-ref <ref>`, then `supabase db push`. Policies are explained in [docs/SECURITY.md](docs/SECURITY.md).

## Owner setup

See [docs/OWNER_SETUP.md](docs/OWNER_SETUP.md). Until an account is listed in `public.owners`, the dashboard stays closed to everyone.

## Demo data (optional, separate from migrations)

```bash
npm run seed:demo         # idempotent: The Essential Tee (4 colours, ₦80,000) + 2 socks (₦50,000 sample price), labelled "Sample product"; prunes sample listings no longer in the list
npm run seed:demo:reset   # removes every is_demo product and its images
```

Sample listings are `is_demo = true`. They show a "Sample product" badge, mark their stock as sample stock, and use "Concept imagery" labels. The checkout refuses them. The seed never touches a product with `is_demo = false`.

## Tests

```bash
npm run test:security     # RLS / storage tests against Supabase (owner suites need .env.test.local)
npm run build && npm run test:e2e   # Playwright: mobile storefront, guards, owner dashboard
```

Test data is named `[TEST] …`, uses `test-` slugs and `is_demo = true`, and is deleted after each run.

## Deploy (Vercel recommended)

1. Push this repo to GitHub and import it in Vercel (Framework: Next.js).
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` for Production and Preview.
3. In Supabase → Authentication → URL Configuration, set the Site URL to your domain.
4. In Supabase → Authentication → Providers → Email, turn off sign-ups if staff accounts are created by hand. Turn on leaked-password protection.
5. Deploy. The image upload route needs the Node.js runtime (already set). Uploads are capped at 8 MB.

Any Node host that runs `next start` also works.

## Brand assets

- The wordmark is typeset (Cormorant Garamond). The interlocking **AV monogram is not recreated**. Supply the approved SVG at `public/brand/monogram.svg` and it can be wired into `src/components/wordmark.tsx`.
- Product imagery comes from the supplied `DESIGNS` renders, split into front and back views in `seed/images`. Because these are renders, the seed labels them "Concept imagery". Untick that per image in the dashboard once real photography is uploaded.
