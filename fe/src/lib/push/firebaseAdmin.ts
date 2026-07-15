import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Env vars can't hold real newlines, so the key is stored with literal "\n".
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

let app: App | null = null;

if (projectId && clientEmail && privateKey) {
  app = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/**
 * `null` until FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY are set (i.e.
 * before a Firebase project exists for this app). Every push call site must
 * treat that as "push not configured yet" and no-op rather than throw, so
 * the rest of the product keeps working without it.
 */
export const messaging = app ? getMessaging(app) : null;
