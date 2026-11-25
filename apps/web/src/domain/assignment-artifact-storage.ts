export const MAX_ASSIGNMENT_ARTIFACT_BYTES = 25 * 1024 * 1024;

const DATABASE_NAME = "northstar-5-assignment-artifacts";
const STORE_NAME = "files";
const DATABASE_VERSION = 1;

interface StoredArtifact {
  id: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: string;
}

export interface StoredArtifactMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local artifact storage."));
    request.onblocked = () => reject(new Error("Local artifact storage is blocked by another open NORTHSTAR tab."));
  });
}

export async function saveAssignmentArtifactFile(file: File): Promise<StoredArtifactMetadata> {
  if (file.size > MAX_ASSIGNMENT_ARTIFACT_BYTES) throw new Error("Files must be 25 MB or smaller.");
  const id = "artifact-" + (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
  const record: StoredArtifact = {
    id, blob: file, fileName: file.name, mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size, addedAt: new Date().toISOString(),
  };
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the file locally."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Local file save was interrupted."));
    });
  } finally {
    database.close();
  }
  return { id, fileName: record.fileName, mimeType: record.mimeType, sizeBytes: record.sizeBytes };
}

export async function readAssignmentArtifactFile(id: string): Promise<StoredArtifact | null> {
  const database = await openDatabase();
  try {
    return await new Promise<StoredArtifact | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve((request.result as StoredArtifact | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read the local file."));
    });
  } finally {
    database.close();
  }
}

export async function deleteAssignmentArtifactFile(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete the local file."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Local file deletion was interrupted."));
    });
  } finally {
    database.close();
  }
}
