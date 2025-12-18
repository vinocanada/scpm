import React from "react";
import { useOutletContext } from "react-router";
import type { Photo } from "../lib/domain";
import type { PhotosOutletContext } from "./app.photos";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PhotosGallery() {
  const { activeSiteId, filtered } = useOutletContext<PhotosOutletContext>();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const start = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const photos = filtered;
  const openPhoto: Photo | undefined = openId ? photos.find((p) => p.id === openId) : undefined;

  React.useEffect(() => {
    setOpenId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeSiteId, photos.length]);

  if (!activeSiteId) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-600">Clock in first to start uploading to a job site.</div>
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">No photos yet</div>
        <div className="mt-1 text-sm text-gray-600">Upload photos to see them here in a grid.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Gallery</div>
        <div className="mt-1 text-xs text-gray-500">Tap any photo to open and zoom.</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
              onClick={() => setOpenId(p.id)}
            >
              <img src={p.dataUrl} alt="Job progress thumbnail" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {openPhoto ? (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => {
              setOpenId(null);
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          />
          <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div className="text-sm font-semibold text-gray-900">Photo</div>
                <button
                  className="rounded-2xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={() => {
                    setOpenId(null);
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  Close
                </button>
              </div>

              <div
                className="relative aspect-[4/3] overflow-hidden bg-black"
                onMouseDown={(e) => {
                  setDragging(true);
                  start.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
                }}
                onMouseMove={(e) => {
                  if (!dragging || !start.current) return;
                  const dx = e.clientX - start.current.x;
                  const dy = e.clientY - start.current.y;
                  setPan({ x: start.current.px + dx, y: start.current.py + dy });
                }}
                onMouseUp={() => {
                  setDragging(false);
                  start.current = null;
                }}
                onMouseLeave={() => {
                  setDragging(false);
                  start.current = null;
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  const next = clamp(zoom + (e.deltaY > 0 ? -0.1 : 0.1), 1, 4);
                  setZoom(next);
                }}
              >
                <img
                  src={openPhoto.dataUrl}
                  alt="Job progress"
                  className="absolute inset-0 h-full w-full select-none object-contain"
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                  draggable={false}
                />
              </div>

              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="text-xs text-gray-500">{new Date(openPhoto.createdAt).toLocaleString()}</div>
                <div className="flex gap-2">
                  <button
                    className="rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    onClick={() => setZoom((z) => clamp(z - 0.25, 1, 4))}
                  >
                    −
                  </button>
                  <button
                    className="rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                  >
                    Reset
                  </button>
                  <button
                    className="rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                    onClick={() => setZoom((z) => clamp(z + 0.25, 1, 4))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

