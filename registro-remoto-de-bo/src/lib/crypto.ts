// Simple AES-GCM helper for local encryption/decryption
// NOTE: This stores the AES key material locally for convenience.
// For production, consider protecting the key via OS keystore or user passphrase.

const KEY_STORAGE_KEY = 'bo_offline_aes_key_jwk_v1';

async function importKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function generateAndStoreKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const jwk = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(jwk));
  return key;
}

export async function getOrCreateAesKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    try {
      const jwk = JSON.parse(stored) as JsonWebKey;
      return importKeyFromJwk(jwk);
    } catch {
      // Fallback to regenerate if corrupted
      return generateAndStoreKey();
    }
  }
  return generateAndStoreKey();
}

function toBase64(bytes: ArrayBuffer): string {
  const uint8 = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export interface EncryptedPayload {
  iv: string; // base64
  data: string; // base64 ciphertext
}

export async function encryptJson(obj: unknown): Promise<EncryptedPayload> {
  const key = await getOrCreateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: toBase64(iv.buffer), data: toBase64(cipher) };
}

export async function decryptJson<T>(payload: EncryptedPayload): Promise<T> {
  const key = await getOrCreateAesKey();
  const iv = new Uint8Array(fromBase64(payload.iv));
  const cipher = fromBase64(payload.data);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  const json = new TextDecoder().decode(plain);
  return JSON.parse(json) as T;
}

export async function encryptBytes(bytes: ArrayBuffer): Promise<EncryptedPayload> {
  const key = await getOrCreateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { iv: toBase64(iv.buffer), data: toBase64(cipher) };
}

export async function decryptBytes(payload: EncryptedPayload): Promise<ArrayBuffer> {
  const key = await getOrCreateAesKey();
  const iv = new Uint8Array(fromBase64(payload.iv));
  const cipher = fromBase64(payload.data);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
}