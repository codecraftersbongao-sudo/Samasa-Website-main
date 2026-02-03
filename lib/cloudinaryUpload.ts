// src/lib/cloudinaryUpload.ts
type CloudinaryResult = {
  secure_url: string;
  public_id: string;
  original_filename?: string;
  resource_type?: string;
  format?: string;
};

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const FOLDER = (import.meta.env.VITE_CLOUDINARY_FOLDER as string) || "samasa/legislative";

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  // Helps you catch "stuck saving" due to missing env
  console.warn("Cloudinary env vars missing. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.");
}

export async function uploadToCloudinary(file: File, opts?: { folder?: string }) {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", opts?.folder || FOLDER);

  // IMPORTANT:
  // - PDFs should work via resource_type=auto endpoint
  // - Images also work here (auto)
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Cloudinary upload failed: ${txt}`);
  }

  const data = (await res.json()) as CloudinaryResult;

  return {
    url: data.secure_url,
    publicId: data.public_id,
  };
}
