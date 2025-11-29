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

const prompt = ai.definePrompt({
  name: 'generateOptimizedContentPrompt',
  input: {schema: GenerateOptimizedContentInputSchema},
  output: {schema: GenerateOptimizedContentOutputSchema},
  prompt: `You are an AI assistant specializing in content optimization. You will receive a user input and an Optimizer ID. Your task is to generate content optimized according to the style, rules, and knowledge base of the selected Optimizer.

Optimizer ID: {{{optimizerId}}}
User Input: {{{userInput}}}

Output:
`, //The prompt is intentionally left simple and depends on external services to fetch optimizer details based on the optimizerId. See the flow implementation below.
});

const generateOptimizedContentFlow = ai.defineFlow(
  {
    name: 'generateOptimizedContentFlow',
    inputSchema: GenerateOptimizedContentInputSchema,
    outputSchema: GenerateOptimizedContentOutputSchema,
  },
  async input => {
    //TODO: Here, we would fetch the Optimizer configuration (system prompt, KB, model config, etc.) based on the optimizerId using a service function.
    //For this example we proceed with a basic prompt call using only user input.
    const {output} = await prompt(input);
    return {optimizedContent: output!.optimizedContent};
  }
);
