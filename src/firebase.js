export { auth, db, storage } from "./services/firebase/client";
export {
  isUserAdmin,
  onAuthUserChanged,
  signInWithGoogle,
} from "./services/firebase/auth";
export {
  deleteEntry,
  getAllEntriesForAdmin,
  getEntities,
  updateEntry,
} from "./services/firebase/entries";
export {
  addPending,
  approvePending,
  denyPending,
  getPending,
  updatePending,
} from "./services/firebase/pending";
export { lookupRequestStatus } from "./services/firebase/status";
