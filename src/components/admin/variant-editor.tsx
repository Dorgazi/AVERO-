"use client";

import { useId, useMemo, useState } from "react";
import { SIZE_ORDER, type Size } from "@/lib/format";
import type { Variant } from "@/lib/types";

type Props = { initial: Pick<Variant, "colour" | "size" | "stock">[]; defaultSizes?: Size[] };

/** Stock-by-size grid for each colourway. Serialises to a hidden `variants` field. */
export function VariantEditor({ initial, defaultSizes = ["S", "M", "L", "XL", "XXL"] }: Props) {
  const uid = useId();
  const [colours, setColours] = useState<string[]>(() => [...new Set(initial.map((v) => v.colour))]);
  const [sizes, setSizes] = useState<Size[]>(() => {
    const s = [...new Set(initial.map((v) => v.size as Size))];
    return (s.length ? s : defaultSizes).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  });
  const [stock, setStock] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((v) => [`${v.colour}|${v.size}`, String(v.stock)])),
  );
  const [newColour, setNewColour] = useState("");

  const serialised = useMemo(
    () =>
      JSON.stringify(
        colours.flatMap((c) =>
          sizes.map((s) => {
            const raw = stock[`${c}|${s}`] ?? "0";
            const n = /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : Number.NaN;
            return { colour: c, size: s, stock: Number.isNaN(n) ? -1 : n };
          }),
        ),
      ),
    [colours, sizes, stock],
  );

  const addColour = () => {
    const c = newColour.trim().replace(/\s+/g, " ");
    if (!c || colours.some((x) => x.toLowerCase() === c.toLowerCase())) return;
    setColours([...colours, c]);
    setNewColour("");
  };

  return (
    <fieldset className="space-y-5">
      <legend className="label text-charcoal">Colours, sizes &amp; stock</legend>
      <input type="hidden" name="variants" value={serialised} />

      <div>
        <p id={`${uid}-sizes`} className="text-xs text-charcoal-soft">Sizes offered</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={`${uid}-sizes`}>
          {SIZE_ORDER.map((s) => (
            <label key={s} className="label flex min-h-10 cursor-pointer items-center gap-2 border border-stone px-3 text-[11px]">
              <input
                type="checkbox"
                className="accent-espresso"
                checked={sizes.includes(s)}
                onChange={(e) =>
                  setSizes((prev) =>
                    (e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)).sort(
                      (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b),
                    ),
                  )
                }
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      {colours.length > 0 && sizes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="text-sm">
            <caption className="sr-only">Stock count per colour and size</caption>
            <thead>
              <tr>
                <th scope="col" className="label pr-3 text-left font-normal text-stone-deep">Colour</th>
                {sizes.map((s) => (
                  <th key={s} scope="col" className="label px-1 text-center font-normal text-stone-deep">{s}</th>
                ))}
                <th scope="col"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {colours.map((c) => (
                <tr key={c}>
                  <th scope="row" className="whitespace-nowrap pr-3 text-left font-normal text-espresso">{c}</th>
                  {sizes.map((s) => {
                    const k = `${c}|${s}`;
                    const v = stock[k] ?? "0";
                    const invalid = !/^\d+$/.test(v.trim());
                    return (
                      <td key={s} className="px-1 py-1">
                        <input
                          aria-label={`Stock for ${c}, size ${s}`}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={v}
                          onChange={(e) => setStock({ ...stock, [k]: e.target.value })}
                          aria-invalid={invalid || undefined}
                          className={`field w-16 text-center ${invalid ? "border-alert" : ""}`}
                        />
                      </td>
                    );
                  })}
                  <td className="pl-2">
                    <button
                      type="button"
                      className="label min-h-10 px-2 text-alert"
                      onClick={() => setColours(colours.filter((x) => x !== c))}
                      aria-label={`Remove colour ${c}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-charcoal-soft">Add a colour and choose at least one size.</p>
      )}

      <div className="flex items-end gap-2">
        <div>
          <label htmlFor={`${uid}-new`} className="text-xs text-charcoal-soft">Add colour</label>
          <input
            id={`${uid}-new`}
            value={newColour}
            onChange={(e) => setNewColour(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColour();
              }
            }}
            placeholder="e.g. Espresso"
            maxLength={40}
            className="field mt-1 w-48"
          />
        </div>
        <button type="button" onClick={addColour} className="btn btn-ghost min-h-11">Add</button>
      </div>
    </fieldset>
  );
}
