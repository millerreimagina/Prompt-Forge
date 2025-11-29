import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import openAICompatible from '@genkit-ai/compat-oai';

// Firebase Admin SDK is now initialized in the flows that need it.

export const ai = genkit({
  plugins: [
    googleAI(),
    openAICompatible({
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
    }),
  ],
  model: 'openai/gpt-5-mini',
});
