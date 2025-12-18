import React from "react";
import { Geolocation } from "@capacitor/geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useApp } from "../components/AppProvider";
import { haversineMeters } from "../lib/geo";
import type { BreakEntry, LocationPoint, TimeEntry } from "../lib/models";
import { uuid } from "../lib/storage";
import { formatHours, timeEntryWorkSeconds } from "../lib/time";

type Geo = { lat: number; lng: number; accuracy?: number };

async function getCurrentGeo(): Promise<Geo | null> {
  // Prefer Capacitor on-device, fall back to browser geolocation.
  try {
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 });
    return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
  } catch {
    // ignore
  }
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;
  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  });
}

export default function Clock() {
  const { session, setSession, employees, jobSites, timeEntries, saveTimeEntry, saveLocationPoint } = useApp();
  const me = employees.find((e) => e.id === session.employeeId);
  const activeEntry = timeEntries.find((t) => t.employeeId === session.employeeId && !t.clockOutTime);
  const activeSite = activeEntry
    ? jobSites.find((s) => s.id === activeEntry.siteId)
    : jobSites.find((s) => s.id === session.activeSiteId);

  const [siteId, setSiteId] = React.useState(session.activeSiteId ?? "");
  const [geoMsg, setGeoMsg] = React.useState<string | null>(null);
  const [distanceMeters, setDistanceMeters] = React.useState<number | null>(null);
  const [farAlerted, setFarAlerted] = React.useState(false);

  const activeBreak = activeEntry?.breaks?.find((b) => !b.endTime);
  const onBreak = Boolean(activeBreak);

  React.useEffect(() => {
    if (session.activeSiteId) setSiteId(session.activeSiteId);
  }, [session.activeSiteId]);

  // Distance monitoring every 30s while clocked in
  React.useEffect(() => {
    if (!activeEntry || !activeSite) return;
    if (!activeSite.latitude || !activeSite.longitude || !activeSite.radius) return;

    const siteLat = activeSite.latitude;
    const siteLng = activeSite.longitude;
    const radius = activeSite.radius;
    const siteName = activeSite.name;

    let alive = true;
    const tick = async () => {
      const geo = await getCurrentGeo();
      if (!alive) return;
      if (!geo) {
        setGeoMsg("Location unavailable (check permissions).");
        return;
      }
      setGeoMsg(null);
      const dist = haversineMeters({ lat: siteLat, lng: siteLng }, { lat: geo.lat, lng: geo.lng });
      setDistanceMeters(dist);
      if (!farAlerted && dist > radius) {
        setFarAlerted(true);
        // On Android this will show a local notification; on web it will still work in most browsers.
        try {
          const perm = await LocalNotifications.requestPermissions();
          if (perm.display === "granted") {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now() % 2147483647,
                  title: "Distance Alert",
                  body: `Out of range: ${Math.round(dist)}m from "${siteName}" (limit ${radius}m).`,
                },
              ],
            });
          } else {
            alert(`Out of range: ${Math.round(dist)}m from "${siteName}" (limit ${radius}m).`);
          }
        } catch {
          alert(`Out of range: ${Math.round(dist)}m from "${siteName}" (limit ${radius}m).`);
        }
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 30000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [activeEntry, activeSite, farAlerted]);

  // Location point tracking every 10 minutes while clocked in (like iOS)
  React.useEffect(() => {
    if (!activeEntry || !me || !session.companyId) return;

    let alive = true;
    const savePoint = async () => {
      const geo = await getCurrentGeo();
      if (!alive) return;
      if (!geo) return;
      const point: LocationPoint = {
        id: uuid(),
        companyId: session.companyId!,
        employeeId: me.id,
        timeEntryId: activeEntry.id,
        latitude: geo.lat,
        longitude: geo.lng,
        timestamp: new Date().toISOString(),
        accuracy: geo.accuracy ?? 0,
      };
      await saveLocationPoint(point);
    };

    void savePoint();
    const id = window.setInterval(() => void savePoint(), 600000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [activeEntry?.id, me?.id, session.companyId, saveLocationPoint]);

  if (!me) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-600">Not logged in.</div>
      </div>
    );
  }

  const now = new Date();
  const worked = activeEntry ? timeEntryWorkSeconds(activeEntry, now) : 0;

  const clockIn = async () => {
    if (!siteId || !session.companyId) return;
    const geo = await getCurrentGeo();
    if (!geo) {
      setGeoMsg("Location unavailable (check permissions).");
      return;
    }
    const entry: TimeEntry = {
      id: uuid(),
      companyId: session.companyId,
      employeeId: me.id,
      siteId,
      clockInTime: new Date().toISOString(),
      clockInLat: geo.lat,
      clockInLon: geo.lng,
      breaks: [],
    };
    await saveTimeEntry(entry);
    setSession({ ...session, activeSiteId: siteId });
    setFarAlerted(false);
  };

  const clockOut = async () => {
    if (!activeEntry) return;
    const geo = await getCurrentGeo();
    const end = new Date().toISOString();
    const breaks: BreakEntry[] = (activeEntry.breaks ?? []).map((b) => (b.endTime ? b : { ...b, endTime: end }));
    const next: TimeEntry = {
      ...activeEntry,
      clockOutTime: end,
      clockOutLat: geo?.lat,
      clockOutLon: geo?.lng,
      breaks,
    };
    await saveTimeEntry(next);
    setSession({ ...session, activeSiteId: undefined });
    setDistanceMeters(null);
    setFarAlerted(false);
  };

  const startBreak = async () => {
    if (!activeEntry || onBreak) return;
    const next: TimeEntry = {
      ...activeEntry,
      breaks: [...(activeEntry.breaks ?? []), { id: uuid(), startTime: new Date().toISOString() }],
    };
    await saveTimeEntry(next);
  };

  const endBreak = async () => {
    if (!activeEntry || !activeBreak) return;
    const end = new Date().toISOString();
    const next: TimeEntry = {
      ...activeEntry,
      breaks: (activeEntry.breaks ?? []).map((b) => (b.id === activeBreak.id ? { ...b, endTime: end } : b)),
    };
    await saveTimeEntry(next);
  };

  const today = now.toISOString().slice(0, 10);
  const todayEntries = timeEntries.filter((t) => t.employeeId === me.id && t.clockInTime.slice(0, 10) === today);
  const todaySeconds = todayEntries.reduce((acc, t) => acc + timeEntryWorkSeconds(t, now), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Time Clock</div>
            <div className="text-xs text-gray-500">Clock in/out, breaks, GPS + geofence alert.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
            Today: {formatHours(todaySeconds)}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Job site</label>
          <select
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-60"
            value={siteId}
            disabled={Boolean(activeEntry)}
            onChange={(e) => setSiteId(e.target.value)}
          >
            <option value="">Select a job site…</option>
            {jobSites
              .filter((s) => s.companyId === session.companyId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {!activeEntry ? (
            <button
              className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              disabled={!siteId}
              onClick={() => void clockIn()}
            >
              Clock in
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                disabled={onBreak}
                onClick={() => void startBreak()}
              >
                Start break
              </button>
              <button
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                disabled={!onBreak}
                onClick={() => void endBreak()}
              >
                End break
              </button>
              <button
                className="col-span-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => void clockOut()}
              >
                Clock out
              </button>
            </div>
          )}

          {activeEntry ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{activeSite?.name ?? "—"}</div>
                <div className="text-xs text-gray-500">{onBreak ? "On break" : "Working"}</div>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Clocked in: {new Date(activeEntry.clockInTime).toLocaleString()}
              </div>
              <div className="mt-2 text-xs font-semibold text-gray-700">Worked so far: {formatHours(worked)}</div>
              <div className="mt-2 text-xs text-gray-500">
                {geoMsg ? (
                  geoMsg
                ) : distanceMeters != null && activeSite ? (
                  <>
                    Distance from site: <span className="font-semibold">{Math.round(distanceMeters)}m</span> · limit{" "}
                    <span className="font-semibold">{activeSite.radius}m</span>
                  </>
                ) : (
                  "Set site latitude/longitude + radius in Manage to enable “too far” alerts."
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

