import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import type { Optimizer } from '@/lib/types';
import OpenAI from 'openai';
import { getFirebaseAdminApp } from '@/firebase/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DEBUG = process.env.DEBUG_OPT === '1';

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
    // Verify Firebase ID token if provided
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    let uid: string | null = null;
    try {
      if (authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.slice('Bearer '.length).trim();
        if (idToken) {
          const app = getFirebaseAdminApp();
          const token = await getAuth(app).verifyIdToken(idToken);
          uid = token.uid || null;
        }
      }
    } catch (e) {
      // Non-fatal: continue without uid if verification fails
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Usage] ID token verification failed:', e);
      }
    }
    const optimizer: Optimizer | undefined = body?.optimizer;
    const userInput: string = body?.userInput ?? '';
    const historyRaw: any[] = Array.isArray(body?.history) ? body.history : [];
    const attachment: { name?: string; type?: string; size?: number; text?: string } | undefined = body?.attachment;

    const history: Array<{ role: 'user' | 'assistant'; content: string }> = historyRaw
      .map((m) => ({ role: (m?.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: String(m?.content ?? '') }))
      .filter((m) => m.content.trim().length > 0)
      .slice(-10);

    if (!optimizer || !userInput) {
      return NextResponse.json({ error: 'Missing optimizer or userInput' }, { status: 400 });
    }

    const provider = (optimizer.model.provider || '').toLowerCase();
    const modelId = resolveModelId(optimizer.model.provider, optimizer.model.model);
    let system = buildSystemPrompt(optimizer.systemPrompt, optimizer.knowledgeBase || []);

    const temperature = optimizer.model.temperature;

    const requestedMax = Number(optimizer.model.maxTokens ?? 0) || 0;
    const safeMax = Math.max(1, Math.min(requestedMax || 512, 4096));

    const genkitConfig: Record<string, any> = {
      temperature,
      maxOutputTokens: safeMax,
    };
    if (provider !== 'openai') {
      genkitConfig.topP = optimizer.model.topP;
    }

    if (DEBUG) {
      console.log('[Gen] provider/model', { provider, modelId, rawModel: optimizer.model.model });
      console.log('[Gen] config', { temperature, requestedMax, usingMax: safeMax, topP: genkitConfig.topP });
      console.log('[Gen] OPENAI key present?', !!process.env.OPENAI_API_KEY);
    }

    let genkitResult: any | null = null;
    try {
      const attachTxtRaw = typeof attachment?.text === 'string' ? attachment.text : '';
      const attachName = attachment?.name || 'attachment';
      // Cap attachment to avoid huge prompts
      const ATTACH_CAP = 10000; // characters
      const attachTxt = attachTxtRaw ? attachTxtRaw.slice(0, ATTACH_CAP) : '';

      const conversationPrefix = history
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      if (process.env.NODE_ENV !== 'production') {
        console.log('[Attachment]', {
          name: attachName,
          type: attachment?.type,
          size: attachment?.size,
          textLen: attachTxt.length,
        });
      }

      // If there is an attachment, reinforce instructions in the system prompt
      if (attachTxt) {
        system = `${system}\n\nYou may receive an attached file inline in the prompt, indicated by a block starting with [Attached file: <name>]. Treat that block as the full textual contents of the attached file and analyze or reference it as requested.`.trim();
      }

      const { output } = await ai.generate({
        model: modelId,
        prompt: (() => {
          const attachBlock = attachTxt ? `\n[Attached file: ${attachName}]\n${attachTxt}\n` : '';
          if (conversationPrefix) {
            return `${conversationPrefix}${attachBlock}\nUser: ${userInput}\nAssistant:`;
          }
          return `${attachBlock}${userInput}`;
        })(),
        system,
        config: genkitConfig,
      });
      genkitResult = output;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production' || DEBUG) {
        console.error('[Genkit error]', e);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Genkit raw output]', JSON.stringify(genkitResult, null, 2));
    }

    let text = extractTextRobust(genkitResult);
    if (DEBUG && (!text || !text.trim())) {
      try { console.log('[Gen] no text from Genkit, output shape keys', genkitResult && Object.keys(genkitResult)); } catch {}
    }

    // Fallback: direct OpenAI Chat Completions if Genkit didn’t return text
    if ((!text || !text.trim()) && provider === 'openai') {
      try {
        if (DEBUG && !process.env.OPENAI_API_KEY) {
          console.warn('[OpenAI] Missing OPENAI_API_KEY');
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const attachTxtRaw = typeof attachment?.text === 'string' ? attachment.text : '';
        const attachName = attachment?.name || 'attachment';
        const ATTACH_CAP = 10000;
        const attachTxt = attachTxtRaw ? attachTxtRaw.slice(0, ATTACH_CAP) : '';
        const completion = await openai.chat.completions.create({
          model: optimizer.model.model, // e.g., 'gpt-5-mini' or others
          messages: [
            ...(system ? [{ role: 'system', content: system as string }] : []),
            ...(attachTxt ? [{ role: 'user', content: `Attached file: ${attachName}\n${attachTxt}` as string }] : []),
            ...history.map((m) => ({ role: m.role, content: m.content } as { role: 'user' | 'assistant'; content: string })),
            { role: 'user', content: userInput },
          ],
          temperature: 1, // enforce for gpt-5-mini per requirement; kept for simplicity
          max_tokens: optimizer.model.maxTokens,
        } as any);

        if (process.env.NODE_ENV !== 'production' || DEBUG) {
          console.log('[OpenAI raw completion]', JSON.stringify(completion, null, 2));
        }

        // Try multiple shapes from OpenAI SDK just in case
        text = completion?.choices?.[0]?.message?.content
          ?? (completion as any)?.choices?.[0]?.text
          ?? '';
      } catch (e) {
        if (process.env.NODE_ENV !== 'production' || DEBUG) {
          console.error('[OpenAI fallback error]', e);
        }
      }
    }

    if (!text || !text.trim()) {
      // Return a graceful minimal response instead of an error to avoid leaking raw error JSON into chat
      const friendly = 'No pude generar contenido con los parámetros actuales. Intenta reformular tu mensaje o prueba de nuevo.';
      if (DEBUG) {
        console.warn('[Gen] returning friendly fallback, no text produced');
      }
      return NextResponse.json({ optimizedContent: friendly });
    }

    // Estimate token usage and record per-user usage (best-effort)
    try {
      if (uid) {
        const app = getFirebaseAdminApp();
        const db = getFirestore(app);
        const attachTxtRaw = typeof body?.attachment?.text === 'string' ? body.attachment.text : '';
        const ATTACH_CAP = 10000;
        const attachTxt = attachTxtRaw ? attachTxtRaw.slice(0, ATTACH_CAP) : '';
        const history: Array<{ role: 'user' | 'assistant'; content: string }> = Array.isArray(body?.history)
          ? body.history.map((m: any) => ({ role: (m?.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: String(m?.content ?? '') }))
          : [];
        const conversationPrefix = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
        const system: string = buildSystemPrompt(body?.optimizer?.systemPrompt ?? '', body?.optimizer?.knowledgeBase ?? []);
        const prompt = `${system}\n${conversationPrefix}\n${attachTxt}\n${body?.userInput ?? ''}`;
        const estimatedTokens = Math.ceil((prompt.length + text.length) / 4); // rough approx: 4 chars per token

        const usageRef = db.doc(`users/${uid}/metrics/usage`);
        await usageRef.set(
          {
            totalTokens: FieldValue.increment(estimatedTokens),
            totalRequests: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Usage] Failed to record usage:', e);
      }
    }

    return NextResponse.json({ optimizedContent: text });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[API error] /api/generate-optimized-content', error);
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
