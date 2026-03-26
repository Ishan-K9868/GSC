import {
  GoogleGenerativeAI,
  SchemaType,
  type Part,
  type ResponseSchema,
} from '@google/generative-ai';

export type GeminiModelTier = 'flash' | 'pro';

export type AiExecutionMeta = {
  provider: 'gemini_api_key' | 'fallback';
  model: string;
  degraded: boolean;
  warning?: string;
};

type GenerateStructuredOptions = {
  task: string;
  model?: GeminiModelTier;
  temperature?: number;
  maxOutputTokens?: number;
  parts?: Part[];
  schema?: ResponseSchema;
};

type StructuredResult<T> = {
  data: T;
  meta: AiExecutionMeta;
};

const FLASH_MODEL = process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash';
const PRO_MODEL = process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro';

let geminiClient: GoogleGenerativeAI | null = null;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return apiKey;
}

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(getApiKey());
  }
  return geminiClient;
}

export function getModelName(model: GeminiModelTier = 'flash'): string {
  return model === 'pro' ? PRO_MODEL : FLASH_MODEL;
}

export function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getGeminiProvider(): AiExecutionMeta['provider'] {
  return hasGeminiApiKey() ? 'gemini_api_key' : 'fallback';
}

export async function generateStructuredJson<T>(
  prompt: string,
  options: GenerateStructuredOptions
): Promise<StructuredResult<T>> {
  const modelName = getModelName(options.model || 'flash');
  const model = getClient().getGenerativeModel({ model: modelName });
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: options.parts || [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
      responseMimeType: 'application/json',
      ...(options.schema ? { responseSchema: options.schema } : {}),
    },
  });

  const rawText = result.response.text();
  const finishReason = result.response.candidates?.[0]?.finishReason;

  let data: T;
  try {
    data = parseJsonResponse<T>(rawText, options.task);
  } catch (error) {
    if (finishReason === 'MAX_TOKENS') {
      throw new Error(`Gemini response hit MAX_TOKENS for ${options.task}`);
    }
    throw error;
  }

  return {
    data,
    meta: {
      provider: 'gemini_api_key',
      model: modelName,
      degraded: false,
    },
  };
}

export async function generateStructuredJsonFromImage<T>(input: {
  task: string;
  prompt: string;
  imageBuffer: Buffer;
  mimeType: string;
  model?: GeminiModelTier;
  temperature?: number;
  maxOutputTokens?: number;
  schema?: ResponseSchema;
}): Promise<StructuredResult<T>> {
  return generateStructuredJson<T>(input.prompt, {
    task: input.task,
    model: input.model,
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
    schema: input.schema,
    parts: [
      { text: input.prompt },
      {
        inlineData: {
          data: input.imageBuffer.toString('base64'),
          mimeType: input.mimeType,
        },
      },
    ],
  });
}

export function buildFallbackMeta(task: string, error: unknown, model: GeminiModelTier = 'flash'): AiExecutionMeta {
  return {
    provider: 'fallback',
    model: getModelName(model),
    degraded: true,
    warning: describeGeminiFailure(task, error),
  };
}

export function describeGeminiFailure(task: string, error: unknown): string {
  const message = extractErrorMessage(error);
  return `${task} failed: ${message}. Using fallback output.`;
}

export const geminiSchema = {
  string(description?: string, nullable = false): ResponseSchema {
    return {
      type: SchemaType.STRING,
      ...(description ? { description } : {}),
      ...(nullable ? { nullable: true } : {}),
    };
  },
  enum(values: string[], description?: string, nullable = false): ResponseSchema {
    return {
      type: SchemaType.STRING,
      format: 'enum',
      enum: values,
      ...(description ? { description } : {}),
      ...(nullable ? { nullable: true } : {}),
    } as ResponseSchema;
  },
  number(description?: string, nullable = false): ResponseSchema {
    return {
      type: SchemaType.NUMBER,
      ...(description ? { description } : {}),
      ...(nullable ? { nullable: true } : {}),
    };
  },
  integer(description?: string, nullable = false): ResponseSchema {
    return {
      type: SchemaType.INTEGER,
      ...(description ? { description } : {}),
      ...(nullable ? { nullable: true } : {}),
    };
  },
  boolean(description?: string, nullable = false): ResponseSchema {
    return {
      type: SchemaType.BOOLEAN,
      ...(description ? { description } : {}),
      ...(nullable ? { nullable: true } : {}),
    };
  },
  array(items: ResponseSchema, description?: string): ResponseSchema {
    return {
      type: SchemaType.ARRAY,
      items,
      ...(description ? { description } : {}),
    };
  },
  object(properties: Record<string, ResponseSchema>, required: string[] = [], description?: string): ResponseSchema {
    return {
      type: SchemaType.OBJECT,
      properties,
      ...(required.length > 0 ? { required } : {}),
      ...(description ? { description } : {}),
    };
  },
};

function parseJsonResponse<T>(text: string, task: string): T {
  const normalized = text.trim().replace(/^\uFEFF/, '');
  if (!normalized) {
    throw new Error(`Empty Gemini response for ${task}`);
  }

  for (const candidate of buildParseCandidates(normalized)) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Try next candidate.
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`Gemini raw response preview for ${task}:`, normalized.slice(0, 1200));
  }

  throw new Error(`Unable to parse Gemini JSON response for ${task}`);
}

function buildParseCandidates(text: string): string[] {
  const candidates = new Set<string>();

  const push = (value: string | undefined) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    candidates.add(trimmed);
    candidates.add(repairJsonLike(trimmed));
  };

  push(text);
  push(text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]);
  push(text.match(/\{[\s\S]*\}/)?.[0]);
  push(text.match(/\[[\s\S]*\]/)?.[0]);

  return Array.from(candidates);
}

function repairJsonLike(value: string): string {
  return value
    .replace(/^json\s*/i, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/:\s*"([^"\\\n]*)$/m, ': "$1"')
    .replace(/\n+/g, '\n');
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'unknown Gemini error';
}
