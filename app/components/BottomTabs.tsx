import { NavLink } from "react-router";
import type { Role } from "../lib/domain";

function TabIcon({ name }: { name: "dashboard" | "clock" | "photos" | "manage" }) {
  const cls = "h-5 w-5";
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 13h8V3H3v10zM13 21h8v-6h-8v6zM13 3h8v10h-8V3zM3 21h8v-6H3v6z" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v5l3 3" />
          <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
        </svg>
      );
    case "photos":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h3l2-2h6l2 2h3v14H4V7Z" />
          <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        </svg>
      );
    case "manage":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1v2" />
          <path d="M12 21v2" />
          <path d="M4.22 4.22l1.42 1.42" />
          <path d="M18.36 18.36l1.42 1.42" />
          <path d="M1 12h2" />
          <path d="M21 12h2" />
          <path d="M4.22 19.78l1.42-1.42" />
          <path d="M18.36 5.64l1.42-1.42" />
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
      );
  }
}

export function BottomTabs({ role }: { role?: Role }) {
  const base =
    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition";
  const active = "text-white bg-gray-900/90 shadow-sm shadow-black/20";
  const inactive = "text-gray-600 hover:text-gray-900 hover:bg-gray-100";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-md px-3 py-2">
        <div className="grid grid-cols-4 gap-2">
          <NavLink
            to="/app"
            end
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            <TabIcon name="dashboard" />
            <span className="text-xs font-medium">Dashboard</span>
          </NavLink>
          <NavLink
            to="/app/clock"
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            <TabIcon name="clock" />
            <span className="text-xs font-medium">Clock</span>
          </NavLink>
          <NavLink
            to="/app/photos"
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            <TabIcon name="photos" />
            <span className="text-xs font-medium">Photos</span>
          </NavLink>
          <NavLink
            to="/app/manage"
            className={({ isActive }) => `${base} ${isActive ? active : inactive} ${role === "manager" ? "" : "opacity-50 pointer-events-none"}`}
          >
            <TabIcon name="manage" />
            <span className="text-xs font-medium">Manage</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

