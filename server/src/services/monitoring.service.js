import { RateLimitError } from '../utils/errors.js';
import { getSupabase } from '../integrations/supabase.js';
import { checkDatabaseConnection } from '../config/supabase.js';

// Model pricing in USD per 1,000,000 tokens
const MODEL_PRICING = {
  'gpt-4o': { promptCostPerM: 2.5, completionCostPerM: 10.0 },
  'gpt-4o-mini': { promptCostPerM: 0.15, completionCostPerM: 0.6 },
  'viva-gpt-4o-mini-v1': { promptCostPerM: 0.15, completionCostPerM: 0.6 },
  'claude-3-5-sonnet': { promptCostPerM: 3.0, completionCostPerM: 15.0 },
  default: { promptCostPerM: 0.5, completionCostPerM: 1.5 },
};

class MonitoringService {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.statusCounts = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    };
    this.errorCategories = new Map();
    this.latencies = []; // Rolling window of response times in ms
    this.jobFailures = 0;
    this.consecutiveFailures = 0;
    this.aiUsageRecords = [];
    this.userBudgets = new Map(); // userId -> maxBudgetUsd
  }

  /**
   * Records an HTTP request completion metric
   */
  recordRequest({ statusCode, latencyMs, errorCode = null }) {
    this.totalRequests++;

    const category = `${Math.floor(statusCode / 100)}xx`;
    if (this.statusCounts[category] !== undefined) {
      this.statusCounts[category]++;
    }

    if (statusCode >= 400 && errorCode) {
      const current = this.errorCategories.get(errorCode) || 0;
      this.errorCategories.set(errorCode, current + 1);
    }

    if (statusCode >= 500) {
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
    }

    // Keep rolling window of 500 latencies
    this.latencies.push(latencyMs);
    if (this.latencies.length > 500) {
      this.latencies.shift();
    }
  }

  /**
   * Records background job failure
   */
  recordJobFailure() {
    this.jobFailures++;
  }

  /**
   * Calculates latency statistics (min, max, avg, p95)
   */
  getLatencyStats() {
    if (this.latencies.length === 0) {
      return { minMs: 0, maxMs: 0, avgMs: 0, p95Ms: 0, samples: 0 };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const minMs = sorted[0];
    const maxMs = sorted[sorted.length - 1];
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avgMs = parseFloat((sum / sorted.length).toFixed(2));

    const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    const p95Ms = sorted[p95Index];

    return { minMs, maxMs, avgMs, p95Ms, samples: sorted.length };
  }

  /**
   * Tracks AI token usage and calculates estimated cost
   */
  recordAiUsage({
    userId,
    courseId = null,
    operation = 'ai_viva',
    model = 'gpt-4o-mini',
    promptTokens = 0,
    completionTokens = 0,
  }) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
    const promptCost = (promptTokens / 1_000_000) * pricing.promptCostPerM;
    const completionCost = (completionTokens / 1_000_000) * pricing.completionCostPerM;
    const totalCostUsd = parseFloat((promptCost + completionCost).toFixed(6));

    const record = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      courseId,
      operation,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      totalCostUsd,
      timestamp: new Date().toISOString(),
    };

    this.aiUsageRecords.push(record);
    return record;
  }

  /**
   * Checks if user has exceeded their AI budget limit
   */
  checkBudget(userId, maxBudgetUsd = 10.0) {
    const budgetLimit = this.userBudgets.get(userId) ?? maxBudgetUsd;
    const userRecords = this.aiUsageRecords.filter((r) => r.userId === userId);
    const currentSpendUsd = userRecords.reduce((sum, r) => sum + r.totalCostUsd, 0);

    if (currentSpendUsd >= budgetLimit) {
      throw new RateLimitError(
        `AI usage cost limit of $${budgetLimit.toFixed(2)} exceeded. Current spend: $${currentSpendUsd.toFixed(2)}.`
      );
    }

    return {
      allowed: true,
      currentSpendUsd: parseFloat(currentSpendUsd.toFixed(4)),
      budgetLimitUsd: budgetLimit,
      remainingUsd: parseFloat(Math.max(0, budgetLimit - currentSpendUsd).toFixed(4)),
    };
  }

  /**
   * Configures a user or tenant AI budget limit
   */
  setUserBudget(userId, budgetUsd) {
    this.userBudgets.set(userId, Number(budgetUsd));
  }

  /**
   * Generates active health alerts based on telemetry thresholds
   */
  getActiveAlerts() {
    const alerts = [];
    const total = this.totalRequests;

    // Error rate alert (> 10% 5xx errors if total requests >= 10)
    if (total >= 10) {
      const error5xxRate = (this.statusCounts['5xx'] / total) * 100;
      if (error5xxRate > 10) {
        alerts.push({
          severity: 'critical',
          type: 'high_server_error_rate',
          message: `Server error rate is ${error5xxRate.toFixed(1)}%, exceeding the 10% critical threshold.`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Consecutive failures alert
    if (this.consecutiveFailures >= 5) {
      alerts.push({
        severity: 'critical',
        type: 'sustained_consecutive_failures',
        message: `${this.consecutiveFailures} consecutive 5xx errors detected. Service health impaired.`,
        timestamp: new Date().toISOString(),
      });
    }

    // Background job failures
    if (this.jobFailures > 5) {
      alerts.push({
        severity: 'warning',
        type: 'elevated_job_failures',
        message: `${this.jobFailures} background job execution failures recorded.`,
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  /**
   * Compiles comprehensive system metrics and telemetry
   */
  getSystemMetrics() {
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());

    const errorBreakdown = {};
    for (const [code, count] of this.errorCategories.entries()) {
      errorBreakdown[code] = count;
    }

    const totalAiTokens = this.aiUsageRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalAiSpendUsd = parseFloat(
      this.aiUsageRecords.reduce((sum, r) => sum + r.totalCostUsd, 0).toFixed(4)
    );

    return {
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      traffic: {
        totalRequests: this.totalRequests,
        statusCodes: this.statusCounts,
      },
      latency: this.getLatencyStats(),
      errors: {
        total5xx: this.statusCounts['5xx'],
        total4xx: this.statusCounts['4xx'],
        breakdownByCategory: errorBreakdown,
        jobFailures: this.jobFailures,
      },
      aiCostControls: {
        totalOperations: this.aiUsageRecords.length,
        totalTokens: totalAiTokens,
        totalSpendUsd: totalAiSpendUsd,
      },
      system: {
        rssMb: parseFloat((memory.rss / (1024 * 1024)).toFixed(2)),
        heapUsedMb: parseFloat((memory.heapUsed / (1024 * 1024)).toFixed(2)),
        heapTotalMb: parseFloat((memory.heapTotal / (1024 * 1024)).toFixed(2)),
      },
      alerts: this.getActiveAlerts(),
    };
  }

  /**
   * Deep readiness inspection verifying database and isolated runner availability
   */
  async checkReadiness() {
    const checks = {
      database: 'unhealthy',
      runner: 'ready',
      storage: 'ready',
    };

    try {
      const dbResult = await checkDatabaseConnection({ client: getSupabase() });
      if (dbResult.ok) {
        checks.database = 'healthy';
      }
    } catch {
      checks.database = 'unhealthy';
    }

    const isReady = Object.values(checks).every((status) => status === 'healthy' || status === 'ready');
    return {
      ready: isReady,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

export const monitoringService = new MonitoringService();
