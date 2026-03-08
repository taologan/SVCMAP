import { GeoPoint } from "firebase/firestore";

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

export function normalizeEntityDoc(entityDoc) {
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

export function normalizeAdminEntityDoc(entityDoc) {
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

export function toFirestoreCoordinates(coordinates) {
  return coordinates.map(([lat, lng]) => new GeoPoint(lat, lng));
}

export function sanitizeEntityPayload(payload) {
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
