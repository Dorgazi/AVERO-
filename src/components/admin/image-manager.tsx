"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { deleteImage, reorderImages, setCoverImage, updateImageMeta } from "@/app/admin/actions";
import type { ProductImage } from "@/lib/types";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type Upload = { name: string; state: "uploading" | "done" | "error"; message?: string };

export function ImageManager({
  productId,
  images: initial,
  colours,
}: {
  productId: string;
  images: ProductImage[];
  colours: string[];
}) {
  const router = useRouter();
  const uid = useId();
  const [images, setImages] = useState(initial);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadColour, setUploadColour] = useState("");
  const [uploadConcept, setUploadConcept] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setImages(initial), [initial]);

  const report = (r: { ok: boolean; error?: string; message?: string }) => {
    setNotice({ ok: r.ok, text: r.ok ? (r.message ?? "Saved.") : (r.error ?? "Something went wrong.") });
    if (r.ok) router.refresh();
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setNotice(null);
    const list = Array.from(files);
    setUploads(list.map((f) => ({ name: f.name, state: "uploading" })));
    for (const [i, f] of list.entries()) {
      // Client checks are for convenience only; the server re-validates bytes, type and size.
      const set = (u: Partial<Upload>) => setUploads((prev) => prev.map((p, j) => (j === i ? { ...p, ...u } : p)));
      if (!TYPES.includes(f.type)) {
        set({ state: "error", message: "Not a JPEG, PNG, WebP or AVIF image." });
        continue;
      }
      if (f.size > MAX_BYTES) {
        set({ state: "error", message: "Larger than 8 MB." });
        continue;
      }
      const body = new FormData();
      body.set("file", f);
      body.set("colour", uploadColour);
      body.set("is_concept", String(uploadConcept));
      try {
        const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) set({ state: "error", message: json.error ?? `Upload failed (${res.status}).` });
        else set({ state: "done", message: "Uploaded. Add alt text below." });
      } catch {
        set({ state: "error", message: "Network error. Nothing was saved." });
      }
    }
    router.refresh();
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...images];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setImages(next);
    startTransition(async () => report(await reorderImages(productId, next.map((i) => i.id))));
  };

  return (
    <section aria-labelledby={`${uid}-h`} className="space-y-6">
      <div>
        <h2 id={`${uid}-h`} className="label text-charcoal">Images</h2>
        <p className="mt-1 text-xs text-charcoal-soft">
          JPEG, PNG, WebP or AVIF, up to 8 MB. Images stay private until the product is published. The first
          image becomes the cover. Every image needs alt text before publishing.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 border border-dashed border-stone p-4">
        <div>
          <label htmlFor={`${uid}-file`} className="label text-charcoal">Upload images</label>
          <input
            id={`${uid}-file`}
            type="file"
            accept={TYPES.join(",")}
            multiple
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
            className="mt-2 block text-sm file:mr-3 file:min-h-10 file:cursor-pointer file:border file:border-espresso file:bg-espresso file:px-4 file:text-xs file:uppercase file:tracking-[0.18em] file:text-bone"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-uc`} className="text-xs text-charcoal-soft">Colourway (optional)</label>
          <select id={`${uid}-uc`} value={uploadColour} onChange={(e) => setUploadColour(e.target.value)} className="field mt-1 w-40">
            <option value="">All colours</option>
            {colours.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={uploadConcept} onChange={(e) => setUploadConcept(e.target.checked)} className="accent-espresso" />
          Concept imagery
        </label>
      </div>

      {uploads.length > 0 && (
        <ul aria-live="polite" className="space-y-1 text-sm">
          {uploads.map((u, i) => (
            <li key={i} className={u.state === "error" ? "text-alert" : u.state === "done" ? "text-ok" : "text-charcoal-soft"}>
              {u.name}: {u.state === "uploading" ? "uploading…" : u.message}
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite" className="min-h-5 text-sm">
        {notice && <p role={notice.ok ? "status" : "alert"} className={notice.ok ? "text-ok" : "text-alert"}>{notice.text}</p>}
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-charcoal-soft">No images yet.</p>
      ) : (
        <ol className="space-y-4" aria-label="Gallery order">
          {images.map((img, idx) => (
            <ImageRow
              key={img.id}
              img={img}
              idx={idx}
              total={images.length}
              colours={colours}
              busy={pending}
              onMove={move}
              onReport={report}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function ImageRow({
  img,
  idx,
  total,
  colours,
  busy,
  onMove,
  onReport,
}: {
  img: ProductImage;
  idx: number;
  total: number;
  colours: string[];
  busy: boolean;
  onMove: (idx: number, dir: -1 | 1) => void;
  onReport: (r: { ok: boolean; error?: string; message?: string }) => void;
}) {
  const uid = useId();
  const [alt, setAlt] = useState(img.alt_text);
  const [colour, setColour] = useState(img.colour ?? "");
  const [concept, setConcept] = useState(img.is_concept);
  const [pending, startTransition] = useTransition();
  const dirty = alt !== img.alt_text || (colour || null) !== img.colour || concept !== img.is_concept;
  const disabled = busy || pending;

  return (
    <li className="flex flex-col gap-4 border border-stone/60 bg-bone/40 p-3 sm:flex-row">
      <div className="relative w-full shrink-0 sm:w-36">
        <div className="aspect-square overflow-hidden bg-bone-deep">
          {img.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.url} alt={img.alt_text ? `Preview: ${img.alt_text}` : "Preview (no alt text yet)"} className="h-full w-full object-cover" />
          )}
        </div>
        <p className="label mt-1 text-[10px] text-stone-deep">
          #{idx + 1}
          {img.is_cover && <span className="ml-2 bg-espresso px-1.5 py-0.5 text-bone">Cover</span>}
        </p>
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <label htmlFor={`${uid}-alt`} className="text-xs text-charcoal-soft">
            Alt text {!img.alt_text && <span className="text-alert">(required to publish)</span>}
          </label>
          <input
            id={`${uid}-alt`}
            value={alt}
            maxLength={300}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="e.g. Black boxy T-shirt, front view, small AV monogram on the chest"
            className="field mt-1"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`${uid}-c`} className="text-xs text-charcoal-soft">Colourway</label>
            <select id={`${uid}-c`} value={colour} onChange={(e) => setColour(e.target.value)} className="field mt-1 w-40">
              <option value="">All colours</option>
              {colours.map((c) => <option key={c} value={c}>{c}</option>)}
              {colour && !colours.includes(colour) && <option value={colour}>{colour}</option>}
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={concept} onChange={(e) => setConcept(e.target.checked)} className="accent-espresso" />
            Concept imagery
          </label>
          <button
            type="button"
            className="btn btn-primary min-h-10"
            disabled={!dirty || disabled}
            onClick={() =>
              startTransition(async () =>
                onReport(await updateImageMeta(img.id, { alt_text: alt, colour: colour || null, is_concept: concept })),
              )
            }
          >
            Save details
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-stone/40 pt-3">
          <button type="button" className="btn btn-ghost min-h-10 px-3" disabled={idx === 0 || disabled} onClick={() => onMove(idx, -1)} aria-label={`Move image ${idx + 1} earlier`}>
            ↑ Earlier
          </button>
          <button type="button" className="btn btn-ghost min-h-10 px-3" disabled={idx === total - 1 || disabled} onClick={() => onMove(idx, 1)} aria-label={`Move image ${idx + 1} later`}>
            ↓ Later
          </button>
          <button
            type="button"
            className="btn btn-ghost min-h-10 px-3"
            disabled={img.is_cover || disabled}
            onClick={() => startTransition(async () => onReport(await setCoverImage(img.id)))}
          >
            Set as cover
          </button>
          <button
            type="button"
            className="btn btn-ghost min-h-10 border-alert px-3 text-alert"
            disabled={disabled}
            onClick={() => {
              if (!window.confirm("Remove this image? The file will be deleted from storage.")) return;
              startTransition(async () => onReport(await deleteImage(img.id)));
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
