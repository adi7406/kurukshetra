import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';

export const PISTON_LANGUAGE_MAP = {
  python: { language: 'python', defaultVersion: '3.10.0', extension: 'py', defaultFile: 'solution.py' },
  javascript: { language: 'javascript', defaultVersion: '18.15.0', extension: 'js', defaultFile: 'solution.js' },
  cpp: { language: 'c++', defaultVersion: '10.2.0', extension: 'cpp', defaultFile: 'solution.cpp' },
  'c++': { language: 'c++', defaultVersion: '10.2.0', extension: 'cpp', defaultFile: 'solution.cpp' },
  java: { language: 'java', defaultVersion: '15.0.2', extension: 'java', defaultFile: 'Solution.java' },
  c: { language: 'c', defaultVersion: '10.2.0', extension: 'c', defaultFile: 'solution.c' },
  go: { language: 'go', defaultVersion: '1.16.2', extension: 'go', defaultFile: 'solution.go' },
};

// In-memory runtime cache with 5-minute TTL
let runtimesCache = null;
let runtimesCacheExpiresAt = 0;

export const pistonAdapter = {
  /**
   * Resolve language configuration
   */
  resolveLanguage(lang) {
    if (!lang) {
      throw new ValidationError('Programming language is required.');
    }
    const key = String(lang).toLowerCase().trim();
    const config = PISTON_LANGUAGE_MAP[key];
    if (!config) {
      throw new ValidationError(
        `Language '${lang}' is not supported. Supported: ${Object.keys(PISTON_LANGUAGE_MAP).filter((k) => k !== 'c++').join(', ')}`
      );
    }
    return { key, ...config };
  },

  /**
   * Fetch verified installed runtimes from Piston service
   */
  async getInstalledRuntimes(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && runtimesCache && now < runtimesCacheExpiresAt) {
      return runtimesCache;
    }

    const baseUrl = env.PISTON_BASE_URL;
    if (!baseUrl) {
      // Offline fallback: return standard defaults
      const defaults = Object.entries(PISTON_LANGUAGE_MAP)
        .filter(([k]) => k !== 'c++')
        .map(([k, v]) => ({
          language: k,
          pistonLanguage: v.language,
          version: v.defaultVersion,
          aliases: [k],
        }));
      runtimesCache = defaults;
      runtimesCacheExpiresAt = now + 60 * 1000;
      return defaults;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), env.PISTON_REQUEST_TIMEOUT_MS || 5000);

      const response = await fetch(`${baseUrl}/api/v2/runtimes`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Piston returned status ${response.status}`);
      }

      const list = await response.json();
      if (Array.isArray(list)) {
        runtimesCache = list;
        runtimesCacheExpiresAt = now + 5 * 60 * 1000; // 5 mins
        return list;
      }
    } catch (err) {
      console.warn(`[Piston Adapter] Unable to reach Piston at ${baseUrl}: ${err.message}`);
    }

    // Default fallback if query fails
    return Object.entries(PISTON_LANGUAGE_MAP)
      .filter(([k]) => k !== 'c++')
      .map(([k, v]) => ({
        language: k,
        pistonLanguage: v.language,
        version: v.defaultVersion,
        aliases: [k],
      }));
  },

  /**
   * Resolve the active version for a requested language from installed runtimes
   */
  async resolveRuntimeVersion(languageKey) {
    const langConfig = this.resolveLanguage(languageKey);
    const runtimes = await this.getInstalledRuntimes();

    const matched = runtimes.find((r) => {
      const rLang = (r.language || '').toLowerCase();
      const aliases = Array.isArray(r.aliases) ? r.aliases.map((a) => a.toLowerCase()) : [];
      return rLang === langConfig.language || aliases.includes(langConfig.key) || aliases.includes(langConfig.language);
    });

    return matched ? matched.version : langConfig.defaultVersion;
  },

  /**
   * Execute code in self-hosted Piston sandbox
   */
  async execute({ language, sourceCode, stdin = '', limits = {} }) {
    const langConfig = this.resolveLanguage(language);
    const maxSourceBytes = env.PISTON_MAX_SOURCE_BYTES || 65536;
    const maxStdinBytes = 32768;

    // Validate source code size
    const sourceBytes = Buffer.byteLength(sourceCode || '', 'utf8');
    if (sourceBytes > maxSourceBytes) {
      throw new ValidationError(`Source code size (${sourceBytes} bytes) exceeds limit of ${maxSourceBytes} bytes.`);
    }

    // Validate stdin size
    const stdinBytes = Buffer.byteLength(stdin || '', 'utf8');
    if (stdinBytes > maxStdinBytes) {
      throw new ValidationError(`Input size (${stdinBytes} bytes) exceeds limit of ${maxStdinBytes} bytes.`);
    }

    const version = await this.resolveRuntimeVersion(langConfig.key);
    const baseUrl = env.PISTON_BASE_URL || 'http://127.0.0.1:2000';
    const timeLimitMs = limits.timeLimitMs || env.PISTON_DEFAULT_CPU_TIME_MS || 3000;
    const memoryLimitKb = limits.memoryLimitMb ? limits.memoryLimitMb * 1024 : env.PISTON_DEFAULT_MEMORY_LIMIT_KB || 128000;

    const requestBody = {
      language: langConfig.language,
      version,
      files: [
        {
          name: langConfig.defaultFile,
          content: sourceCode,
        },
      ],
      stdin: stdin || '',
      args: [],
      compile_timeout: 10000,
      run_timeout: timeLimitMs,
      compile_memory_limit: -1,
      run_memory_limit: memoryLimitKb * 1024, // in bytes
    };

    const startTime = Date.now();
    let response = null;

    try {
      const controller = new AbortController();
      const timeoutMs = (env.PISTON_REQUEST_TIMEOUT_MS || 10000) + timeLimitMs;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      response = await fetch(`${baseUrl}/api/v2/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (err) {
      const durationMs = Date.now() - startTime;
      if (err.name === 'AbortError') {
        return {
          status: 'time_limit',
          stdout: null,
          stderr: `Time Limit Exceeded: Execution took longer than permitted limit (${timeLimitMs}ms).`,
          exitCode: 124,
          runtimeMs: timeLimitMs,
          memoryBytes: 0,
        };
      }
      return {
        status: 'infrastructure_error',
        stdout: null,
        stderr: `Sandbox communication failure: ${err.message}`,
        exitCode: 500,
        runtimeMs: durationMs,
        memoryBytes: 0,
      };
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        status: 'infrastructure_error',
        stdout: null,
        stderr: `Piston execution failed with status ${response.status}: ${errText}`,
        exitCode: response.status,
        runtimeMs: durationMs,
        memoryBytes: 0,
      };
    }

    const data = await response.json();
    return this.normalizePistonResponse(data, durationMs, timeLimitMs);
  },

  /**
   * Normalize Piston result into stable MasterPath result format
   */
  normalizePistonResponse(data, fallbackDurationMs = 0, timeLimitMs = 3000) {
    const compile = data.compile;
    const run = data.run || {};

    // 1. Compilation Error
    if (compile && compile.code !== 0) {
      return {
        status: 'compile_error',
        stdout: null,
        stderr: compile.output || compile.stderr || 'Compilation error',
        exitCode: compile.code,
        runtimeMs: fallbackDurationMs,
        memoryBytes: 0,
      };
    }

    // 2. Timeout (SIGKILL / SIGTERM or output indication)
    if (run.signal === 'SIGKILL' || run.signal === 'SIGTERM' || (run.stderr && run.stderr.includes('Time Limit Exceeded'))) {
      return {
        status: 'time_limit',
        stdout: run.stdout || null,
        stderr: `Time Limit Exceeded: Program exceeded CPU limit (${timeLimitMs}ms)`,
        exitCode: 124,
        runtimeMs: timeLimitMs,
        memoryBytes: 0,
      };
    }

    // 3. Runtime Error
    if (run.code !== 0) {
      return {
        status: 'runtime_error',
        stdout: run.stdout || null,
        stderr: run.stderr || run.output || `Program exited with non-zero code ${run.code}`,
        exitCode: run.code,
        runtimeMs: fallbackDurationMs,
        memoryBytes: 0,
      };
    }

    // 4. Success / Output Produced
    return {
      status: 'success',
      stdout: run.stdout !== undefined ? run.stdout : (run.output || ''),
      stderr: run.stderr || null,
      exitCode: 0,
      runtimeMs: fallbackDurationMs,
      memoryBytes: 0,
    };
  },

  /**
   * Probe Piston reachability for health checks
   */
  async checkHealth() {
    const baseUrl = env.PISTON_BASE_URL;
    if (!baseUrl) {
      return {
        configured: false,
        reachable: false,
        message: 'PISTON_BASE_URL not configured. Running in simulated fallback mode.',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${baseUrl}/api/v2/runtimes`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const runtimes = await res.json();
        return {
          configured: true,
          reachable: true,
          url: baseUrl,
          runtimesCount: Array.isArray(runtimes) ? runtimes.length : 0,
        };
      }
      return {
        configured: true,
        reachable: false,
        status: res.status,
        url: baseUrl,
      };
    } catch (err) {
      return {
        configured: true,
        reachable: false,
        url: baseUrl,
        error: err.message,
      };
    }
  },
};

export default pistonAdapter;
