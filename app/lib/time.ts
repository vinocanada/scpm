import type { BreakSegment, Shift } from "./domain";
import type { BreakEntry, TimeEntry } from "./models";

export function parseIso(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function breakSeconds(b: BreakSegment, now = new Date()) {
  const s = parseIso(b.startAt);
  if (!s) return 0;
  const e = parseIso(b.endAt) ?? now;
  return Math.max(0, (e.getTime() - s.getTime()) / 1000);
}

export function shiftWorkSeconds(shift: Shift, now = new Date()) {
  const start = parseIso(shift.clockInAt);
  if (!start) return 0;
  const end = parseIso(shift.clockOutAt) ?? now;
  const total = Math.max(0, (end.getTime() - start.getTime()) / 1000);
  const breaks = shift.breaks.reduce((acc, b) => acc + breakSeconds(b, now), 0);
  return Math.max(0, total - breaks);
}

export function formatHours(seconds: number) {
  const hours = seconds / 3600;
  return `${hours.toFixed(2)}h`;
}

export function timeEntryWorkSeconds(entry: TimeEntry, now = new Date()) {
  const start = parseIso(entry.clockInTime);
  if (!start) return 0;
  const end = parseIso(entry.clockOutTime) ?? now;
  const total = Math.max(0, (end.getTime() - start.getTime()) / 1000);

  const breakSeconds = (b: BreakEntry) => {
    const s = parseIso(b.startTime);
    if (!s) return 0;
    const e = parseIso(b.endTime) ?? now;
    return Math.max(0, (e.getTime() - s.getTime()) / 1000);
  };

  const breaks = (entry.breaks ?? []).reduce((acc, b) => acc + breakSeconds(b), 0);
  return Math.max(0, total - breaks);
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeek(d: Date) {
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // Monday as start
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

