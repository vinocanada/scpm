import React from "react";
import type { Unsubscribe } from "firebase/firestore";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseServices, isFirebaseConfigured } from "../lib/firebase.client";
import type { AppSession, Company, Employee, JobPhoto, JobSite, LocationPoint, Tag, TimeEntry } from "../lib/models";
import { isBrowser, loadJson, removeKey, saveJson, uuid } from "../lib/storage";

const SESSION_KEY = "jobdocs.session.v1";

function parseMaybeTimestamp(v: unknown): string | undefined {
  // Firestore Timestamp has toDate()
  const any = v as { toDate?: () => Date };
  if (typeof any?.toDate === "function") return any.toDate().toISOString();
  if (typeof v === "string") return v;
  return undefined;
}

function normalizeId(id: unknown, fallback: string) {
  return typeof id === "string" && id.length ? id : fallback;
}

function normalizeCompany(id: string, data: Record<string, unknown>): Company {
  const createdDate = parseMaybeTimestamp(data.createdDate) ?? new Date().toISOString();
  const subscriptionEndDate = parseMaybeTimestamp(data.subscriptionEndDate) ?? new Date().toISOString();
  const subscriptionStatus = (data.subscriptionStatus as Company["subscriptionStatus"]) ?? "trial";
  return {
    id,
    name: String(data.name ?? "Company"),
    subscriptionStatus,
    subscriptionEndDate,
    createdDate,
    ownerEmail: String(data.ownerEmail ?? ""),
  };
}

function normalizeEmployee(id: string, data: Record<string, unknown>): Employee {
  const isManager = Boolean(data.isManager);
  const roleRaw = data.role;
  const role = roleRaw === "manager" || roleRaw === "employee" ? roleRaw : isManager ? "manager" : "employee";
  return {
    id,
    companyId: String(data.companyId ?? ""),
    name: String(data.name ?? "Employee"),
    role,
    pin: String(data.pin ?? ""),
  };
}

function normalizeJobSite(id: string, data: Record<string, unknown>): JobSite {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    name: String(data.name ?? "Site"),
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    radius: Number(data.radius ?? 250),
  };
}

function normalizeBreaks(data: unknown): TimeEntry["breaks"] {
  const arr = Array.isArray(data) ? data : [];
  return arr
    .map((b) => {
      const obj = (b ?? {}) as Record<string, unknown>;
      return {
        id: normalizeId(obj.id, uuid()),
        startTime: parseMaybeTimestamp(obj.startTime) ?? new Date().toISOString(),
        endTime: parseMaybeTimestamp(obj.endTime),
      };
    })
    .filter(Boolean);
}

function normalizeTimeEntry(id: string, data: Record<string, unknown>): TimeEntry {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    employeeId: String(data.employeeId ?? ""),
    siteId: String(data.siteId ?? ""),
    clockInTime: parseMaybeTimestamp(data.clockInTime) ?? new Date().toISOString(),
    clockInLat: Number(data.clockInLat ?? 0),
    clockInLon: Number(data.clockInLon ?? 0),
    clockOutTime: parseMaybeTimestamp(data.clockOutTime),
    clockOutLat: data.clockOutLat == null ? undefined : Number(data.clockOutLat),
    clockOutLon: data.clockOutLon == null ? undefined : Number(data.clockOutLon),
    breaks: normalizeBreaks(data.breaks),
  };
}

function normalizeLocationPoint(id: string, data: Record<string, unknown>): LocationPoint {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    employeeId: String(data.employeeId ?? ""),
    timeEntryId: String(data.timeEntryId ?? ""),
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    timestamp: parseMaybeTimestamp(data.timestamp) ?? new Date().toISOString(),
    accuracy: Number(data.accuracy ?? 0),
  };
}

function normalizeJobPhoto(id: string, data: Record<string, unknown>): JobPhoto {
  return {
    id,
    companyId: String(data.companyId ?? ""),
    sessionId: String(data.sessionId ?? uuid()),
    siteId: String(data.siteId ?? ""),
    employeeId: String(data.employeeId ?? ""),
    imageURL: data.imageURL ? String(data.imageURL) : undefined,
    videoURL: data.videoURL ? String(data.videoURL) : undefined,
    isVideo: Boolean(data.isVideo),
    comment: String(data.comment ?? ""),
    tags: Array.isArray(data.tags) ? (data.tags as unknown[]).map((t) => String(t)) : [],
    date: parseMaybeTimestamp(data.date) ?? new Date().toISOString(),
    latitude: data.latitude == null ? undefined : Number(data.latitude),
    longitude: data.longitude == null ? undefined : Number(data.longitude),
  };
}

function normalizeTags(docs: Array<{ id: string; data: Record<string, unknown> }>): Tag[] {
  return docs.map(({ id, data }) => ({
    id,
    companyId: String(data.companyId ?? ""),
    name: String(data.name ?? id),
  }));
}

