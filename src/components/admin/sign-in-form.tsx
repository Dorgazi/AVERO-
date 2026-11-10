"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="label text-charcoal">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field mt-2" />
      </div>
      <div>
        <label htmlFor="password" className="label text-charcoal">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field mt-2" />
      </div>
      <div aria-live="assertive" className="min-h-5">
        {state && !state.ok && <p role="alert" className="text-sm text-alert">{state.error}</p>}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
