import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import {
  GeoPoint,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export function onAuthUserChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function isUserAdmin(user) {
  if (!user) return false;

  const adminDocByUid = await getDoc(doc(db, "admins", user.uid));
  if (adminDocByUid.exists()) return true;

  const normalizedEmail = (user.email ?? "").trim();
  if (!normalizedEmail) return false;

  const adminsRef = collection(db, "admins");
  const emailMatches = await getDocs(
    query(adminsRef, where("email", "==", normalizedEmail), limit(1)),
  );
  if (!emailMatches.empty) return true;

  const lowerEmailMatches = await getDocs(
    query(
      adminsRef,
      where("emailLower", "==", normalizedEmail.toLowerCase()),
      limit(1),
    ),
  );
  return !lowerEmailMatches.empty;
}

function normalizeCoordinate(value) {
  if (Array.isArray(value) && value.length === 2) {
    const [lat, lng] = value;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }

  if (value && typeof value === "object") {
    const lat = value.lat ?? value.latitude;
    const lng = value.lng ?? value.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }

  return null;
}

function normalizeCoordinates(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((coordinate) => normalizeCoordinate(coordinate))
    .filter(Boolean);
}

function normalizeUploadedFiles(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((file) => {
      if (typeof file === "string") return file;
      if (file && typeof file === "object" && typeof file.name === "string") {
        return file.name;
      }
      return null;
    })
    .filter(Boolean);
}

function isBrowserFile(value) {
  return typeof File !== "undefined" && value instanceof File;
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function resolveUploadedFilesForPending(pendingId, uploadedFiles) {
  if (!Array.isArray(uploadedFiles)) return [];

  const existingUrls = [];
  const filesToUpload = [];

  uploadedFiles.forEach((file) => {
    if (typeof file === "string") {
      const url = file.trim();
      if (url) existingUrls.push(url);
      return;
    }

    if (isBrowserFile(file)) {
      filesToUpload.push(file);
    }
  });

  if (!filesToUpload.length) {
    return existingUrls;
  }

  const timestamp = Date.now();
  const uploadedUrls = await Promise.all(
    filesToUpload.map(async (file, index) => {
      const normalizedName = sanitizeFileName(file.name || `upload-${index}`);
      const objectPath = `pending/${pendingId}/${timestamp}-${index}-${normalizedName}`;
      const objectRef = storageRef(storage, objectPath);
      await uploadBytes(objectRef, file);
      return getDownloadURL(objectRef);
    }),
  );

  return [...existingUrls, ...uploadedUrls];
}

function normalizeEntityDoc(entityDoc) {
  const data = entityDoc.data();
  const coordinates = normalizeCoordinates(data.coordinates);
  if (!coordinates.length) return null;

  return {
    id: data.id ?? entityDoc.id,
    type: data.type ?? "person",
    name: data.name ?? "Unknown",
    summary: data.summary ?? "",
    dates: data.dates ?? "",
    coordinates,
    uploadedFiles: normalizeUploadedFiles(data.uploadedFiles),
  };
}

function normalizeAdminEntityDoc(entityDoc) {
  const data = entityDoc.data();
  return {
    id: data.id ?? entityDoc.id,
    type: data.type ?? "person",
    name: data.name ?? "Unknown",
    summary: data.summary ?? "",
    dates: data.dates ?? "",
    coordinates: normalizeCoordinates(data.coordinates),
    uploadedFiles: normalizeUploadedFiles(data.uploadedFiles),
  };
}

function toFirestoreCoordinates(coordinates) {
  return coordinates.map(([lat, lng]) => new GeoPoint(lat, lng));
}

function sanitizeEntityPayload(payload) {
  return {
    type: payload.type ?? "submission",
    name: payload.name ?? "Unknown",
    summary: payload.summary ?? "",
    dates: payload.dates ?? "Community submission",
    coordinates: normalizeCoordinates(payload.coordinates),
    uploadedFiles: normalizeUploadedFiles(payload.uploadedFiles),
    source: payload.source ?? "user",
  };
}

function normalizeEmail(value) {
  const email = (value ?? "").trim();
  return email;
}

function normalizeEmailLower(value) {
  return normalizeEmail(value).toLowerCase();
}

function normalizePhone(value) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[^\d+]/g, "");
}

