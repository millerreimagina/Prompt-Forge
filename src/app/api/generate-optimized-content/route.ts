import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import type { Optimizer } from '@/lib/types';
import OpenAI from 'openai';

function resolveModelId(provider: string, model: string) {
  const p = (provider || '').toLowerCase();
  if (p === 'openai') return `openai/${model}`;
  if (p === 'google') return `googleai/${model}`;
  return model; // already namespaced or custom
}

function buildSystemPrompt(systemPrompt: string, knowledgeBase: Optimizer['knowledgeBase']) {
  let full = systemPrompt || '';
  if (knowledgeBase && knowledgeBase.length > 0) {
    const kbContent = knowledgeBase.map(kb => `[Knowledge: ${kb.name}]`).join('\n');
    full += `\n\n--- KNOWLEDGE BASE ---\n${kbContent}`;
  }
  return full;
}

function extractTextRobust(output: any): string | null {
  // 1) Genkit standard
  const text = output?.text ?? output?.output?.text;
  if (text && typeof text === 'string' && text.trim()) return text;

  // 2) OpenAI-like shape
  const choiceContent = output?.choices?.[0]?.message?.content;
  if (choiceContent && typeof choiceContent === 'string' && choiceContent.trim()) return choiceContent;

  // 3) Gemini-like shape
  const candidates = output?.candidates || output?.output?.candidates;
  if (Array.isArray(candidates)) {
    for (const c of candidates) {
      const parts = c?.content?.parts;
      if (Array.isArray(parts)) {
        const joined = parts.map((p: any) => p?.text).filter(Boolean).join('\n');
        if (joined && joined.trim()) return joined;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const optimizer: Optimizer | undefined = body?.optimizer;
    const userInput: string = body?.userInput ?? '';

    if (!optimizer || !userInput) {
      return NextResponse.json({ error: 'Missing optimizer or userInput' }, { status: 400 });
    }

    const provider = (optimizer.model.provider || '').toLowerCase();
    const modelId = resolveModelId(optimizer.model.provider, optimizer.model.model);
    const system = buildSystemPrompt(optimizer.systemPrompt, optimizer.knowledgeBase || []);

    const temperature = (provider === 'openai' && optimizer.model.model === 'gpt-5-mini')
      ? 1
      : optimizer.model.temperature;

    const genkitConfig: Record<string, any> = {
      temperature,
      maxOutputTokens: optimizer.model.maxTokens,
    };
    if (provider !== 'openai') {
      genkitConfig.topP = optimizer.model.topP;
    }

    let genkitResult: any | null = null;
    try {
      const { output } = await ai.generate({
        model: modelId,
        prompt: userInput,
        system,
        config: genkitConfig,
      });
      genkitResult = output;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Genkit error]', e);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Genkit raw output]', JSON.stringify(genkitResult, null, 2));
    }

    let text = extractTextRobust(genkitResult);

    // Fallback: direct OpenAI Chat Completions if Genkit didn’t return text
    if ((!text || !text.trim()) && provider === 'openai') {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: optimizer.model.model, // e.g., 'gpt-5-mini' or others
          messages: [
            ...(system ? [{ role: 'system', content: system as string }] : []),
            { role: 'user', content: userInput },
          ],
          temperature: 1, // enforce for gpt-5-mini per requirement; kept for simplicity
          max_completion_tokens: optimizer.model.maxTokens,
        } as any);

        if (process.env.NODE_ENV !== 'production') {
          console.log('[OpenAI raw completion]', JSON.stringify(completion, null, 2));
        }

        text = completion?.choices?.[0]?.message?.content ?? '';
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[OpenAI fallback error]', e);
        }
      }
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'No content generated.' }, { status: 502 });
    }

    return NextResponse.json({ optimizedContent: text });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[API error] /api/generate-optimized-content', error);
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
