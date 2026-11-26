import * as Dialog from "@radix-ui/react-dialog";
import { Check, ImageOff, Search, Upload } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { searchCommons, type CommonsPhoto } from "../lib/campus-photos";
import { validateCoverUpload } from "../lib/cover-storage";
import type { University } from "../lib/library";
import { CampusCoverImage, PhotoAttribution } from "./campus-cover";
import { EditorShell } from "./editor-shell";

const pageSize = 12;
type Results = Awaited<ReturnType<typeof searchCommons>>;
type Selection = CommonsPhoto | File;

export function CoverPicker({ university, onClose, onSave }: {
  university: University;
  onClose: () => void;
  onSave: (selection: Selection | null) => Promise<void>;
}) {
  const initialTerm = [university.name, university.location || university.country].filter(Boolean).join(" ");
  const [query, setQuery] = useState(initialTerm);
  const [search, setSearch] = useState({ term: initialTerm, fallback: university.name });
  const [results, setResults] = useState<Results>({ photos: [] });
  const [activeTerm, setActiveTerm] = useState(initialTerm);
  const [visible, setVisible] = useState(pageSize);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [problem, setProblem] = useState("");
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [localPreview, setLocalPreview] = useState("");
  const currentRequest = useRef<AbortController>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const selectedPhoto = selected && !(selected instanceof File) ? selected : null;
  const selectedFile = selected instanceof File ? selected : null;
  const hasCover = Boolean(university.coverPhoto || university.cover);

  useEffect(() => {
    const controller = new AbortController();
    currentRequest.current = controller;
    setLoading(true);
    setMore(false);
    setProblem("");
    setResults({ photos: [] });
    setVisible(pageSize);
    void (async () => {
      try {
        let term = search.term;
        let result = await searchCommons(term, controller.signal);
        if (result.photos.length < pageSize && search.fallback && term !== search.fallback) {
          const broad = await searchCommons(search.fallback, controller.signal).catch(error => {
            if (result.photos.length === 0) throw error;
            return undefined;
          });
          if (broad?.photos.length) {
            const known = new Set(result.photos.map(photo => photo.sourceUrl));
            result = { photos: [...result.photos, ...broad.photos.filter(photo => !known.has(photo.sourceUrl))], next: broad.next };
            term = search.fallback;
          }
        }
        if (controller.signal.aborted) return;
        setActiveTerm(term);
        setResults(result);
      } catch {
        if (!controller.signal.aborted) setProblem("Could not load photos from Wikimedia Commons. Try another search or upload a photograph.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => { controller.abort(); };
  }, [search]);

  useEffect(() => {
    if (!selectedFile) { setLocalPreview(""); return; }
    const url = URL.createObjectURL(selectedFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearch({ term, fallback: "" });
  }

  async function loadMore() {
    if (loading || more || busy) return;
    const target = visible + pageSize;
    if (results.photos.length >= target || !results.next) { setVisible(target); return; }
    const signal = currentRequest.current?.signal;
    if (!signal) return;
    setMore(true);
    setProblem("");
    try {
      const page = await searchCommons(activeTerm, signal, results.next);
      if (signal.aborted) return;
      const known = new Set(results.photos.map(photo => photo.sourceUrl));
      setResults({ photos: [...results.photos, ...page.photos.filter(photo => !known.has(photo.sourceUrl))], next: page.next });
      setVisible(target);
    } catch {
      if (!signal.aborted) setProblem("Could not load more photos. Try again.");
    } finally {
      if (!signal.aborted) setMore(false);
    }
  }

  async function save(value: Selection | null) {
    if (busy) return;
    setBusy(true);
    setSaveError("");
    try {
      await onSave(value);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the cover. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorShell title="Change cover" description={university.name} onClose={onClose} busy={busy} className="cover-picker">
      <form className="cover-search" onSubmit={submitSearch}>
        <label className="sr-only" htmlFor="campus-photo-search">Search campus photos</label>
        <input id="campus-photo-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
          maxLength={260} placeholder="University, location, or building" disabled={busy} />
        <button className="button button-secondary" type="submit" disabled={busy || !query.trim()}><Search size={16} />Search</button>
        <button className="button button-secondary" type="button" onClick={() => uploadInput.current?.click()} disabled={busy}><Upload size={16} />Upload photo</button>
      </form>
      <input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy}
        onChange={event => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          const error = validateCoverUpload(file);
          setSaveError(error);
          if (!error) setSelected(file);
        }} />
      <div className="cover-picker-content">
        <div className="cover-results">
          {loading && <p role="status" className="cover-message">Searching Wikimedia Commons…</p>}
          {problem && <p role="alert" className="cover-message">{problem}</p>}
          {!loading && !problem && results.photos.length === 0 && <p role="status" className="cover-message">No campus photos found. Try the university’s full name or a building name.</p>}
          {results.photos.length > 0 && (
            <ul className="cover-thumbnail-grid" aria-label="Campus photographs">
              {results.photos.slice(0, visible).map(photo => {
                const isSelected = selectedPhoto?.sourceUrl === photo.sourceUrl;
                return (
                  <li key={photo.sourceUrl}>
                    <button type="button" aria-pressed={isSelected} disabled={busy}
                      onClick={() => { setSelected(photo); setSaveError(""); }}>
                      <img src={photo.url} alt="" loading="lazy" decoding="async" />
                      <span title={photo.title}>{photo.title}</span>
                      {isSelected && <Check className="cover-selected-check" size={16} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {(results.next || results.photos.length > visible) && (
            <button type="button" className="button button-secondary cover-more" onClick={loadMore} disabled={loading || more || busy}>
              {more ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
        <section className="cover-preview-panel" aria-label="Cover preview">
          <h2>{selected ? "Preview" : "Current cover"}</h2>
          <div className="cover-preview">
            {selectedPhoto || selectedFile ? (
              (selectedPhoto?.url || localPreview) && <img src={selectedPhoto?.url || localPreview} alt={selectedPhoto?.title ?? "Uploaded cover preview"} />
            ) : (
              <><ImageOff size={24} aria-hidden="true" /><CampusCoverImage university={university} /></>
            )}
          </div>
          {selectedPhoto ? <PhotoAttribution photo={selectedPhoto} />
            : selectedFile ? <p className="cover-attribution">{selectedFile.name} · Private upload</p>
              : university.coverPhoto?.source === "wikimedia" ? <PhotoAttribution photo={university.coverPhoto} /> : null}
        </section>
      </div>
      {saveError && <p role="alert" className="form-error mt-3">{saveError}</p>}
      <div className="dialog-actions cover-actions">
        {hasCover && <button type="button" className="button button-secondary cover-remove" onClick={() => save(null)} disabled={busy}>Remove cover</button>}
        <Dialog.Close className="button button-secondary" disabled={busy}>Cancel</Dialog.Close>
        <button type="button" className="button button-primary" disabled={!selected || busy} onClick={() => save(selected)}>{busy ? "Saving…" : "Save cover"}</button>
      </div>
    </EditorShell>
  );
}
