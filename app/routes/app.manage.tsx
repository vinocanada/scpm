import React from "react";
import { useApp } from "../components/AppProvider";
import type { Role } from "../lib/models";
import { uuid } from "../lib/storage";

export default function Manage() {
  const { session, employees, jobSites, tags, saveEmployee, deleteEmployee, saveJobSite, deleteJobSite, saveTag, deleteTag } = useApp();
  const me = employees.find((u) => u.id === session.employeeId);

  const [empName, setEmpName] = React.useState("");
  const [empRole, setEmpRole] = React.useState<Role>("employee");
  const [empPin, setEmpPin] = React.useState("0000");

  const [siteName, setSiteName] = React.useState("");
  const [siteLat, setSiteLat] = React.useState("");
  const [siteLng, setSiteLng] = React.useState("");
  const [siteRadius, setSiteRadius] = React.useState("250");
  const [tagName, setTagName] = React.useState("");

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
        <input
          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="PIN (4 digits)"
          inputMode="numeric"
          value={empPin}
          onChange={(e) => setEmpPin(e.target.value)}
        />
        <button
          className="mt-2 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          disabled={!session.companyId || !empName.trim() || empPin.trim().length < 4}
          onClick={() => {
            if (!session.companyId) return;
            void saveEmployee({
              id: uuid(),
              companyId: session.companyId,
              name: empName.trim(),
              role: empRole,
              pin: empPin.trim(),
            });
            setEmpName("");
            setEmpRole("employee");
            setEmpPin("0000");
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
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="decimal"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="Latitude"
              value={siteLat}
              onChange={(e) => setSiteLat(e.target.value)}
            />
            <input
              inputMode="decimal"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="Longitude"
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
          disabled={!session.companyId || !siteName.trim() || !siteLat.trim() || !siteLng.trim()}
          onClick={() => {
            if (!session.companyId) return;
            const latitude = Number(siteLat);
            const longitude = Number(siteLng);
            const radius = Number(siteRadius || "250");
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            void saveJobSite({
              id: uuid(),
              companyId: session.companyId,
              name: siteName.trim(),
              latitude,
              longitude,
              radius: Number.isFinite(radius) ? radius : 250,
            });
            setSiteName("");
            setSiteLat("");
            setSiteLng("");
            setSiteRadius("250");
          }}
        >
          Add site
        </button>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Employees</div>
        <div className="mt-3 space-y-2">
          {employees
            .filter((e) => e.companyId === session.companyId)
            .map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">{u.name}</div>
                <div className="text-xs text-gray-500">{u.role} · PIN {u.pin}</div>
              </div>
              <button
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => void deleteEmployee(u.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Job sites</div>
        <div className="mt-3 space-y-2">
          {jobSites
            .filter((s) => s.companyId === session.companyId)
            .map((s) => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    ({s.latitude}, {s.longitude}) · radius {s.radius}m
                  </div>
                </div>
                <button
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                  onClick={() => void deleteJobSite(s.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Photo tags</div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Add tag name"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
          <button
            className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            disabled={!tagName.trim()}
            onClick={() => {
              void saveTag(tagName.trim());
              setTagName("");
            }}
          >
            Add
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {tags
            .filter((t) => t.companyId === session.companyId)
            .map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                <button
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                  onClick={() => void deleteTag(t.id)}
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

