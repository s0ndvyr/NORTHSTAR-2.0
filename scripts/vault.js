/* NORTHSTAR device vault.
   Encrypts persistent secrets with AES-GCM and a non-extractable Web Crypto key
   stored in IndexedDB. This protects data at rest from casual inspection; it is
   not a defense against XSS or malicious same-origin JavaScript. */
(function (global) {
  'use strict';
  const DB_NAME = 'northstar-secure-vault';
  const DB_VERSION = 1;
  const STORE = 'secrets';
  let dbPromise;
  function openDb() {
    if (!global.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open secure storage.'));
    });
    return dbPromise;
  }
  async function transaction(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode), store = tx.objectStore(STORE);
      let result;
      try { result = action(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result && result.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Secure storage transaction failed.'));
    });
  }
  async function getKey() {
    let key = await transaction('readonly', store => store.get('__device_key__'));
    if (key) return key;
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await transaction('readwrite', store => store.put(key, '__device_key__'));
    return key;
  }
  async function set(name, value) {
    const key = await getKey(), iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(value));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
    await transaction('readwrite', store => store.put({ iv: Array.from(iv), cipher }, name));
    return true;
  }
  async function get(name, fallback) {
    const record = await transaction('readonly', store => store.get(name));
    if (!record) return fallback;
    try {
      const key = await getKey();
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, key, record.cipher);
      return JSON.parse(new TextDecoder().decode(plain));
    } catch { return fallback; }
  }
  async function remove(name) { await transaction('readwrite', store => store.delete(name)); }
  global.NorthstarVault = { get, set, remove };
})(typeof window !== 'undefined' ? window : globalThis);