type AppState = {
  ready: boolean;
  firebaseConfigured: boolean;
  session: AppSession;
  company?: Company;
  employees: Employee[];
  jobSites: JobSite[];
  timeEntries: TimeEntry[];
  photos: JobPhoto[];
  tags: Tag[];
  locationPoints: LocationPoint[];
  refresh(): void;
  setSession(next: AppSession): void;
  clearSession(): void;

  // Core CRUD used by screens (mirrors the iOS FirebaseManager surface)
  createCompany(args: { name: string; ownerEmail: string }): Promise<Company | null>;
  fetchCompanyById(id: string): Promise<Company | null>;
  saveEmployee(employee: Employee): Promise<void>;
  deleteEmployee(employeeId: string): Promise<void>;
  saveJobSite(site: JobSite): Promise<void>;
  deleteJobSite(siteId: string): Promise<void>;
  saveTimeEntry(entry: TimeEntry): Promise<void>;
  saveLocationPoint(point: LocationPoint): Promise<void>;
  savePhoto(photo: JobPhoto): Promise<void>;
  uploadImage(args: { bytes: Uint8Array; photoId: string }): Promise<string | null>;
  uploadVideo(args: { bytes: Uint8Array; photoId: string }): Promise<string | null>;
  saveTag(tagName: string): Promise<void>;
  deleteTag(tagId: string): Promise<void>;
};

