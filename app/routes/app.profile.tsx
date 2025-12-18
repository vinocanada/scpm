import { useNavigate } from "react-router";
import { useApp } from "../components/AppProvider";

export default function Profile() {
  const nav = useNavigate();
  const { session, company, employees, clearSession } = useApp();
  const me = employees.find((e) => e.id === session.employeeId);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Profile</div>
        <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs font-semibold text-gray-500">Company</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{company?.name ?? session.companyId ?? "—"}</div>
        </div>
        <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs font-semibold text-gray-500">Employee</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{me?.name ?? "—"}</div>
          <div className="mt-1 text-xs text-gray-500">{me?.role ?? "—"}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <button
          className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
          onClick={() => {
            clearSession();
            nav("/");
          }}
        >
          Logout
        </button>
      </section>
    </div>
  );
}

