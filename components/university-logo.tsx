import { useReducer, useState, type CSSProperties } from "react";
import { collectionColors, logoOverrideURL, universityDomain, type University, type UniversityFields } from "../lib/library";

const logoKey = process.env.NEXT_PUBLIC_LOGO_DEV_KEY;
const failedLogos = new Set<string>();
type LogoUniversity = UniversityFields & Pick<University, "initials" | "color">;

export function UniversityLogo({ university, className = "", enabled = true }: {
  university: LogoUniversity;
  className?: string;
  enabled?: boolean;
}) {
  const [loaded, setLoaded] = useState<string>();
  const [, refresh] = useReducer(value => value + 1, 0);
  const domain = enabled ? universityDomain(university) : "";
  const automatic = logoKey && domain
    ? `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(logoKey)}&size=128&format=png&fallback=404`
    : "";
  const custom = enabled ? logoOverrideURL(university.logoOverride ?? "") : "";
  const source = [custom, automatic].find((url): url is string => Boolean(url && !failedLogos.has(url)));
  const initials = university.initials ?? university.name.trim().split(/\s+/).slice(0, 2).map(word => [...word][0]).join("");
  const color = university.color ?? collectionColors[(university.name.codePointAt(0) ?? 0) % collectionColors.length];

  return (
    <span className={`university-logo ${className}`} aria-hidden="true"
      style={{ "--monogram-color": color } as CSSProperties} data-loaded={source && loaded === source ? "" : undefined}>
      <span className="university-initials">{initials}</span>
      {source && (
        <img key={source} src={source} alt="" loading="lazy" decoding="async"
          referrerPolicy={source === automatic ? "origin" : "no-referrer"}
          onLoad={() => setLoaded(source)}
          onError={() => { failedLogos.add(source); refresh(); }} />
      )}
    </span>
  );
}
