import React from "react";
import { useNavigate } from "react-router";
import { useApp } from "../components/AppProvider";
import type { Role } from "../lib/domain";
import { upsertUser } from "../lib/db";
import { makeId } from "../lib/storage";

export default function Index() {
  const nav = useNavigate();
  const { ready, users, session, setSession, refresh } = useApp();
  const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(session.userId);

  const [newName, setNewName] = React.useState("");
  const [newRole, setNewRole] = React.useState<Role>("employee");

  React.useEffect(() => {
    if (!ready) return;
    if (session.userId) nav("/app");
  }, [ready, session.userId, nav]);

  if (!ready) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-gray-50 to-white px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold">Loading…</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-gray-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-semibold text-gray-900">Job Documentation</div>
          <div className="mt-1 text-sm text-gray-600">
            Sign in to clock time, upload job photos, and create daily reports.
          </div>

          <div className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">User</label>
            <select
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value || undefined)}
            >
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>

            <button
              className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              disabled={!selectedUserId}
              onClick={() => {
                if (!selectedUserId) return;
                setSession({ ...session, userId: selectedUserId });
                nav("/app");
              }}
            >
              Sign in
            </button>

            <div className="pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quick add user (MVP)
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <input
                  className="col-span-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <select
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <button
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                disabled={!newName.trim()}
                onClick={() => {
                  const now = new Date().toISOString();
                  upsertUser({ id: makeId("usr"), name: newName.trim(), role: newRole, createdAt: now });
                  setNewName("");
                  setNewRole("employee");
                  refresh();
                }}
              >
                Add
              </button>
            </div>

            <div className="pt-3 text-xs text-gray-500">
              Tip: This MVP stores everything locally. Next step is syncing to a backend for multi-device, payroll exports,
              and manager notifications.
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          Starter page: <a className="underline" href="/welcome">/welcome</a>
        </div>
      </div>
    </main>
  );
}

