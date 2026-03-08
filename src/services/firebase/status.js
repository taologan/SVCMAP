import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./client";
import { normalizeEmailLower, normalizePhone } from "./normalizers";

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
