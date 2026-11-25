"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Ellipsis, FolderClosed, HardDrive, LayoutGrid, List, Menu as MenuIcon, PanelLeft, PanelLeftClose, Pencil, Plus, Search, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { collectionColors, newId, searchableText, universityCount, type Collection, type Library, type University, type UniversityFields, type View } from "../lib/library";
import { updateLibrary, useLibrary } from "../lib/storage";
import { Editor, type EditorState } from "./editor";
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

export function Odyssey() {
  const library = useLibrary();
  const [screen, setScreen] = useState<Screen>({ page: "library" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ text: string; warning?: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeCollection = screen.page === "collection" ? library.collections.find(item => item.id === screen.id) : undefined;
  const page = screen.page === "collection" && !activeCollection ? "collections" : screen.page;
  const pageName = activeCollection?.name ?? (page === "settings" ? "Settings" : page === "collections" ? "Collections" : "Library");
  const supportsSearch = page === "library" || page === "collection";

  useEffect(() => {
    if (!supportsSearch || editor || mobileOpen) return;
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
  }, [editor, mobileOpen, supportsSearch]);

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

  function commit(change: (previous: Library) => Library, message?: string) {
    const saved = updateLibrary(change);
    if (!saved) setNotice({ text: "Browser storage is unavailable. Changes last until you reload.", warning: true });
    else if (message) setNotice({ text: message });
  }

  function saveUniversity(fields: UniversityFields, university?: University) {
    commit(previous => {
      const universities = university
        ? previous.universities.map(item => item.id === university.id ? { ...item, ...fields } : item)
        : [{ ...fields, id: newId(), collectionIds: activeCollection ? [activeCollection.id] : [] }, ...previous.universities];
      return { ...previous, universities };
    }, university ? "University updated" : "University added");
    if (!university) setQuery("");
    setEditor(null);
  }

  function saveCollection(name: string, collection?: Collection, universityId?: string) {
    if (library.collections.some(item => item.id !== collection?.id && item.name.toLowerCase() === name.toLowerCase())) {
      return "A collection with that name already exists.";
    }
    const added: Collection = { id: newId(), name, color: collectionColors[library.collections.length % collectionColors.length] };
    commit(previous => ({
      ...previous,
      collections: collection
        ? previous.collections.map(item => item.id === collection.id ? { ...item, name } : item)
        : [...previous.collections, added],
      universities: universityId
        ? previous.universities.map(item => item.id === universityId ? { ...item, collectionIds: [...item.collectionIds, added.id] } : item)
        : previous.universities,
    }), collection ? "Collection renamed" : universityId ? "Collection created and university added" : "Collection created");
    setEditor(null);
    if (!collection && !universityId) navigate({ page: "collection", id: added.id });
  }

  function toggleMembership(universityId: string, collectionId: string, included: boolean) {
    commit(previous => ({
      ...previous,
      universities: previous.universities.map(item => {
        if (item.id !== universityId) return item;
        const others = item.collectionIds.filter(id => id !== collectionId);
        return { ...item, collectionIds: included ? [...others, collectionId] : others };
      }),
    }));
  }

  function deleteRecord(request: Extract<EditorState, { kind: "remove-university" | "delete-collection" }>) {
    if (request.kind === "remove-university") {
      commit(previous => ({ ...previous, universities: previous.universities.filter(item => item.id !== request.university.id) }), "University removed");
    } else {
      const { id } = request.collection;
      commit(previous => ({
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
    if (view !== library.view) commit(previous => ({ ...previous, view }));
  }

  const sidebarProps = { screen, collections: library.collections, navigate, onCreate: () => createCollection() };
  const inScope = activeCollection
    ? library.universities.filter(university => university.collectionIds.includes(activeCollection.id))
    : library.universities;
  const terms = searchableText(query).split(/\s+/).filter(Boolean);
  const visible = terms.length ? inScope.filter(university => {
    const text = searchableText(`${university.name} ${university.location} ${university.website}`);
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
              onClick={() => commit(previous => ({ ...previous, sidebarCollapsed: !previous.sidebarCollapsed }))}>
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
          {page === "library" && (
            <section className="library-hero" aria-labelledby="library-title">
              <div className="hero-content">
                <h1 id="library-title">University library</h1>
                <p>Keep track of the universities you’re exploring.</p>
                {addButton}
              </div>
            </section>
          )}
          {activeCollection && (
            <div className="page-heading">
              <div>
                <div className="collection-heading-icon" style={{ "--collection-color": activeCollection.color } as CSSProperties}><FolderClosed size={22} /></div>
                <h1>{activeCollection.name}</h1>
                <p>{universityCount(inScope.length)}</p>
              </div>
              <div className="heading-actions">{addButton}{collectionMenu(activeCollection)}</div>
            </div>
          )}
          {supportsSearch && (
            <section className="university-section" aria-labelledby="university-list-title">
              <div className="section-toolbar">
                <div className="section-title">
                  <h2 id="university-list-title">{terms.length ? "Search results" : page === "library" ? "All universities" : "Universities"}</h2>
                  <span aria-live="polite">{universityCount(visible.length)}</span>
                </div>
                <ViewToggle view={library.view} onChange={changeView} />
              </div>
              {visible.length ? (
                <ul className="university-layout" data-view={library.view}>
                  {visible.map(university => (
                    <UniversityItem key={university.id} university={university} collections={library.collections}
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
                  <div><h2>Local storage</h2><p>Universities, collections, and preferences are saved in this browser.</p></div>
                  <HardDrive size={20} className="storage-icon" aria-hidden="true" />
                </div>
              </div>
              <a className="photo-credits" href="/photo-credits.txt" target="_blank" rel="noreferrer">Campus photo credits</a>
            </>
          )}
        </main>
      </div>
      {editor && <Editor editor={editor} onClose={() => setEditor(null)} onUniversity={saveUniversity}
        onCollection={saveCollection} onDelete={deleteRecord} />}
      {notice && <div className="toast" role={notice.warning ? "alert" : "status"}>
        {notice.warning ? <TriangleAlert size={18} /> : <Check size={18} />}{notice.text}
        <button className="icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button>
      </div>}
    </div>
  );
}
