import { supabase } from "./supabase";

// ============================================================
// BUCKET NAMES (type-safe constants)
// ============================================================
export const BUCKETS = {
  PROFILE_IMAGES: "profile-images",
  DRIVER_DOCUMENTS: "driver-documents",
  VENDOR_ASSETS: "vendor-assets",
  PRODUCT_IMAGES: "product-images",
  SOS_ATTACHMENTS: "sos-attachments",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

// ============================================================
// PATH BUILDERS
// Returns the storage object path for a given entity.
// ============================================================
export const storagePaths = {
  avatar: (userId: string, ext: string) =>
    `${userId}/avatar.${ext}`,

  driverLicense: (driverId: string, ext: string) =>
    `${driverId}/license.${ext}`,

  driverPermit: (driverId: string, ext: string) =>
    `${driverId}/permit.${ext}`,

  vendorLogo: (vendorId: string, ext: string) =>
    `${vendorId}/logo.${ext}`,

  vendorCover: (vendorId: string, ext: string) =>
    `${vendorId}/cover.${ext}`,

  vendorGallery: (vendorId: string, index: number, ext: string) =>
    `${vendorId}/gallery/${index}.${ext}`,

  productImage: (vendorId: string, productId: string, ext: string) =>
    `${vendorId}/${productId}.${ext}`,

  sosAttachment: (alertId: string, filename: string) =>
    `${alertId}/${filename}`,
};

// ============================================================
// UPLOAD RESULT TYPE
// ============================================================
export type UploadResult =
  | { url: string; path: string; error: null }
  | { url: null; path: null; error: string };

// ============================================================
// CORE UPLOAD — upserts the file and returns a public URL
// ============================================================
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File,
): Promise<UploadResult> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return { url: null, path: null, error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, error: null };
}

// ============================================================
// SIGNED URL — for private buckets (driver-documents, sos-attachments)
// ============================================================
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

// ============================================================
// DELETE FILE
// ============================================================
export async function deleteFile(
  bucket: BucketName,
  path: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error?.message ?? null };
}

// ============================================================
// CONVENIENCE UPLOADERS
// ============================================================

export function getFileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "jpg";
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<UploadResult> {
  const ext = getFileExtension(file);
  const path = storagePaths.avatar(userId, ext);
  return uploadFile(BUCKETS.PROFILE_IMAGES, path, file);
}

export async function uploadVendorLogo(
  vendorId: string,
  file: File,
): Promise<UploadResult> {
  const ext = getFileExtension(file);
  const path = storagePaths.vendorLogo(vendorId, ext);
  return uploadFile(BUCKETS.VENDOR_ASSETS, path, file);
}

export async function uploadVendorCover(
  vendorId: string,
  file: File,
): Promise<UploadResult> {
  const ext = getFileExtension(file);
  const path = storagePaths.vendorCover(vendorId, ext);
  return uploadFile(BUCKETS.VENDOR_ASSETS, path, file);
}

export async function uploadVendorGalleryImage(
  vendorId: string,
  index: number,
  file: File,
): Promise<UploadResult> {
  const ext = getFileExtension(file);
  const path = storagePaths.vendorGallery(vendorId, index, ext);
  return uploadFile(BUCKETS.VENDOR_ASSETS, path, file);
}

export async function uploadProductImage(
  vendorId: string,
  productId: string,
  file: File,
): Promise<UploadResult> {
  const ext = getFileExtension(file);
  const path = storagePaths.productImage(vendorId, productId, ext);
  return uploadFile(BUCKETS.PRODUCT_IMAGES, path, file);
}

export async function uploadDriverDocument(
  driverId: string,
  type: "license" | "permit",
  file: File,
): Promise<UploadResult> {
  const ext = getFileExtension(file);
  const path =
    type === "license"
      ? storagePaths.driverLicense(driverId, ext)
      : storagePaths.driverPermit(driverId, ext);
  return uploadFile(BUCKETS.DRIVER_DOCUMENTS, path, file);
}

export async function uploadSosAttachment(
  alertId: string,
  file: File,
): Promise<UploadResult> {
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = storagePaths.sosAttachment(alertId, filename);
  return uploadFile(BUCKETS.SOS_ATTACHMENTS, path, file);
}

// ============================================================
// CACHE-BUSTING PUBLIC URL BUILDER
// Appends a version param so browsers don't serve stale avatars.
// ============================================================
export function bustCache(url: string): string {
  return `${url}?t=${Date.now()}`;
}
