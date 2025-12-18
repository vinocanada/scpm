import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { useOutletContext } from "react-router";
import { useApp } from "../components/AppProvider";
import type { Photo } from "../lib/domain";
import { upsertPhoto } from "../lib/db";
import { makeId } from "../lib/storage";
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
  const { session, refresh } = useApp();
  const { activeSiteId, usersById, filtered } = useOutletContext<PhotosOutletContext>();
  const [idx, setIdx] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [tagText, setTagText] = React.useState("");
  const [commentText, setCommentText] = React.useState("");

  const photos = filtered;
  const current = photos[idx];

  React.useEffect(() => {
    setIdx(0);
    setNote("");
    setTagText("");
    setCommentText("");
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

  const save = (p: Photo) => {
    upsertPhoto(p);
    refresh();
  };

  const onSwipe = (dir: "left" | "right") => {
    if (!photos.length) return;
    const next = dir === "left" ? idx + 1 : idx - 1;
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    setIdx(clamped);
    setNote("");
    setTagText("");
    setCommentText("");
  };

  const userName = (userId: string) => usersById.get(userId)?.name ?? "User";

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
              <img src={current.dataUrl} alt="Job progress" className="h-full w-full object-cover" />
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
          {new Date(current.createdAt).toLocaleString()} · Uploaded by{" "}
          <span className="font-semibold text-gray-700">{userName(current.userId)}</span>
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
                onRemove={() => save({ ...current, tags: current.tags.filter((x) => x !== t) })}
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
              save({ ...current, tags: [...current.tags, t] });
              setTagText("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Note</div>
        <textarea
          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          rows={3}
          placeholder="Add a note about this photo…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          disabled={!note.trim()}
          onClick={() => {
            save({ ...current, note: note.trim() });
            setNote("");
          }}
        >
          Save note
        </button>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Comments</div>
        <div className="mt-3 space-y-2">
          {current.comments.length ? (
            current.comments.map((c) => (
              <div key={c.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-700">
                  {userName(c.userId)} · <span className="font-medium text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-sm text-gray-900">{c.text}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-600">No comments yet.</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Add a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button
            className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            disabled={!commentText.trim()}
            onClick={() => {
              const text = commentText.trim();
              if (!text) return;
              save({
                ...current,
                comments: [
                  ...current.comments,
                  { id: makeId("cmt"), userId: session.userId!, createdAt: new Date().toISOString(), text },
                ],
              });
              setCommentText("");
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

