"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Cloud, Ellipsis, LayoutGrid, List, Menu as MenuIcon, PanelLeft, PanelLeftClose, Pencil, Plus, Search, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CommonsPhoto } from "../lib/campus-photos";
import { deleteCampusCover, uploadCampusCover } from "../lib/cover-storage";
import { collectionColors, findSavedUniversity, newId, searchableText, universityCount, websiteDomain, type Collection, type Library, type LibraryChange, type PersistLibrary, type University, type UniversityFields, type View } from "../lib/library";
import { Editor, type EditorState } from "./editor";
import { CoverPicker } from "./cover-picker";
import { CollectionIcon, Sidebar, type Screen } from "./sidebar";
import { EmptyState, UniversityItem } from "./university";

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div className="view-toggle" role="group" aria-label="Library view">
      <button className="icon-button" aria-pressed={view === "grid"} onClick={() => onChange("grid")} aria-label="Grid view" title="Grid view"><LayoutGrid size={16} /></button>
      <button className="icon-button" aria-pressed={view === "list"} onClick={() => onChange("list")} aria-label="List view" title="List view"><List size={19} /></button>
    </div>
  );
}

function CollectionMenu({ collection, onRename, onDelete }: {
  collection: Collection; onRename: () => void; onDelete: () => void;
}) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className="icon-button more-button" aria-label={`Actions for ${collection.name}`}><Ellipsis size={20} /></Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="action-menu" align="end" sideOffset={7} collisionPadding={12}>
          <Menu.Item className="menu-item" onSelect={onRename}><Pencil size={15} />Rename collection</Menu.Item>
          <Menu.Item className="menu-item menu-danger" onSelect={onDelete}><Trash2 size={15} />Delete collection</Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function LibraryWorkspace({ library, persist, account }: {
  library: Library;
  persist: PersistLibrary;
  account: { id: string; email: string; signOut: () => void; busy: boolean; error: string };
}) {
  const [screen, setScreen] = useState<Screen>({ page: "library" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [coverUniversityId, setCoverUniversityId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ text: string; warning?: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const coverUniversity = library.universities.find(item => item.id === coverUniversityId);
  const activeCollection = screen.page === "collection" ? library.collections.find(item => item.id === screen.id) : undefined;
  const page = screen.page === "collection" && !activeCollection ? "collections" : screen.page;
  const pageName = activeCollection?.name ?? (page === "settings" ? "Settings" : page === "collections" ? "Collections" : "Library");
  const supportsSearch = page === "library" || page === "collection";

  useEffect(() => {
    if (!supportsSearch || editor || coverUniversity || mobileOpen) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !(event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable], [role=menu]"))
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [editor, coverUniversity, mobileOpen, supportsSearch]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.warning ? 6000 : 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function navigate(next: Screen) {
    setScreen(next);
    setQuery("");
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }

  async function commit(change: LibraryChange, message?: string) {
    await persist(change);
    if (message) setNotice({ text: message });
  }

  function applyChange(change: LibraryChange) {
    void commit(change).catch(error => {
      setNotice({ text: error instanceof Error ? error.message : "Could not save your changes. Try again.", warning: true });
    });
  }

  function cleanUpCover(path: string | undefined) {
    if (path) void deleteCampusCover(path).catch(() => {
      setNotice({ text: "The old uploaded photo could not be deleted.", warning: true });
    });
  }

  async function saveCover(id: string, selection: CommonsPhoto | File | null) {
    const coverPhoto = selection instanceof File ? await uploadCampusCover(account.id, selection) : selection ?? undefined;
    let replacedUpload: string | undefined;
    await commit(previous => {
      const university = previous.universities.find(item => item.id === id);
      if (!university) throw new Error("This university was removed from your library.");
      replacedUpload = university.coverPhoto?.source === "upload" ? university.coverPhoto.path : undefined;
      return {
        ...previous,
        universities: previous.universities.map(item => item.id === id
          ? { ...item, cover: undefined, coverPosition: undefined, coverPhoto }
          : item),
      };
    }, coverPhoto ? "Campus cover saved" : "Campus cover removed");
    cleanUpCover(replacedUpload);
    setCoverUniversityId(null);
  }

  async function saveUniversity(fields: UniversityFields, university?: University, collectionIds: string[] = []) {
    const id = university?.id ?? newId();
    await commit(previous => {
      const current = previous.universities.find(item => item.id === id);
      if (university && !current) {
        throw new Error("This university was removed from your library.");
      }
      const sameWebsite = current?.website === fields.website;
      const saved: University = {
        ...current, ...fields, id,
        domain: fields.domain || (sameWebsite ? current?.domain : undefined) || websiteDomain(fields.website) || undefined,
        domains: fields.domains ?? (sameWebsite ? current?.domains : undefined),
        collectionIds: current?.collectionIds ?? previous.collections.filter(item => collectionIds.includes(item.id)).map(item => item.id),
      };
      if ((!current || current.name !== saved.name || !sameWebsite) && findSavedUniversity(previous.universities, saved, id)) {
        throw new Error("This university is already in your library.");
      }
      const universities = current
        ? previous.universities.map(item => item.id === id ? saved : item)
        : [saved, ...previous.universities];
      return { ...previous, universities };
    }, university ? "University updated" : "University added");
    if (!university) setQuery("");
    setEditor(null);
  }

  async function saveCollection(name: string, collection?: Collection, universityId?: string) {
    const id = collection?.id ?? newId();
    await commit(previous => {
      if (previous.collections.some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) {
        throw new Error("A collection with that name already exists.");
      }
      if (collection && !previous.collections.some(item => item.id === id)) {
        throw new Error("This collection was removed from your library.");
      }
      if (universityId && !previous.universities.some(item => item.id === universityId)) {
        throw new Error("This university was removed from your library.");
      }
      return {
        ...previous,
        collections: collection
          ? previous.collections.map(item => item.id === id ? { ...item, name } : item)
          : [...previous.collections, { id, name, color: collectionColors[previous.collections.length % collectionColors.length] }],
        universities: universityId
          ? previous.universities.map(item => item.id === universityId ? { ...item, collectionIds: [...item.collectionIds, id] } : item)
          : previous.universities,
      };
    }, collection ? "Collection renamed" : universityId ? "Collection created and university added" : "Collection created");
    setEditor(null);
    if (!collection && !universityId) navigate({ page: "collection", id });
  }

  function toggleMembership(universityId: string, collectionId: string, included: boolean) {
    applyChange(previous => {
      if (!previous.collections.some(item => item.id === collectionId)) {
        throw new Error("This collection was removed from your library.");
      }
      return {
        ...previous,
        universities: previous.universities.map(item => {
          if (item.id !== universityId || item.collectionIds.includes(collectionId) === included) return item;
          const others = item.collectionIds.filter(id => id !== collectionId);
          return { ...item, collectionIds: included ? [...others, collectionId] : others };
        }),
      };
    });
  }

  async function deleteRecord(request: Extract<EditorState, { kind: "remove-university" | "delete-collection" }>) {
    if (request.kind === "remove-university") {
      let removedUpload: string | undefined;
      await commit(previous => {
        const photo = previous.universities.find(item => item.id === request.university.id)?.coverPhoto;
        removedUpload = photo?.source === "upload" ? photo.path : undefined;
        return { ...previous, universities: previous.universities.filter(item => item.id !== request.university.id) };
      }, "University removed");
      cleanUpCover(removedUpload);
    } else {
      const { id } = request.collection;
      await commit(previous => ({
        ...previous,
        collections: previous.collections.filter(item => item.id !== id),
        universities: previous.universities.map(item => ({ ...item, collectionIds: item.collectionIds.filter(collectionId => collectionId !== id) })),
      }), "Collection deleted");
      if (activeCollection?.id === id) navigate({ page: "collections" });
    }
    setEditor(null);
  }

  function createCollection(universityId?: string) {
    setMobileOpen(false);
    setEditor({ kind: "collection", universityId });
  }

  function changeView(view: View) {
    applyChange(previous => previous.view === view ? previous : { ...previous, view });
  }

  const sidebarProps = { screen, collections: library.collections, navigate, onCreate: () => createCollection() };
  const inScope = activeCollection
    ? library.universities.filter(university => university.collectionIds.includes(activeCollection.id))
    : library.universities;
  const terms = searchableText(query).split(/\s+/).filter(Boolean);
  const visible = terms.length ? inScope.filter(university => {
    const text = searchableText([university.name, university.location, university.website, university.country, university.domain, ...(university.domains ?? [])].join(" "));
    return terms.every(term => text.includes(term));
  }) : inScope;

  function collectionMenu(collection: Collection) {
    return <CollectionMenu collection={collection}
      onRename={() => setEditor({ kind: "collection", collection })}
      onDelete={() => setEditor({ kind: "delete-collection", collection })} />;
  }

  const addButton = <button className="button button-primary" onClick={() => setEditor({ kind: "university" })}><Plus size={17} />Add university</button>;

  return (
    <div className="odyssey" data-collapsed={library.sidebarCollapsed || undefined}>
      <div className="desktop-sidebar"><Sidebar {...sidebarProps} collapsed={library.sidebarCollapsed} /></div>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button desktop-toggle" aria-label={library.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!library.sidebarCollapsed} title={library.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => applyChange(previous => ({ ...previous, sidebarCollapsed: !previous.sidebarCollapsed }))}>
              {library.sidebarCollapsed ? <PanelLeft size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger className="icon-button mobile-toggle" aria-label="Open sidebar"><MenuIcon size={20} /></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay mobile-overlay" />
                <Dialog.Content className="mobile-drawer">
                  <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title>
                  <Dialog.Description className="sr-only">Open your library, collections, or settings.</Dialog.Description>
                  <Sidebar {...sidebarProps} onClose={() => setMobileOpen(false)} />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              {activeCollection ? <button onClick={() => navigate({ page: "collections" })}>Collections</button> : <span>Workspace</span>}
              <ChevronRight size={14} className="breadcrumb-divider" aria-hidden="true" />
              <span className="breadcrumb-current" aria-current="page">{pageName}</span>
            </nav>
          </div>
          {supportsSearch && (
            <div className="search-field" role="search">
              <Search size={17} aria-hidden="true" />
              <input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)}
                onKeyDown={event => { if (event.key === "Escape" && query) setQuery(""); }}
                type="search" placeholder="Search library…" aria-label="Search universities" />
              {query ? <button className="icon-button clear-search" onClick={() => { setQuery(""); searchRef.current?.focus(); }} aria-label="Clear search"><X size={15} /></button>
                : <kbd aria-hidden="true">/</kbd>}
            </div>
          )}
        </header>

        <main className="main-content">
          {supportsSearch && (
            <section aria-labelledby="library-title">
              <header className="library-header">
                <h1 id="library-title">{activeCollection?.name ?? "University library"}</h1>
                <p className="library-count" aria-live="polite">
                  {terms.length > 0 && `${visible.length} of `}
                  {universityCount(inScope.length)}
                </p>
                <div className="heading-actions">
                  {addButton}
                  {activeCollection && collectionMenu(activeCollection)}
                </div>
                <ViewToggle view={library.view} onChange={changeView} />
              </header>
              {visible.length ? (
                <ul className="university-layout" data-view={library.view}>
                  {visible.map(university => (
                    <UniversityItem key={university.id} university={university} collections={library.collections}
                      onProfile={() => setEditor({ kind: "university-profile", university })}
                      onChangeCover={() => setCoverUniversityId(university.id)}
                      onEdit={() => setEditor({ kind: "university", university })}
                      onRemove={() => setEditor({ kind: "remove-university", university })}
                      onMembership={(id, included) => toggleMembership(university.id, id, included)}
                      onNewCollection={() => createCollection(university.id)} />
                  ))}
                </ul>
              ) : terms.length ? (
                <EmptyState title="No matching universities" detail="Try a different name or location." action="Clear search" onAction={() => setQuery("")} />
              ) : activeCollection ? (
                <EmptyState title="This collection is empty" detail="Use the three-dot menu on a university to add it to this collection."
                  action="Open library" onAction={() => navigate({ page: "library" })} />
              ) : (
                <EmptyState title="Your library is empty" detail="Add a university to start your list."
                  action="Add university" onAction={() => setEditor({ kind: "university" })} />
              )}
            </section>
          )}
          {page === "collections" && (
            <>
              <div className="page-heading">
                <div><h1>Collections</h1><p>Group the universities in your library.</p></div>
                <button className="button button-primary" onClick={() => createCollection()}><Plus size={17} />New collection</button>
              </div>
              {library.collections.length ? (
                <ul className="collection-list">
                  {library.collections.map(collection => (
                    <li key={collection.id}>
                      <button className="collection-link" onClick={() => navigate({ page: "collection", id: collection.id })}>
                        <span className="collection-tile-icon" style={{ "--collection-color": collection.color } as CSSProperties}><CollectionIcon collection={collection} /></span>
                        <span><strong>{collection.name}</strong><small>{universityCount(library.universities.filter(university => university.collectionIds.includes(collection.id)).length)}</small></span>
                      </button>
                      {collectionMenu(collection)}
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No collections yet" detail="Create a collection to start grouping universities." />}
            </>
          )}
          {page === "settings" && (
            <>
              <div className="page-heading"><div><h1>Settings</h1><p>Manage your library preferences.</p></div></div>
              <div className="settings-panel">
                <div className="settings-row">
                  <div><h2>Library layout</h2><p>Choose how universities are displayed.</p></div>
                  <ViewToggle view={library.view} onChange={changeView} />
                </div>
                <div className="settings-row">
                  <div><h2>Cloud storage</h2><p>Universities, collections, and preferences are saved to your account.</p></div>
                  <Cloud size={20} className="storage-icon" aria-hidden="true" />
                </div>
                <div className="settings-row">
                  <div className="min-w-0 break-words">
                    <h2>Account</h2><p>{account.email}</p>
                    {account.error && <p role="alert">{account.error}</p>}
                  </div>
                  <button className="button button-secondary" disabled={account.busy} onClick={account.signOut}>Sign out</button>
                </div>
              </div>
              <a className="photo-credits" href="/photo-credits.txt" target="_blank" rel="noreferrer">Campus photo credits</a>
            </>
          )}
        </main>
      </div>
      {editor && <Editor key={editor.kind} editor={editor} universities={library.universities} collections={library.collections}
        activeCollectionId={activeCollection?.id} onClose={() => setEditor(null)}
        onEditUniversity={university => setEditor({ kind: "university", university })} onUniversity={saveUniversity}
        onCollection={saveCollection} onDelete={deleteRecord} />}
      {coverUniversity && <CoverPicker key={coverUniversity.id} university={coverUniversity}
        onClose={() => setCoverUniversityId(null)} onSave={selection => saveCover(coverUniversity.id, selection)} />}
      {notice && <div className="toast" role={notice.warning ? "alert" : "status"}>
        {notice.warning ? <TriangleAlert size={18} /> : <Check size={18} />}{notice.text}
        <button className="icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button>
      </div>}
    </div>
  );
}
