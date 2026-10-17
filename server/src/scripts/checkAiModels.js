import dotenv from 'dotenv';
dotenv.config();

import { aiProvider, NVIDIA_CONFIG } from '../integrations/aiProvider.js';

async function runCheck() {
  console.log('=====================================================');
  console.log('   MasterPath: NVIDIA AI Dual-Model Diagnostic Probe');
  console.log('=====================================================');
  console.log(`Base URL:         ${NVIDIA_CONFIG.BASE_URL}`);
  console.log(`Primary Model:    ${NVIDIA_CONFIG.PRIMARY_MODEL}`);
  console.log(`Secondary Model:  ${NVIDIA_CONFIG.SECONDARY_MODEL}`);
  console.log('-----------------------------------------------------');

  console.log('Probing configured models independently...\n');

  const result = await aiProvider.runAllModelDiagnostics();

  console.log('[PRIMARY MODEL]');
  console.log(`  Model ID:     ${result.models.primary.model}`);
  console.log(`  Status:       ${result.models.primary.success ? 'ONLINE (SUCCESS)' : 'OFFLINE (FAILED)'}`);
  console.log(`  Latency:      ${result.models.primary.latencyMs}ms`);
  if (result.models.primary.success) {
    console.log(`  Sanitized:    "${result.models.primary.preview}"`);
    console.log(`  Tokens:       ${JSON.stringify(result.models.primary.usage)}`);
  } else {
    console.log(`  Error Class:  ${result.models.primary.errorCategory}`);
    console.log(`  Safe Reason:  ${result.models.primary.errorMessage}`);
  }

  console.log('\n[SECONDARY MODEL]');
  console.log(`  Model ID:     ${result.models.secondary.model}`);
  console.log(`  Status:       ${result.models.secondary.success ? 'ONLINE (SUCCESS)' : 'OFFLINE (FAILED)'}`);
  console.log(`  Latency:      ${result.models.secondary.latencyMs}ms`);
  if (result.models.secondary.success) {
    console.log(`  Sanitized:    "${result.models.secondary.preview}"`);
    console.log(`  Tokens:       ${JSON.stringify(result.models.secondary.usage)}`);
  } else {
    console.log(`  Error Class:  ${result.models.secondary.errorCategory}`);
    console.log(`  Safe Reason:  ${result.models.secondary.errorMessage}`);
  }

  console.log('\n-----------------------------------------------------');
  console.log(`Overall Health:   ${result.overallHealthy ? 'HEALTHY' : result.degraded ? 'DEGRADED' : 'UNAVAILABLE'}`);
  console.log('=====================================================');

  if (!result.overallHealthy && !result.degraded) {
    process.exit(1);
  }
}

runCheck().catch((err) => {
  console.error('[Diagnostic Failure]:', err.message);
  process.exit(1);
});
