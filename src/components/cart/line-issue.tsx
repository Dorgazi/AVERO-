import { formatNGN } from "@/lib/format";
import type { ValidatedLine } from "@/lib/cart-validation";

export function LineIssue({ line }: { line?: ValidatedLine }) {
  if (!line || line.issue === "ok") return null;
  const text =
    line.issue === "sold_out"
      ? "Now sold out. Please remove this item."
      : line.issue === "insufficient_stock"
        ? `Only ${line.quantityAvailable} available. Please reduce the quantity.`
        : line.issue === "price_changed"
          ? `Price updated to ${formatNGN(line.unitPriceNgn ?? 0)}.`
          : "No longer available. Please remove this item.";
  return <p className="mt-2 text-xs text-alert">{text}</p>;
}
