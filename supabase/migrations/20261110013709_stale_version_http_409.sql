-- Raise optimistic-concurrency conflicts with SQLSTATE PT409 (PostgREST maps
-- it to HTTP 409) instead of 40001, which PostgREST retries as a
-- serialization failure until the request times out. Bodies otherwise unchanged.

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
    raise exception 'stale_version' using errcode = 'PT409',
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
    raise exception 'image_set_mismatch' using errcode = 'PT409';
  end if;
  update public.product_images pi set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where pi.id = o.id;
end $$;
