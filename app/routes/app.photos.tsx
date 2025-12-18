import React from "react";
import { Outlet, NavLink, useLocation, useSearchParams } from "react-router";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useApp } from "../components/AppProvider";
import type { Photo, User } from "../lib/domain";
import { upsertPhoto } from "../lib/db";
import { makeId } from "../lib/storage";

export type PhotosOutletContext = {
  activeSiteId: string;
  usersById: Map<string, User>;
  allTags: string[];
  filtered: Photo[];
};

function uniqueTags(photos: Photo[]) {
  const set = new Set<string>();
  for (const p of photos) for (const t of p.tags) if (t.trim()) set.add(t.trim());
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function withinMonth(iso: string, month: string) {
  // month = YYYY-MM
  if (!month) return true;
  return iso.slice(0, 7) === month;
}

function withinRange(iso: string, from?: string, to?: string) {
  const d = iso.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

async function toDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function downloadDailyPdf(opts: { siteName: string; date: string; photos: Photo[]; usersById: Map<string, User> }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]); // US letter
  let { height } = page.getSize();
  let y = height - 60;

  page.drawText(`Daily Report`, { x: 48, y, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;
  page.drawText(`${opts.siteName} — ${opts.date}`, { x: 48, y, size: 12, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 28;

  const items = opts.photos.slice(0, 25); // MVP safety limit
  for (const p of items) {
    if (y < 170) {
      page = pdf.addPage([612, 792]);
      ({ height } = page.getSize());
      y = height - 60;
    }
    const author = opts.usersById.get(p.userId)?.name ?? "Unknown";
    page.drawText(`${new Date(p.createdAt).toLocaleString()} — ${author}`, { x: 48, y, size: 10, font: bold });
    y -= 14;

    // Photo thumbnail (best effort)
    try {
      const bytes = dataUrlToBytes(p.dataUrl);
      const isPng = p.dataUrl.startsWith("data:image/png");
      const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const maxW = 160;
      const maxH = 110;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: 48, y: y - h, width: w, height: h });
    } catch {
      page.drawText("(Photo omitted)", { x: 48, y: y - 10, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    }

    const note = (p.note ?? "").trim();
    const tags = p.tags.length ? `Tags: ${p.tags.join(", ")}` : "";
    const comments = p.comments.map((c) => `• ${(opts.usersById.get(c.userId)?.name ?? "User")}: ${c.text}`).join("\n");
    const block = [note, tags, comments].filter(Boolean).join("\n");
    let textY = y;
    const textX = 48 + 170;
    if (block) {
      const lines = block.split("\n").slice(0, 8);
      for (const line of lines) {
        page.drawText(line, { x: textX, y: textY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        textY -= 12;
      }
    } else {
      page.drawText("(No notes/comments)", { x: textX, y: textY, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    }
    y -= 130;
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-report_${opts.siteName.replaceAll(" ", "_")}_${opts.date}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function PhotosLayout() {
  const { session, users, sites, photos, refresh } = useApp();
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const activeSiteId = session.activeSiteId;
  const activeSite = sites.find((s) => s.id === activeSiteId);

  const usersById = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const q = (params.get("q") ?? "").trim().toLowerCase();
  const tag = (params.get("tag") ?? "").trim();
  const month = (params.get("month") ?? "").trim(); // YYYY-MM
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const sitePhotos = photos.filter((p) => (activeSiteId ? p.siteId === activeSiteId : true));
  const allTags = React.useMemo(() => uniqueTags(sitePhotos), [sitePhotos]);

  const filtered = sitePhotos.filter((p) => {
    if (month && !withinMonth(p.createdAt, month)) return false;
    if ((from || to) && !withinRange(p.createdAt, from || undefined, to || undefined)) return false;
    if (tag && !p.tags.includes(tag)) return false;
    if (q) {
      const txt = `${p.note ?? ""} ${p.tags.join(" ")} ${p.comments.map((c) => c.text).join(" ")}`.toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const onPickPhoto = async (file?: File | null) => {
    if (!file) return;
    if (!activeSiteId) return;
    const dataUrl = await toDataUrl(file);
    upsertPhoto({
      id: makeId("photo"),
      userId: session.userId!,
      siteId: activeSiteId,
      createdAt: new Date().toISOString(),
      dataUrl,
      tags: [],
      comments: [],
    });
    refresh();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Photos</div>
            <div className="text-xs text-gray-500">
              Feed + Gallery. Filter by date/month/tags. Add comments per photo.
            </div>
          </div>
          <button
            className="rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            disabled={!activeSiteId}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        {!activeSiteId ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Clock in and select a job site first. The selected site is memorized across tabs until you clock out.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="text-xs text-gray-500">
              Active site: <span className="font-semibold text-gray-900">{activeSite?.name ?? "—"}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                className="col-span-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                placeholder="Search notes/tags/comments…"
                value={params.get("q") ?? ""}
                onChange={(e) => setParam("q", e.target.value)}
              />

              <input
                type="month"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                value={params.get("month") ?? ""}
                onChange={(e) => setParam("month", e.target.value)}
              />
              <select
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                value={params.get("tag") ?? ""}
                onChange={(e) => setParam("tag", e.target.value)}
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                value={params.get("from") ?? ""}
                onChange={(e) => setParam("from", e.target.value)}
              />
              <input
                type="date"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                value={params.get("to") ?? ""}
                onChange={(e) => setParam("to", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-900">{filtered.length}</span> photos
              </div>
              <button
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.delete("q");
                  next.delete("tag");
                  next.delete("month");
                  next.delete("from");
                  next.delete("to");
                  setParams(next, { replace: true });
                }}
              >
                Clear filters
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">PDF report includes notes/tags/comments (MVP).</div>
              <button
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                disabled={!activeSiteId}
                onClick={() => {
                  const daily = photos.filter((p) => p.siteId === activeSiteId && p.createdAt.slice(0, 10) === today);
                  void downloadDailyPdf({
                    siteName: activeSite?.name ?? "Site",
                    date: today,
                    photos: daily,
                    usersById,
                  });
                }}
              >
                Export today PDF
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2 p-2">
          <NavLink
            to={`/app/photos${loc.search}`}
            end
            className={({ isActive }) =>
              `rounded-2xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`
            }
          >
            Feed
          </NavLink>
          <NavLink
            to={`/app/photos/gallery${loc.search}`}
            className={({ isActive }) =>
              `rounded-2xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`
            }
          >
            Gallery
          </NavLink>
        </div>
      </section>

      <Outlet
        context={{
          activeSiteId: activeSiteId ?? "",
          usersById,
          allTags,
          filtered,
        } satisfies PhotosOutletContext}
      />
    </div>
  );
}

