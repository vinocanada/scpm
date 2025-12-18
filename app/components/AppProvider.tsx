import React from "react";
import type { AppSession, JobSite, Photo, Shift, User } from "../lib/domain";
import {
  ensureBootstrapData,
  getPhotos,
  getSession,
  getShifts,
  getSites,
  getUsers,
  saveSession,
} from "../lib/db";
import { isBrowser } from "../lib/storage";

type AppState = {
  ready: boolean;
  session: AppSession;
  users: User[];
  sites: JobSite[];
  shifts: Shift[];
  photos: Photo[];
  refresh(): void;
  setSession(next: AppSession): void;
};

const AppContext = React.createContext<AppState | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [session, setSessionState] = React.useState<AppSession>({});
  const [users, setUsers] = React.useState<User[]>([]);
  const [sites, setSites] = React.useState<JobSite[]>([]);
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [photos, setPhotos] = React.useState<Photo[]>([]);

  const refresh = React.useCallback(() => {
    if (!isBrowser()) return;
    ensureBootstrapData();
    setSessionState(getSession());
    setUsers(getUsers());
    setSites(getSites());
    setShifts(getShifts());
    setPhotos(getPhotos());
    setReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    if (!isBrowser()) return;
    const onStorage = (e: StorageEvent) => {
      if (!e.key?.startsWith("scpm.")) return;
      refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const setSession = React.useCallback(
    (next: AppSession) => {
      setSessionState(next);
      if (isBrowser()) saveSession(next);
    },
    [setSessionState],
  );

  return (
    <AppContext.Provider
      value={{
        ready,
        session,
        users,
        sites,
        shifts,
        photos,
        refresh,
        setSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

