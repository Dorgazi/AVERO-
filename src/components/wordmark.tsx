import Link from "next/link";

/**
 * AVÉRO wordmark, set in the brand serif. The interlocking AV monogram is
 * intentionally not recreated here: drop the approved SVG into
 * /public/brand/monogram.svg and render it via <Monogram /> when supplied.
 */
export function Wordmark({ className = "", href = "/" }: { className?: string; href?: string | null }) {
  const mark = (
    <span
      className={`font-serif text-[1.65rem] leading-none tracking-[0.28em] text-espresso ${className}`}
      aria-label="AVÉRO"
    >
      AVÉRO
    </span>
  );
  if (!href) return mark;
  return (
    <Link href={href} className="inline-block py-2" aria-label="AVÉRO home">
      {mark}
    </Link>
  );
}
