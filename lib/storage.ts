"use client";

import { useSyncExternalStore } from "react";
import { sampleLibrary, type Library } from "./library";

const key = "odyssey.library.v1";
const listeners = new Set<() => void>();
let cached: Library = sampleLibrary;
let cachedRaw: string | null | undefined;

function read(): Library {
  try {
    const raw = localStorage.getItem(key);
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    if (!raw) return (cached = sampleLibrary);

    const value = JSON.parse(raw) as Partial<Library> | null;
    if (
      value?.version === 1 && Array.isArray(value.universities) && Array.isArray(value.collections) &&
      (value.view === "grid" || value.view === "list") && typeof value.sidebarCollapsed === "boolean"
    ) {
      return (cached = value as Library);
    }
    return (cached = sampleLibrary);
  } catch {
    // A blocked browser store leaves the current tab fully usable.
    return cached;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(listener);
  };
}

export function useLibrary() {
  return useSyncExternalStore(subscribe, read, () => sampleLibrary);
}

export function updateLibrary(change: (previous: Library) => Library) {
  cached = change(read());
  let saved = false;
  try {
    const raw = JSON.stringify(cached);
    localStorage.setItem(key, raw);
    cachedRaw = raw;
    saved = true;
  } catch {
    // Keep the edit in memory when browser storage is disabled or full.
  }
  listeners.forEach(listener => listener());
  return saved;
}
