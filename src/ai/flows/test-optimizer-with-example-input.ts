'use server';
/**
 * @fileOverview Allows administrators to test an Optimizer with an example input and see the AI's response and the complete prompt sent to the model.
 *
 * - testOptimizer - A function that handles the testing process.
 * - TestOptimizerInput - The input type for the testOptimizer function.
 * - TestOptimizerOutput - The return type for the testOptimizer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TestOptimizerInputSchema = z.object({
  optimizerName: z.string().describe('The name of the optimizer to test.'),
  exampleInput: z.string().describe('The example input to use for testing the optimizer.'),
});
export type TestOptimizerInput = z.infer<typeof TestOptimizerInputSchema>;

const TestOptimizerOutputSchema = z.object({
  aiResponse: z.string().describe('The AI response to the example input.'),
  fullPrompt: z.string().describe('The complete prompt sent to the model.'),
});
export type TestOptimizerOutput = z.infer<typeof TestOptimizerOutputSchema>;

export async function testOptimizer(input: TestOptimizerInput): Promise<TestOptimizerOutput> {
  return testOptimizerFlow(input);
}

const testOptimizerPrompt = ai.definePrompt({
  name: 'testOptimizerPrompt',
  input: {schema: TestOptimizerInputSchema},
  output: {schema: TestOptimizerOutputSchema},
  prompt: `You are testing the optimizer named {{{optimizerName}}}.\nHere is the example input: {{{exampleInput}}}.\n\nRespond with the AI's response and the complete prompt that was sent to the model.\nAI Response: {{aiResponse}}\nFull Prompt: {{fullPrompt}}`,
});

const testOptimizerFlow = ai.defineFlow(
  {
    name: 'testOptimizerFlow',
    inputSchema: TestOptimizerInputSchema,
    outputSchema: TestOptimizerOutputSchema,
  },
  async input => {
    // For now, just return the input as the AI response and full prompt.
    // Later, this will actually call the optimizer and get the real response and prompt.
    const {output} = await testOptimizerPrompt({
      optimizerName: input.optimizerName,
      exampleInput: input.exampleInput,
      aiResponse: 'This is a placeholder AI response.',
      fullPrompt: 'This is a placeholder full prompt.',
    });
    return output!;
  }
);
