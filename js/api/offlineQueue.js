const DB_NAME = 'stocker-offline';
const STORE_NAME = 'requests';
const QUEUE_EVENT = 'stocker:queue-changed';

function openQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, callback) {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const result = callback(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export async function enqueue(request) {
  const item = { ...request, id: crypto.randomUUID(), createdAt: Date.now(), attempts: 0 };
  await withStore('readwrite', (store) => store.put(item));
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  return item;
}

export async function listQueue() {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result.sort((a, b) => a.createdAt - b.createdAt)); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function removeQueued(id) {
  await withStore('readwrite', (store) => store.delete(id));
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
}

export async function queueCount() {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count();
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export { QUEUE_EVENT };
