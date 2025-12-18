import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { Link, useNavigate } from "react-router";
import { useApp } from "./AppProvider";

export function SideMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose(): void;
}) {
  const { session, clearSession, employees, jobSites, timeEntries } = useApp();
  const nav = useNavigate();
  const user = employees.find((u) => u.id === session.employeeId);
  const site = jobSites.find((s) => s.id === session.activeSiteId);
  const activeTimeEntry = timeEntries.find((t) => t.employeeId === session.employeeId && !t.clockOutTime);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 bottom-0 z-50 w-[320px] max-w-[90vw] border-l border-gray-200 bg-white shadow-2xl"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 35 }}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">Signed in</div>
                  <div className="text-lg font-semibold text-gray-900">{user?.name ?? "Unknown"}</div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {user?.role ?? "—"}
                  </div>
                </div>
                <button
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-500">Active job site (memorized)</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{site?.name ?? "None selected"}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {activeTimeEntry ? "Clocked in" : "Not clocked in"}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <Link className="block rounded-xl px-3 py-2 text-gray-900 hover:bg-gray-100" to="/app">
                  Dashboard
                </Link>
                <Link className="block rounded-xl px-3 py-2 text-gray-900 hover:bg-gray-100" to="/app/clock">
                  Clock in/out
                </Link>
                <Link className="block rounded-xl px-3 py-2 text-gray-900 hover:bg-gray-100" to="/app/photos">
                  Photos
                </Link>
                <Link className="block rounded-xl px-3 py-2 text-gray-900 hover:bg-gray-100" to="/app/reports">
                  Reports
                </Link>
                <Link className="block rounded-xl px-3 py-2 text-gray-900 hover:bg-gray-100" to="/app/tracking">
                  Tracking
                </Link>
                <Link className="block rounded-xl px-3 py-2 text-gray-900 hover:bg-gray-100" to="/app/manage">
                  Manage
                </Link>
                <Link className="block rounded-xl px-3 py-2 text-gray-900 hover:bg-gray-100" to="/app/profile">
                  Profile
                </Link>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <button
                  className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
                  onClick={() => {
                    clearSession();
                    onClose();
                    nav("/");
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

