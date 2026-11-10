export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`label inline-flex items-center border border-charcoal/40 bg-bone/90 px-2 py-1 text-[10px] text-charcoal ${className}`}
      title="Sample listing for demonstration. Price, stock and specifications are placeholders."
    >
      Sample product
    </span>
  );
}

export function ConceptBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`label inline-flex items-center bg-charcoal/75 px-2 py-1 text-[10px] text-bone ${className}`}
      title="Concept imagery: a design render, not a photograph of a finished garment."
    >
      Concept imagery
    </span>
  );
}
