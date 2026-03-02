#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const args = process.argv.slice(2);

function getArgValue(flag, fallback) {
  const prefix = `${flag}=`;
  const entry = args.find((arg) => arg.startsWith(prefix));
  if (!entry) return fallback;
  return entry.slice(prefix.length);
}

function hasFlag(flag) {
  return args.includes(flag);
}

const envFile = getArgValue('--file', '.env');
const targetArg = getArgValue('--targets', 'production');
const dryRun = hasFlag('--dry-run');
const targets = targetArg
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (targets.length === 0) {
  console.error('[vercel:env:sync] no targets provided');
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFile);
if (!fs.existsSync(envPath)) {
  console.error(`[vercel:env:sync] env file not found: ${envPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(envPath, 'utf8');
const parsed = dotenv.parse(raw);
const entries = Object.entries(parsed).filter(([key]) => key && key.trim().length > 0);

if (entries.length === 0) {
  console.error('[vercel:env:sync] no env entries parsed');
  process.exit(1);
}

console.log(
  `[vercel:env:sync] file=${envFile}, keys=${entries.length}, targets=${targets.join(',')}, dryRun=${dryRun}`
);

const token = process.env.VERCEL_TOKEN;
let completed = 0;

for (const [key, value] of entries) {
  for (const target of targets) {
    const cmdArgs = [
      'vercel',
      'env',
      'add',
      key,
      target,
      '--force',
      '--yes',
      '--non-interactive',
      '--value',
      value,
    ];
    if (token) {
      cmdArgs.push('--token', token);
    }

    if (dryRun) {
      console.log(`[dry-run] upsert ${key} -> ${target}`);
      completed += 1;
      continue;
    }

    const result = spawnSync('npx', cmdArgs, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const stderr = (result.stderr || '').trim();
      const stdout = (result.stdout || '').trim();
      console.error(`[vercel:env:sync] failed: ${key} -> ${target}`);
      if (stderr) console.error(stderr);
      if (stdout) console.error(stdout);
      if (!stderr && !stdout) {
        console.error(
          '[vercel:env:sync] no CLI output captured. Check Vercel login/token state (`npx vercel whoami`).'
        );
      }
      process.exit(result.status || 1);
    }

    console.log(`[ok] upsert ${key} -> ${target}`);
    completed += 1;
  }
}

console.log(`[vercel:env:sync] done (${completed} upserts)`);
