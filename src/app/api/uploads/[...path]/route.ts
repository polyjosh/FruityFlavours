import { readLocalPhoto } from "@/lib/server/uploads";

/** Serves product photos stored locally (.data/uploads) when Supabase Storage isn't configured. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const file = await readLocalPhoto((await params).path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