function sanitizeContactPayload(payload) {
  const submitterEmail = normalizeEmail(payload.submitterEmail);
  const submitterPhone = normalizePhone(payload.submitterPhone);
  return {
    submitterEmail: submitterEmail || null,
    submitterEmailLower: submitterEmail ? submitterEmail.toLowerCase() : null,
    submitterPhone: submitterPhone || null,
  };
}

export async function getEntities() {
  const entriesRef = collection(db, "entries");
  const entriesSnap = await getDocs(entriesRef);
  if (!entriesSnap.empty) {
    return entriesSnap.docs.map(normalizeEntityDoc).filter(Boolean);
  }

  // Backward compatibility with older projects that still use "entities".
  const entitiesRef = collection(db, "entities");
  const entitiesSnap = await getDocs(entitiesRef);
  return entitiesSnap.docs.map(normalizeEntityDoc).filter(Boolean);
}

export async function getAllEntriesForAdmin() {
  const entriesRef = collection(db, "entries");
  const entriesSnap = await getDocs(entriesRef);
  if (!entriesSnap.empty) {
    return entriesSnap.docs.map(normalizeAdminEntityDoc);
  }

  // Backward compatibility with older projects that still use "entities".
  const entitiesRef = collection(db, "entities");
  const entitiesSnap = await getDocs(entitiesRef);
  return entitiesSnap.docs.map(normalizeAdminEntityDoc);
}

