import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./client";
import {
  normalizeAdminEntityDoc,
  normalizeEntityDoc,
  sanitizeEntryPayload,
  toFirestoreCoordinates,
} from "./normalizers";
import { resolveUploadedFiles } from "./uploads";

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
  storyType,
  neighborhood,
  graveLocation,
  sourceLabel,
  sourceUrl,
  externalLinks,
  coordinates,
  uploadedFiles = [],
}) {
  const entryRef = doc(db, "entries", entryId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    throw new Error("Entry not found.");
  }
  const uploadedFileUrls = await resolveUploadedFiles({
    folder: "entries",
    recordId: entryId,
    uploadedFiles,
  });
  const sanitized = sanitizeEntryPayload({
    name,
    summary,
    role,
    storyType,
    neighborhood,
    graveLocation,
    sourceLabel,
    sourceUrl,
    externalLinks,
    coordinates,
    uploadedFiles: uploadedFileUrls,
  });

  await updateDoc(entryRef, {
    ...sanitized,
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    updatedAt: serverTimestamp(),
  });

  console.info(`[firebase] Updated entries/${entryId}`);

  return { id: entryId, ...sanitized };
}

export async function createEntry({
  name,
  summary,
  role,
  storyType,
  neighborhood,
  graveLocation,
  sourceLabel,
  sourceUrl,
  externalLinks,
  coordinates,
  uploadedFiles = [],
}) {
  const entryCollection = collection(db, "entries");
  const entryRef = doc(entryCollection);
  const uploadedFileUrls = await resolveUploadedFiles({
    folder: "entries",
    recordId: entryRef.id,
    uploadedFiles,
  });
  const sanitized = sanitizeEntryPayload({
    name,
    summary,
    role,
    storyType,
    neighborhood,
    graveLocation,
    sourceLabel,
    sourceUrl,
    externalLinks,
    coordinates,
    uploadedFiles: uploadedFileUrls,
  });

  await setDoc(entryRef, {
    id: entryRef.id,
    ...sanitized,
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: entryRef.id, ...sanitized };
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
