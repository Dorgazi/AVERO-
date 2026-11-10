# Owner setup

Admin access is closed by default. An account can manage the store only if it is:

1. a confirmed Supabase Auth user, **and**
2. listed in `public.owners`.

The app checks both on every admin page, action and upload. Row Level Security enforces the same rule in the database.

## Current state

- The store owner's account has been authorized (migration `20261110012613_authorize_store_owner`).
- No test accounts exist.

## Add an owner

1. Supabase → Authentication → Users → **Add user** → enter the email and a strong password → tick *Auto confirm*.
2. Supabase → SQL editor:

   ```sql
   insert into public.owners (user_id, note)
   select id, 'Store owner' from auth.users where lower(email) = lower('owner@example.com')
   on conflict (user_id) do nothing;
   ```
3. Sign in at `/admin/login`.

## Remove an owner

```sql
delete from public.owners where user_id = (select id from auth.users where lower(email) = lower('owner@example.com'));
```

The account can still sign in to Supabase, but it can no longer reach the dashboard or write anything.

## Recommended Auth settings (Supabase dashboard)

- Authentication → Providers → Email: **disable sign-ups** (owners are added by hand).
- Authentication → Password security: **enable leaked-password protection** and set a minimum length of at least 12.
- Consider enabling MFA for owner accounts.
- Authentication → URL Configuration: set the Site URL to the production domain.
