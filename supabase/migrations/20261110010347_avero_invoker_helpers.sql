-- Switch helper predicates to SECURITY INVOKER so they cannot be used to
-- bypass RLS. Results are unchanged:
--  * is_owner(): owners RLS only exposes the caller's own row.
--  * is_published_image(): products/product_images RLS + explicit status filter.
grant select on public.owners to anon;

create or replace function public.is_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.owners o where o.user_id = (select auth.uid()));
$$;

create or replace function public.is_published_image(p_path text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.product_images pi
    join public.products p on p.id = pi.product_id
    where pi.storage_path = p_path and p.status = 'published');
$$;
