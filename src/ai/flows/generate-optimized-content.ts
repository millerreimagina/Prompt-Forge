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
import { definePrompt, generate } from 'genkit/ai';
import { Optimizer } from '@/lib/types';


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

// This is a dynamic prompt that will be constructed inside the flow
// so we don't need a predefined handlebars prompt here.

const generateOptimizedContentFlow = ai.defineFlow(
  {
    name: 'generateOptimizedContentFlow',
    inputSchema: GenerateOptimizedContentInputSchema,
    outputSchema: GenerateOptimizedContentOutputSchema,
  },
  async (input) => {
    
    const firestore = getFirestore();
    const optimizer = await getOptimizer(firestore, input.optimizerId);

    if (!optimizer) {
        throw new Error(`Optimizer with ID ${input.optimizerId} not found.`);
    }

    const { systemPrompt, model: modelConfig, generationParams } = optimizer;

    // Construct a dynamic prompt
    const prompt = definePrompt({
        name: 'dynamicGenerateContentPrompt',
        system: systemPrompt,
        input: { schema: z.string() },
        output: { schema: z.object({ optimizedContent: z.string() }) },
        config: {
            model: ai.model(modelConfig.model),
            temperature: modelConfig.temperature,
            maxOutputTokens: modelConfig.maxTokens,
            topP: modelConfig.topP,
        },
    });

    const { output } = await prompt(input.userInput);

    return { optimizedContent: output!.optimizedContent };
  }
);
