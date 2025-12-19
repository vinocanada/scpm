import React from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useApp } from "../components/AppProvider";
import type { Employee, JobPhoto, TimeEntry } from "../lib/models";
import { timeEntryWorkSeconds } from "../lib/time";

type ReportType = "photos" | "payroll";
type DateFilter = "today" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

function dateRange(filter: DateFilter, customStart: string, customEnd: string) {
  const now = new Date();
  const cal = (d: Date) => d.toISOString().slice(0, 10);

  if (filter === "custom") return { from: customStart, to: customEnd };
  if (filter === "today") return { from: cal(now), to: cal(now) };
  if (filter === "thisWeek") {
    const day = now.getDay();
    const diff = (day + 6) % 7; // Monday
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    return { from: cal(start), to: cal(now) };
  }
  if (filter === "thisMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: cal(start), to: cal(now) };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  return { from: cal(start), to: cal(now) };
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function generatePhotoReport(opts: {
  title: string;
  companyName: string;
  rangeLabel: string;
  photos: JobPhoto[];
  employeesById: Map<string, Employee>;
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  let { height } = page.getSize();
  let y = height - 56;

  page.drawText(opts.companyName, { x: 48, y, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) });
  y -= 22;
  page.drawText(opts.title, { x: 48, y, size: 20, font: bold, color: rgb(0.05, 0.05, 0.05) });
  y -= 18;
  page.drawText(opts.rangeLabel, { x: 48, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 24;

  const items = opts.photos.slice(0, 40);
  for (const p of items) {
    if (y < 170) {
      page = pdf.addPage([612, 792]);
      ({ height } = page.getSize());
      y = height - 56;
    }

    const author = opts.employeesById.get(p.employeeId)?.name ?? "Employee";
    page.drawText(`${new Date(p.date).toLocaleString()} — ${author}`, { x: 48, y, size: 10, font: bold });
    y -= 14;

    if (!p.isVideo && p.imageURL) {
      try {
        const bytes = await fetchBytes(p.imageURL);
        const isPng = p.imageURL.toLowerCase().includes(".png");
        const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const maxW = 180;
        const maxH = 120;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: 48, y: y - h, width: w, height: h });
      } catch {
        page.drawText("(Image omitted)", { x: 48, y: y - 10, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
      }
    } else if (p.isVideo) {
      page.drawText("(Video)", { x: 48, y: y - 10, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    }

    const tags = p.tags.length ? `Tags: ${p.tags.join(", ")}` : "";
    const comment = p.comment?.trim() ? `Comment: ${p.comment.trim()}` : "";
    const text = [tags, comment].filter(Boolean).join("\n");

    let textY = y;
    const textX = 48 + 200;
    if (text) {
      for (const line of text.split("\n").slice(0, 10)) {
        page.drawText(line, { x: textX, y: textY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        textY -= 12;
      }
    } else {
      page.drawText("(No tags/comments)", { x: textX, y: textY, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    }
    y -= 140;
  }

  return await pdf.save();
}

async function generatePayrollReport(opts: {
  title: string;
  companyName: string;
  rangeLabel: string;
  employees: Employee[];
  entries: TimeEntry[];
  now: Date;
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  let { height } = page.getSize();
  let y = height - 56;

  page.drawText(opts.companyName, { x: 48, y, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) });
  y -= 22;
  page.drawText(opts.title, { x: 48, y, size: 20, font: bold, color: rgb(0.05, 0.05, 0.05) });
  y -= 18;
  page.drawText(opts.rangeLabel, { x: 48, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 24;

  const byEmployee = new Map<string, TimeEntry[]>();
  for (const e of opts.entries) {
    byEmployee.set(e.employeeId, [...(byEmployee.get(e.employeeId) ?? []), e]);
  }

  for (const emp of opts.employees.sort((a, b) => a.name.localeCompare(b.name))) {
    const entries = (byEmployee.get(emp.id) ?? []).filter((t) => t.clockOutTime);
    const totalSeconds = entries.reduce((acc, t) => acc + timeEntryWorkSeconds(t, opts.now), 0);
    const hours = totalSeconds / 3600;

    if (y < 140) {
      page = pdf.addPage([612, 792]);
      ({ height } = page.getSize());
      y = height - 56;
    }

    page.drawText(emp.name, { x: 48, y, size: 12, font: bold });
    page.drawText(emp.role.toUpperCase(), { x: 360, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;
    page.drawText(`Work time: ${hours.toFixed(2)} hours`, { x: 60, y, size: 10, font });
    y -= 14;

    const recent = entries.sort((a, b) => b.clockInTime.localeCompare(a.clockInTime)).slice(0, 6);
    for (const t of recent) {
      const sec = timeEntryWorkSeconds(t, opts.now);
      page.drawText(`• ${t.clockInTime.slice(0, 10)} — ${(sec / 3600).toFixed(2)}h`, { x: 72, y, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
      y -= 12;
    }

    y -= 10;
  }

  return await pdf.save();
}

export default function Reports() {
  const { session, company, employees, photos, timeEntries, tags } = useApp();
  const me = employees.find((e) => e.id === session.employeeId);

  const [type, setType] = React.useState<ReportType>("photos");
  const [filter, setFilter] = React.useState<DateFilter>("thisWeek");
  const [customFrom, setCustomFrom] = React.useState(new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = React.useState(new Date().toISOString().slice(0, 10));
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

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
        <div className="mt-1 text-sm text-gray-600">Reports are available to managers.</div>
      </div>
    );
  }

  const range = dateRange(filter, customFrom, customTo);
  const rangeLabel = `${range.from} → ${range.to}`;
  const companyName = company?.name ?? "Company";
  const employeesById = new Map(employees.map((e) => [e.id, e]));

  const scopedEmployees = employees.filter((e) => e.companyId === session.companyId);
  const scopedTags = tags.filter((t) => t.companyId === session.companyId).map((t) => t.name);

  const filteredPhotos = photos
    .filter((p) => p.companyId === session.companyId)
    .filter((p) => {
      const d = p.date.slice(0, 10);
      if (d < range.from || d > range.to) return false;
      if (selectedTags.length && selectedTags.every((t) => !p.tags.includes(t))) return false;
      if (selectedEmployees.length && !selectedEmployees.includes(p.employeeId)) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredEntries = timeEntries
    .filter((t) => t.companyId === session.companyId)
    .filter((t) => {
      const d = t.clockInTime.slice(0, 10);
      if (d < range.from || d > range.to) return false;
      if (selectedEmployees.length && !selectedEmployees.includes(t.employeeId)) return false;
      return true;
    });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Reports</div>
        <div className="mt-1 text-xs text-gray-500">Generate PDF photo reports and payroll summaries.</div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${type === "photos" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}
            onClick={() => setType("photos")}
          >
            Photos
          </button>
          <button
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${type === "payroll" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}
            onClick={() => setType("payroll")}
          >
            Payroll
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <select
            className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            value={filter}
            onChange={(e) => setFilter(e.target.value as DateFilter)}
          >
            <option value="today">Today</option>
            <option value="thisWeek">This week</option>
            <option value="thisMonth">This month</option>
            <option value="thisYear">This year</option>
            <option value="custom">Custom</option>
          </select>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-semibold text-gray-700">
            {rangeLabel}
          </div>
        </div>

        {filter === "custom" ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="date"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <input
              type="date"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <select
            multiple
            className="h-28 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm"
            value={selectedEmployees}
            onChange={(e) => setSelectedEmployees(Array.from(e.target.selectedOptions).map((o) => o.value))}
          >
            {scopedEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.role})
              </option>
            ))}
          </select>
          <select
            multiple
            disabled={type !== "photos"}
            className="h-28 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm disabled:opacity-60"
            value={selectedTags}
            onChange={(e) => setSelectedTags(Array.from(e.target.selectedOptions).map((o) => o.value))}
          >
            {scopedTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {type === "photos" ? `${filteredPhotos.length} photos` : `${filteredEntries.length} time entries`}
          </div>
          <button
            className="rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const now = new Date();
                if (type === "photos") {
                  const bytes = await generatePhotoReport({
                    title: "Photo Report",
                    companyName,
                    rangeLabel,
                    photos: filteredPhotos,
                    employeesById,
                  });
                  await downloadPdf(bytes, `photo-report_${companyName.replaceAll(" ", "_")}_${range.from}_${range.to}.pdf`);
                } else {
                  const bytes = await generatePayrollReport({
                    title: "Payroll Report",
                    companyName,
                    rangeLabel,
                    employees: scopedEmployees.filter((e) => !selectedEmployees.length || selectedEmployees.includes(e.id)),
                    entries: filteredEntries,
                    now,
                  });
                  await downloadPdf(bytes, `payroll-report_${companyName.replaceAll(" ", "_")}_${range.from}_${range.to}.pdf`);
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            Generate PDF
          </button>
        </div>
      </section>
    </div>
  );
}

