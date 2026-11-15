import { EncryptedPayload, encryptJson, decryptJson, encryptBytes, decryptBytes } from './crypto';

export type PendingStatus = 'pending' | 'failed';

export interface OfflineBoItem {
  localId: string;
  collected_at: string; // ISO datetime of local collection
  payload: EncryptedPayload; // encrypted JSON of BO body (without localId/collected_at stored redundantly)
  audio?: EncryptedPayload | null; // optional encrypted audio raw data
  status: PendingStatus;
  error?: string;
  retries?: number;
  createdAt: number;
}

// Raw BO body structure expected by backend sync endpoint (minus localId/collected_at here)
export interface BoSyncBody {
  date_and_time_of_event: string;
  place_of_the_fact: string;
  type_of_occurrence: string;
  full_name: string;
  cpf_or_rg?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  marital_status?: string;
  profession?: string;
  full_address?: string;
  phone_or_cell_phone?: string;
  email?: string;
  relationship_with_the_fact: string;
  transcription?: string;
}

const DB_NAME = 'bo-offline-db';
const DB_VERSION = 1;
const STORE_PENDING = 'pendingBos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: 'localId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode: IDBTransactionMode, cb: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, mode);
    const store = tx.objectStore(STORE_PENDING);
    cb(store);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function savePendingBo(localId: string, collectedAtIso: string, body: BoSyncBody, audioBlob?: Blob | null): Promise<void> {
  const payload = await encryptJson(body);
  let audio: EncryptedPayload | null = null;
  if (audioBlob) {
    const bytes = await audioBlob.arrayBuffer();
    audio = await encryptBytes(bytes);
  }
  const item: OfflineBoItem = {
    localId,
    collected_at: collectedAtIso,
    payload,
    audio,
    status: 'pending',
    retries: 0,
    createdAt: Date.now(),
  };
  await withStore('readwrite', (store) => {
    store.put(item);
  });
}

export async function listPendingBos(): Promise<OfflineBoItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readonly');
    const store = tx.objectStore(STORE_PENDING);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as OfflineBoItem[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingBo(localId: string): Promise<void> {
  await withStore('readwrite', (store) => {
    store.delete(localId);
  });
}

export async function markFailed(localId: string, error: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const item = getReq.result as OfflineBoItem | undefined;
      if (!item) {
        resolve();
        return;
      }
      item.status = 'failed';
      item.error = error;
      item.retries = (item.retries || 0) + 1;
      store.put(item);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDecryptedBody(item: OfflineBoItem): Promise<BoSyncBody> {
  return decryptJson<BoSyncBody>(item.payload);
}

export async function getDecryptedAudio(item: OfflineBoItem): Promise<Blob | null> {
  if (!item.audio) return null;
  const bytes = await decryptBytes(item.audio);
  return new Blob([bytes]);
}

export interface SyncPayloadItem extends BoSyncBody {
  localId: string;
  collected_at?: string;
}

export async function buildSyncPayload(items: OfflineBoItem[]): Promise<SyncPayloadItem[]> {
  const result: SyncPayloadItem[] = [];
  for (const it of items) {
    const body = await loadDecryptedBody(it);
    // Preserva strings vazias ("") para que o backend possa limpar campos opcionais
    const sanitized: Partial<BoSyncBody> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined || v === null) continue;
      (sanitized as Record<string, unknown>)[k] = v;
    }
    result.push({
      ...(sanitized as BoSyncBody),
      localId: it.localId,
      collected_at: it.collected_at,
    });
  }
  return result;
}