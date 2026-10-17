import dotenv from 'dotenv';
import { z } from 'zod';

const isTestExecution =
  process.env.NODE_ENV === 'test' ||
  process.env.npm_lifecycle_event === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.argv.some((a) => typeof a === 'string' && a.toLowerCase().includes('test')) ||
  process.execArgv.some((a) => typeof a === 'string' && a.toLowerCase().includes('test'));

if (isTestExecution) {
  process.env.NODE_ENV = 'test';
}

dotenv.config();

if (isTestExecution) {
  process.env.NODE_ENV = 'test';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  DIAGNOSTIC_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().default('private-learning-documents'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NVIDIA_PRIMARY_MODEL: z.string().default('nvidia/nemotron-3-ultra-550b-a55b'),
  NVIDIA_SECONDARY_MODEL: z.string().default('openai/gpt-oss-20b'),
  JUDGE0_API_URL: z.string().url().optional(),
  JUDGE0_API_KEY: z.string().optional(),
  PISTON_BASE_URL: z.string().url().optional(),
  PISTON_REQUEST_TIMEOUT_MS: z
    .string()
    .default('10000')
    .transform((val) => parseInt(val, 10)),
  PISTON_MAX_SOURCE_BYTES: z
    .string()
    .default('65536')
    .transform((val) => parseInt(val, 10)),
  PISTON_DEFAULT_MEMORY_LIMIT_KB: z
    .string()
    .default('128000')
    .transform((val) => parseInt(val, 10)),
  PISTON_DEFAULT_CPU_TIME_MS: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10)),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error('Environment configuration validation failed:');
    console.error(formatted);
    console.error('Please verify your .env file matches .env.example.');
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw new Error('Environment validation failed');
  }

  const data = { ...result.data };
  // Harmonize publishable/anon and secret/service-role keys
  const effectivePublishableKey = data.SUPABASE_PUBLISHABLE_KEY || data.SUPABASE_ANON_KEY;
  const effectiveSecretKey = data.SUPABASE_SECRET_KEY || data.SUPABASE_SERVICE_ROLE_KEY;

  if (effectivePublishableKey) {
    data.SUPABASE_PUBLISHABLE_KEY = data.SUPABASE_PUBLISHABLE_KEY || effectivePublishableKey;
    data.SUPABASE_ANON_KEY = data.SUPABASE_ANON_KEY || effectivePublishableKey;
  }

  if (effectiveSecretKey) {
    data.SUPABASE_SECRET_KEY = data.SUPABASE_SECRET_KEY || effectiveSecretKey;
    data.SUPABASE_SERVICE_ROLE_KEY = data.SUPABASE_SERVICE_ROLE_KEY || effectiveSecretKey;
  }

  return data;
}

export const env = loadEnv();

