import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME as string;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY as string;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET as string;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "hireai/uploads";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn("[cloudinary] Missing Cloudinary env vars");
    return;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export async function uploadDataUrl(dataUrl: string, folder?: string) {
  ensureConfigured();
  const res = await cloudinary.uploader.upload(dataUrl, {
    folder: folder || CLOUDINARY_FOLDER,
    resource_type: "image",
  });
  return res.secure_url as string;
}

export { CLOUDINARY_FOLDER };
