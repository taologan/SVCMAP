import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db } from "./client";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

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
