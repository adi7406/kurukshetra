import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runSmokeTests } from '../src/scripts/smokeTest.js';
import { getMigrationsList, runMigrationCheck } from '../src/scripts/migrate.js';

describe('Staging and Production Deployment Verification (TASK-039)', () => {
  it('discovers and verifies all SQL migration files in strict sequential order', async () => {
    const migrations = getMigrationsList();
    assert.ok(migrations.length >= 11, 'Must have at least 11 migrations');

    // Verify ordering
    const prefixes = migrations.map((m) => m.filename.substring(0, 4));
    for (let i = 0; i < prefixes.length; i++) {
      const expectedPrefix = String(i + 1).padStart(4, '0');
      assert.equal(
        prefixes[i],
        expectedPrefix,
        `Migration ${migrations[i].filename} is out of sequential order!`
      );
      assert.ok(migrations[i].sizeBytes > 0, `Migration ${migrations[i].filename} is empty`);
    }

    const checkResult = await runMigrationCheck({ dryRun: true });
    assert.equal(checkResult.success, true);
    assert.equal(checkResult.dryRun, true);
  });

  it('runs non-destructive post-deployment smoke test suite with 100% pass rate', async () => {
    const { allPassed, results } = await runSmokeTests();
    assert.equal(allPassed, true);
    assert.ok(results.passed >= 5);
    assert.equal(results.failed, 0);
  });
});
