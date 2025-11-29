import type { Optimizer } from './types';

export const optimizers: Optimizer[] = [
  {
    id: 'linkedin-optimizer',
    internalName: 'Reimagina LinkedIn Optimizer',
    name: 'Reimagina LinkedIn Optimizer',
    description: 'Generates LinkedIn posts optimized for B2B founders.',
    language: 'Spanish',
    status: 'Published',
    model: {
      provider: 'OpenAI',
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 1024,
      topP: 1,
    },
    systemPrompt: 'You are an expert LinkedIn content creator for B2B founders. Your tone is professional yet approachable. You create engaging posts that drive conversation and build authority. Always include a hook, main body, and a call-to-action.',
    knowledgeBase: [
      { id: 'kb-1', name: 'Reimagina Value Proposition' },
      { id: 'kb-2', name: 'Key B2B Founder Pain Points' },
    ],
    generationParams: {
      variants: 3,
      preferredLength: 'Medium',
      creativityLevel: 'Balanced',
      structureRules: ['Hook', 'CTA'],
      explainReasoning: true,
    },
    guidedInputs: [
      { id: 'goal', label: 'What is the goal of this post?', required: true },
      { id: 'audience', label: 'Who is the target audience?', required: false },
    ],
  },
  {
    id: 'trend-rider-tweet',
    internalName: 'Trend Rider Tweet',
    name: 'Trend Rider Tweet',
    description: 'Generates tweets based on current trends.',
    language: 'English',
    status: 'Published',
    model: {
      provider: 'Anthropic',
      model: 'claude-3-sonnet',
      temperature: 0.8,
      maxTokens: 280,
      topP: 1,
    },
    systemPrompt: 'You are a witty social media manager who excels at jumping on trends. Your goal is to create viral tweets that are relevant, funny, and shareable. Keep it short and punchy.',
    knowledgeBase: [],
    generationParams: {
      variants: 5,
      preferredLength: 'Short',
      creativityLevel: 'High',
      structureRules: [],
      explainReasoning: false,
    },
    guidedInputs: [
      { id: 'trend', label: 'What trend are we riding?', required: true },
    ],
  },
  {
    id: 'key-phrase-image',
    internalName: 'Key Phrase Image',
    name: 'Key Phrase Image',
    description: 'Transforms key phrases into image prompts for Midjourney.',
    language: 'English',
    status: 'Draft',
    model: {
      provider: 'Google',
      model: 'gemini-1.5-pro',
      temperature: 0.9,
      maxTokens: 512,
      topP: 1,
    },
    systemPrompt: 'You are an expert prompt engineer for the Midjourney image generation AI. You transform simple key phrases into detailed, artistic, and effective prompts. Use descriptive language, specify styles, camera angles, and lighting. The output must be only the prompt itself.',
    knowledgeBase: [
      { id: 'kb-3', name: 'Midjourney Parameter Guide' },
    ],
    generationParams: {
      variants: 1,
      preferredLength: 'Long',
      creativityLevel: 'Very High',
      structureRules: [],
      explainReasoning: false,
    },
    guidedInputs: [
      { id: 'phrase', label: 'Enter your key phrase or idea', required: true },
    ],
  },
];
