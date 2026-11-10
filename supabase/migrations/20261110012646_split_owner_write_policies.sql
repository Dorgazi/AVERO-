-- Replace FOR ALL owner policies with per-action policies so SELECT is governed
-- by a single permissive policy (same access, better planning).
drop policy if exists variants_owner_write on public.product_variants;
create policy variants_owner_insert on public.product_variants for insert to authenticated with check ((select public.is_owner()));
create policy variants_owner_update on public.product_variants for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy variants_owner_delete on public.product_variants for delete to authenticated using ((select public.is_owner()));

drop policy if exists images_owner_write on public.product_images;
create policy images_owner_insert on public.product_images for insert to authenticated with check ((select public.is_owner()));
create policy images_owner_update on public.product_images for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy images_owner_delete on public.product_images for delete to authenticated using ((select public.is_owner()));
