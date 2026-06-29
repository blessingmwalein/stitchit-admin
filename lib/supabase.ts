import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

export const DESIGNS_BUCKET = "orders";

export async function uploadDesignImage(file: File, folder = "designs"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(DESIGNS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(DESIGNS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteDesignImage(url: string): Promise<void> {
  try {
    const bucket = `/${DESIGNS_BUCKET}/`;
    const pathStart = url.indexOf(bucket);
    if (pathStart === -1) return;
    const path = url.slice(pathStart + bucket.length);
    await supabase.storage.from(DESIGNS_BUCKET).remove([path]);
  } catch {
    // best-effort delete — don't block the user
  }
}
