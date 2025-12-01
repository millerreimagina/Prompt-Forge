export type Optimizer = {
  id: string;
  internalName: string;
  name: string;
  description: string;
  language: string;
  status: 'Published' | 'Draft';
  category: string;
  organization: 'Reimagina' | 'Trend Riders' | 'Personal';
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
    url?: string; // Add URL for storage
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

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
  company: 'Reimagina' | 'Trend Riders' | 'Personal';
};