const AppContext = React.createContext<AppState | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [session, setSessionState] = React.useState<AppSession>(() => loadJson<AppSession>(SESSION_KEY, {}));
  const [company, setCompany] = React.useState<Company | undefined>(undefined);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [jobSites, setJobSites] = React.useState<JobSite[]>([]);
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([]);
  const [photos, setPhotos] = React.useState<JobPhoto[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [locationPoints, setLocationPoints] = React.useState<LocationPoint[]>([]);

  const firebaseConfigured = isFirebaseConfigured();

  const refresh = React.useCallback(() => {
    // Firebase is event-driven; refresh just re-reads session from storage.
    if (!isBrowser()) return;
    setSessionState(loadJson<AppSession>(SESSION_KEY, {}));
    setReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const setSession = React.useCallback(
    (next: AppSession) => {
      setSessionState(next);
      if (isBrowser()) saveJson(SESSION_KEY, next);
    },
    [setSessionState],
  );

  const clearSession = React.useCallback(() => {
    setSessionState({});
    setCompany(undefined);
    setEmployees([]);
    setJobSites([]);
    setTimeEntries([]);
    setPhotos([]);
    setTags([]);
    setLocationPoints([]);
    if (isBrowser()) removeKey(SESSION_KEY);
  }, []);

  // Firestore listeners (company-scoped, like the iOS app)
  React.useEffect(() => {
    if (!firebaseConfigured) {
      setReady(true);
      return;
    }
    if (!session.companyId) {
      setCompany(undefined);
      setEmployees([]);
      setJobSites([]);
      setTimeEntries([]);
      setPhotos([]);
      setTags([]);
      setLocationPoints([]);
      setReady(true);
      return;
    }

    const services = getFirebaseServices();
    if (!services) {
      setReady(true);
      return;
    }
    const db = services.db;

    let unsub: Unsubscribe[] = [];
    let alive = true;

    const loadCompany = async () => {
      const snap = await getDoc(doc(db, "companies", session.companyId!));
      if (!alive) return;
      if (!snap.exists()) {
        setCompany(undefined);
        return;
      }
      setCompany(normalizeCompany(snap.id, snap.data() as Record<string, unknown>));
    };

    void loadCompany().finally(() => setReady(true));

    unsub.push(
      onSnapshot(
        query(collection(db, "employees"), where("companyId", "==", session.companyId)),
        (snap) => {
          const list = snap.docs.map((d) => normalizeEmployee(d.id, d.data() as Record<string, unknown>));
          setEmployees(list);
        },
      ),
    );
    unsub.push(
      onSnapshot(
        query(collection(db, "jobSites"), where("companyId", "==", session.companyId)),
        (snap) => {
          const list = snap.docs.map((d) => normalizeJobSite(d.id, d.data() as Record<string, unknown>));
          setJobSites(list);
        },
      ),
    );
    unsub.push(
      onSnapshot(
        query(collection(db, "timeEntries"), where("companyId", "==", session.companyId)),
        (snap) => {
          const list = snap.docs.map((d) => normalizeTimeEntry(d.id, d.data() as Record<string, unknown>));
          setTimeEntries(list);
        },
      ),
    );
    unsub.push(
      onSnapshot(
        query(collection(db, "photos"), where("companyId", "==", session.companyId)),
        (snap) => {
          const list = snap.docs.map((d) => normalizeJobPhoto(d.id, d.data() as Record<string, unknown>));
          setPhotos(list);
        },
      ),
    );
    unsub.push(
      onSnapshot(
        query(collection(db, "tags"), where("companyId", "==", session.companyId)),
        (snap) => {
          const list = normalizeTags(snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> })));
          setTags(list);
        },
      ),
    );
    unsub.push(
      onSnapshot(
        query(collection(db, "locationPoints"), where("companyId", "==", session.companyId)),
        (snap) => {
          const list = snap.docs.map((d) => normalizeLocationPoint(d.id, d.data() as Record<string, unknown>));
          setLocationPoints(list);
        },
      ),
    );

    return () => {
      alive = false;
      for (const u of unsub) u();
      unsub = [];
    };
  }, [firebaseConfigured, session.companyId]);

  const createCompany = React.useCallback(
    async ({ name, ownerEmail }: { name: string; ownerEmail: string }) => {
      const services = getFirebaseServices();
      if (!services) return null;
      const db = getFirestore(services.app);
      const id = uuid();
      const now = new Date();
      const subscriptionEnd = new Date(now);
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

      const company: Company = {
        id,
        name,
        ownerEmail,
        subscriptionStatus: "trial",
        createdDate: now.toISOString(),
        subscriptionEndDate: subscriptionEnd.toISOString(),
      };
      await setDoc(doc(db, "companies", id), company, { merge: true });
      return company;
    },
    [],
  );

  const fetchCompanyById = React.useCallback(async (id: string) => {
    const services = getFirebaseServices();
    if (!services) return null;
    const db = getFirestore(services.app);
    const snap = await getDoc(doc(db, "companies", id));
    if (!snap.exists()) return null;
    return normalizeCompany(snap.id, snap.data() as Record<string, unknown>);
  }, []);

  const saveEmployee = React.useCallback(async (employee: Employee) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    // Write both `role` and `isManager` for compatibility with the iOS schema.
    await setDoc(
      doc(db, "employees", employee.id),
      { ...employee, isManager: employee.role === "manager" },
      { merge: true },
    );
  }, []);

  const deleteEmployee = React.useCallback(async (employeeId: string) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    await deleteDoc(doc(db, "employees", employeeId));
  }, []);

  const saveJobSite = React.useCallback(async (site: JobSite) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    await setDoc(doc(db, "jobSites", site.id), site, { merge: true });
  }, []);

  const deleteJobSite = React.useCallback(async (siteId: string) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    await deleteDoc(doc(db, "jobSites", siteId));
  }, []);

  const saveTimeEntry = React.useCallback(async (entry: TimeEntry) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    await setDoc(doc(db, "timeEntries", entry.id), entry, { merge: true });
  }, []);

  const saveLocationPoint = React.useCallback(async (point: LocationPoint) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    await setDoc(doc(db, "locationPoints", point.id), point, { merge: true });
  }, []);

  const savePhoto = React.useCallback(async (photo: JobPhoto) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    await setDoc(doc(db, "photos", photo.id), photo, { merge: true });
  }, []);

  const uploadImage = React.useCallback(async ({ bytes, photoId }: { bytes: Uint8Array; photoId: string }) => {
    const services = getFirebaseServices();
    if (!services) return null;
    const storage = getStorage(services.app);
    const r = ref(storage, `photos/${photoId}.jpg`);
    await uploadBytes(r, bytes, { contentType: "image/jpeg" });
    return await getDownloadURL(r);
  }, []);

  const uploadVideo = React.useCallback(async ({ bytes, photoId }: { bytes: Uint8Array; photoId: string }) => {
    const services = getFirebaseServices();
    if (!services) return null;
    const storage = getStorage(services.app);
    const r = ref(storage, `videos/${photoId}.mp4`);
    await uploadBytes(r, bytes, { contentType: "video/mp4" });
    return await getDownloadURL(r);
  }, []);

  const saveTag = React.useCallback(
    async (tagName: string) => {
      const services = getFirebaseServices();
      if (!services) return;
      const db = getFirestore(services.app);
      const companyId = session.companyId;
      if (!companyId) return;
      const clean = tagName.trim();
      if (!clean) return;
      const id = `${companyId}_${clean}`;
      await setDoc(doc(db, "tags", id), { companyId, name: clean }, { merge: true });
    },
    [session.companyId],
  );

  const deleteTag = React.useCallback(async (tagId: string) => {
    const services = getFirebaseServices();
    if (!services) return;
    const db = getFirestore(services.app);
    await deleteDoc(doc(db, "tags", tagId));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ready,
        firebaseConfigured,
        session,
        company,
        employees,
        jobSites,
        timeEntries,
        photos,
        tags,
        locationPoints,
        refresh,
        setSession,
        clearSession,
        createCompany,
        fetchCompanyById,
        saveEmployee,
        deleteEmployee,
        saveJobSite,
        deleteJobSite,
        saveTimeEntry,
        saveLocationPoint,
        savePhoto,
        uploadImage,
        uploadVideo,
        saveTag,
        deleteTag,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

