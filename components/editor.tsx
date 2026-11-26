import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { websiteURL, type Collection, type University, type UniversityFields } from "../lib/library";

export type EditorState =
  | { kind: "university"; university?: University }
  | { kind: "collection"; collection?: Collection; universityId?: string }
  | { kind: "remove-university"; university: University }
  | { kind: "delete-collection"; collection: Collection };

function EditorShell({ title, description, onClose, busy, children }: {
  title: string; description: string; onClose: () => void; busy: boolean; children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content ref={panel} className="dialog-panel"
          onOpenAutoFocus={event => {
            if (document.activeElement instanceof HTMLElement) previousFocus.current = document.activeElement;
            const firstField = panel.current?.querySelector<HTMLElement>("input, .dialog-actions button");
            if (firstField) {
              event.preventDefault();
              firstField.focus({ preventScroll: true });
            }
          }}
          onCloseAutoFocus={event => {
            if (previousFocus.current?.isConnected) {
              event.preventDefault();
              previousFocus.current.focus({ preventScroll: true });
            }
          }}>
          <Dialog.Close className="icon-button dialog-close" aria-label="Close dialog" disabled={busy}><X size={19} /></Dialog.Close>
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="dialog-description">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditorActions({ submit, danger, busy }: { submit: string; danger?: boolean; busy: boolean }) {
  return (
    <div className="dialog-actions">
      <Dialog.Close className="button button-secondary" disabled={busy}>Cancel</Dialog.Close>
      <button type="submit" className={`button ${danger ? "button-danger" : "button-primary"}`} disabled={busy}>{busy ? "Saving…" : submit}</button>
    </div>
  );
}

export function Editor({ editor, onClose, onUniversity, onCollection, onDelete }: {
  editor: EditorState;
  onClose: () => void;
  onUniversity: (fields: UniversityFields, university?: University) => Promise<void>;
  onCollection: (name: string, collection?: Collection, universityId?: string) => Promise<void>;
  onDelete: (request: Extract<EditorState, { kind: "remove-university" | "delete-collection" }>) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    const name = String(data.get("name") ?? "").trim();
    if (!name) return setError("Enter a name.");

    if (editor.kind === "university") {
      const website = websiteURL(String(data.get("website") ?? ""));
      if (website === null) return setError("Enter a valid website, such as example.edu.");
      void save(() => onUniversity({ name, website, location: String(data.get("location") ?? "").trim() }, editor.university));
    }

    if (editor.kind === "collection") {
      void save(() => onCollection(name, editor.collection, editor.universityId));
    }
  }

  const university = editor.kind === "university";
  const record = university ? editor.university : editor.collection;
  const title = university ? (record ? "Edit university" : "Add university") : (record ? "Rename collection" : "New collection");
  const description = university ? "Enter the details you want to save in your library." : "Give your collection a name.";

  return (
    <EditorShell title={title} description={description} onClose={onClose} busy={busy}>
      <form className="editor-form" onSubmit={submit} onInput={() => { if (error) setError(""); }}>
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
          </>
        )}
        {error && <p role="alert" className="form-error">{error}</p>}
        <EditorActions submit={record ? "Save changes" : university ? "Add university" : "Create collection"} busy={busy} />
      </form>
    </EditorShell>
  );
}
