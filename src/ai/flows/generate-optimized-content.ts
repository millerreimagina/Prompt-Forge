'use server';

/**
 * @fileOverview A flow that generates content optimized according to a selected Optimizer's style, rules, and knowledge base.
 *
 * - generateOptimizedContent - A function that takes an Optimizer ID and user input, and returns optimized content.
 * - GenerateOptimizedContentInput - The input type for the generateOptimizedContent function.
 * - GenerateOptimizedContentOutput - The return type for the generateOptimizedContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import {getOptimizer} from '@/lib/optimizers-service.server';
import { Optimizer } from '@/lib/types';
import { getFirebaseAdminApp } from '@/firebase/firebase-admin';


const GenerateOptimizedContentInputSchema = z.object({
  optimizerId: z.string().describe('The ID of the selected Optimizer.'),
  userInput: z.string().describe('The user input or instructions.'),
});
export type GenerateOptimizedContentInput = z.infer<typeof GenerateOptimizedContentInputSchema>;

const GenerateOptimizedContentOutputSchema = z.object({
  optimizedContent: z.string().describe('The content optimized according to the selected Optimizer.'),
});
export type GenerateOptimizedContentOutput = z.infer<typeof GenerateOptimizedContentOutputSchema>;

export async function generateOptimizedContent(input: GenerateOptimizedContentInput): Promise<GenerateOptimizedContentOutput> {
  return generateOptimizedContentFlow(input);
}

const generateOptimizedContentFlow = ai.defineFlow(
  {
    name: 'generateOptimizedContentFlow',
    inputSchema: GenerateOptimizedContentInputSchema,
    outputSchema: GenerateOptimizedContentOutputSchema,
  },
  async (input) => {
    
    const adminApp = getFirebaseAdminApp();
    const firestore = getFirestore(adminApp);
    const optimizer = await getOptimizer(firestore, input.optimizerId);

    if (!optimizer) {
        throw new Error(`Optimizer with ID ${input.optimizerId} not found.`);
    }

    const { systemPrompt, model: modelConfig, knowledgeBase } = optimizer;

    let fullSystemPrompt = systemPrompt;

    if (knowledgeBase && knowledgeBase.length > 0) {
      // NOTE: For simplicity, we are just appending the names.
      // A more robust solution would fetch the content from the URLs.
      const kbContent = knowledgeBase.map(kb => `[Knowledge: ${kb.name}]`).join('\n');
      fullSystemPrompt += `\n\n--- KNOWLEDGE BASE ---\n${kbContent}`;
    }
    
    // Dynamically resolve provider -> model id mapping
    const provider = (modelConfig.provider || '').toLowerCase();
    const providerPrefix = provider === 'openai'
      ? 'openai'
      : provider === 'google'
        ? 'googleai'
        : '';
    const fullModelId = providerPrefix
      ? `${providerPrefix}/${modelConfig.model}`
      : modelConfig.model; // fallback if provider is custom or already namespaced
    
    const { output } = await ai.generate({
      model: fullModelId,
      prompt: input.userInput,
      system: fullSystemPrompt,
      config: {
        temperature: (provider === 'openai' && modelConfig.model === 'gpt-5-mini') ? 1 : modelConfig.temperature,
        maxOutputTokens: modelConfig.maxTokens,
        ...(provider !== 'openai' ? { topP: modelConfig.topP } : {}),
      }
    });

    return { optimizedContent: output.text ?? "No content generated." };
  }
);
