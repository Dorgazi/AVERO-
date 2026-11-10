import Link from "next/link";
import { coverImage, getPublishedProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { ConceptBadge } from "@/components/store/badges";
import { SilhouetteDiagram } from "@/components/store/silhouette";
import type { Product, ProductImage } from "@/lib/types";

export const dynamic = "force-dynamic";

const isBack = (i: ProductImage) => /\bback\b/i.test(`${i.alt_text} ${i.storage_path}`);

/** One front-view image per colour of a product, in variant order. */
function colourways(p: Product | undefined) {
  if (!p) return [];
  const colours = [...new Set(p.product_variants.map((v) => v.colour))];
  return colours
    .map((c) => {
      const imgs = p.product_images.filter((i) => i.colour === c);
      const img = imgs.find((i) => !isBack(i)) ?? imgs[0];
      return img?.url ? { colour: c, img } : null;
    })
    .filter((x): x is { colour: string; img: ProductImage } => !!x);
}

export default async function HomePage() {
  const products = await getPublishedProducts();
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const collection = featured.length ? featured : products.slice(0, 4);
  const hero = collection[0];
  const heroImage =
    hero?.product_images.find((i) => !isBack(i) && i.colour === "Black") ?? (hero ? coverImage(hero) : undefined);
  const tee = products.find((p) => coloursOf(p) > 1) ?? hero;
  const ways = colourways(tee);

  return (
    <>
      {/* Editorial hero: copy on espresso beside the full garment, shown uncropped. */}
      <section aria-labelledby="hero-title" className="on-dark relative overflow-hidden bg-espresso">
        <div className="mx-auto grid max-w-7xl md:min-h-[calc(100svh-7.5rem)] md:grid-cols-12">
          <div className="order-2 flex flex-col justify-end px-5 pb-14 pt-12 sm:px-8 md:order-1 md:col-span-6 md:pb-20 md:pt-24">
            <p className="eyebrow rise text-bone/80">Lagos · Collection 01</p>
            <h1 id="hero-title" className="display rise rise-2 mt-6 text-[3.6rem] text-bone sm:text-7xl lg:text-[7.5rem]">
              Structure,
              <br />
              <em className="font-light italic">quietly kept.</em>
            </h1>
            <p className="rise rise-3 mt-8 max-w-md text-[15px] leading-relaxed text-bone/75">
              AVÉRO begins with a single garment: a cropped, boxy-fit T-shirt with dropped shoulders and a clean
              crew neck. Everything else follows from it.
            </p>
            <div className="rise rise-3 mt-10 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-light">
                Shop the collection
              </Link>
              <Link href="#silhouette" className="btn btn-outline-light">
                The silhouette
              </Link>
            </div>
          </div>
          <div className="relative order-1 md:order-2 md:col-span-6">
            <div className="relative aspect-square overflow-hidden bg-bone-deep md:absolute md:inset-0 md:aspect-auto">
              {heroImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage.url}
                  alt={heroImage.alt_text || hero?.name || "AVÉRO T-shirt"}
                  className="slow-zoom h-full w-full object-cover"
                  fetchPriority="high"
                />
              ) : null}
              {heroImage?.is_concept && <ConceptBadge className="absolute bottom-4 left-4" />}
            </div>
          </div>
        </div>
      </section>

      {/* House statement */}
      <section aria-label="The house" className="mx-auto max-w-4xl px-5 py-28 text-center sm:px-8 md:py-40">
        <p className="eyebrow justify-center text-stone-deep">The house</p>
        <p className="display mt-10 text-[2.1rem] leading-[1.15] text-espresso sm:text-5xl md:text-[3.6rem]">
          One silhouette, considered <em className="italic">from every angle</em>. Cut wide, finished cleanly,
          and made to be worn without thought.
        </p>
        <span aria-hidden className="mx-auto mt-14 block h-16 w-px bg-stone" />
      </section>

      {/* Featured collection */}
      <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 md:pb-40">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b hairline pb-8">
          <div>
            <p className="eyebrow text-stone-deep">Featured</p>
            <h2 id="featured-title" className="display mt-4 text-5xl sm:text-6xl">
              The Essentials
            </h2>
          </div>
          <Link href="/shop" className="link-static text-[10.5px] uppercase tracking-[0.26em] text-espresso">
            View all pieces
          </Link>
        </div>
        {collection.length ? (
          <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-8 lg:grid-cols-4">
            {collection.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 2} index={i} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-12 text-charcoal-soft">The collection is being prepared. Please check back soon.</p>
        )}
      </section>

      {/* Colourways */}
      {tee && ways.length > 1 && (
        <section aria-labelledby="colourways-title" className="bg-bone-deep py-28 md:py-36">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <p className="eyebrow text-stone-deep">{tee.name}</p>
                <h2 id="colourways-title" className="display mt-4 text-5xl sm:text-6xl">
                  {numberWord(ways.length)} colourways,
                  <br />
                  <em className="italic">one line.</em>
                </h2>
              </div>
              <p className="max-w-sm text-charcoal-soft md:col-span-5 md:justify-self-end">
                The same square shoulder and straight fall in every shade, from deep black to a soft
                cream.
              </p>
            </div>
            <ul className="mt-16 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {ways.map(({ colour, img }) => (
                <li key={colour}>
                  <Link href={`/shop/${tee.slug}?colour=${encodeURIComponent(colour)}`} className="group block">
                    <div className="relative aspect-square overflow-hidden bg-bone">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url ?? ""}
                        alt={img.alt_text || `${tee.name} in ${colour}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="font-serif text-2xl font-light text-espresso">{colour}</span>
                      <span className="link-draw text-[10px] uppercase tracking-[0.24em] text-charcoal-soft group-hover:text-espresso">
                        Discover
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* The silhouette */}
      <section
        id="silhouette"
        aria-labelledby="silhouette-title"
        className="on-dark scroll-mt-24 bg-espresso text-bone/80"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 py-28 sm:px-8 md:grid-cols-2 md:py-40">
          <div>
            <p className="eyebrow text-stone">The AVÉRO silhouette</p>
            <h2 id="silhouette-title" className="display mt-5 text-5xl text-bone sm:text-6xl">
              Cut wide.{" "}
              <em className="block italic">Worn easy.</em>
            </h2>
            <div className="mt-10 max-w-md space-y-5">
              <p>
                The shoulder seam drops past the natural shoulder, so the T-shirt sits square rather than
                clinging. The body falls straight and roomy from chest to hem.
              </p>
              <p>
                A firm, close crew neckline keeps the shape composed. It is structured enough to hold its line
                under a jacket and relaxed enough for a Lagos afternoon.
              </p>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-bone/15 pt-8">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.26em] text-stone">Fit</dt>
                <dd className="mt-2 font-serif text-2xl font-light text-bone">Boxy</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.26em] text-stone">Shoulder</dt>
                <dd className="mt-2 font-serif text-2xl font-light text-bone">Dropped</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.26em] text-stone">Neck</dt>
                <dd className="mt-2 font-serif text-2xl font-light text-bone">Crew</dd>
              </div>
            </dl>
          </div>
          <div className="text-bone">
            <SilhouetteDiagram />
          </div>
        </div>
      </section>

      {/* Closing invitation */}
      <section aria-label="Shop the collection" className="mx-auto max-w-7xl px-5 py-28 text-center sm:px-8 md:py-36">
        <p className="eyebrow justify-center text-stone-deep">Collection 01</p>
        <p className="display mt-8 text-5xl text-espresso sm:text-7xl">
          Begin with <em className="italic">the Essential.</em>
        </p>
        <Link href="/shop" className="btn btn-primary mt-12">
          Shop the collection
        </Link>
      </section>
    </>
  );
}

function coloursOf(p: Product) {
  return new Set(p.product_variants.map((v) => v.colour)).size;
}

function numberWord(n: number) {
  return ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"][n] ?? String(n);
}
