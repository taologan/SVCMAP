export const SUPPORTED_UPLOAD_ACCEPT = "image/*,audio/mpeg,.mp3";

const SUPPORTED_UPLOAD_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
  "mp3",
]);

function getFileExtension(fileName = "") {
  const trimmed = fileName.trim();
  if (!trimmed) return "";

  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex < 0) return "";

  return trimmed.slice(dotIndex + 1).toLowerCase();
}

export function isSupportedUploadFile(file) {
  if (!file) return false;

  const fileType = (file.type ?? "").toLowerCase();
  if (fileType.startsWith("image/")) return true;
  if (fileType === "audio/mpeg") return true;

  return SUPPORTED_UPLOAD_EXTENSIONS.has(getFileExtension(file.name ?? ""));
}

export function getUnsupportedUploadFiles(files = []) {
  return files.filter((file) => !isSupportedUploadFile(file));
}

export function getUnsupportedUploadMessage(files = []) {
  const unsupportedFiles = getUnsupportedUploadFiles(files);
  if (!unsupportedFiles.length) return "";

  const names = unsupportedFiles.map((file) => file.name).join(", ");
  return `Unsupported file type: ${names}. Please upload images or MP3 files only.`;
}
