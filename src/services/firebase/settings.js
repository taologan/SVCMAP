import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { APP_CONFIG } from "../../constants";
import { db } from "./client";

const APP_SETTINGS_COLLECTION = "settings";
const APP_SETTINGS_DOC_ID = "publicExperience";

function normalizeAppSettings(data = {}) {
  return {
    allowCommunitySubmissions:
      typeof data.allowCommunitySubmissions === "boolean"
        ? data.allowCommunitySubmissions
        : APP_CONFIG.defaultAllowCommunitySubmissions,
  };
}

function getAppSettingsRef() {
  return doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
}

export function subscribeToAppSettings({ onChange, onError }) {
  return onSnapshot(
    getAppSettingsRef(),
    (snapshot) => {
      const nextSettings = snapshot.exists()
        ? normalizeAppSettings(snapshot.data())
        : normalizeAppSettings();
      onChange?.(nextSettings);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function updateCommunitySubmissionsSetting({
  allowCommunitySubmissions,
  updatedBy = null,
}) {
  await setDoc(
    getAppSettingsRef(),
    {
      allowCommunitySubmissions,
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { allowCommunitySubmissions };
}
