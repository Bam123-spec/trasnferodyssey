import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { DirectoryUniversity } from "../lib/directory";
import { logoOverrideURL, universityDomain, websiteURL, type Collection, type University, type UniversityFields } from "../lib/library";
import { EditorShell } from "./editor-shell";
import { CampusCoverImage, PhotoAttribution } from "./campus-cover";
import { UniversityDirectory } from "./university-directory";
import { UniversityLogo } from "./university-logo";

export type EditorState =
  | { kind: "university"; university?: University }
  | { kind: "university-profile"; university: University }
  | { kind: "collection"; collection?: Collection; universityId?: string }
  | { kind: "remove-university"; university: University }
  | { kind: "delete-collection"; collection: Collection };

function EditorActions({ submit, danger, busy, disabled }: { submit: string; danger?: boolean; busy: boolean; disabled?: boolean }) {
  return (
    <div className="dialog-actions">
      <Dialog.Close className="button button-secondary" disabled={busy}>Cancel</Dialog.Close>
      <button type="submit" className={`button ${danger ? "button-danger" : "button-primary"}`} disabled={busy || disabled}>{busy ? "Saving…" : submit}</button>
    </div>
  );
}

export function Editor({ editor, universities, collections, activeCollectionId, onClose, onEditUniversity, onUniversity, onCollection, onDelete }: {
  editor: EditorState;
  universities: University[];
  collections: Collection[];
  activeCollectionId?: string;
  onClose: () => void;
  onEditUniversity: (university: University) => void;
  onUniversity: (fields: UniversityFields, university?: University, collectionIds?: string[]) => Promise<void>;
  onCollection: (name: string, collection?: Collection, universityId?: string) => Promise<void>;
  onDelete: (request: Extract<EditorState, { kind: "remove-university" | "delete-collection" }>) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [selected, setSelected] = useState<DirectoryUniversity | null>(null);
  const addingUniversity = editor.kind === "university" && !editor.university;
  const showDirectory = addingUniversity && !manual;

  async function save(action: () => Promise<void>) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save your changes. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (editor.kind === "university-profile") {
    const university = universities.find(item => item.id === editor.university.id) ?? editor.university;
    const domain = universityDomain(university);
    const website = websiteURL(university.website);
    const memberships = collections.filter(collection => university.collectionIds.includes(collection.id));
    return (
      <EditorShell title={university.name} description="University profile" onClose={onClose} busy={false}>
        {(university.cover || university.coverPhoto) && (
          <figure className="profile-campus-cover">
            <div><CampusCoverImage university={university} /></div>
            {university.coverPhoto?.source === "wikimedia" && <PhotoAttribution photo={university.coverPhoto} />}
            {university.cover && !university.coverPhoto && (
              <a className="cover-attribution" href="/photo-credits.txt" target="_blank" rel="noreferrer">Campus photo credits</a>
            )}
          </figure>
        )}
        <div className="university-profile-summary">
          <UniversityLogo university={university} className="university-profile-logo" />
          <dl>
            {(university.location || university.country) && (
              <div><dt>Location</dt><dd>{university.location || university.country}</dd></div>
            )}
            {domain && <div><dt>Official domain</dt><dd>{domain}</dd></div>}
            {memberships.length > 0 && <div><dt>Collections</dt><dd>{memberships.map(collection => collection.name).join(", ")}</dd></div>}
          </dl>
        </div>
        <div className="dialog-actions">
          {website && <a href={website} target="_blank" rel="noreferrer" className="button button-secondary"><ExternalLink size={15} />Visit website</a>}
          <button className="button button-primary" onClick={() => onEditUniversity(university)}>Edit university</button>
        </div>
      </EditorShell>
    );
  }

  if (editor.kind === "remove-university" || editor.kind === "delete-collection") {
    const university = editor.kind === "remove-university";
    const title = university ? "Remove university" : "Delete collection";
    const description = university
      ? `${editor.university.name} will be removed from your library and its collections.`
      : `${editor.collection.name} will be deleted. Its universities will still be in your library.`;
    return (
      <EditorShell title={title} description={description} onClose={onClose} busy={busy}>
        <form onSubmit={event => { event.preventDefault(); void save(() => onDelete(editor)); }}>
          {error && <p role="alert" className="form-error mt-4">{error}</p>}
          <EditorActions submit={title} busy={busy} danger />
        </form>
      </EditorShell>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const collectionIds = data.getAll("collection").map(String);
    if (showDirectory) {
      if (!selected) return;
      const { name, location, website, domain, domains, country, countryCode } = selected;
      void save(() => onUniversity({ name, location, website, domain, domains, country, countryCode }, undefined, collectionIds));
      return;
    }
    const name = String(data.get("name") ?? "").trim();
    if (!name) return setError("Enter a name.");

    if (editor.kind === "university") {
      const website = websiteURL(String(data.get("website") ?? ""));
      if (website === null) return setError("Enter a valid website, such as example.edu.");
      const logoOverride = logoOverrideURL(String(data.get("logoOverride") ?? ""));
      if (logoOverride === null) return setError("Enter a valid HTTPS logo image URL.");
      void save(() => onUniversity({
        name, website, logoOverride: logoOverride || undefined, location: String(data.get("location") ?? "").trim(),
      }, editor.university, collectionIds));
    }

    if (editor.kind === "collection") {
      void save(() => onCollection(name, editor.collection, editor.universityId));
    }
  }

  const university = editor.kind === "university";
  const record = university ? editor.university : editor.collection;
  const title = university ? (record ? "Edit university" : "Add university") : (record ? "Rename collection" : "New collection");
  const description = addingUniversity ? "Search the directory or enter a university manually."
    : university ? "Enter the details you want to save in your library." : "Give your collection a name.";

  return (
    <EditorShell title={title} description={description} onClose={onClose} busy={busy}>
      {addingUniversity && (
        <div className="directory-modes" role="group" aria-label="Add university method">
          <button type="button" className="button button-secondary" aria-pressed={!manual} disabled={busy}
            onClick={() => { setManual(false); setError(""); }}>Directory</button>
          <button type="button" className="button button-secondary" aria-pressed={manual} disabled={busy}
            onClick={() => { setManual(true); setError(""); }}>Manual entry</button>
        </div>
      )}
      <form className="editor-form" onSubmit={submit} onInput={() => { if (error) setError(""); }}>
        {showDirectory ? (
          <UniversityDirectory saved={universities} selected={selected} busy={busy}
            onSelect={entry => { setSelected(entry); setError(""); }} />
        ) : (
          <>
            <label>
              {university ? "University name" : "Collection name"}
              <input name="name" autoComplete="off" defaultValue={record?.name} required readOnly={busy} maxLength={university ? 120 : 60}
                placeholder={university ? "e.g. New York University" : "e.g. Fall shortlist"} />
            </label>
            {editor.kind === "university" && (
              <>
                <label>Location <span>Optional</span>
                  <input name="location" autoComplete="off" defaultValue={editor.university?.location} readOnly={busy} maxLength={100} placeholder="City, state or country" />
                </label>
                <label>Website <span>Optional</span>
                  <input name="website" inputMode="url" autoComplete="off" defaultValue={editor.university?.website} readOnly={busy} maxLength={250} placeholder="example.edu" />
                </label>
                <label>Logo image URL <span>Optional</span>
                  <input name="logoOverride" inputMode="url" autoComplete="off" defaultValue={editor.university?.logoOverride}
                    readOnly={busy} maxLength={2048} placeholder="https://example.edu/logo.png" aria-describedby="logo-override-hint" />
                  <small id="logo-override-hint" className="logo-override-hint">Leave blank to use the official domain.</small>
                </label>
              </>
            )}
          </>
        )}
        {addingUniversity && collections.length > 0 && (
          <div hidden={showDirectory && !selected}>
            <fieldset className="directory-collections" disabled={busy}>
              <legend>Collections <span>Optional</span></legend>
              <div>{collections.map(collection => (
                <label key={collection.id}>
                  <input type="checkbox" name="collection" value={collection.id} defaultChecked={collection.id === activeCollectionId} />
                  {collection.name}
                </label>
              ))}</div>
            </fieldset>
          </div>
        )}
        {error && <p role="alert" className="form-error">{error}</p>}
        <EditorActions submit={record ? "Save changes" : university ? "Add university" : "Create collection"}
          busy={busy} disabled={showDirectory && !selected} />
      </form>
    </EditorShell>
  );
}
