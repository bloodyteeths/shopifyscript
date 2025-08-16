#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const taskId = process.argv[3];
const note = process.argv.slice(4).join(' ') || '';
if (!file || !taskId) {
  console.error('Usage: node tools/audit.js <roadmap-file> <task-id> [note]');
  process.exit(1);
}
const abs = path.resolve(process.cwd(), file);
const ts = new Date().toISOString();
const block = `\n---\n\n## Agent Audit — ${ts}\n\n- ${taskId} — done\n  - ${note}\n`;
try {
  fs.appendFileSync(abs, block);
  process.stdout.write('ok');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}


