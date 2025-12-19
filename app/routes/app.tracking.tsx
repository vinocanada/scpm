import React from "react";
import { useApp } from "../components/AppProvider";
import { haversineMeters } from "../lib/geo";

export default function Tracking() {
  const { session, employees, jobSites, timeEntries, locationPoints } = useApp();
  const me = employees.find((e) => e.id === session.employeeId);

  if (!me) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-600">Not logged in.</div>
      </div>
    );
  }

  if (me.role !== "manager") {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Managers only</div>
        <div className="mt-1 text-sm text-gray-600">Tracking is available to managers.</div>
      </div>
    );
  }

  const activeEntries = timeEntries
    .filter((t) => t.companyId === session.companyId && !t.clockOutTime)
    .sort((a, b) => b.clockInTime.localeCompare(a.clockInTime));

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Tracking</div>
        <div className="mt-1 text-xs text-gray-500">
          Shows active employees and their last recorded GPS point (saved every 10 minutes while clocked in).
        </div>
      </section>

      {activeEntries.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">No active employees right now.</div>
        </div>
      ) : (
        activeEntries.map((entry) => {
          const emp = employees.find((e) => e.id === entry.employeeId);
          const site = jobSites.find((s) => s.id === entry.siteId);
          const points = locationPoints
            .filter((p) => p.timeEntryId === entry.id)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          const last = points[0];

          let distance: number | null = null;
          if (last && site) {
            distance = haversineMeters(
              { lat: site.latitude, lng: site.longitude },
              { lat: last.latitude, lng: last.longitude },
            );
          }

          return (
            <div key={entry.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">{emp?.name ?? "Employee"}</div>
                  <div className="truncate text-xs text-gray-500">{site?.name ?? "Site"} · Clocked in {new Date(entry.clockInTime).toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                  {points.length} pts
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold text-gray-500">Last location</div>
                  <div className="mt-1 text-xs text-gray-700">
                    {last ? `${last.latitude.toFixed(5)}, ${last.longitude.toFixed(5)}` : "No points yet"}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{last ? new Date(last.timestamp).toLocaleString() : ""}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-xs font-semibold text-gray-500">Distance to site</div>
                  <div className="mt-1 text-xs font-semibold text-gray-900">
                    {distance == null ? "—" : `${Math.round(distance)}m`}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{site ? `Radius ${site.radius}m` : ""}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

