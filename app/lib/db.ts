import type { AppSession, JobSite, Photo, Shift, User } from "./domain";
import { loadJson, makeId, removeKey, saveJson } from "./storage";

const KEYS = {
  users: "scpm.users.v1",
  sites: "scpm.sites.v1",
  shifts: "scpm.shifts.v1",
  photos: "scpm.photos.v1",
  session: "scpm.session.v1",
} as const;

export function getUsers(): User[] {
  return loadJson<User[]>(KEYS.users, []);
}

export function saveUsers(users: User[]) {
  saveJson(KEYS.users, users);
}

export function upsertUser(user: User) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx === -1) users.unshift(user);
  else users[idx] = user;
  saveUsers(users);
}

export function getSites(): JobSite[] {
  return loadJson<JobSite[]>(KEYS.sites, []);
}

export function saveSites(sites: JobSite[]) {
  saveJson(KEYS.sites, sites);
}

export function upsertSite(site: JobSite) {
  const sites = getSites();
  const idx = sites.findIndex((s) => s.id === site.id);
  if (idx === -1) sites.unshift(site);
  else sites[idx] = site;
  saveSites(sites);
}

export function getShifts(): Shift[] {
  return loadJson<Shift[]>(KEYS.shifts, []);
}

export function saveShifts(shifts: Shift[]) {
  saveJson(KEYS.shifts, shifts);
}

export function upsertShift(shift: Shift) {
  const shifts = getShifts();
  const idx = shifts.findIndex((s) => s.id === shift.id);
  if (idx === -1) shifts.unshift(shift);
  else shifts[idx] = shift;
  saveShifts(shifts);
}

export function getPhotos(): Photo[] {
  return loadJson<Photo[]>(KEYS.photos, []);
}

export function savePhotos(photos: Photo[]) {
  saveJson(KEYS.photos, photos);
}

export function upsertPhoto(photo: Photo) {
  const photos = getPhotos();
  const idx = photos.findIndex((p) => p.id === photo.id);
  if (idx === -1) photos.unshift(photo);
  else photos[idx] = photo;
  savePhotos(photos);
}

export function getSession(): AppSession {
  return loadJson<AppSession>(KEYS.session, {});
}

export function saveSession(session: AppSession) {
  saveJson(KEYS.session, session);
}

export function clearSession() {
  removeKey(KEYS.session);
}

export function ensureBootstrapData() {
  const users = getUsers();
  const sites = getSites();

  if (users.length === 0) {
    const now = new Date().toISOString();
    upsertUser({ id: makeId("usr"), name: "Admin Manager", role: "manager", createdAt: now });
    upsertUser({ id: makeId("usr"), name: "Employee 1", role: "employee", createdAt: now });
  }

  if (sites.length === 0) {
    const now = new Date().toISOString();
    upsertSite({
      id: makeId("site"),
      name: "Demo Job Site",
      address: "123 Main St",
      lat: 37.7749,
      lng: -122.4194,
      radiusMeters: 250,
      createdAt: now,
    });
  }
}

