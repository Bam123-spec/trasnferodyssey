import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { loadDirectory, searchDirectory, type DirectoryUniversity } from "../lib/directory";
import { findSavedUniversity, type University } from "../lib/library";
import { UniversityLogo } from "./university-logo";

export function UniversityDirectory({ saved, selected, onSelect, busy }: {
  saved: University[];
  selected: DirectoryUniversity | null;
  onSelect: (university: DirectoryUniversity | null) => void;
  busy: boolean;
}) {
  const [directory, setDirectory] = useState<DirectoryUniversity[] | null>();
  const [query, setQuery] = useState("");
  const [logoQuery, setLogoQuery] = useState("");
  const searchField = useRef<HTMLInputElement>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(() => searchDirectory(directory ?? [], deferredQuery).map(university => ({
    university, savedUniversity: findSavedUniversity(saved, university),
  })), [directory, deferredQuery, saved]);

  useEffect(() => {
    let active = true;
    void loadDirectory().then(data => {
      if (active) setDirectory(data);
    }).catch(() => {
      if (active) setDirectory(null);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setLogoQuery(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  function select(university: DirectoryUniversity | null) {
    onSelect(university);
    requestAnimationFrame(() => {
      if (university) changeButton.current?.focus();
      else searchField.current?.focus();
    });
  }

  if (selected) {
    return (
      <div className="directory-selection">
        <div className="directory-result-main">
          <UniversityLogo university={selected} />
          <div><strong>{selected.name}</strong><p>{[selected.country, selected.domain].filter(Boolean).join(" · ")}</p></div>
        </div>
        <button type="button" ref={changeButton} className="button button-secondary" disabled={busy} onClick={() => select(null)}>Change</button>
      </div>
    );
  }

  return (
    <div className="directory-search">
      <label>
        Search directory
        <span className="directory-input">
          <Search size={17} aria-hidden="true" />
          <input ref={searchField} type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Name, country, or domain" autoComplete="off" aria-controls="directory-results"
            onKeyDown={event => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const first = deferredQuery === query && matches.find(match => !match.savedUniversity);
              if (first) select(first.university);
            }} />
        </span>
      </label>
      <div id="directory-results">
        {directory === null ? <p className="directory-message" role="status">Directory unavailable. You can still add a university manually.</p>
          : deferredQuery.trim().length < 2 ? null
            : !directory ? <p className="directory-message" role="status">Loading directory…</p>
              : matches.length === 0 ? <p className="directory-message" role="status">No matches. Try another search or add it manually.</p>
                : (
                  <ul className="directory-results" aria-label="Matching universities">
                    {matches.map(({ university, savedUniversity }, index) => (
                      <li key={`${university.name}-${university.domain}-${index}`}>
                        <button type="button" disabled={Boolean(savedUniversity)} onClick={() => select(university)}>
                          <span className="directory-result-main">
                            <UniversityLogo university={savedUniversity ?? university} enabled={logoQuery === query && deferredQuery === query} />
                            <span><strong>{university.name}</strong><small>{[university.country, university.domain].filter(Boolean).join(" · ")}</small></span>
                          </span>
                          {savedUniversity && <span className="directory-saved">Saved</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
      </div>
    </div>
  );
}
