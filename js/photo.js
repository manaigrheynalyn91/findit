// Prepares an item photo in the browser before upload:
// - resizes it to at most 1280 px on the longest side,
// - re-encodes it as JPEG, which drops EXIF metadata such as GPS location,
// - keeps it under the 2 MB storage limit.
import { supabase, PHOTO_BUCKET } from "./common.js";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

async function decode(file) {
  if ("createImageBitmap" in window) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Returns a resized JPEG Blob, or throws an Error whose message is safe to show. */
export async function preparePhoto(file) {
  if (!file) throw new Error("Choose a photo first.");
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error("That file isn't a photo. Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is too large (over 15 MB). Choose a smaller one.");

  let img;
  try { img = await decode(file); }
  catch { throw new Error("This browser couldn't open that photo. Try a JPG or PNG (iPhone HEIC photos may need converting)."); }

  for (const [maxSide, quality] of [[1280, 0.82], [1024, 0.72], [800, 0.65]]) {
    const w = img.width, h = img.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= MAX_OUTPUT_BYTES) { img.close?.(); return blob; }
  }
  img.close?.();
  throw new Error("We couldn't shrink that photo enough. Try a different one.");
}

/** Uploads into the student's own folder. Returns the storage path. */
export async function uploadPhoto(userId, blob) {
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Best-effort removal; failures are logged, not shown. */
export async function deletePhoto(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) console.warn("Photo cleanup failed", error);
}
