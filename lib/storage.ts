import { isLibrary, type Library } from "./library";

export function readBrowserLibrary(): Library | null {
  try {
    const raw = localStorage.getItem("odyssey.library.v1");
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isLibrary(value) ? value : null;
  } catch {
    return null;
  }
}
