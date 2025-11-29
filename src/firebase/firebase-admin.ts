import { initializeApp, getApps, App, cert, getApp } from 'firebase-admin/app';
import 'server-only';

let app: App;

if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // For Vercel, use service account key from environment variable
        app = initializeApp({
            credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
            databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
        });
    } else {
        // For local development, use application default credentials
        app = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
} else {
    app = getApp();
}

export function getFirebaseAdminApp() {
    return app;
}
