import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { APP_CONFIG, normalizeAllowedRoles } from "../../constants";
import { db } from "./client";

const APP_SETTINGS_COLLECTION = "settings";
const PUBLIC_EXPERIENCE_DOC_ID = "publicExperience";
const ALLOWED_ROLES_DOC_ID = "allowedRoles";

function normalizeAppSettings(settingsByDocId = {}) {
  const publicExperienceData = settingsByDocId[PUBLIC_EXPERIENCE_DOC_ID] ?? {};
  const allowedRolesData = settingsByDocId[ALLOWED_ROLES_DOC_ID] ?? {};
  const allowedRoles = normalizeAllowedRoles(allowedRolesData.roles ?? []);
  return {
    allowCommunitySubmissions:
      typeof publicExperienceData.allowCommunitySubmissions === "boolean"
        ? publicExperienceData.allowCommunitySubmissions
        : APP_CONFIG.defaultAllowCommunitySubmissions,
    allowedRoles,
  };
}

function getPublicExperienceSettingsRef() {
  return doc(db, APP_SETTINGS_COLLECTION, PUBLIC_EXPERIENCE_DOC_ID);
}

function getAllowedRolesSettingsRef() {
  return doc(db, APP_SETTINGS_COLLECTION, ALLOWED_ROLES_DOC_ID);
}

export function subscribeToAppSettings({ onChange, onError }) {
  let publicExperienceData = {};
  let allowedRolesData = {};

  const emitSettings = () => {
    onChange?.(
      normalizeAppSettings({
        [PUBLIC_EXPERIENCE_DOC_ID]: publicExperienceData,
        [ALLOWED_ROLES_DOC_ID]: allowedRolesData,
      }),
    );
  };

  const unsubscribePublicExperience = onSnapshot(
    getPublicExperienceSettingsRef(),
    (snapshot) => {
      publicExperienceData = snapshot.exists() ? snapshot.data() : {};
      emitSettings();
    },
    (error) => {
      onError?.(error);
    },
  );

  const unsubscribeAllowedRoles = onSnapshot(
    getAllowedRolesSettingsRef(),
    (snapshot) => {
      allowedRolesData = snapshot.exists() ? snapshot.data() : {};
      emitSettings();
    },
    (error) => {
      onError?.(error);
    },
  );

  return () => {
    unsubscribePublicExperience();
    unsubscribeAllowedRoles();
  };
}

export async function updateCommunitySubmissionsSetting({
  allowCommunitySubmissions,
  updatedBy = null,
}) {
  await setDoc(
    getPublicExperienceSettingsRef(),
    {
      allowCommunitySubmissions,
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { allowCommunitySubmissions };
}

export async function updateAllowedRolesSetting({ allowedRoles, updatedBy = null }) {
  const normalizedRoles = normalizeAllowedRoles(allowedRoles);
  await setDoc(
    getAllowedRolesSettingsRef(),
    {
      roles: normalizedRoles,
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { allowedRoles: normalizedRoles };
}
