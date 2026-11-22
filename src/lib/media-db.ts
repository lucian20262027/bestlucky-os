import { upload } from '@vercel/blob/client';

const DB_NAME = 'loopos_media_v1';
const STORE_NAME = 'blobs';

interface StoredMediaRecord {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: string;
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open media store'));
  });
}

export async function saveLocalMedia(file: File): Promise<{
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  cloudUrl?: string;
}> {
  let cloudUrl: string | undefined;
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blob = await upload(`loopos/${Date.now()}-${safeName}`, file, {
      access: 'public',
      handleUploadUrl: '/api/sync/upload',
    });
    cloudUrl = blob.url;
  } catch {
    // Vercel Blob not configured or offline — keep local IndexedDB seamlessly
  }

  const db = await openMediaDb();
  const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record: StoredMediaRecord = {
    id,
    name: file.name,
    mimeType: file.type || 'video/mp4',
    sizeBytes: file.size,
    blob: file,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => {
      db.close();
      resolve({
        id,
        name: record.name,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        cloudUrl,
      });
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save media'));
    };
  });
}

export async function getLocalMediaBlob(id: string): Promise<Blob | null> {
  if (!id || typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }
  const db = await openMediaDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const rec = req.result as StoredMediaRecord | undefined;
      db.close();
      resolve(rec?.blob ?? null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

export async function deleteLocalMedia(id: string): Promise<void> {
  if (!id || typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }
  const db = await openMediaDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      resolve();
    };
  });
}
