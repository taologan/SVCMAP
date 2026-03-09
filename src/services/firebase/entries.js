import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./client";
import {
  normalizeAdminEntityDoc,
  normalizeEntityDoc,
  sanitizeEntryPayload,
  toFirestoreCoordinates,
} from "./normalizers";

export async function getEntities() {
  const entriesSnap = await getDocs(collection(db, "entries"));
  return entriesSnap.docs.map(normalizeEntityDoc).filter(Boolean);
}

export async function getAllEntriesForAdmin() {
  const entriesSnap = await getDocs(collection(db, "entries"));
  return entriesSnap.docs.map(normalizeAdminEntityDoc);
}

export async function updateEntry({
  entryId,
  name,
  summary,
  role,
  coordinates,
  uploadedFiles,
}) {
  const entryRef = doc(db, "entries", entryId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    throw new Error("Entry not found.");
  }
  const sanitized = sanitizeEntryPayload({
    name,
    summary,
    role,
    coordinates,
    uploadedFiles,
  });

  await updateDoc(entryRef, {
    ...sanitized,
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    updatedAt: serverTimestamp(),
  });

  console.info(`[firebase] Updated entries/${entryId}`);

  return { id: entryId, ...sanitized };
}

export async function deleteEntry(entryId) {
  const entryRef = doc(db, "entries", entryId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    console.warn(`[firebase] No matching entry found to delete for ID ${entryId}`);
    return;
  }
  await deleteDoc(entryRef);
  console.info(`[firebase] Deleted entries document for ID ${entryId}`);
}
