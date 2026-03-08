import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import {
  GeoPoint,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'

const MOCK_ENTITIES = [
  {
    id: 'john-wesley-dobbs',
    type: 'person',
    name: 'John Wesley Dobbs and Family',
    summary:
      "Often referred to as the unofficial mayor of Auburn Avenue, Dobbs coined the term 'Sweet Auburn' and helped lead major voter registration and civic organizing in Atlanta's Black community.",
    dates: 'Voting rights advocate',
    coordinates: [
      [33.7554, -84.3738],
      [33.7559, -84.3729],
    ],
  },
  {
    id: 'clara-maxwell-cater-pitts',
    type: 'person',
    name: 'Clara Maxwell Cater Pitts',
    summary:
      'Pitts served as superintendent of the Carrie Steele Orphans Home, modernized its operations, and was later honored with the renamed Carrie Steele Pitts Home and a school in her name.',
    dates: 'Educator and orphanage manager',
    coordinates: [
      [33.7347, -84.4152],
      [33.7388, -84.4126],
    ],
  },
  {
    id: 'moses-amos',
    type: 'person',
    name: 'Moses Amos',
    summary:
      'Amos became the first African American granted a Georgia druggist license in 1911 and built Gate City Drug Store into a hub of mentorship and opportunity.',
    dates: 'First licensed Black pharmacist in Georgia',
    coordinates: [
      [33.7598, -84.3878],
      [33.7555, -84.3735],
    ],
  },
  {
    id: 'dinah-watts-pace',
    type: 'person',
    name: 'Dinah Watts Pace',
    summary:
      "Born enslaved in 1833, Pace founded one of Georgia's earliest orphanages for African American children and helped build foundational faith and education institutions.",
    dates: 'Educator and orphanage founder',
    coordinates: [
      [33.7366, -84.3866],
      [33.5968, -83.8602],
    ],
  },
  {
    id: 'adrienne-herndon',
    type: 'person',
    name: 'Adrienne Herndon',
    summary:
      "Herndon was an educator and performer who became one of Atlanta University's first Black faculty members and later designed the Herndon family's Diamond Hill estate.",
    dates: 'Educator and actor',
    coordinates: [
      [33.749, -84.4122],
      [33.7674, -84.3992],
    ],
  },
  {
    id: 'george-union-wilder',
    type: 'person',
    name: 'George "Union" Wilder',
    summary:
      'In Brownsville, Wilder was killed while defending his home during the 1906 Race Massacre; this resistance slowed white mobs as violence spread.',
    dates: 'Victim of the 1906 Race Massacre',
    coordinates: [[33.6893, -84.3885]],
  },
  {
    id: 'ad-jennie-williams',
    type: 'person',
    name: 'A. D. and Jennie Williams',
    summary:
      "A.D. Williams and Jennie Parks Williams shaped Ebenezer's civic and faith leadership, with A.D. also helping found the Atlanta NAACP branch.",
    dates: 'Grandparents of Dr. Martin Luther King Jr.',
    coordinates: [
      [33.7542, -84.3738],
      [33.7546, -84.3729],
    ],
  },
  {
    id: 'walter-westmoreland',
    type: 'person',
    name: 'Walter Westmoreland',
    summary:
      'Westmoreland, a Morehouse and Atlanta University graduate, served as a Tuskegee Airman with the Red Tail Flyers during WWII.',
    dates: 'First Lieutenant, Tuskegee Airman',
    coordinates: [[33.7478, -84.4141]],
  },
  {
    id: 'mlk-sr-and-alberta',
    type: 'person',
    name: 'Rev. and Mrs. Martin Luther King, Sr.',
    summary:
      "Rev. Martin Luther King Sr. and Alberta Williams King helped shape Atlanta's religious and civic life through decades of leadership at Ebenezer and beyond.",
    dates: 'Parents of Dr. Martin Luther King Jr.',
    coordinates: [
      [33.7542, -84.3738],
      [33.749, -84.388],
    ],
  },
  {
    id: 'henry-aaron',
    type: 'person',
    name: 'Henry Aaron',
    summary:
      'Aaron broke baseball barriers on and off the field, then leveraged his legacy to support civil rights and public service causes.',
    dates: 'Baseball legend and civil rights supporter',
    coordinates: [
      [33.7348, -84.3899],
      [33.755, -84.3727],
    ],
  },
  {
    id: 'julian-bond',
    type: 'person',
    name: 'Julian Bond',
    summary:
      'Bond rose from student activism at Morehouse to SNCC leadership and major public service in Georgia politics and civil rights advocacy.',
    dates: 'Civil rights organizer and legislator',
    coordinates: [
      [33.7478, -84.4141],
      [33.749, -84.3878],
    ],
  },
  {
    id: 'john-lewis',
    type: 'person',
    name: 'Congressman John Lewis',
    summary:
      'Lewis bridged grassroots civil rights organizing and national public office, representing Georgia while sustaining movement leadership for decades.',
    dates: 'Civil rights leader and U.S. Congressman',
    coordinates: [
      [33.7552, -84.3903],
      [33.7493, -84.3884],
    ],
  },
]

const BATCH_SIZE = 500

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

function validateEntity(entity) {
  if (!entity?.id || !entity?.name) {
    throw new Error(`Invalid entity (missing id/name): ${JSON.stringify(entity)}`)
  }
  if (!Array.isArray(entity.coordinates) || entity.coordinates.length === 0) {
    throw new Error(`Invalid entity coordinates for id "${entity.id}"`)
  }

  for (const coordinate of entity.coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length !== 2) {
      throw new Error(`Invalid coordinate shape for id "${entity.id}"`)
    }

    const [lat, lng] = coordinate
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Invalid coordinate values for id "${entity.id}"`)
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error(`Coordinate out of range for id "${entity.id}"`)
    }
  }
}

async function seedEntities() {
  loadDotEnv()
  const firebaseConfig = getFirebaseConfig()
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  for (const entity of MOCK_ENTITIES) validateEntity(entity)

  const entriesRef = collection(db, 'entries')
  let processed = 0

  while (processed < MOCK_ENTITIES.length) {
    const chunk = MOCK_ENTITIES.slice(processed, processed + BATCH_SIZE)
    const batch = writeBatch(db)

    for (const entity of chunk) {
      const docRef = doc(entriesRef, entity.id)
      batch.set(
        docRef,
        {
          id: entity.id,
          type: entity.type ?? 'person',
          name: entity.name,
          summary: entity.summary ?? '',
          dates: entity.dates ?? '',
          coordinates: entity.coordinates.map(([lat, lng]) => new GeoPoint(lat, lng)),
          uploadedFiles: [],
          source: 'seed',
          createdAt: serverTimestamp(),
        },
        { merge: true },
      )
    }

    await batch.commit()
    processed += chunk.length
    console.log(`Committed ${processed}/${MOCK_ENTITIES.length} entries`)
  }

  console.log('Seed complete.')
}

seedEntities().catch((error) => {
  console.error('Seed failed:', error)
  process.exitCode = 1
})