export async function addEntity({
  type = "submission",
  name,
  summary,
  dates = "Community submission",
  coordinates,
  uploadedFiles = [],
  source = "user",
}) {
  const entriesRef = collection(db, "entries");
  const entryRef = doc(entriesRef);
  const sanitized = sanitizeEntityPayload({
    type,
    name,
    summary,
    dates,
    coordinates,
    uploadedFiles,
    source,
  });

  await setDoc(entryRef, {
    id: entryRef.id,
    ...sanitized,
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: entryRef.id,
    ...sanitized,
  };
}

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
  type = "submission",
  name,
  summary,
  dates = "Community submission",
  coordinates,
  uploadedFiles = [],
  source = "user",
  submitterEmail = "",
  submitterPhone = "",
}) {
  const pendingCollection = collection(db, "pending");
  const pendingRef = doc(pendingCollection);
  const requestStatusRef = doc(db, "requestStatuses", pendingRef.id);
  const uploadedFileUrls = await resolveUploadedFilesForPending(
    pendingRef.id,
    uploadedFiles,
  );
  const sanitized = sanitizeEntityPayload({
    type,
    name,
    summary,
    dates,
    coordinates,
    uploadedFiles: uploadedFileUrls,
    source,
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
  type,
  name,
  summary,
  dates,
  coordinates,
  uploadedFiles,
  source = "user",
}) {
  const pendingDocRef = doc(db, "pending", pendingId);
  const sanitized = sanitizeEntityPayload({
    type,
    name,
    summary,
    dates,
    coordinates,
    uploadedFiles,
    source,
  });

  await updateDoc(pendingDocRef, {
    ...sanitized,
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
  const sanitized = sanitizeEntityPayload({
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

  batch.update(pendingDocRef, {
    status: "denied",
    reviewNotes,
    reviewedBy,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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
}

export async function lookupRequestStatus({
  submitterEmail = "",
  submitterPhone = "",
}) {
  const emailInput = normalizeEmailLower(submitterEmail);
  const phoneInput = normalizePhone(submitterPhone);

  if (!emailInput && !phoneInput) {
    throw new Error("Email or phone is required.");
  }

  const statusCollection = collection(db, "requestStatuses");
  const matchesById = new Map();

  if (emailInput) {
    const byEmailSnap = await getDocs(
      query(statusCollection, where("submitterEmailLower", "==", emailInput)),
    );
    byEmailSnap.docs.forEach((snapshot) => {
      const data = snapshot.data();
      matchesById.set(snapshot.id, {
        id: snapshot.id,
        status: data.status ?? "pending",
        name: data.name ?? "",
        reviewNotes: data.reviewNotes ?? "",
        updatedAt: data.updatedAt ?? null,
      });
    });
  }

  if (phoneInput) {
    const byPhoneSnap = await getDocs(
      query(statusCollection, where("submitterPhone", "==", phoneInput)),
    );
    byPhoneSnap.docs.forEach((snapshot) => {
      const data = snapshot.data();
      matchesById.set(snapshot.id, {
        id: snapshot.id,
        status: data.status ?? "pending",
        name: data.name ?? "",
        reviewNotes: data.reviewNotes ?? "",
        updatedAt: data.updatedAt ?? null,
      });
    });
  }

  const matches = [...matchesById.values()];
  if (!matches.length) {
    throw new Error("No requests found for that contact information.");
  }

  matches.sort((a, b) => {
    const aMillis =
      a.updatedAt && typeof a.updatedAt.toMillis === "function"
        ? a.updatedAt.toMillis()
        : 0;
    const bMillis =
      b.updatedAt && typeof b.updatedAt.toMillis === "function"
        ? b.updatedAt.toMillis()
        : 0;
    return bMillis - aMillis;
  });

  return matches.map((match) => ({
    id: match.id,
    status: match.status,
    name: match.name,
    reviewNotes: match.reviewNotes,
  }));
}

export async function updateEntry({
  entryId,
  type,
  name,
  summary,
  dates,
  coordinates,
  uploadedFiles,
  source = "admin",
}) {
  const entryRef = doc(db, "entries", entryId);
  const legacyEntityRef = doc(db, "entities", entryId);
  const [entrySnap, legacyEntitySnap] = await Promise.all([
    getDoc(entryRef),
    getDoc(legacyEntityRef),
  ]);
  const targetCollection = entrySnap.exists()
    ? "entries"
    : legacyEntitySnap.exists()
      ? "entities"
      : "entries";
  const targetRef = targetCollection === "entries" ? entryRef : legacyEntityRef;
  const sanitized = sanitizeEntityPayload({
    type,
    name,
    summary,
    dates,
    coordinates,
    uploadedFiles,
    source,
  });

  await updateDoc(targetRef, {
    ...sanitized,
    coordinates: toFirestoreCoordinates(sanitized.coordinates),
    updatedAt: serverTimestamp(),
  });

  console.info(`[firebase] Updated ${targetCollection}/${entryId}`);

  return { id: entryId, ...sanitized };
}

export async function deleteEntry(entryId) {
  const entryRef = doc(db, "entries", entryId);
  const legacyEntityRef = doc(db, "entities", entryId);
  const [entrySnap, legacyEntitySnap] = await Promise.all([
    getDoc(entryRef),
    getDoc(legacyEntityRef),
  ]);

  const deletes = [];
  const deletedCollections = [];
  if (entrySnap.exists()) {
    deletes.push(deleteDoc(entryRef));
    deletedCollections.push("entries");
  }
  if (legacyEntitySnap.exists()) {
    deletes.push(deleteDoc(legacyEntityRef));
    deletedCollections.push("entities");
  }

  // If neither exists, keep delete idempotent for UI flow.
  if (deletes.length) {
    await Promise.all(deletes);
    console.info(
      `[firebase] Deleted ${deletedCollections.join(", ")} document(s) for ID ${entryId}`,
    );
  } else {
    console.warn(`[firebase] No matching entry found to delete for ID ${entryId}`);
  }
}

export async function getPlaceInfoByName(placeName) {
  const placeRef = doc(db, "places", placeName);
  const placeSnap = await getDoc(placeRef);
  if (!placeSnap.exists()) return null;

  const peopleSnap = await getDocs(collection(placeRef, "people"));
  const people = peopleSnap.docs.map((p) => ({
    id: p.id,
    ...p.data(),
  }));

  return {
    id: placeSnap.id,
    ...placeSnap.data(),
    people,
  };
}
