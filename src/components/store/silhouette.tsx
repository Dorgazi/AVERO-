/**
 * Line drawing of the AVÉRO boxy tee with callouts. Purely illustrative:
 * no measurements are implied (garment specs come from the owner).
 */
export function SilhouetteDiagram() {
  return (
    <figure className="mx-auto w-full max-w-xl">
      <svg
        viewBox="0 0 520 440"
        role="img"
        aria-labelledby="sil-title sil-desc"
        className="h-auto w-full"
      >
        <title id="sil-title">The AVÉRO silhouette</title>
        <desc id="sil-desc">
          A line drawing of a boxy T-shirt from the front, with notes pointing to the clean crew neckline,
          the dropped shoulder seam, the roomy straight body, and the short, wide sleeve.
        </desc>
        <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
          {/* body */}
          <path d="M175 70 Q260 100 345 70 L420 98 L460 190 L400 210 L392 178 L392 392 L128 392 L128 178 L120 210 L60 190 L100 98 Z" />
          {/* neck rib */}
          <path d="M210 74 Q260 118 310 74" />
          <path d="M200 72 Q260 128 320 72" opacity=".5" />
          {/* dropped shoulder seams */}
          <path d="M128 178 L118 104" strokeDasharray="4 4" />
          <path d="M392 178 L402 104" strokeDasharray="4 4" />
          {/* hem */}
          <path d="M128 378 L392 378" opacity=".5" />
        </g>
        <g fill="currentColor" fontFamily="var(--font-sans)" fontSize="11" letterSpacing="1.6">
          <circle cx="260" cy="102" r="3" />
          <path d="M260 102 L260 30" stroke="currentColor" strokeWidth=".8" />
          <text x="260" y="22" textAnchor="middle">CLEAN CREW NECK</text>

          <circle cx="122" cy="140" r="3" />
          <path d="M122 140 L40 140 L40 60" stroke="currentColor" strokeWidth=".8" fill="none" />
          <text x="20" y="50">DROPPED SHOULDER</text>

          <circle cx="440" cy="190" r="3" />
          <path d="M440 190 L500 190 L500 250" stroke="currentColor" strokeWidth=".8" fill="none" />
          <text x="500" y="268" textAnchor="end">WIDE SLEEVE</text>

          <circle cx="260" cy="300" r="3" />
          <path d="M260 300 L260 420" stroke="currentColor" strokeWidth=".8" />
          <text x="260" y="436" textAnchor="middle">ROOMY, STRAIGHT BODY</text>
        </g>
      </svg>
    </figure>
  );
}
