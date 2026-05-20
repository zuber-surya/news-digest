import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const firebaseConfig = JSON.parse(
  readFileSync(join(process.cwd(), 'firebase-applet-config.json'), 'utf8')
);

// Initialize Firebase Client SDK
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with the specific database ID and long polling for serverless stability
// We use the Client SDK because it uses the API key and obeys security rules,
// avoiding IAM/Service Account permission issues in some environments.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
