export type Optimizer = {
  id: string;
  internalName: string;
  name: string;
  description: string;
  language: string;
  status: 'Published' | 'Draft';
  model: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    backupModel?: string;
    modelPipeline?: string;
  };
  systemPrompt: string;
  knowledgeBase: {
    id: string;
    name: string;
  }[];
  generationParams: {
    variants: number;
    preferredLength: string;
    creativityLevel: string;
    structureRules: string[];
    explainReasoning: boolean;
  };
  guidedInputs: {
    id: string;
    label: string;
    required: boolean;
  }[];
};
