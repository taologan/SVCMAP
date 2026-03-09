import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { storage } from "./client";

function isBrowserFile(value) {
  return typeof File !== "undefined" && value instanceof File;
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function resolveUploadedFiles({ folder, recordId, uploadedFiles }) {
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
      const objectPath = `${folder}/${recordId}/${timestamp}-${index}-${normalizedName}`;
      const objectRef = storageRef(storage, objectPath);
      await uploadBytes(objectRef, file);
      return getDownloadURL(objectRef);
    }),
  );

  return [...existingUrls, ...uploadedUrls];
}
