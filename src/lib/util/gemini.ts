/**
 * Minimal client for Google's Gemini API (Generative Language API), called
 * directly from the browser with the user's API key. Given the current diagram
 * and an instruction, returns updated Mermaid code plus a short summary.
 *
 * Model: gemini-2.5-flash-lite — the most cost-effective Gemini model
 * ($0.10 / $0.40 per 1M input/output tokens as of 2026), which is plenty for
 * generating Mermaid. Change MODEL below to trade cost for capability.
 *
 * The system prompt is composed by the editable "skill" (`src/lib/ai/skill.ts`)
 * from the diagram type and the user's standing preferences — this module just
 * wires it to the API.
 */

import { buildSystemPrompt } from '$/ai/skill';

export const MODEL = 'gemini-2.5-flash-lite';

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string };
}

export interface AiResult {
  code: string;
  summary: string;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', description: 'The complete updated Mermaid diagram source.' },
    summary: { type: 'string', description: 'One short sentence describing what changed.' }
  },
  required: ['code', 'summary']
};

const stripFences = (text: string): string => {
  const fenced = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
};

export const generateMermaid = async ({
  prompt,
  code,
  apiKey,
  diagramType,
  userStyle
}: {
  prompt: string;
  code: string;
  apiKey: string;
  /** Detected type of the current diagram, for type-specific skill guidance. */
  diagramType?: string;
  /** The user's persisted custom instructions (`aiSettings.style`). */
  userStyle?: string;
}): Promise<AiResult> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const body = {
    systemInstruction: { parts: [{ text: buildSystemPrompt({ diagramType, userStyle }) }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Current diagram:\n\n${
              code.trim() || '(empty — create a new diagram)'
            }\n\nInstruction: ${prompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini request failed (${response.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';

  // With responseMimeType JSON the model returns a JSON object; fall back to
  // treating the whole reply as code if parsing somehow fails.
  let result: AiResult;
  try {
    const parsed = JSON.parse(text) as Partial<AiResult>;
    result = { code: stripFences(parsed.code ?? ''), summary: (parsed.summary ?? '').trim() };
  } catch {
    result = { code: stripFences(text), summary: '' };
  }

  if (!result.code) {
    throw new Error('Gemini returned no diagram code.');
  }
  return result;
};
