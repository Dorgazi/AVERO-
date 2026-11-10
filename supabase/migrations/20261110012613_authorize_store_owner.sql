-- Owner authorization (data, not schema). Applied to the hosted project on
-- 2026-11-10 for the store owner's account. The email is intentionally not
-- stored in this public repository; to authorize an owner on another
-- environment, follow docs/OWNER_SETUP.md:
--
--   insert into public.owners (user_id, note)
--   select id, 'Store owner' from auth.users where lower(email) = lower('<owner email>')
--   on conflict (user_id) do nothing;
select 1;
