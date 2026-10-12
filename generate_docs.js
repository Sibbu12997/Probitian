#!/usr/bin/env node
/**
 * Documentation maintenance check.
 *
 * Source documents are maintained directly in /docs. We intentionally do not
 * generate duplicate public Markdown or PDF exports; those copies became stale
 * and were removed. This command verifies that the core documentation entry
 * points exist without writing generated files.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/DATABASE_ARCHITECTURE.md',
  'docs/DATABASE_MIGRATIONS.md',
  'docs/SECURITY.md',
  'docs/DEPLOYMENT_WORKFLOW.md',
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error('[Docs Check] Missing required source documents:');
  for (const file of missing) console.error(` - ${file}`);
  process.exitCode = 1;
} else {
  console.log('[Docs Check] Source documentation is present. No duplicate exports generated.');
}
