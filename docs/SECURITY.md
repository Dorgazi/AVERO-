# Security model

## Roles

| Who | How identified | Can |
| --- | --- | --- |
| Shopper (anonymous or signed-in non-owner) | anything that is not an owner | Read **published** products, their variants and images |
| Owner | `auth.uid()` present in `public.owners` | Everything below, via RLS-checked writes |

`public.is_owner()` is `SECURITY INVOKER` and reads `owners`. RLS on `owners` only exposes the caller's own row, so the function cannot be used to list owners.

## Row Level Security

| Table | SELECT | INSERT / UPDATE / DELETE |
| --- | --- | --- |
| `products` | `status = 'published'` or owner | owner |
| `product_variants` | parent published or owner | owner |
| `product_images` | parent published or owner | owner |
| `owners` | own row only | none from the API (SQL editor only) |

## Storage (`product-images` bucket)

- **Private** bucket. There are no public URLs. The server signs every URL as the visitor, so RLS decides what can be signed.
- Read: owner, or `public.is_published_image(name)` (the object is referenced by an image of a published product). Draft and archived images, and orphaned files, are never readable by shoppers.
- Write: owners only.
- Limits enforced by Storage itself: 8 MB, `image/jpeg|png|webp|avif`. The upload route also sniffs magic bytes and decodes the file with `sharp` before storing it.

## Consistency

- **Stale edits**: `admin_save_product(id, expected_version, …)` updates only if the version matches. Otherwise it raises `stale_version`, and the dashboard tells the owner to reload. Price, stock and status changes all go through it and bump `version`.
- **Variants** are replaced in the same transaction as the product update.
- **Upload**: the file is stored first, then the row is inserted. If the insert fails, the file is removed.
- **Removal**: the row is deleted first, then the file. If file removal fails, the leftover object stays private and is logged.
- **Cover**: a partial unique index allows one cover per product. Triggers promote a new cover when the old one is deleted.

## Checkout

`validateCart` re-reads price, stock and publish status from Supabase as the visitor before the review page shows anything. Demo (`is_demo`) items are flagged and can never be paid for.

## Keys

Only the publishable key is used. No service-role key exists in the codebase or environment. Keep `PAYSTACK_SECRET_KEY` server-only when it is added.
