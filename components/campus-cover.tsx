import { useEffect, useState } from "react";
import type { CommonsPhoto } from "../lib/campus-photos";
import { signedCoverUrl } from "../lib/cover-storage";
import type { University } from "../lib/library";

export function CampusCoverImage({ university, className = "university-cover" }: {
  university: University;
  className?: string;
}) {
  const cover = university.coverPhoto;
  const path = cover?.source === "upload" ? cover.path : "";
  const [signed, setSigned] = useState<{ path: string; url: string }>();
  const [failed, setFailed] = useState("");
  useEffect(() => {
    if (!path) return;
    let active = true;
    void signedCoverUrl(path).then(url => { if (active) setSigned({ path, url }); });
    return () => { active = false; };
  }, [path]);

  const source = cover?.source === "wikimedia" ? cover.url : path ? (signed?.path === path ? signed.url : "") : university.cover;
  if (!source || source === failed) return null;
  return <img src={source} className={className} alt="" loading="lazy" decoding="async"
    style={{ objectPosition: university.coverPosition }}
    onError={() => setFailed(source)} />;
}

export function PhotoAttribution({ photo, compact = false }: { photo: CommonsPhoto; compact?: boolean }) {
  return (
    <p className={`cover-attribution ${compact ? "cover-attribution-compact" : ""}`}>
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer" title={photo.title}>{photo.title}</a>
      {" by "}{photo.author}{" · "}
      {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> : photo.license}
      {photo.credit && !compact && <> · {photo.credit}</>}
      {" · Cropped for cover"}
    </p>
  );
}
