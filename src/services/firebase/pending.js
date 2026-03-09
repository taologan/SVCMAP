import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./client";
import {
  normalizeEntityDoc,
  sanitizeContactPayload,
  sanitizeEntryPayload,
  sanitizePendingPayload,
  toFirestoreCoordinates,
} from "./normalizers";
import { resolveUploadedFiles } from "./uploads";

export async function getPending() {
  const pendingRef = collection(db, "pending");
  const pendingSnap = await getDocs(pendingRef);

  return pendingSnap.docs
    .filter((snapshot) => {
      const status = snapshot.data().status;
      return !status || status === "pending";
    })
    .map(normalizeEntityDoc)
    .filter(Boolean);
}

export async function addPending({
  name,
  summary,
  role = "",
  coordinates,
  uploadedFiles = [],
  submitterEmail = "",
  submitterPhone = "",
}) {
  const pendingCollection = collection(db, "pending");
  const pendingRef = doc(pendingCollection);
  const requestStatusRef = doc(db, "requestStatuses", pendingRef.id);
  const uploadedFileUrls = await resolveUploadedFiles({
    folder: "pending",
    recordId: pendingRef.id,
    uploadedFiles,
  });
  const sanitized = sanitizePendingPayload({
    name,
    summary,
    role,
    coordinates,
    uploadedFiles: uploadedFileUrls,
  });
  const contact = sanitizeContactPayload({ submitterEmail, submitterPhone });
  const batch = writeBatch(db);

  batch.set(pendingRef, {
    id: pendingRef.id,
    ...sanitized,
    ...contact,
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(requestStatusRef, {
    id: pendingRef.id,
    status: "pending",
    name: sanitized.name,
    ...contact,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return {
    id: pendingRef.id,
    ...sanitized,
    ...contact,
    status: "pending",
  };
}

export async function updatePending({
  pendingId,
  name,
  summary,
  role,
  coordinates,
  uploadedFiles,
}) {
  const pendingDocRef = doc(db, "pending", pendingId);
  const sanitized = sanitizePendingPayload({
    name,
    summary,
    role,
    coordinates,
    uploadedFiles,
  });

  await updateDoc(pendingDocRef, {
    ...sanitized,
    type: deleteField(),
    source: deleteField(),
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    updatedAt: serverTimestamp(),
  });

  return { id: pendingId, ...sanitized };
}

export async function approvePending({
  pendingId,
  reviewedBy = null,
  updates = {},
}) {
  const pendingRef = doc(db, "pending", pendingId);
  const pendingSnap = await getDoc(pendingRef);
  if (!pendingSnap.exists()) {
    throw new Error("Pending entry not found.");
  }

  const pendingData = pendingSnap.data();
  const requestStatusRef = doc(db, "requestStatuses", pendingId);
  const sanitized = sanitizeEntryPayload({
    ...pendingData,
    ...updates,
  });

  if (!sanitized.coordinates.length) {
    throw new Error("Cannot approve an entry without coordinates.");
  }

  const entryRef = doc(db, "entries", pendingId);
  const batch = writeBatch(db);
  batch.set(entryRef, {
    id: pendingId,
    ...sanitized,
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    approvedAt: serverTimestamp(),
    approvedBy: reviewedBy,
    updatedAt: serverTimestamp(),
    createdAt: pendingData.createdAt ?? serverTimestamp(),
  });
  batch.set(
    requestStatusRef,
    {
      id: pendingId,
      status: "approved",
      name: sanitized.name,
      submitterEmail: pendingData.submitterEmail ?? null,
      submitterEmailLower: pendingData.submitterEmailLower ?? null,
      submitterPhone: pendingData.submitterPhone ?? null,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.delete(pendingRef);
  await batch.commit();

  return { id: pendingId, ...sanitized };
}

export async function denyPending({
  pendingId,
  reviewedBy = null,
  reviewNotes = "",
}) {
  const pendingDocRef = doc(db, "pending", pendingId);
  const requestStatusRef = doc(db, "requestStatuses", pendingId);
  const pendingSnap = await getDoc(pendingDocRef);
  const pendingData = pendingSnap.exists() ? pendingSnap.data() : {};
  const batch = writeBatch(db);

  if (pendingSnap.exists()) {
    batch.delete(pendingDocRef);
  }
  batch.set(
    requestStatusRef,
    {
      id: pendingId,
      status: "denied",
      name: pendingData.name ?? null,
      submitterEmail: pendingData.submitterEmail ?? null,
      submitterEmailLower: pendingData.submitterEmailLower ?? null,
      submitterPhone: pendingData.submitterPhone ?? null,
      reviewNotes,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  if (!pendingSnap.exists()) {
    console.warn(
      `[firebase] denyPending: pending/${pendingId} was already processed or removed`,
    );
  }

  return {
    alreadyProcessed: !pendingSnap.exists(),
  };
}
