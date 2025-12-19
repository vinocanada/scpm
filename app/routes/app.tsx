import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { BottomTabs } from "../components/BottomTabs";
import { SideMenu } from "../components/SideMenu";
import { useApp } from "../components/AppProvider";

export default function AppLayout() {
  const { ready, session, employees, jobSites, timeEntries } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => setMenuOpen(false), [loc.pathname]);

  const user = employees.find((u) => u.id === session.employeeId);
  const site = jobSites.find((s) => s.id === session.activeSiteId);
  const activeTimeEntry = timeEntries.find((t) => t.employeeId === session.employeeId && !t.clockOutTime);

  React.useEffect(() => {
    if (!ready) return;
    if (!session.companyId || !session.employeeId) nav("/");
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

  if (!session.companyId || !session.employeeId) return null;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 via-white to-white">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/65">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">
              {site ? site.name : "Select a job site"}
            </div>
            <div className="truncate text-xs text-gray-500">
              {user?.name ?? "—"} · {activeTimeEntry ? "Clocked in" : "Not clocked in"}
            </div>
          </div>
          <button
            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="mx-auto max-w-md px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <BottomTabs role={user?.role} />
    </div>
  );
}

