// Solo clips are downloaded ahead of time (so rounds start instantly) but encrypted, with each
// round's key released only when its clock starts. Otherwise a player could listen to every clip
// first and then answer in no time. AES-GCM via WebCrypto, which both Node and browsers have.
// Format: 12-byte IV, then ciphertext with the GCM tag appended.

const IV_BYTES = 12;

function importKey(key: string, use: KeyUsage) {
  const raw = Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [use]);
}

/** Encrypts a clip with a base64url key (as stored on the round). */
export async function encryptClip(data: ArrayBuffer, key: string): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await importKey(key, "encrypt"), data));
  const out = new Uint8Array(IV_BYTES + sealed.length);
  out.set(iv);
  out.set(sealed, IV_BYTES);
  return out;
}

export async function decryptClip(data: ArrayBuffer, key: string): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.subarray(0, IV_BYTES) }, await importKey(key, "decrypt"), bytes.subarray(IV_BYTES));
}
