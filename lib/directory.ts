import { searchableText, websiteDomain, websiteURL, type UniversityFields } from "./library";

type HipoUniversity = {
  name: string;
  country: string;
  alpha_two_code: string;
  "state-province": string | null;
  domains: string[];
  web_pages: string[];
};

export type DirectoryUniversity = UniversityFields & { country: string; searchName: string; searchText: string };

let directoryRequest: Promise<DirectoryUniversity[]> | undefined;

export function loadDirectory() {
  return (directoryRequest ??= fetch("/directory/hipo.json")
    .then(async response => {
      if (!response.ok) throw new Error("The university directory could not be loaded.");
      const universities: HipoUniversity[] = await response.json();
      return universities.map(entry => {
        const domains = [...new Set((entry.domains ?? []).map(websiteDomain).filter(Boolean))];
        const websites = (entry.web_pages ?? []).map(websiteURL).filter((url): url is string => Boolean(url));
        const domain = domains[0] || websiteDomain(websites[0] ?? "");
        const website = websites.find(url => websiteDomain(url) === domain) || websites[0] || (domain ? `https://${domain}/` : "");
        const location = [...new Set([entry["state-province"]?.trim(), entry.country].filter(Boolean))].join(", ");
        const searchName = searchableText(entry.name);
        return {
          name: entry.name, country: entry.country, countryCode: entry.alpha_two_code,
          location, domain, domains, website, searchName,
          searchText: searchableText(`${entry.name} ${location} ${domains.join(" ")} ${domain}`),
        };
      });
    })
    .catch(error => {
      directoryRequest = undefined;
      throw error;
    }));
}

export function searchDirectory(universities: DirectoryUniversity[], input: string) {
  const query = searchableText(input).replace(/\s+/g, " ");
  if (query.length < 2) return [];
  const words = query.split(" ");
  const groups: DirectoryUniversity[][] = [[], [], [], []];
  for (const university of universities) {
    if (!words.every(word => university.searchText.includes(word))) continue;
    const rank = university.searchName === query || university.domain === query ? 0
      : university.searchName.startsWith(query) ? 1
        : university.searchName.includes(query) ? 2 : 3;
    if (groups[rank].length < 12) groups[rank].push(university);
  }
  return groups.flat().slice(0, 12);
}
