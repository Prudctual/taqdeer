/** كاش ذاكرة قصير العمر عبر الطلبات — يخفض قراءة SQLite دون تجميد الأرقام لدقائق. */

type Entry = { expires: number; value: unknown };

const store = new Map<string, Entry>();

export const PAGE_REVALIDATE_SECONDS = 20;
export const QUERY_TTL_MS = 12_000;
export const HEAVY_TTL_MS = 15_000;

export function withTtl<T>(key: string, ttlMs: number, compute: () => T): T {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) {
    return hit.value as T;
  }
  const value = compute();
  store.set(key, { expires: now + ttlMs, value });
  return value;
}
