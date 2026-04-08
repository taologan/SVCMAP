import { GeoPoint } from "firebase/firestore";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || "";
}

function normalizeLinkItem(value) {
  if (typeof value === "string") {
    const url = value.trim();
    if (!url) return null;
    return { label: url, url };
  }

  if (value && typeof value === "object") {
    const label = normalizeOptionalText(value.label || value.title || value.name);
    const url = normalizeOptionalText(value.url || value.href);
    if (!url) return null;
    return {
      label: label || url,
      url,
    };
  }

  return null;
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

export function normalizeCoordinates(value) {
  if (!Array.isArray(value)) return [];
  return value.map((coordinate) => normalizeCoordinate(coordinate)).filter(Boolean);
}

export function normalizeUploadedFiles(value) {
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

export function normalizeExternalLinks(value) {
  if (!Array.isArray(value)) return [];
  return value.map((link) => normalizeLinkItem(link)).filter(Boolean);
}

export function normalizeEntityDoc(entityDoc) {
  const data = entityDoc.data();
  const coordinates = normalizeCoordinates(data.coordinates);
  if (!coordinates.length) return null;

  return {
    id: data.id ?? entityDoc.id,
    name: data.name ?? "Unknown",
    summary: data.summary ?? "",
    role: data.role ?? data.dates ?? "",
    storyType: normalizeOptionalText(data.storyType),
    neighborhood: normalizeOptionalText(data.neighborhood),
    graveLocation: normalizeOptionalText(data.graveLocation),
    sourceLabel: normalizeOptionalText(data.sourceLabel),
    sourceUrl: normalizeOptionalText(data.sourceUrl),
    externalLinks: normalizeExternalLinks(data.externalLinks),
    coordinates,
    uploadedFiles: normalizeUploadedFiles(data.uploadedFiles),
  };
}

export function normalizeAdminEntityDoc(entityDoc) {
  const data = entityDoc.data();
  return {
    id: data.id ?? entityDoc.id,
    name: data.name ?? "Unknown",
    summary: data.summary ?? "",
    role: data.role ?? data.dates ?? "",
    storyType: normalizeOptionalText(data.storyType),
    neighborhood: normalizeOptionalText(data.neighborhood),
    graveLocation: normalizeOptionalText(data.graveLocation),
    sourceLabel: normalizeOptionalText(data.sourceLabel),
    sourceUrl: normalizeOptionalText(data.sourceUrl),
    externalLinks: normalizeExternalLinks(data.externalLinks),
    coordinates: normalizeCoordinates(data.coordinates),
    uploadedFiles: normalizeUploadedFiles(data.uploadedFiles),
  };
}

export function toFirestoreCoordinates(coordinates) {
  return coordinates.map(([lat, lng]) => new GeoPoint(lat, lng));
}

export function sanitizePendingPayload(payload) {
  return {
    name: payload.name ?? "Unknown",
    summary: payload.summary ?? "",
    role: payload.role ?? payload.dates ?? "",
    storyType: normalizeOptionalText(payload.storyType),
    neighborhood: normalizeOptionalText(payload.neighborhood),
    graveLocation: normalizeOptionalText(payload.graveLocation),
    sourceLabel: normalizeOptionalText(payload.sourceLabel),
    sourceUrl: normalizeOptionalText(payload.sourceUrl),
    externalLinks: normalizeExternalLinks(payload.externalLinks),
    coordinates: normalizeCoordinates(payload.coordinates),
    uploadedFiles: normalizeUploadedFiles(payload.uploadedFiles),
  };
}

export function sanitizeEntryPayload(payload) {
  return {
    name: payload.name ?? "Unknown",
    summary: payload.summary ?? "",
    role: payload.role ?? payload.dates ?? "",
    storyType: normalizeOptionalText(payload.storyType),
    neighborhood: normalizeOptionalText(payload.neighborhood),
    graveLocation: normalizeOptionalText(payload.graveLocation),
    sourceLabel: normalizeOptionalText(payload.sourceLabel),
    sourceUrl: normalizeOptionalText(payload.sourceUrl),
    externalLinks: normalizeExternalLinks(payload.externalLinks),
    coordinates: normalizeCoordinates(payload.coordinates),
    uploadedFiles: normalizeUploadedFiles(payload.uploadedFiles),
  };
}

export function normalizeEmail(value) {
  const email = (value ?? "").trim();
  return email;
}

export function normalizeEmailLower(value) {
  return normalizeEmail(value).toLowerCase();
}

export function normalizePhone(value) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[^\d+]/g, "");
}

export function sanitizeContactPayload(payload) {
  const submitterEmail = normalizeEmail(payload.submitterEmail);
  const submitterPhone = normalizePhone(payload.submitterPhone);
  return {
    submitterEmail: submitterEmail || null,
    submitterEmailLower: submitterEmail ? submitterEmail.toLowerCase() : null,
    submitterPhone: submitterPhone || null,
  };
}
