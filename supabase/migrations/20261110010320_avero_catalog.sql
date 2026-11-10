-- AVÉRO catalog: owners, products, variants (stock by colour/size), images, storage.
-- Additive only. Safe to run on a fresh project; uses IF NOT EXISTS where Postgres allows.

-- ---------------------------------------------------------------------------
-- Owners allowlist. A Supabase Auth user is an owner only if listed here.
-- Rows are added manually (SQL editor / service role), never by the app.
-- ---------------------------------------------------------------------------
create table if not exists public.owners (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.owners enable row level security;

drop policy if exists owners_select_self on public.owners;
create policy owners_select_self on public.owners
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.owners o where o.user_id = (select auth.uid()));
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.product_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name          text not null check (char_length(name) between 1 and 120),
  description   text not null default '' check (char_length(description) <= 4000),
  details       text[] not null default '{}',          -- owner-supplied garment specification lines
  category      text not null default 't-shirts' check (category ~ '^[a-z0-9-]{1,40}$'),
  price_ngn     integer not null check (price_ngn between 0 and 100000000), -- whole naira
  status        public.product_status not null default 'draft',
  is_demo       boolean not null default false,          -- sample listing: never enters live checkout
  featured      boolean not null default false,
  version       integer not null default 1,              -- optimistic concurrency token
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists products_status_idx on public.products (status, featured);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  colour      text not null check (char_length(colour) between 1 and 40),
  size        text not null check (size in ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'ONE SIZE')),
  stock       integer not null default 0 check (stock between 0 and 1000000),
  sort_order  integer not null default 0,
  unique (product_id, colour, size)
);

create table if not exists public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  storage_path  text not null unique,
  alt_text      text not null default '' check (char_length(alt_text) <= 300),
  colour        text,                                     -- optional: image belongs to a colourway
  position      integer not null default 0,
  is_cover      boolean not null default false,
  is_concept    boolean not null default false,          -- generated / concept imagery, labelled on site
  width         integer,
  height        integer,
  created_at    timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, position);
create unique index if not exists product_images_one_cover on public.product_images (product_id) where is_cover;

-- First image becomes cover; deleting the cover promotes the next image.
create or replace function public.product_images_cover_maintenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.product_images where product_id = new.product_id and is_cover and id <> new.id) then
      update public.product_images set is_cover = true where id = new.id;
    end if;
    return null;
  elsif tg_op = 'DELETE' then
    if old.is_cover then
      update public.product_images set is_cover = true
      where id = (select id from public.product_images where product_id = old.product_id order by position, created_at limit 1);
    end if;
    return null;
  end if;
  return null;
end $$;

drop trigger if exists product_images_cover_ins on public.product_images;
create trigger product_images_cover_ins after insert on public.product_images
  for each row execute function public.product_images_cover_maintenance();
drop trigger if exists product_images_cover_del on public.product_images;
create trigger product_images_cover_del after delete on public.product_images
  for each row execute function public.product_images_cover_maintenance();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Shoppers (anon + any signed-in non-owner) see published products only.
-- Every write requires an owner.
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select to anon, authenticated
  using (status = 'published' or (select public.is_owner()));

drop policy if exists products_owner_insert on public.products;
create policy products_owner_insert on public.products
  for insert to authenticated with check ((select public.is_owner()));
drop policy if exists products_owner_update on public.products;
create policy products_owner_update on public.products
  for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy if exists products_owner_delete on public.products;
create policy products_owner_delete on public.products
  for delete to authenticated using ((select public.is_owner()));

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or (select public.is_owner()))));
drop policy if exists variants_owner_write on public.product_variants;
create policy variants_owner_write on public.product_variants
  for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

drop policy if exists images_read on public.product_images;
create policy images_read on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or (select public.is_owner()))));
drop policy if exists images_owner_write on public.product_images;
create policy images_owner_write on public.product_images
  for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

grant select on public.products, public.product_variants, public.product_images to anon, authenticated;
grant insert, update, delete on public.products, public.product_variants, public.product_images to authenticated;
grant select on public.owners to authenticated;

-- ---------------------------------------------------------------------------
-- Owner RPCs (security invoker: RLS still applies, plus explicit owner check)
-- ---------------------------------------------------------------------------

-- Create a draft product with variants. Returns id + version.
create or replace function public.admin_create_product(p_product jsonb, p_variants jsonb)
returns table (id uuid, version integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.is_owner() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  insert into public.products (slug, name, description, details, category, price_ngn, is_demo, featured, status)
  values (
    p_product->>'slug',
    p_product->>'name',
    coalesce(p_product->>'description', ''),
    coalesce(array(select jsonb_array_elements_text(p_product->'details')), '{}'),
    coalesce(p_product->>'category', 't-shirts'),
    (p_product->>'price_ngn')::integer,
    coalesce((p_product->>'is_demo')::boolean, false),
    coalesce((p_product->>'featured')::boolean, false),
    'draft'
  )
  returning products.id into v_id;

  insert into public.product_variants (product_id, colour, size, stock, sort_order)
  select v_id, e.value->>'colour', e.value->>'size', (e.value->>'stock')::integer, e.ordinality
  from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) with ordinality as e(value, ordinality);

  return query select v_id, 1;
