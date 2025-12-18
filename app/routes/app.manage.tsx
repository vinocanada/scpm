import React from "react";
import { useApp } from "../components/AppProvider";
import type { Role } from "../lib/domain";
import { upsertSite, upsertUser } from "../lib/db";
import { makeId } from "../lib/storage";

export default function Manage() {
  const { session, users, sites, refresh } = useApp();
  const me = users.find((u) => u.id === session.userId);

  const [empName, setEmpName] = React.useState("");
  const [empRole, setEmpRole] = React.useState<Role>("employee");

  const [siteName, setSiteName] = React.useState("");
  const [siteAddress, setSiteAddress] = React.useState("");
  const [siteLat, setSiteLat] = React.useState("");
  const [siteLng, setSiteLng] = React.useState("");
  const [siteRadius, setSiteRadius] = React.useState("250");

  if (!me) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-600">No user selected.</div>
      </div>
    );
  }

  if (me.role !== "manager") {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Managers only</div>
        <div className="mt-1 text-sm text-gray-600">You don’t have access to employee/site management.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Add employee / manager</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <input
            className="col-span-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Name"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
          />
          <select
            className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            value={empRole}
            onChange={(e) => setEmpRole(e.target.value as Role)}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <button
          className="mt-2 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          disabled={!empName.trim()}
          onClick={() => {
            const now = new Date().toISOString();
            upsertUser({ id: makeId("usr"), name: empName.trim(), role: empRole, createdAt: now });
            setEmpName("");
            setEmpRole("employee");
            refresh();
          }}
        >
          Add user
        </button>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Add job site</div>
        <div className="mt-3 space-y-2">
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Site name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Address (optional)"
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="decimal"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="Latitude (optional)"
              value={siteLat}
              onChange={(e) => setSiteLat(e.target.value)}
            />
            <input
              inputMode="decimal"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="Longitude (optional)"
              value={siteLng}
              onChange={(e) => setSiteLng(e.target.value)}
            />
          </div>
          <input
            inputMode="numeric"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Radius meters (for “too far” alerts)"
            value={siteRadius}
            onChange={(e) => setSiteRadius(e.target.value)}
          />
        </div>
        <button
          className="mt-2 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          disabled={!siteName.trim()}
          onClick={() => {
            const now = new Date().toISOString();
            const lat = siteLat.trim() ? Number(siteLat) : undefined;
            const lng = siteLng.trim() ? Number(siteLng) : undefined;
            const radiusMeters = siteRadius.trim() ? Number(siteRadius) : undefined;
            upsertSite({
              id: makeId("site"),
              name: siteName.trim(),
              address: siteAddress.trim() || undefined,
              lat: Number.isFinite(lat as number) ? lat : undefined,
              lng: Number.isFinite(lng as number) ? lng : undefined,
              radiusMeters: Number.isFinite(radiusMeters as number) ? radiusMeters : undefined,
              createdAt: now,
            });
            setSiteName("");
            setSiteAddress("");
            setSiteLat("");
            setSiteLng("");
            setSiteRadius("250");
            refresh();
          }}
        >
          Add site
        </button>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Current users</div>
        <div className="mt-3 space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{u.name}</div>
                <div className="text-xs text-gray-500">{u.role}</div>
              </div>
              <div className="text-xs text-gray-500">{u.id.slice(0, 10)}…</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Current job sites</div>
        <div className="mt-3 space-y-2">
          {sites.map((s) => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">{s.name}</div>
              <div className="mt-1 text-xs text-gray-500">
                {s.address ? `${s.address} · ` : ""}
                {s.lat != null && s.lng != null ? `(${s.lat}, ${s.lng}) · ` : ""}
                {s.radiusMeters != null ? `radius ${s.radiusMeters}m` : "no radius set"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

