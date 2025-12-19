export function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeKey(key: string) {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
}

export function makeId(prefix = "id") {
  const g = globalThis as unknown as { crypto?: Crypto };
  const uuid = g.crypto?.randomUUID?.();
  return uuid ? `${prefix}_${uuid}` : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function uuid() {
  const g = globalThis as unknown as { crypto?: Crypto };
  return g.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

