import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const BATCH_SIZE = 400;

function loadDotEnv() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf8");
  for (const rawLine of envContent.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function getFirebaseConfig() {
  const requiredKeys = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MEASUREMENT_ID",
  ];

  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing Firebase env keys: ${missing.join(", ")}`);
  }

  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

async function migrateEntitiesToEntries() {
  loadDotEnv();
  const firebaseConfig = getFirebaseConfig();
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const [entitiesSnap, entriesSnap] = await Promise.all([
    getDocs(collection(db, "entities")),
    getDocs(collection(db, "entries")),
  ]);

  const existingEntryIds = new Set(entriesSnap.docs.map((snapshot) => snapshot.id));
  const docsToCopy = entitiesSnap.docs.filter(
    (snapshot) => !existingEntryIds.has(snapshot.id),
  );

  console.log(`entities docs: ${entitiesSnap.size}`);
  console.log(`entries docs: ${entriesSnap.size}`);
  console.log(`docs to copy: ${docsToCopy.length}`);

  if (docsToCopy.length === 0) {
    console.log("No migration needed.");
    return;
  }

  let processed = 0;
  while (processed < docsToCopy.length) {
    const chunk = docsToCopy.slice(processed, processed + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((snapshot) => {
      const entityData = snapshot.data();
      const targetRef = doc(db, "entries", snapshot.id);
      batch.set(
        targetRef,
        {
          id: entityData.id ?? snapshot.id,
          ...entityData,
          migratedFrom: "entities",
          migratedAt: serverTimestamp(),
          updatedAt: entityData.updatedAt ?? serverTimestamp(),
        },
        { merge: true },
      );
    });

    await batch.commit();
    processed += chunk.length;
    console.log(`Copied ${processed}/${docsToCopy.length}`);
  }

  console.log("Migration complete.");
}

migrateEntitiesToEntries().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
