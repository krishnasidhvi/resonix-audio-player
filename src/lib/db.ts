// Minimal promise wrapper around IndexedDB. Stores:
//   kv        – app state (library index, playlists, favourites, settings)
//   files     – local File / FileSystemFileHandle objects, keyed by localKey
//   analysis  – per-track Analysis results
//   plays     – listening events for Stats
//   offline   – audio saved for offline listening (Blob), keyed by track id
//   lyrics    – lyrics the user edited or synced, keyed by track id
const DB_NAME = 'resonix';
const STORES = ['kv', 'files', 'analysis', 'plays', 'offline', 'lyrics'] as const;
type Store = (typeof STORES)[number];

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2); // v2 adds offline + lyrics; onupgradeneeded creates any missing store
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, s === 'plays' ? { autoIncrement: true } : undefined);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function store(name: Store, mode: IDBTransactionMode) {
  return (await open()).transaction(name, mode).objectStore(name);
}

export const db = {
  async get<T>(s: Store, key: IDBValidKey): Promise<T | undefined> {
    return wrap((await store(s, 'readonly')).get(key)) as Promise<T | undefined>;
  },
  async set(s: Store, key: IDBValidKey | undefined, value: unknown): Promise<void> {
    const os = await store(s, 'readwrite');
    await wrap(key === undefined ? os.add(value) : os.put(value, key));
  },
  async del(s: Store, key: IDBValidKey): Promise<void> {
    await wrap((await store(s, 'readwrite')).delete(key));
  },
  async all<T>(s: Store): Promise<T[]> {
    return wrap((await store(s, 'readonly')).getAll()) as Promise<T[]>;
  },
  async clear(s: Store): Promise<void> {
    await wrap((await store(s, 'readwrite')).clear());
  },
};
