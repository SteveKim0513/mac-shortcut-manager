import { spawn } from 'node:child_process';
import fs from 'node:fs';
import type { RunResult } from '../shared/types';

const TIMEOUT_MS = 30_000;
const OUTPUT_CAP = 4000;

export function runScript(filePath: string): Promise<RunResult> {
  return new Promise((resolve) => {
    try {
      fs.chmodSync(filePath, 0o755);
    } catch {
      // File may already be executable, or the user manages permissions
      // themselves — either way this is best-effort, not load-bearing.
    }

    const child = spawn('/bin/zsh', [filePath], { timeout: TIMEOUT_MS });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout = (stdout + chunk.toString()).slice(0, OUTPUT_CAP);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(0, OUTPUT_CAP);
    });
    child.on('close', (code) => {
      resolve({ success: code === 0, code, stdout, stderr });
    });
    child.on('error', (err) => {
      resolve({ success: false, code: null, stdout, stderr: String(err) });
    });
  });
}
