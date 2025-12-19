import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { useOutletContext } from "react-router";
import { useApp } from "../components/AppProvider";
import type { JobPhoto } from "../lib/models";
import type { PhotosOutletContext } from "./app.photos";

function Chip({ text, onRemove }: { text: string; onRemove?(): void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
      {text}
      {onRemove ? (
        <button
          className="rounded-full px-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          onClick={onRemove}
          aria-label={`Remove ${text}`}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

export default function PhotosFeed() {
  const { savePhoto, session } = useApp();
  const { activeSiteId, employeesById, filtered } = useOutletContext<PhotosOutletContext>();
  const [idx, setIdx] = React.useState(0);
  const [tagText, setTagText] = React.useState("");
  const [comment, setComment] = React.useState("");

  const photos = filtered;
  const current = photos[idx];

  React.useEffect(() => {
    setIdx(0);
    setTagText("");
    setComment("");
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
        <div className="mt-1 text-sm text-gray-600">Tap “Upload” above to add progress photos for today.</div>
      </div>
    );
  }

  const save = async (p: JobPhoto) => {
    await savePhoto(p);
  };

  const onSwipe = (dir: "left" | "right") => {
    if (!photos.length) return;
    const next = dir === "left" ? idx + 1 : idx - 1;
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    setIdx(clamped);
    setTagText("");
    setComment("");
  };

  const userName = (employeeId: string) => employeesById.get(employeeId)?.name ?? "User";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Feed</div>
          <div className="text-xs text-gray-500">
            {idx + 1} / {photos.length}
          </div>
        </div>

        <div className="mt-3 relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          <AnimatePresence initial={false}>
            <motion.div
              key={current.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.98, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -6 }}
              transition={{ duration: 0.2 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) onSwipe("left");
                if (info.offset.x > 80) onSwipe("right");
              }}
            >
              {!current.isVideo && current.imageURL ? (
                <img src={current.imageURL} alt="Job progress" className="h-full w-full object-cover" />
              ) : current.isVideo && current.videoURL ? (
                <video src={current.videoURL} className="h-full w-full object-cover" controls />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">Missing media</div>
              )}
              <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2">
                <button
                  className="rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-gray-900 shadow hover:bg-white"
                  onClick={() => onSwipe("right")}
                  disabled={idx === 0}
                >
                  Prev
                </button>
                <button
                  className="rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-gray-900 shadow hover:bg-white"
                  onClick={() => onSwipe("left")}
                  disabled={idx === photos.length - 1}
                >
                  Next
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          {new Date(current.date).toLocaleString()} · Uploaded by{" "}
          <span className="font-semibold text-gray-700">{userName(current.employeeId)}</span>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Tags</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {current.tags.length ? (
            current.tags.map((t) => (
              <Chip
                key={t}
                text={t}
                onRemove={() => void save({ ...current, tags: current.tags.filter((x) => x !== t) })}
              />
            ))
          ) : (
            <div className="text-sm text-gray-600">No tags yet.</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Add tag (e.g. drywall, plumbing)…"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
          />
          <button
            className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            disabled={!tagText.trim()}
            onClick={() => {
              const t = tagText.trim();
              if (!t) return;
              if (current.tags.includes(t)) return;
              void save({ ...current, tags: [...current.tags, t] });
              setTagText("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Comment</div>
        <textarea
          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          rows={3}
          placeholder="Add a comment about this photo/video…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          disabled={!comment.trim()}
          onClick={() => void save({ ...current, comment: comment.trim() })}
        >
          Save comment
        </button>
      </div>
    </div>
  );
}

