import type { SupabaseClient } from "@supabase/supabase-js";
import { isLibrary, sampleLibrary, type Library, type LibraryChange } from "./library";

export type CloudLibrarySnapshot = { library: Library; revision: number | null };
type LibraryRow = { library: unknown; revision: number };
const table = "odyssey_libraries";
const fields = "library,revision";

function readRow(row: LibraryRow): CloudLibrarySnapshot {
  if (!isLibrary(row.library)) throw new Error("Your saved library has an unsupported format.");
  return { library: row.library, revision: row.revision };
}

export function createCloudLibrary(client: SupabaseClient, owner: string) {
  let current: CloudLibrarySnapshot = { library: sampleLibrary, revision: null };
  let queue = Promise.resolve();

  async function load() {
    const { data, error } = await client.from(table).select(fields).eq("owner_id", owner).maybeSingle();
    if (error) throw new Error("Could not load your library. Try again.");
    current = data ? readRow(data) : { library: sampleLibrary, revision: null };
    return current;
  }

  function save(change: LibraryChange, initialize = false) {
    const task = queue.then(async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { library, revision } = current;
        if (initialize && revision !== null) return current;
        const updated = change(library);
        if (!initialize && updated === library) return current;

        // Both transforms and the revision check are based on the same saved snapshot.
        const result = revision === null
          ? await client.from(table).insert({ owner_id: owner, library: updated }).select(fields).single()
          : await client.from(table).update({ library: updated, revision: revision + 1 })
            .eq("owner_id", owner).eq("revision", revision).select(fields).maybeSingle();

        if (result.data) return (current = readRow(result.data));
        if (result.error && !(revision === null && result.error.code === "23505")) {
          throw new Error("Could not save your changes. Try again.");
        }
        await load();
      }
      throw new Error("Your library changed on another device. Try saving again.");
    });

    queue = task.then(() => undefined, () => undefined);
    return task;
  }

  return { load, save };
}
