export interface PreferenceStorageAdapter {
  load(): string | null;
  save(value: string): void;
  clear(): void;
}

// Storage is resolved only when methods run after mount. Every operation keeps
// an in-memory copy so denied localStorage never interrupts adaptation.
export function createPreferenceStorage(
  persistence: 'memory' | 'local' = 'memory',
  key = 'ally:pref:v1',
  getStorage: () => Storage | null = () => {
    try { return typeof window === 'undefined' ? null : window.localStorage; }
    catch { return null; }
  },
): PreferenceStorageAdapter {
  let memory: string | null = null;
  let localUnavailable = false;
  const local = () => persistence === 'local' && !localUnavailable ? getStorage() : null;
  return {
    load() {
      try { return local()?.getItem(key) ?? memory; }
      catch { localUnavailable = true; return memory; }
    },
    save(value) {
      memory = value;
      try { local()?.setItem(key, value); }
      catch { localUnavailable = true; }
    },
    clear() {
      memory = null;
      try { local()?.removeItem(key); }
      catch { localUnavailable = true; }
    },
  };
}
