export type StorageMode = 'session' | 'local';

export interface StoredApiKey {
  value: string;
  mode: StorageMode | null;
}

const API_KEY_STORAGE_KEY = 'pocket-server-api-key';

export function readStoredApiKey(): StoredApiKey {
  if (typeof window === 'undefined') {
    return { value: '', mode: null };
  }

  const localApiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
  if (localApiKey) {
    return { value: localApiKey, mode: 'local' };
  }

  const sessionApiKey = window.sessionStorage
    .getItem(API_KEY_STORAGE_KEY)
    ?.trim();
  if (sessionApiKey) {
    return { value: sessionApiKey, mode: 'session' };
  }

  return { value: '', mode: null };
}

export function persistApiKey(value: string, mode: StorageMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  const trimmedValue = value.trim();

  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);

  const storage =
    mode === 'local' ? window.localStorage : window.sessionStorage;
  storage.setItem(API_KEY_STORAGE_KEY, trimmedValue);
}
