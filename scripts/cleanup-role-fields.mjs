import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import {
  collection,
  deleteField,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore'

const BATCH_SIZE = 450

function loadDotEnv() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.resolve(__dirname, '../.env')
  if (!fs.existsSync(envPath)) return

  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (key && !process.env[key]) process.env[key] = value
  }
}

function getFirebaseConfig() {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MEASUREMENT_ID',
  ]

  const missing = requiredKeys.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing Firebase env keys: ${missing.join(', ')}`)
  }

  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  }
}

function normalizeRolesArray(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const normalized = []

  for (const rawRole of value) {
    const role = `${rawRole ?? ''}`.trim()
    if (!role) continue

    const normalizedRole = role.toLowerCase()
    if (seen.has(normalizedRole)) continue
    seen.add(normalizedRole)
    normalized.push(role)
  }

  return normalized.sort((leftRole, rightRole) =>
    leftRole.localeCompare(rightRole, undefined, { sensitivity: 'base' }),
  )
}

function deriveRoles(data = {}) {
  const normalizedRoles = normalizeRolesArray(data.roles)
  if (normalizedRoles.length) return normalizedRoles

  const fallbackRoleText = `${data.role ?? ''}`.trim()
  if (!fallbackRoleText) return []

  return normalizeRolesArray(fallbackRoleText.split(','))
}

function areEqualRoles(leftRoles = [], rightRoles = []) {
  if (leftRoles.length !== rightRoles.length) return false
  return leftRoles.every((role, index) => role === rightRoles[index])
}

async function cleanupCollection({ db, collectionName, dryRun }) {
  const collectionRef = collection(db, collectionName)
  const snapshot = await getDocs(collectionRef)

  let scannedCount = 0
  let updatedCount = 0
  let removedLegacyRoleCount = 0
  let batch = writeBatch(db)
  let pendingWrites = 0

  for (const docSnapshot of snapshot.docs) {
    scannedCount += 1
    const data = docSnapshot.data()
    const hasLegacyRole = Object.prototype.hasOwnProperty.call(data, 'role')
    const normalizedCurrentRoles = normalizeRolesArray(data.roles)
    const normalizedNextRoles = deriveRoles(data)
    const needsRolesUpdate = !areEqualRoles(normalizedCurrentRoles, normalizedNextRoles)

    if (!hasLegacyRole && !needsRolesUpdate) continue

    updatedCount += 1
    if (hasLegacyRole) removedLegacyRoleCount += 1

    if (dryRun) continue

    batch.update(doc(db, collectionName, docSnapshot.id), {
      roles: normalizedNextRoles,
      role: deleteField(),
    })
    pendingWrites += 1

    if (pendingWrites >= BATCH_SIZE) {
      await batch.commit()
      batch = writeBatch(db)
      pendingWrites = 0
    }
  }

  if (!dryRun && pendingWrites > 0) {
    await batch.commit()
  }

  return { collectionName, scannedCount, updatedCount, removedLegacyRoleCount }
}

async function cleanupRoleFields() {
  const dryRun = process.argv.includes('--dry-run')
  loadDotEnv()
  const firebaseConfig = getFirebaseConfig()
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const collections = ['entries', 'pending']
  const summaries = []

  for (const collectionName of collections) {
    const summary = await cleanupCollection({ db, collectionName, dryRun })
    summaries.push(summary)
    console.log(
      `[${collectionName}] scanned=${summary.scannedCount} updated=${summary.updatedCount} removedLegacyRole=${summary.removedLegacyRoleCount}`,
    )
  }

  const totalUpdated = summaries.reduce((total, summary) => total + summary.updatedCount, 0)
  if (dryRun) {
    console.log(`Dry run complete. ${totalUpdated} documents would be updated.`)
    return
  }

  console.log(`Cleanup complete. Updated ${totalUpdated} documents.`)
}

cleanupRoleFields().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exitCode = 1
})
