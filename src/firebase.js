import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)

export const analytics =
  typeof window !== 'undefined' ? getAnalytics(app) : null

export async function getPlaceInfoByName(placeName) {
  const placeRef = doc(db, 'places', placeName)
  const placeSnap = await getDoc(placeRef)
  if (!placeSnap.exists()) return null

  const peopleSnap = await getDocs(collection(placeRef, 'people'))
  const people = peopleSnap.docs.map((p) => ({
    id: p.id,
    ...p.data(),
  }))

  return {
    id: placeSnap.id,
    ...placeSnap.data(),
    people,
  }
}