end $$;

-- Update product fields and (optionally) the full variant set, only if the
-- caller's version matches. Raises 'stale_version' (40001) otherwise.
create or replace function public.admin_save_product(
  p_id uuid, p_expected_version integer, p_product jsonb, p_variants jsonb default null)
returns table (id uuid, version integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare v_new integer; v_cur integer;
begin
  if not public.is_owner() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.products p set
    slug        = coalesce(p_product->>'slug', p.slug),
    name        = coalesce(p_product->>'name', p.name),
    description = coalesce(p_product->>'description', p.description),
    details     = case when p_product ? 'details'
                       then array(select jsonb_array_elements_text(p_product->'details')) else p.details end,
    category    = coalesce(p_product->>'category', p.category),
    price_ngn   = coalesce((p_product->>'price_ngn')::integer, p.price_ngn),
    featured    = coalesce((p_product->>'featured')::boolean, p.featured),
    is_demo     = coalesce((p_product->>'is_demo')::boolean, p.is_demo),
    status      = coalesce((p_product->>'status')::public.product_status, p.status),
    published_at = case
                     when (p_product->>'status') = 'published' and p.status <> 'published' then now()
                     else p.published_at end,
    version     = p.version + 1,
    updated_at  = now()
  where p.id = p_id and p.version = p_expected_version
  returning p.version into v_new;

  if v_new is null then
    select p.version into v_cur from public.products p where p.id = p_id;
    if v_cur is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    raise exception 'stale_version' using errcode = '40001',
      detail = format('expected %s, current %s', p_expected_version, v_cur);
  end if;

  if p_variants is not null then
    delete from public.product_variants v
    where v.product_id = p_id
      and not exists (
        select 1 from jsonb_array_elements(p_variants) e
        where e->>'colour' = v.colour and e->>'size' = v.size);

    insert into public.product_variants (product_id, colour, size, stock, sort_order)
    select p_id, e.value->>'colour', e.value->>'size', (e.value->>'stock')::integer, e.ordinality
    from jsonb_array_elements(p_variants) with ordinality as e(value, ordinality)
    on conflict (product_id, colour, size)
      do update set stock = excluded.stock, sort_order = excluded.sort_order;
  end if;

  return query select p_id, v_new;
end $$;

-- Reorder gallery: p_ids in display order; must be exactly the product's images.
create or replace function public.admin_reorder_images(p_product uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if (select count(*) from public.product_images where product_id = p_product) <> coalesce(array_length(p_ids, 1), 0)
     or exists (select 1 from unnest(p_ids) i where not exists (
          select 1 from public.product_images pi where pi.id = i and pi.product_id = p_product)) then
    raise exception 'image_set_mismatch' using errcode = '40001';
  end if;
  update public.product_images pi set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where pi.id = o.id;
end $$;

create or replace function public.admin_set_cover(p_image uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_product uuid;
begin
  if not public.is_owner() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select product_id into v_product from public.product_images where id = p_image;
  if v_product is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.product_images set is_cover = false where product_id = v_product and is_cover and id <> p_image;
  update public.product_images set is_cover = true where id = p_image;
end $$;

revoke all on function public.admin_create_product(jsonb, jsonb) from public, anon;
revoke all on function public.admin_save_product(uuid, integer, jsonb, jsonb) from public, anon;
revoke all on function public.admin_reorder_images(uuid, uuid[]) from public, anon;
revoke all on function public.admin_set_cover(uuid) from public, anon;
grant execute on function public.admin_create_product(jsonb, jsonb) to authenticated;
grant execute on function public.admin_save_product(uuid, integer, jsonb, jsonb) to authenticated;
grant execute on function public.admin_reorder_images(uuid, uuid[]) to authenticated;
grant execute on function public.admin_set_cover(uuid) to authenticated;
revoke all on function public.product_images_cover_maintenance() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, server-enforced type + size limits.
-- Objects are readable only when referenced by an image of a published
-- product (or by an owner). Draft images stay private.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create or replace function public.is_published_image(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.product_images pi
    join public.products p on p.id = pi.product_id
    where pi.storage_path = p_path and p.status = 'published');
$$;
revoke all on function public.is_published_image(text) from public;
grant execute on function public.is_published_image(text) to anon, authenticated;

drop policy if exists avero_images_read on storage.objects;
create policy avero_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images' and ((select public.is_owner()) or public.is_published_image(name)));

drop policy if exists avero_images_owner_insert on storage.objects;
create policy avero_images_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_owner()));

drop policy if exists avero_images_owner_update on storage.objects;
create policy avero_images_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_owner()))
  with check (bucket_id = 'product-images' and (select public.is_owner()));

drop policy if exists avero_images_owner_delete on storage.objects;
create policy avero_images_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_owner()));
