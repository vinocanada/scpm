export type Role = "manager" | "employee";

export type Company = {
  id: string; // UUID string
  name: string;
  subscriptionStatus: "trial" | "active" | "expired";
  subscriptionEndDate: string; // ISO
  createdDate: string; // ISO
  ownerEmail: string;
};

export type Employee = {
  id: string; // UUID string
  companyId: string; // UUID string
  name: string;
  role: Role;
  pin: string; // 4 digits
};

export type JobSite = {
  id: string; // UUID string
  companyId: string; // UUID string
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
};

export type BreakEntry = {
  id: string;
  startTime: string; // ISO
  endTime?: string; // ISO
};

export type TimeEntry = {
  id: string;
  companyId: string;
  employeeId: string;
  siteId: string;
  clockInTime: string; // ISO
  clockInLat: number;
  clockInLon: number;
  clockOutTime?: string; // ISO
  clockOutLat?: number;
  clockOutLon?: number;
  breaks: BreakEntry[];
};

export type LocationPoint = {
  id: string;
  companyId: string;
  employeeId: string;
  timeEntryId: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO
  accuracy: number; // meters
};

export type JobPhoto = {
  id: string;
  companyId: string;
  sessionId: string;
  siteId: string;
  employeeId: string;
  imageURL?: string;
  videoURL?: string;
  isVideo: boolean;
  comment: string;
  tags: string[];
  date: string; // ISO
  latitude?: number;
  longitude?: number;
};

export type Tag = {
  id: string; // `${companyId}_${name}`
  companyId: string;
  name: string;
};

export type AppSession = {
  companyId?: string;
  employeeId?: string;
  activeSiteId?: string; // memorized across tabs until clock-out
};

