import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let defaultClient = null;
let serviceClient = null;

/**
 * Validates that required Supabase environment variables are defined.
 * Fails clearly with a descriptive ConfigurationError if required variables are missing.
 *
 * @returns {{ url: string, key: string }}
 */
export function validateSupabaseConfig() {
  const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const missing = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!key) missing.push('SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)');

  if (missing.length > 0) {
    const error = new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}. Please verify your .env file matches .env.example.`
    );
    error.name = 'ConfigurationError';
    error.code = 'CONFIG_MISSING_SUPABASE';
    throw error;
  }

  return { url, key };
}

/**
 * Creates a new Supabase client configured for non-persistent server-side execution.
 *
 * @param {string} url - Supabase project URL
 * @param {string} key - Supabase publishable/anon key (or service-role key for reviewed privileged ops)
 * @param {object} [customOptions={}] - Optional client overrides
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createSupabaseClient(url, key, customOptions = {}) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    const error = new Error('Supabase client requires a valid project URL');
    error.name = 'ConfigurationError';
    throw error;
  }
  if (!key || typeof key !== 'string' || !key.trim()) {
    const error = new Error('Supabase client requires a valid API key');
    error.name = 'ConfigurationError';
    throw error;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...customOptions,
  });
}

/**
 * Returns the default singleton Supabase client using server environment variables.
 * Fails clearly during invocation if required environment variables are missing.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (defaultClient) {
    return defaultClient;
  }

  const { url, key } = validateSupabaseConfig();
  defaultClient = createSupabaseClient(url, key);
  return defaultClient;
}

/**
 * Creates a privileged service-role client strictly for reviewed administrative operations.
 * Never exposed to frontend code or mounted as a global unreviewed default.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getPrivilegedSupabaseClient() {
  if (serviceClient) {
    return serviceClient;
  }

  const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    const error = new Error(
      'Missing required Supabase service-role credentials: SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.'
    );
    error.name = 'ConfigurationError';
    throw error;
  }

  serviceClient = createSupabaseClient(url, secretKey);
  return serviceClient;
}

/**
 * Resets cached singleton instances (primarily used in tests or re-configuration).
 */
export function resetSupabaseClient() {
  defaultClient = null;
  serviceClient = null;
}

/**
 * Safely probes database connectivity against an existing harmless table ('profiles')
 * without exposing credentials, sensitive error messages, SQL details, or table rows.
 *
 * @param {object} [options={}]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client] - Injected client
 * @returns {Promise<{ ok: boolean, status: string, latencyMs: number, timestamp: string, error?: string }>}
 */
export async function checkDatabaseConnection(options = {}) {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  let client = options.client;

  if (!client) {
    try {
      client = getSupabaseClient();
    } catch (configErr) {
      return {
        ok: false,
        status: 'misconfigured',
        latencyMs: Date.now() - start,
        timestamp,
        error: configErr.message || 'Supabase configuration is invalid or missing',
      };
    }
  }

  try {
    // Harmless read test on existing profiles table with limit 1
    // RLS will safely filter rows without mutating any data
    const { error, status } = await client
      .from('profiles')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - start;

    if (error) {
      console.error('[Supabase Diagnostics] Database query returned an error:', {
        code: error.code,
        message: error.message,
        status,
      });

      return {
        ok: false,
        status: 'disconnected',
        httpStatus: status || 500,
        latencyMs,
        timestamp,
        error: 'Database query probe failed',
      };
    }

    return {
      ok: true,
      status: 'connected',
      latencyMs,
      timestamp,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    console.error('[Supabase Diagnostics] Unhandled exception during database probe:', err.message);

    return {
      ok: false,
      status: 'unreachable',
      latencyMs,
      timestamp,
      error: 'Database service unreachable',
    };
  }
}

/**
 * Lazy proxy exporting the default Supabase client instance.
 */
export const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
