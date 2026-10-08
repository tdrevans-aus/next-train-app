/**
 * One station-board computation per ~15 s, shared by every direction of a /api/board fan-out.
 *
 * api/board.js fires one getXDogfoodNextTrain() per direction (12 at Melbourne Flinders Street,
 * 32 at København H) and each one used to redo the whole static join + classification on the
 * event loop. On a cold Vercel instance (a fraction of a local CPU) that serialised repeat work
 * was the difference between ~10 s and the 30 s cap (docs/jim-brief-vercel-cold-board.md). The
 * in-flight promise is cached so concurrent directions await a single computation; a failed
 * load is evicted immediately so it is never replayed.
 *
 * @template T
 * @param {(station: string, now: Date) => Promise<T>} loader
 * @param {{ reuseMs?: number, maxEntries?: number }} [options]
 * @returns {(station: string, now?: Date) => Promise<T>}
 */
export function createSharedStationBoard(loader, { reuseMs = 15_000, maxEntries = 64 } = {}) {
  const cache = new Map();
  return function sharedStationBoard(station, now) {
    const key = String(station ?? "").trim().toLowerCase();
    const t = now instanceof Date ? now.getTime() : Date.now();
    const hit = cache.get(key);
    if (hit && Math.abs(t - hit.at) < reuseMs) {
      return hit.promise;
    }
    const promise = loader(station, now instanceof Date ? now : new Date());
    cache.set(key, { at: t, promise });
    promise.catch(() => {
      if (cache.get(key)?.promise === promise) cache.delete(key);
    });
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
    return promise;
  };
}
