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
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

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
      if (file && typeof file === "object" && typeof file.name === "string")
        return file.name;
      return null;
    })
    .filter(Boolean);
}

export async function getEntities() {
  const entitiesRef = collection(db, "entities");
  const entitiesSnap = await getDocs(entitiesRef);

  return entitiesSnap.docs
    .map((entityDoc) => {
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
    })
    .filter(Boolean);
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
  const entitiesRef = collection(db, "entities");
  const entityRef = doc(entitiesRef);

  const firestoreCoordinates = coordinates.map(
    ([lat, lng]) => new GeoPoint(lat, lng),
  );

  await setDoc(entityRef, {
    id: entityRef.id,
    type,
    name,
    summary,
    dates,
    coordinates: firestoreCoordinates,
    uploadedFiles,
    source,
    createdAt: serverTimestamp(),
  });

  return {
    id: entityRef.id,
    type,
    name,
    summary,
    dates,
    coordinates,
    uploadedFiles,
    source,
  };
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
