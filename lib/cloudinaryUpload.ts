// src/lib/cloudinaryUpload.ts
type CloudinaryResult = {
  secure_url: string;
  public_id: string;
  original_filename?: string;
  resource_type?: string;
  format?: string;
  error?: { message?: string };
};

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const FOLDER = (import.meta.env.VITE_CLOUDINARY_FOLDER as string) || "samasa/legislative";

export function cloudinaryEnvOk() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export async function uploadToCloudinary(file: File, opts?: { folder?: string }) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary env vars missing: VITE_CLOUDINARY_CLOUD_NAME and/or VITE_CLOUDINARY_UPLOAD_PRESET"
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", opts?.folder || FOLDER);

  // image-only endpoint is a little more strict (good for landing images)
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const res = await fetch(url, { method: "POST", body: form });

  const text = await res.text();
  let data: CloudinaryResult | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    // leave as null
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      (typeof text === "string" && text.trim().length ? text : "Unknown Cloudinary error");
    throw new Error(`Cloudinary upload failed (${res.status}): ${msg}`);
  }

  if (!data?.secure_url || !data?.public_id) {
    throw new Error("Cloudinary upload failed: missing secure_url/public_id in response");
  }

  return { url: data.secure_url, publicId: data.public_id };
}
