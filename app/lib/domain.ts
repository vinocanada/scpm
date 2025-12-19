export type Role = "manager" | "employee";

export type User = {
  id: string;
  name: string;
  role: Role;
  createdAt: string; // ISO
};

export type JobSite = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number; // used for "too far from job site" alerts
  createdAt: string; // ISO
};

export type GeoPoint = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
};

export type BreakSegment = {
  id: string;
  startAt: string; // ISO
  endAt?: string; // ISO
  startLocation?: GeoPoint;
  endLocation?: GeoPoint;
};

export type Shift = {
  id: string;
  userId: string;
  siteId: string;
  clockInAt: string; // ISO
  clockInLocation?: GeoPoint;
  clockOutAt?: string; // ISO
  clockOutLocation?: GeoPoint;
  breaks: BreakSegment[];
};

export type PhotoComment = {
  id: string;
  userId: string;
  createdAt: string; // ISO
  text: string;
};

export type Photo = {
  id: string;
  userId: string;
  siteId: string;
  createdAt: string; // ISO
  takenAt?: string; // ISO (if known)
  dataUrl: string; // MVP: store image as data URL in local storage
  note?: string;
  tags: string[];
  comments: PhotoComment[];
};

export type AppSession = {
  userId?: string;
  activeSiteId?: string; // memorized across tabs until clock-out
  activeShiftId?: string;
};

