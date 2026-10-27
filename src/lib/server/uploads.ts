import "server-only";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Product photo storage. Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * (public bucket SUPABASE_STORAGE_BUCKET, default "product-photos"); otherwise files go to
 * .data/uploads and are served by /api/uploads/[...path].
 */
export const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");

let client: SupabaseClient | null = null;
function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}
const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || "product-photos";

export class UploadError extends Error {}

export async function savePhoto(file: File) {
  const ext = PHOTO_TYPES[file.type];
  if (!ext) throw new UploadError("Photos must be JPG or PNG.");
  if (file.size > MAX_PHOTO_BYTES) throw new UploadError("Photos must be 5 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  // Check the file really is a JPG / PNG, not just named like one.
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if ((ext === "jpg" && !isJpg) || (ext === "png" && !isPng)) throw new UploadError("That file doesn't look like a JPG or PNG.");

  const name = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const sb = supabase();
  if (sb) {
    const { error } = await sb.storage.from(bucket()).upload(name, bytes, { contentType: file.type, upsert: false });
    if (error) throw new UploadError(error.message);
    return { url: sb.storage.from(bucket()).getPublicUrl(name).data.publicUrl, path: name };
  }
  const dest = path.join(LOCAL_DIR, name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  return { url: `/api/uploads/${name}`, path: name };
}

export async function deletePhoto(storedPath: string | null | undefined) {
  if (!storedPath) return;
  const sb = supabase();
  if (sb) {
    await sb.storage.from(bucket()).remove([storedPath]);
    return;
  }
  await unlink(path.join(LOCAL_DIR, storedPath)).catch(() => {});
}

/** For the local file route only. Returns null for anything outside .data/uploads. */
export async function readLocalPhoto(parts: string[]) {
  const file = path.resolve(LOCAL_DIR, ...parts);
  if (!file.startsWith(LOCAL_DIR + path.sep)) return null;
  const ext = path.extname(file).slice(1);
  const type = ext === "png" ? "image/png" : ext === "jpg" ? "image/jpeg" : null;
  if (!type) return null;
  try {
    return { bytes: await readFile(file), type };
  } catch {
    return null;
  }
}
