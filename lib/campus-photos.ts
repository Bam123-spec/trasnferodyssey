import { searchableText } from "./library";

export type CommonsPhoto = {
  source: "wikimedia";
  title: string;
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl?: string;
  credit?: string;
};

export type UploadedCover = { source: "upload"; path: string; title: string };
export type CampusCover = CommonsPhoto | UploadedCover;
type Cursor = Record<string, string | number>;
type SearchPage = { photos: CommonsPhoto[]; next?: Cursor };
type Metadata = Record<string, { value?: string } | undefined>;
type CommonsPage = {
  title: string;
  index?: number;
  imageinfo?: Array<{ thumburl?: string; descriptionurl?: string; width?: number; height?: number; mime?: string; extmetadata?: Metadata }>;
};
const endpoint = "https://commons.wikimedia.org/w/api.php";
const cache = new Map<string, SearchPage>();
const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const artwork = /\b(logo|wordmark|seal|coat of arms|map|diagram|flag|screenshot|poster|portrait)\b/i;
const campus = /\b(campus|aerial|architecture|building|library|hall|quadrangle|courtyard|faculty|university|college)\b/gi;

function plainText(value = "") {
  const template = document.createElement("template");
  template.innerHTML = value;
  return (template.content.textContent ?? "").replace(/\s+/g, " ").trim();
}

function safeLink(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value, endpoint);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.protocol = "https:";
    return url.href;
  } catch { return ""; }
}

function toPhoto(page: CommonsPage): CommonsPhoto | undefined {
  const image = page.imageinfo?.[0];
  if (!image?.thumburl || !image.descriptionurl || (image.width ?? 0) < 640 || (image.height ?? 0) < 360
    || !photoTypes.has(image.mime ?? "") || artwork.test(page.title)) return;

  const meta = image.extmetadata ?? {};
  const license = plainText(meta.LicenseShortName?.value || meta.UsageTerms?.value);
  if (!license) return;
  const publicDomain = /public domain|\bcc0\b/i.test(license);
  const licenseUrl = safeLink(meta.LicenseUrl?.value);
  const attribution = plainText(meta.Attribution?.value);
  const author = plainText(meta.Artist?.value) || attribution;
  if (!publicDomain && (!licenseUrl || !author)) return;
  const credit = attribution || plainText(meta.Credit?.value);
  const url = safeLink(image.thumburl);
  const sourceUrl = safeLink(image.descriptionurl);
  if (!url || !sourceUrl) return;

  return {
    source: "wikimedia",
    title: page.title.replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " "),
    url, sourceUrl, author: author || "Unknown author", license, licenseUrl: licenseUrl || undefined,
    credit: credit && credit !== author && credit.toLowerCase() !== "own work" ? credit : undefined,
  };
}

export async function searchCommons(term: string, signal: AbortSignal, cursor?: Cursor): Promise<SearchPage> {
  const key = JSON.stringify([term, cursor]);
  const existing = cache.get(key);
  if (existing) return existing;
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", origin: "*", generator: "search",
    gsrnamespace: "6", gsrlimit: "24", gsrsearch: `${term} filetype:bitmap`,
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "960",
    iiextmetadatafilter: "Artist|Credit|Attribution|LicenseShortName|LicenseUrl|UsageTerms",
  });
  for (const [name, value] of Object.entries(cursor ?? {})) params.set(name, String(value));

  const response = await fetch(`${endpoint}?${params}`, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("Wikimedia Commons is unavailable. Try again.");
  const data: { query?: { pages?: CommonsPage[] }; continue?: Cursor; error?: unknown } = await response.json();
  if (data.error) throw new Error("Wikimedia Commons could not complete the search.");
  const photos = (data.query?.pages ?? []).flatMap(page => {
    const photo = toPhoto(page);
    if (!photo) return [];
    const priority = (searchableText(photo.title).match(campus)?.length ?? 0)
      + (/\baerial\b|\bcampus\b|\barchitecture\b/i.test(photo.title) ? 2 : 0);
    return [{ photo, priority, index: page.index ?? 0 }];
  }).sort((a, b) => b.priority - a.priority || a.index - b.index).map(entry => entry.photo);
  const result = { photos, next: data.continue };
  if (cache.size >= 30) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
