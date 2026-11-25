import { Compass, FolderClosed, LibraryBig, Plus, Settings, X } from "lucide-react";
import type { Collection } from "../lib/library";

export type Screen = { page: "library" | "collections" | "settings" } | { page: "collection"; id: string };

type SidebarProps = {
  screen: Screen;
  collections: Collection[];
  collapsed?: boolean;
  navigate: (screen: Screen) => void;
  onCreate: () => void;
  onClose?: () => void;
};

export function CollectionIcon({ collection }: { collection: Collection }) {
  return <FolderClosed size={16} style={{ color: collection.color }} aria-hidden="true" />;
}

export function Sidebar({ screen, collections, collapsed, navigate, onCreate, onClose }: SidebarProps) {
  return (
    <aside className="sidebar" data-collapsed={collapsed || undefined}>
      <div className="sidebar-top">
        <button className="brand" onClick={() => navigate({ page: "library" })} aria-label="Odyssey home" title={collapsed ? "Odyssey" : undefined}>
          <span className="brand-mark"><Compass size={22} strokeWidth={1.65} /></span>
          <span className="sidebar-label">Odyssey</span>
        </button>
        {onClose && <button className="icon-button" onClick={onClose} aria-label="Close sidebar"><X size={18} /></button>}
      </div>
      <nav className="sidebar-nav" aria-label="Workspace">
        <p className="sidebar-caption">Workspace</p>
        <button className="nav-item" aria-current={screen.page === "library" ? "page" : undefined}
          onClick={() => navigate({ page: "library" })} title={collapsed ? "Library" : undefined}>
          <LibraryBig size={18} aria-hidden="true" /><span className="sidebar-label">Library</span>
        </button>
        <div className="nav-collection">
          <button className="nav-item" aria-current={screen.page === "collections" ? "page" : undefined}
            onClick={() => navigate({ page: "collections" })} title={collapsed ? "Collections" : undefined}>
            <FolderClosed size={18} aria-hidden="true" /><span className="sidebar-label">Collections</span>
          </button>
          <button className="icon-button collection-add" onClick={onCreate} aria-label="New collection" title="New collection"><Plus size={16} /></button>
        </div>
        {collections.length > 0 && (
          <ul className="sidebar-collections">
            {collections.map(collection => (
              <li key={collection.id}>
                <button className="nav-item nav-child"
                  aria-current={screen.page === "collection" && screen.id === collection.id ? "page" : undefined}
                  onClick={() => navigate({ page: "collection", id: collection.id })}
                  title={collapsed ? collection.name : undefined}>
                  <CollectionIcon collection={collection} />
                  <span className="sidebar-label">{collection.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" aria-current={screen.page === "settings" ? "page" : undefined}
          onClick={() => navigate({ page: "settings" })} title={collapsed ? "Settings" : undefined}>
          <Settings size={18} aria-hidden="true" /><span className="sidebar-label">Settings</span>
        </button>
      </div>
    </aside>
  );
}
