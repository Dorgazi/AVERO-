import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="label text-stone-deep">404</p>
      <h1 className="mt-4 text-5xl">Not on the rail.</h1>
      <p className="mt-4 text-charcoal-soft">This piece isn&apos;t available, or it may not have been released yet.</p>
      <Link href="/shop" className="btn btn-primary mt-10">Back to the shop</Link>
    </div>
  );
}
