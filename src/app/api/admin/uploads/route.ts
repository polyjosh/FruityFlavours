import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/http";
import { savePhoto, UploadError } from "@/lib/server/uploads";

/** Uploads one product photo (multipart field "file"); the editor attaches it to the product on save. */
export const POST = adminRoute(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  try {
    return NextResponse.json(await savePhoto(file), { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
});
