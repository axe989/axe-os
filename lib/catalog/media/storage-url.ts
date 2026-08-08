const BUCKET = "product-media";

// The bucket is public (see 20260808110000_product_center_v2_phase_b_fixes.sql),
// so the public object URL is deterministic from the storage path -- no
// signed-URL round trip needed to just render a thumbnail.
export function productMediaUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}
