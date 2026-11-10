import Link from "next/link";
import { coverImage, getPublishedProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { ConceptBadge } from "@/components/store/badges";
import { SilhouetteDiagram } from "@/components/store/silhouette";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getPublishedProducts();
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const collection = featured.length ? featured : products.slice(0, 4);
  const hero = collection[0];
  const heroImage =
    hero?.product_images.find((i) => /back/i.test(i.storage_path) && i.colour === "Black") ??
    (hero ? coverImage(hero) : undefined);

  return (
    <>
      {/* Editorial hero */}
      <section aria-labelledby="hero-title" className="border-b border-stone/60">
        <div className="mx-auto grid max-w-7xl md:grid-cols-12">
          <div className="flex flex-col justify-end px-4 pb-12 pt-16 sm:px-8 md:col-span-5 md:pb-20 md:pt-28">
            <p className="label text-stone-deep">Lagos · Collection 01</p>
            <h1 id="hero-title" className="mt-6 text-5xl sm:text-6xl lg:text-7xl">
              Structure,
              <br />
              <em className="font-normal">quietly kept.</em>
            </h1>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-charcoal-soft">
              AVÉRO begins with a single garment: a boxy-fit T-shirt with a roomy body, dropped shoulders and
              a clean crew neck. Everything else follows from it.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary">
                Shop the collection
              </Link>
              <Link href="#silhouette" className="btn btn-ghost">
                The silhouette
              </Link>
            </div>
          </div>
          <div className="relative md:col-span-7">
            <div className="relative aspect-[4/5] bg-bone-deep md:aspect-auto md:h-full md:min-h-[640px]">
              {heroImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage.url}
                  alt={heroImage.alt_text || hero?.name || "AVÉRO T-shirt"}
                  className="absolute inset-0 h-full w-full object-cover"
                  fetchPriority="high"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-espresso">
                  <span className="font-serif text-6xl tracking-[0.3em] text-bone/90">AVÉRO</span>
                </div>
              )}
              {heroImage?.is_concept && <ConceptBadge className="absolute bottom-4 left-4" />}
            </div>
          </div>
        </div>
      </section>

      {/* Featured collection */}
      <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-8 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label text-stone-deep">Featured</p>
            <h2 id="featured-title" className="mt-3 text-4xl sm:text-5xl">
              The Essentials
            </h2>
          </div>
          <Link href="/shop" className="label link-underline py-2 text-espresso">
            View all pieces
          </Link>
        </div>
        {collection.length ? (
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
            {collection.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-12 text-charcoal-soft">The collection is being prepared. Please check back soon.</p>
        )}
      </section>

      {/* The silhouette */}
      <section id="silhouette" aria-labelledby="silhouette-title" className="scroll-mt-20 bg-bone-deep">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 py-20 sm:px-8 md:grid-cols-2 md:py-28">
          <div>
            <p className="label text-stone-deep">The AVÉRO silhouette</p>
            <h2 id="silhouette-title" className="mt-3 text-4xl sm:text-5xl">
              Cut wide. Worn easy.
            </h2>
            <div className="mt-8 max-w-md space-y-5 text-charcoal-soft">
              <p>
                The shoulder seam drops past the natural shoulder, so the T-shirt sits square rather than
                clinging. The body falls straight and roomy from chest to hem.
              </p>
              <p>
                A firm, close crew neckline keeps the shape composed. It is structured enough to hold its
                line under a jacket and relaxed enough for a Lagos afternoon.
              </p>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-stone pt-6">
              <div>
                <dt className="label text-stone-deep">Fit</dt>
                <dd className="mt-1 font-serif text-xl text-espresso">Boxy</dd>
              </div>
              <div>
                <dt className="label text-stone-deep">Shoulder</dt>
                <dd className="mt-1 font-serif text-xl text-espresso">Dropped</dd>
              </div>
              <div>
                <dt className="label text-stone-deep">Neck</dt>
                <dd className="mt-1 font-serif text-xl text-espresso">Crew</dd>
              </div>
            </dl>
          </div>
          <SilhouetteDiagram />
        </div>
      </section>
    </>
  );
}
