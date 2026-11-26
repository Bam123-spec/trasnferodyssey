import * as Menu from "@radix-ui/react-dropdown-menu";
import { BookOpen, Check, Ellipsis, ExternalLink, ImagePlus, Landmark, MapPin, Pencil, Plus, School, Trash2 } from "lucide-react";
import type { Collection, University } from "../lib/library";
import { CampusCoverImage, PhotoAttribution } from "./campus-cover";
import { CollectionIcon } from "./sidebar";
import { UniversityLogo } from "./university-logo";

type UniversityActions = {
  onProfile: () => void;
  onChangeCover: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onMembership: (id: string, included: boolean) => void;
  onNewCollection: () => void;
};

type UniversityItemProps = UniversityActions & { university: University; collections: Collection[] };

function UniversityMenu({ university, collections, onProfile, onChangeCover, onEdit, onRemove, onMembership, onNewCollection }: UniversityItemProps) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className="icon-button more-button" aria-label={`Actions for ${university.name}`}>
        <Ellipsis size={20} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="action-menu" align="end" sideOffset={7} collisionPadding={12}>
          <Menu.Item className="menu-item" onSelect={onProfile}><School size={15} />View profile</Menu.Item>
          <Menu.Item className="menu-item" onSelect={onChangeCover}><ImagePlus size={15} />Change Cover</Menu.Item>
          <Menu.Item className="menu-item" onSelect={onEdit}><Pencil size={15} />Edit university</Menu.Item>
          {university.website && (
            <Menu.Item asChild className="menu-item">
              <a href={university.website} target="_blank" rel="noreferrer"><ExternalLink size={15} />Visit website</a>
            </Menu.Item>
          )}
          <Menu.Separator className="menu-divider" />
          <Menu.Label className="menu-label">Collections</Menu.Label>
          {collections.map(collection => (
            <Menu.CheckboxItem key={collection.id} className="menu-item"
              checked={university.collectionIds.includes(collection.id)}
              onSelect={event => event.preventDefault()}
              onCheckedChange={included => onMembership(collection.id, included)}>
              <CollectionIcon collection={collection} /><span className="min-w-0 flex-1 truncate">{collection.name}</span>
              <Menu.ItemIndicator className="menu-check"><Check size={15} /></Menu.ItemIndicator>
            </Menu.CheckboxItem>
          ))}
          <Menu.Item className="menu-item" onSelect={onNewCollection}><Plus size={16} />New collection</Menu.Item>
          <Menu.Separator className="menu-divider" />
          <Menu.Item className="menu-item menu-danger" onSelect={onRemove}><Trash2 size={15} />Remove university</Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

function UniversityArt({ university }: { university: University }) {
  return (
    <div className="university-art" data-id={university.cover && !university.coverPhoto ? university.id : undefined}>
      <Landmark className="cover-landmark" aria-hidden="true" strokeWidth={0.75} />
      <CampusCoverImage university={university} />
      <UniversityLogo university={university} className="university-card-logo" />
    </div>
  );
}

export function UniversityItem(props: UniversityItemProps) {
  const { university } = props;
  return (
    <li className="university-item">
      <UniversityArt university={university} />
      <div className="university-body">
        <div className="university-info">
          <h2><button className="university-profile-trigger" onClick={props.onProfile}>{university.name}</button></h2>
          {university.location && <p><MapPin size={14} aria-hidden="true" />{university.location}</p>}
          {university.coverPhoto?.source === "wikimedia" && <PhotoAttribution photo={university.coverPhoto} compact />}
        </div>
        <UniversityMenu {...props} />
      </div>
    </li>
  );
}

export function EmptyState({ title, detail, action, onAction }: {
  title: string; detail: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <BookOpen size={24} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{detail}</p>
      {action && <button className="button button-secondary" onClick={onAction}>{action}</button>}
    </div>
  );
}
