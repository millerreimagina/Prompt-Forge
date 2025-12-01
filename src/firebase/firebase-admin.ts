import { initializeApp, getApps, App, cert, getApp } from 'firebase-admin/app';
import 'server-only';

let app: App | undefined;

if (getApps().length === 0) {
    const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    // 1) Try Base64-encoded service account first
    if (svcB64) {
        try {
            const decoded = Buffer.from(svcB64, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            app = initializeApp({
                credential: cert(parsed),
                databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
            });
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[Firebase Admin] Invalid FIREBASE_SERVICE_ACCOUNT_KEY_BASE64. Will try JSON/discrete creds next. Error:', e);
            }
        }
    }
    // 2) Try plain JSON from FIREBASE_SERVICE_ACCOUNT_KEY
    if (!app && svc) {
        try {
            const parsed = JSON.parse(svc);
            app = initializeApp({
                credential: cert(parsed),
                databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
            });
        } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[Firebase Admin] Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON. Will try discrete creds/ADC next. Error:', e);
            }
        }
    }
    // 3) Try discrete env credentials
    if (!app) {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        if (projectId && clientEmail && privateKey) {
            app = initializeApp({
                credential: cert({ projectId, clientEmail, privateKey }),
                databaseURL: `https://${projectId}.firebaseio.com`
            });
        }
    }
    // 4) Fallback to ADC/local projectId (may fail outside GCP if ADC not configured)
    if (!app) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Firebase Admin] Using Application Default Credentials fallback. If you see ENOTFOUND metadata.google.internal, set FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 or FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.');
        }
        app = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
} else {
    app = getApp();
}

export function getFirebaseAdminApp() {
    if (!app) {
        app = getApp();
    }
    return app;
}
