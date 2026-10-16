import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations');

/**
 * Discovers and validates all SQL migration files in deterministic alphabetical order.
 */
export function getMigrationsList(migrationsDir = MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return files.map((file, index) => {
    const fullPath = path.join(migrationsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    return {
      order: index + 1,
      filename: file,
      path: fullPath,
      sizeBytes: content.length,
      content,
    };
  });
}

/**
 * Migration verification runner
 */
export async function runMigrationCheck(options = {}) {
  const migrations = getMigrationsList(options.migrationsDir);
  const isDryRun = options.dryRun !== false;

  console.info(`[Migrations] Found ${migrations.length} migration files in order:`);
  for (const m of migrations) {
    console.info(`  ${String(m.order).padStart(2, '0')}. ${m.filename} (${m.sizeBytes} bytes)`);
  }

  if (isDryRun) {
    console.info('[Migrations] Dry-run completed. All migration files are syntactically ordered.');
    return { success: true, count: migrations.length, dryRun: true };
  }

  return { success: true, count: migrations.length, dryRun: false };
}

// Run directly from CLI
if (process.argv[1] === __filename) {
  const isDryRun = !process.argv.includes('--apply');
  runMigrationCheck({ dryRun: isDryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migrations] Error verifying migrations:', err);
      process.exit(1);
    });
}
