import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {initializeApp, getApps, App} from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!getApps().length) {
    initializeApp({
        credential: credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}


export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
