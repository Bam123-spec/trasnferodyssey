"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { Compass } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createCloudLibrary, type CloudLibrarySnapshot } from "../lib/cloud-library";
import { sampleLibrary, type Library } from "../lib/library";
import { readBrowserLibrary } from "../lib/storage";
import { getSupabaseClient } from "../lib/supabase";
import { LibraryWorkspace } from "./odyssey";

function AccountPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="account-shell">
      <section className="account-panel" aria-labelledby="account-title">
        <div className="brand account-brand">
          <span className="brand-mark"><Compass size={22} strokeWidth={1.65} aria-hidden="true" /></span>
          <span>Odyssey</span>
        </div>
        <h1 id="account-title" className="dialog-title">{title}</h1>
        {children}
      </section>
    </main>
  );
}

function SignIn({ client }: { client: SupabaseClient }) {
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const credentials = {
      email: String(fields.get("email") ?? "").trim(),
      password: String(fields.get("password") ?? ""),
    };
    setBusy(true);
    setProblem("");
    setConfirmation("");
    try {
      if (creating) {
        const { data, error } = await client.auth.signUp(credentials);
        if (error) throw error;
        if (!data.session) {
          form.reset();
          setCreating(false);
          setConfirmation("Check your email to confirm your account, then return here to sign in.");
        }
      } else {
        const { error } = await client.auth.signInWithPassword(credentials);
        if (error) throw error;
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not connect to your account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountPanel title={creating ? "Create your account" : "Sign in"}>
      {confirmation && <p role="status" className="dialog-description">{confirmation}</p>}
      <form className="editor-form" onSubmit={submit} onInput={() => { if (problem) setProblem(""); }}>
        <label>Email<input name="email" type="email" autoComplete="email" required readOnly={busy} /></label>
        <label>Password
          <input name="password" type="password" autoComplete={creating ? "new-password" : "current-password"}
            minLength={creating ? 6 : undefined} required readOnly={busy} />
        </label>
        {problem && <p role="alert" className="form-error">{problem}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
        </button>
      </form>
      <div className="account-switch">
        <span>{creating ? "Already have an account?" : "New to Odyssey?"}</span>
        <button disabled={busy} onClick={() => { setCreating(value => !value); setProblem(""); setConfirmation(""); }}>
          {creating ? "Sign in" : "Create an account"}
        </button>
      </div>
    </AccountPanel>
  );
}

function AccountLibrary({ client, user }: { client: SupabaseClient; user: User }) {
  const repository = useMemo(() => createCloudLibrary(client, user.id), [client, user.id]);
  const [saved, setSaved] = useState<CloudLibrarySnapshot>();
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [importError, setImportError] = useState("");
  const [browserLibrary] = useState(readBrowserLibrary);

  useEffect(() => {
    let active = true;
    void repository.load().then(result => {
      if (active) setSaved(result);
    }).catch(error => {
      if (active) setLoadError(error instanceof Error ? error.message : "Could not load your library.");
    });
    return () => { active = false; };
  }, [repository, loadAttempt]);

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch {
      setSignOutError("Could not sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  }

  async function initialize(library: Library) {
    setInitializing(true);
    setImportError("");
    try {
      setSaved(await repository.save(() => library, true));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not set up your library.");
    } finally {
      setInitializing(false);
    }
  }

  if (!saved) {
    return (
      <AccountPanel title={loadError ? "Library unavailable" : "Loading your library"}>
        {loadError && (
          <>
            <p role="alert" className="form-error">{loadError}</p>
            <div className="account-actions">
              <button className="button button-primary" onClick={() => { setLoadError(""); setLoadAttempt(value => value + 1); }}>Try again</button>
              <button className="button button-secondary" disabled={signingOut} onClick={signOut}>Sign out</button>
            </div>
            {signOutError && <p role="alert" className="form-error">{signOutError}</p>}
          </>
        )}
      </AccountPanel>
    );
  }

  if (saved.revision === null && browserLibrary) {
    return (
      <AccountPanel title="Use your browser library?">
        <p className="dialog-description">Copy the universities, collections, and preferences saved in this browser to {user.email ?? "your account"}.</p>
        {importError && <p role="alert" className="form-error">{importError}</p>}
        <div className="account-actions">
          <button className="button button-primary" disabled={initializing} onClick={() => initialize(browserLibrary)}>Import browser library</button>
          <button className="button button-secondary" disabled={initializing} onClick={() => initialize(sampleLibrary)}>Use sample library</button>
        </div>
        <div className="account-switch"><button disabled={signingOut || initializing} onClick={signOut}>Sign out</button></div>
        {signOutError && <p role="alert" className="form-error">{signOutError}</p>}
      </AccountPanel>
    );
  }

  return (
    <LibraryWorkspace
      library={saved.library}
      persist={async change => { setSaved(await repository.save(change)); }}
      account={{ id: user.id, email: user.email ?? "", signOut, busy: signingOut, error: signOutError }}
    />
  );
}

export function Odyssey() {
  const [client, setClient] = useState<SupabaseClient>();
  const [session, setSession] = useState<Session | null | undefined>();
  const [setupError, setSetupError] = useState(false);

  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      setClient(supabase);
      // Keep the auth callback synchronous so it never holds the client's session lock.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
      return () => subscription.unsubscribe();
    } catch {
      setSetupError(true);
    }
  }, []);

  if (setupError) {
    return <AccountPanel title="Account unavailable"><p role="alert" className="form-error">Could not connect to Supabase.</p></AccountPanel>;
  }
  if (!client || session === undefined) return <AccountPanel title="Loading Odyssey"><span className="sr-only" role="status">Loading account</span></AccountPanel>;
  if (!session) return <SignIn client={client} />;
  return <AccountLibrary key={session.user.id} client={client} user={session.user} />;
}
