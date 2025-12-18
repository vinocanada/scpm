import React from "react";
import { useNavigate } from "react-router";
import { useApp } from "../components/AppProvider";
import { uuid } from "../lib/storage";

export default function Index() {
  const nav = useNavigate();
  const {
    ready,
    firebaseConfigured,
    session,
    setSession,
    company,
    employees,
    createCompany,
    fetchCompanyById,
    saveEmployee,
  } = useApp();

  const [mode, setMode] = React.useState<"setup" | "login">("setup");
  const [companyIdInput, setCompanyIdInput] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [ownerEmail, setOwnerEmail] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("");
  const [pin, setPin] = React.useState("");

  React.useEffect(() => {
    if (!ready) return;
    if (session.companyId) setMode("login");
    if (session.companyId && session.employeeId) nav("/app");
  }, [ready, session.companyId, session.employeeId, nav]);

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
          <div className="text-2xl font-semibold text-gray-900">Condo Super</div>
          <div className="mt-1 text-sm text-gray-600">
            Company setup + employee PIN login (Android-ready).
          </div>

          {!firebaseConfigured ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Firebase is not configured yet. Add Vite env vars (VITE_FIREBASE_*) to enable the shared company/employee/jobsite
              database like your iOS app.
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl bg-gray-50 p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "setup" ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}
                onClick={() => setMode("setup")}
              >
                Company
              </button>
              <button
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}
                onClick={() => setMode("login")}
                disabled={!session.companyId}
              >
                Login
              </button>
            </div>
          </div>

          {status ? <div className="mt-4 text-sm text-gray-700">{status}</div> : null}

          {mode === "setup" ? (
            <div className="mt-6 space-y-3">
              <div className="text-sm font-semibold text-gray-900">Join existing company</div>
              <input
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                placeholder="Company ID"
                value={companyIdInput}
                onChange={(e) => setCompanyIdInput(e.target.value.trim())}
              />
              <button
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                disabled={!firebaseConfigured || !companyIdInput}
                onClick={async () => {
                  setStatus(null);
                  const c = await fetchCompanyById(companyIdInput);
                  if (!c) {
                    setStatus("Company not found.");
                    return;
                  }
                  setSession({ ...session, companyId: c.id, employeeId: undefined, activeSiteId: undefined });
                  setMode("login");
                  setStatus(`Selected company: ${c.name}`);
                }}
              >
                Use company
              </button>

              <div className="pt-4">
                <div className="text-sm font-semibold text-gray-900">Create new company (30-day trial)</div>
                <div className="mt-3 space-y-2">
                  <input
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <input
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Owner email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>
                <button
                  className="mt-2 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                  disabled={!firebaseConfigured || !companyName.trim() || !ownerEmail.includes("@")}
                  onClick={async () => {
                    setStatus(null);
                    const c = await createCompany({ name: companyName.trim(), ownerEmail: ownerEmail.trim() });
                    if (!c) {
                      setStatus("Failed to create company.");
                      return;
                    }
                    // Auto-create admin like iOS (pin 0000)
                    await saveEmployee({
                      id: uuid(),
                      companyId: c.id,
                      name: "Admin",
                      role: "manager",
                      pin: "0000",
                    });
                    setSession({ ...session, companyId: c.id, employeeId: undefined, activeSiteId: undefined });
                    setMode("login");
                    setStatus(`Created company: ${c.name}. Admin PIN is 0000.`);
                  }}
                >
                  Create company
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="text-sm text-gray-600">
                Company: <span className="font-semibold text-gray-900">{company?.name ?? session.companyId ?? "—"}</span>
              </div>
              <label className="block text-sm font-medium text-gray-700">Employee</label>
              <select
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">Select employee…</option>
                {employees
                  .filter((e) => e.companyId === session.companyId)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
              </select>

              <input
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                placeholder="PIN"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />

              <button
                className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                disabled={!selectedEmployeeId || pin.trim().length < 4}
                onClick={() => {
                  const emp = employees.find((e) => e.id === selectedEmployeeId);
                  if (!emp) return;
                  if (emp.pin !== pin.trim()) {
                    setStatus("Invalid PIN.");
                    return;
                  }
                  setSession({ ...session, employeeId: emp.id });
                  nav("/app");
                }}
              >
                Login
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          Starter page: <a className="underline" href="/welcome">/welcome</a>
        </div>
      </div>
    </main>
  );
}

