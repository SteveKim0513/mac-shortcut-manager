import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { helpersDir } from './helpers';
import { cleanupOldLogs, startExecLog, zshVersion } from './exec-log';
import type { RunResult } from '../shared/types';

const TIMEOUT_MS = 30_000;
const OUTPUT_CAP = 4000;

/** Buffers partial chunks and emits complete lines — stdout/stderr data
 * events don't align with line boundaries. */
function lineSplitter(onLine: (line: string) => void) {
  let buffer = '';
  return {
    write(chunk: string) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) onLine(line);
    },
    flush() {
      if (buffer) {
        onLine(buffer);
        buffer = '';
      }
    },
  };
}

export function runScript(filePath: string, args: string[] = []): Promise<RunResult> {
  return new Promise((resolve) => {
    try {
      fs.chmodSync(filePath, 0o755);
    } catch {
      // File may already be executable, or the user manages permissions
      // themselves — either way this is best-effort, not load-bearing.
    }

    cleanupOldLogs();
    const log = startExecLog(filePath);
    log.line(`실행 시작: ${filePath}`);
    log.line(`셸 버전: ${zshVersion()}`);
    log.line(`사용자 폴더: ${os.homedir()}`);
    log.line(`로그 파일: ${log.path}`);
    if (args.length) log.line(`인자: ${args.join(' ')}`);

    // Extra args are how a `folder` trigger hands the script the path of
    // the file that just appeared — the script reads it as $1. Prepending
    // helpersDir() to PATH is what makes `msm-ask` etc. callable by name.
    // Electron's own cwd (an app-bundle path, not anything script-relevant)
    // would otherwise leak into any script that uses a relative path — the
    // home directory is a saner default, closer to what a shell prompt starts in.
    const child = spawn('/bin/zsh', [filePath, ...args], {
      timeout: TIMEOUT_MS,
      cwd: os.homedir(),
      env: { ...process.env, PATH: `${helpersDir()}:${process.env.PATH ?? ''}` },
    });
    let stdout = '';
    let stderr = '';
    const stdoutLog = lineSplitter((line) => log.line(line));
    const stderrLog = lineSplitter((line) => log.line(line));
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout = (stdout + text).slice(0, OUTPUT_CAP);
      stdoutLog.write(text);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr = (stderr + text).slice(0, OUTPUT_CAP);
      stderrLog.write(text);
    });
    child.on('close', (code, signal) => {
      stdoutLog.flush();
      stderrLog.flush();
      if (signal) log.line(`중단 신호를 받았습니다: ${signal}`);
      log.line('스크립트 종료');
      log.line(`종료 코드: ${code ?? '없음'}`);
      if (signal) log.line(`마지막 상태: ${signal} 신호로 중단`);
      log.close();
      resolve({ success: code === 0, code, stdout, stderr });
    });
    child.on('error', (err) => {
      stdoutLog.flush();
      stderrLog.flush();
      log.line(`실행 오류: ${String(err)}`);
      log.line('스크립트 종료');
      log.close();
      resolve({ success: false, code: null, stdout, stderr: String(err) });
    });
  });
}
