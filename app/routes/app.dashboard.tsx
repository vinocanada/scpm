import React from "react";
import { useApp } from "../components/AppProvider";
import { formatHours, startOfDay, startOfWeek, startOfYear, timeEntryWorkSeconds } from "../lib/time";

function secondsInRange(clockInIso: string, seconds: number, rangeStart: Date) {
  const d = new Date(clockInIso);
  if (Number.isNaN(d.getTime())) return 0;
  return d >= rangeStart ? seconds : 0;
}

export default function Dashboard() {
  const { session, employees, timeEntries, jobSites } = useApp();
  const now = new Date();
  const me = employees.find((u) => u.id === session.employeeId);
  const activeSite = jobSites.find((s) => s.id === session.activeSiteId);

  if (!me) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-600">No user selected.</div>
      </div>
    );
  }

  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const yearStart = startOfYear(now);

  const visibleUsers = me.role === "manager" ? employees : [me];

  const rows = visibleUsers.map((u) => {
    const userEntries = timeEntries.filter((t) => t.employeeId === u.id);
    const totals = userEntries.reduce(
      (acc, s) => {
        const sec = timeEntryWorkSeconds(s, now);
        acc.day += secondsInRange(s.clockInTime, sec, dayStart);
        acc.week += secondsInRange(s.clockInTime, sec, weekStart);
        acc.year += secondsInRange(s.clockInTime, sec, yearStart);
        return acc;
      },
      { day: 0, week: 0, year: 0 },
    );
    return { user: u, totals };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Overview</div>
        <div className="mt-1 text-xs text-gray-500">
          Active site: <span className="font-medium text-gray-700">{activeSite?.name ?? "None"}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-500">Today</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {formatHours(rows.reduce((acc, r) => acc + r.totals.day, 0))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-500">Week</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {formatHours(rows.reduce((acc, r) => acc + r.totals.week, 0))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-500">Year</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {formatHours(rows.reduce((acc, r) => acc + r.totals.year, 0))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {me.role === "manager" ? "Team hours" : "Your hours"}
            </div>
            <div className="text-xs text-gray-500">Daily, weekly, yearly totals (MVP)</div>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Today</th>
                <th className="px-3 py-2">Week</th>
                <th className="px-3 py-2">Year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user.id} className="border-t border-gray-200">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.user.name}</div>
                    <div className="text-xs text-gray-500">{r.user.role}</div>
                  </td>
                  <td className="px-3 py-2 font-semibold">{formatHours(r.totals.day)}</td>
                  <td className="px-3 py-2 font-semibold">{formatHours(r.totals.week)}</td>
                  <td className="px-3 py-2 font-semibold">{formatHours(r.totals.year)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Payroll export will come from shifts (clock in/out minus breaks). Next step is syncing to a backend so managers can
          view everyone’s reports/photos from any device.
        </div>
      </section>
    </div>
  );
}

