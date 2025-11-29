import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Firebase Admin SDK is now initialized in the flows that need it.

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
