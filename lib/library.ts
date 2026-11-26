export type UniversityFields = {
  name: string;
  location: string;
  website: string;
};

export type University = UniversityFields & {
  id: string;
  collectionIds: string[];
  cover?: string;
  coverPosition?: string;
  initials?: string;
  color?: string;
};

export type Collection = { id: string; name: string; color: string };
export type View = "grid" | "list";

export type Library = {
  version: 1;
  universities: University[];
  collections: Collection[];
  view: View;
  sidebarCollapsed: boolean;
};

export type LibraryChange = (previous: Library) => Library;
export type PersistLibrary = (change: LibraryChange) => Promise<void>;

export function isLibrary(value: unknown): value is Library {
  if (!value || typeof value !== "object") return false;
  const library = value as Partial<Library>;
  return library.version === 1 && Array.isArray(library.universities) && Array.isArray(library.collections)
    && (library.view === "grid" || library.view === "list") && typeof library.sidebarCollapsed === "boolean";
}

export const collectionColors = ["#d9ae75", "#ae9bc5", "#8dad97", "#a2acc9", "#cb9294"];

export const sampleLibrary: Library = {
  version: 1,
  view: "grid",
  sidebarCollapsed: false,
  collections: [
    { id: "shortlist", name: "Transfer shortlist", color: collectionColors[0] },
    { id: "dream", name: "Dream schools", color: collectionColors[1] },
    { id: "abroad", name: "Study abroad", color: collectionColors[2] },
  ],
  universities: [
    {
      id: "washington", name: "University of Washington", location: "Seattle, WA", website: "https://www.washington.edu/",
      initials: "W", color: "#524262", cover: "/campuses/washington.jpg", collectionIds: ["shortlist"],
    },
    {
      id: "berkeley", name: "UC Berkeley", location: "Berkeley, CA", website: "https://www.berkeley.edu/",
      initials: "B", color: "#304964", cover: "/campuses/berkeley.jpg", collectionIds: ["shortlist", "dream"],
    },
    {
      id: "oxford", name: "University of Oxford", location: "Oxford, United Kingdom", website: "https://www.ox.ac.uk/",
      initials: "O", color: "#35415f", cover: "/campuses/oxford.jpg", collectionIds: ["dream", "abroad"],
    },
    {
      id: "cornell", name: "Cornell University", location: "Ithaca, NY", website: "https://www.cornell.edu/",
      initials: "C", color: "#753b3e", cover: "/campuses/cornell.jpg", collectionIds: ["dream"],
    },
    {
      id: "ubc", name: "University of British Columbia", location: "Vancouver, BC", website: "https://www.ubc.ca/",
      initials: "UBC", color: "#375453", cover: "/campuses/ubc.jpg", collectionIds: ["shortlist", "abroad"],
    },
    {
      id: "eth", name: "ETH Zürich", location: "Zürich, Switzerland", website: "https://ethz.ch/en.html",
      initials: "ETH", color: "#66574d", cover: "/campuses/eth.jpg", collectionIds: ["abroad"],
    },
  ],
};

export function universityCount(count: number) {
  return `${count} ${count === 1 ? "university" : "universities"}`;
}

export function websiteURL(input: string) {
  if (!input.trim()) return "";
  try {
    const candidate = input.trim();
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`);
    if (["https:", "http:"].includes(url.protocol) && url.hostname.includes(".") && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}

export function searchableText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function newId() {
  return crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), number => number.toString(16).padStart(8, "0")).join("");
}
