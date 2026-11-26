import { newId } from "./library";
import { getSupabaseClient } from "./supabase";
import type { UploadedCover } from "./campus-photos";

const bucket = "odyssey-campus-covers";
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const signedUrls = new Map<string, { until: number; request: Promise<string> }>();
const signedLifetime = 60 * 60;

export function validateCoverUpload(file: File) {
  if (!Object.hasOwn(extensions, file.type)) return "Choose a JPEG, PNG, or WebP photograph.";
  if (file.size > 5 * 1024 * 1024) return "Choose a photograph smaller than 5 MB.";
  if (file.size === 0) return "This file is empty. Choose another photograph.";
  return "";
}

export async function uploadCampusCover(owner: string, file: File): Promise<UploadedCover> {
  const problem = validateCoverUpload(file);
  if (problem) throw new Error(problem);
  const path = `${owner}/${newId()}.${extensions[file.type]}`;
  const { error } = await getSupabaseClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("Could not upload the photograph. Try again.");
  return { source: "upload", path, title: file.name };
}

export function signedCoverUrl(path: string) {
  const current = signedUrls.get(path);
  if (current && current.until > Date.now()) return current.request;
  const request = getSupabaseClient().storage.from(bucket).createSignedUrl(path, signedLifetime).then(({ data, error }) => {
    if (error || !data?.signedUrl) {
      signedUrls.delete(path);
      return "";
    }
    return data.signedUrl;
  }).catch(() => {
    signedUrls.delete(path);
    return "";
  });
  signedUrls.set(path, { request, until: Date.now() + (signedLifetime - 60) * 1000 });
  return request;
}

export async function deleteCampusCover(path: string) {
  signedUrls.delete(path);
  const { error } = await getSupabaseClient().storage.from(bucket).remove([path]);
  if (error) throw new Error("Could not delete the uploaded file.");
}
