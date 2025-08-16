#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { run: false, plan: false, maxParallel: 2, config: null };
  argv.forEach((arg, i) => {
    if (arg === '--run') args.run = true;
    if (arg === '--plan') args.plan = true;
    if (arg.startsWith('--max-parallel=')) {
      const v = Number(arg.split('=')[1]);
      if (!Number.isNaN(v) && v > 0) args.maxParallel = v;
    }
    if (arg.startsWith('--config=')) {
      const p = arg.split('=')[1];
      if (p) args.config = p;
    }
  });
  return args;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function loadConfig(configPath) {
  const fullPath = path.resolve(configPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing tasks config at ${fullPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  try {
    const cfg = JSON.parse(raw);
    if (!Array.isArray(cfg.tasks)) throw new Error('tasks must be an array');
    return cfg;
  } catch (e) {
    console.error('Invalid tasks.config.json:', e.message);
    process.exit(1);
  }
}

function runTask(task, options) {
  return new Promise((resolve) => {
    const rootDir = options.rootDir;
    const runLogsDir = options.runLogsDir;

    if (task.skipIf && fs.existsSync(path.resolve(rootDir, task.skipIf))) {
      return resolve({ id: task.id, status: 'skipped', code: 0 });
    }

    const logFile = path.resolve(runLogsDir, `${timestamp()}_${task.id}.log`);
    const outStream = fs.createWriteStream(logFile, { flags: 'a' });

    const child = spawn(task.cmd, {
      cwd: path.resolve(rootDir, task.cwd || '.'),
      shell: true,
      env: process.env,
    });

    child.stdout.on('data', (d) => {
      process.stdout.write(`[${task.id}] ${d}`);
      outStream.write(d);
    });
    child.stderr.on('data', (d) => {
      process.stderr.write(`[${task.id}] ${d}`);
      outStream.write(d);
    });

    child.on('close', (code) => {
      outStream.end();
      resolve({ id: task.id, status: code === 0 ? 'ok' : 'error', code });
    });
  });
}

async function runQueue(tasks, maxParallel, options) {
  const results = [];
  let index = 0;
  const running = new Set();

  return new Promise((resolve) => {
    function launchNext() {
      while (running.size < maxParallel && index < tasks.length) {
        const task = tasks[index++];
        const p = runTask(task, options).then((r) => {
          running.delete(p);
          results.push(r);
          launchNext();
        });
        running.add(p);
      }
      if (running.size === 0 && index >= tasks.length) {
        resolve(results);
      }
    }
    launchNext();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const runLogsDir = path.resolve(rootDir, 'run_logs');
  const thirdPartyDir = path.resolve(rootDir, 'third_party');
  ensureDir(runLogsDir);
  ensureDir(thirdPartyDir);

  const cfgPath = args.config ? path.resolve(rootDir, args.config) : path.resolve(rootDir, 'tools', 'tasks.config.json');
  const cfg = loadConfig(cfgPath);

  if (args.plan) {
    console.log('Planned tasks:');
    cfg.tasks.forEach((t) => {
      console.log(`- ${t.id}: ${t.cmd}`);
    });
  }

  if (args.run) {
    const results = await runQueue(cfg.tasks, args.maxParallel || cfg.maxParallel || 2, { rootDir, runLogsDir });
    const summary = results.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Task summary:', summary);
    const failed = results.filter((r) => r.status !== 'ok');
    if (failed.length > 0) {
      console.error('Some tasks failed:', failed.map((f) => `${f.id} (code ${f.code})`).join(', '));
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
