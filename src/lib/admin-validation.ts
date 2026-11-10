import { z } from "zod";
import { SIZE_ORDER } from "@/lib/format";

/** Accepts "50000", "50,000", "₦50,000". Rejects decimals: whole naira only. */
export const NairaSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[₦,\s]/g, "").replace(/^NGN/i, ""))
  .refine((s) => /^\d{1,9}$/.test(s), "Enter a whole-naira amount, e.g. 50000 (no kobo).")
  .transform((s) => Number.parseInt(s, 10))
  .refine((n) => n >= 0 && n <= 100_000_000, "Price must be between ₦0 and ₦100,000,000.");

export const VariantSchema = z.object({
  colour: z.string().trim().min(1, "Colour name required").max(40),
  size: z.enum(SIZE_ORDER),
  stock: z.number().int("Stock must be a whole number").min(0, "Stock can't be negative").max(1_000_000),
});

export const VariantsSchema = z
  .array(VariantSchema)
  .max(200)
  .superRefine((vs, ctx) => {
    const seen = new Set<string>();
    for (const v of vs) {
      const k = `${v.colour.toLowerCase()}|${v.size}`;
      if (seen.has(k)) ctx.addIssue({ code: "custom", message: `Duplicate ${v.colour} / ${v.size}` });
      seen.add(k);
    }
  });

export const ProductFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.")
    .max(80),
  category: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,40}$/, "Category: lowercase letters, numbers, hyphens."),
  description: z.string().max(4000).default(""),
  details: z.array(z.string().trim().min(1).max(200)).max(30),
  price_ngn: NairaSchema,
  featured: z.boolean(),
  is_demo: z.boolean(),
});

export const ImageMetaSchema = z.object({
  alt_text: z.string().trim().max(300),
  colour: z.string().trim().max(40).nullable(),
  is_concept: z.boolean(),
});

export function firstIssue(err: z.ZodError) {
  const i = err.issues[0];
  return i ? `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}` : "Invalid input";
}
