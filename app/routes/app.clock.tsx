import React from "react";
import { useApp } from "../components/AppProvider";
import type { GeoPoint, Shift } from "../lib/domain";
import { getShifts, upsertShift } from "../lib/db";
import { haversineMeters } from "../lib/geo";
import { makeId } from "../lib/storage";
import { formatHours, shiftWorkSeconds } from "../lib/time";

async function getCurrentGeo(): Promise<GeoPoint | undefined> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return undefined;
  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  });
}

export default function Clock() {
  const { session, setSession, users, sites, shifts, refresh } = useApp();
  const me = users.find((u) => u.id === session.userId);

  const activeShift = shifts.find((s) => s.id === session.activeShiftId);
  const activeSite = sites.find((s) => s.id === session.activeSiteId);

  const [siteId, setSiteId] = React.useState<string>(session.activeSiteId ?? "");
  const [geoMsg, setGeoMsg] = React.useState<string | null>(null);
  const [distanceMeters, setDistanceMeters] = React.useState<number | null>(null);
  const [farAlerted, setFarAlerted] = React.useState(false);

  const onBreak = Boolean(activeShift?.breaks?.some((b) => !b.endAt));

  React.useEffect(() => {
    if (session.activeSiteId) setSiteId(session.activeSiteId);
  }, [session.activeSiteId]);

  React.useEffect(() => {
    if (!activeShift) return;
    if (!activeSite) return;
    const siteLat = activeSite.lat;
    const siteLng = activeSite.lng;
    const radiusMeters = activeSite.radiusMeters;
    const siteName = activeSite.name;
    if (siteLat == null || siteLng == null) return;
    if (radiusMeters == null) return;
    if (activeShift.clockOutAt) return;

    let alive = true;
    const tick = async () => {
      const geo = await getCurrentGeo();
      if (!alive) return;
      if (!geo) {
        setGeoMsg("Location unavailable (check permissions).");
        return;
      }
      setGeoMsg(null);
      const sitePoint = { lat: siteLat, lng: siteLng };
      const dist = haversineMeters(sitePoint, geo);
      setDistanceMeters(dist);
      if (!farAlerted && dist > radiusMeters) {
        setFarAlerted(true);
        // MVP: in a real Android build this becomes a local notification + server alert.
        alert(`Out of range: ${Math.round(dist)}m from "${siteName}" (limit ${radiusMeters}m).`);
      }
    };

    tick();
    const id = window.setInterval(tick, 30000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [activeShift, activeSite, farAlerted]);

  if (!me) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-600">No user selected.</div>
      </div>
    );
  }

  const now = new Date();
  const worked = activeShift ? shiftWorkSeconds(activeShift, now) : 0;

  const clockIn = async () => {
    if (!siteId) return;
    const geo = await getCurrentGeo();
    const shift: Shift = {
      id: makeId("shift"),
      userId: me.id,
      siteId,
      clockInAt: new Date().toISOString(),
      clockInLocation: geo,
      breaks: [],
    };
    upsertShift(shift);
    setSession({ ...session, activeSiteId: siteId, activeShiftId: shift.id });
    refresh();
  };

  const clockOut = async () => {
    if (!activeShift) return;
    const geo = await getCurrentGeo();
    const next: Shift = {
      ...activeShift,
      clockOutAt: new Date().toISOString(),
      clockOutLocation: geo,
      breaks: activeShift.breaks.map((b) => (b.endAt ? b : { ...b, endAt: new Date().toISOString() })),
    };
    upsertShift(next);
    setSession({ ...session, activeSiteId: undefined, activeShiftId: undefined });
    setDistanceMeters(null);
    setFarAlerted(false);
    refresh();
  };

  const startBreak = async () => {
    if (!activeShift) return;
    if (onBreak) return;
    const geo = await getCurrentGeo();
    const next: Shift = {
      ...activeShift,
      breaks: [
        ...activeShift.breaks,
        { id: makeId("break"), startAt: new Date().toISOString(), startLocation: geo },
      ],
    };
    upsertShift(next);
    refresh();
  };

  const endBreak = async () => {
    if (!activeShift) return;
    const open = activeShift.breaks.find((b) => !b.endAt);
    if (!open) return;
    const geo = await getCurrentGeo();
    const next: Shift = {
      ...activeShift,
      breaks: activeShift.breaks.map((b) =>
        b.id === open.id ? { ...b, endAt: new Date().toISOString(), endLocation: geo } : b,
      ),
    };
    upsertShift(next);
    refresh();
  };

  const todayShifts = getShifts().filter((s) => s.userId === me.id && s.clockInAt.slice(0, 10) === now.toISOString().slice(0, 10));
  const todaySeconds = todayShifts.reduce((acc, s) => acc + shiftWorkSeconds(s, now), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Clock</div>
            <div className="text-xs text-gray-500">Stores clock in/out time + GPS (MVP).</div>
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
            disabled={Boolean(session.activeShiftId)}
            onChange={(e) => setSiteId(e.target.value)}
          >
            <option value="">Select a job site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {!session.activeShiftId ? (
            <button
              className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              disabled={!siteId}
              onClick={clockIn}
            >
              Clock in
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                disabled={onBreak}
                onClick={startBreak}
              >
                Start break
              </button>
              <button
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                disabled={!onBreak}
                onClick={endBreak}
              >
                End break
              </button>
              <button
                className="col-span-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                onClick={clockOut}
              >
                Clock out
              </button>
            </div>
          )}

          {activeShift ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{activeSite?.name ?? "—"}</div>
                <div className="text-xs text-gray-500">{onBreak ? "On break" : "Working"}</div>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Clocked in: {new Date(activeShift.clockInAt).toLocaleString()}
              </div>
              <div className="mt-2 text-xs font-semibold text-gray-700">Worked so far: {formatHours(worked)}</div>
              <div className="mt-2 text-xs text-gray-500">
                {geoMsg ? geoMsg : distanceMeters != null && activeSite?.radiusMeters != null ? (
                  <>
                    Distance from site: <span className="font-semibold">{Math.round(distanceMeters)}m</span> · limit{" "}
                    <span className="font-semibold">{activeSite.radiusMeters}m</span>
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

