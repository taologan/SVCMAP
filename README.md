# SVCMAP

SVCMAP is a React + Vite web app deployed on Firebase Hosting.

## Prerequisites

- Node.js 18+ and npm
- A Firebase project (this repo is configured for `svcmap-488322`)
- Firebase CLI installed globally:

```bash
npm install -g firebase-tools
```

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create/update your `.env` file in the project root with Firebase web config values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

3. Start the development server:

```bash
npm run dev
```

## Build for production

Generate a production build:

```bash
npm run build
```

This creates static files in `dist/`, which is the directory configured in `firebase.json` for hosting.

## Deploy to Firebase Hosting

1. Authenticate with Firebase (first time only):

```bash
firebase login
```

2. Confirm your active Firebase project:

```bash
firebase use
```

If needed, switch to the configured project:

```bash
firebase use svcmap-488322
```

3. Build and deploy:

```bash
npm run build
firebase deploy --only hosting
```