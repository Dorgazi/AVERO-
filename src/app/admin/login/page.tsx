import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
import { Wordmark } from "@/components/wordmark";
import { SignInForm } from "@/components/admin/sign-in-form";

export const metadata: Metadata = { title: "Owner sign-in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getOwner()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Wordmark />
          <h1 className="mt-6 text-3xl">Owner sign-in</h1>
          <p className="mt-2 text-sm text-charcoal-soft">For authorized AVÉRO staff only.</p>
        </div>
        {error === "not-owner" && (
          <p role="alert" className="mt-8 border border-alert/40 bg-alert/5 p-3 text-sm text-alert">
            This account is signed in but is not authorized to manage the store.
          </p>
        )}
        <SignInForm />
      </div>
    </main>
  );
}
