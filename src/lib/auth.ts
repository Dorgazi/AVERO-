import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OwnerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
};

/**
 * Server-side authorization check. Verifies the JWT with Supabase
 * (getUser hits the Auth server) and checks the owners allowlist through RLS.
 * Returns null when the visitor is not an authorized owner.
 */
export async function getOwner(): Promise<OwnerContext | null> {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;
  const { data: owner } = await supabase
    .from("owners")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!owner) return null;
  return { supabase, userId: userData.user.id, email: userData.user.email ?? null };
}

/** For pages: redirect away unless the visitor is an owner. */
export async function requireOwnerPage(): Promise<OwnerContext> {
  const owner = await getOwner();
  if (!owner) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    redirect(data.user ? "/admin/login?error=not-owner" : "/admin/login");
  }
  return owner;
}

export class NotAuthorizedError extends Error {
  constructor() {
    super("not_authorized");
  }
}

/** For server actions and route handlers: throw unless owner. */
export async function requireOwner(): Promise<OwnerContext> {
  const owner = await getOwner();
  if (!owner) throw new NotAuthorizedError();
  return owner;
}
