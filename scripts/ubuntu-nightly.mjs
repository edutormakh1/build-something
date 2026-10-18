#!/usr/bin/env node
// Local candidate builds only. No deployment, installs, source updates or services.
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync,
  realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ZONE = 'America/Argentina/Buenos_Aires';
export const STATUS = Object.freeze({ OK: 0, FAILED: 1, LOCKED: 73, DEFERRED_WINDOW: 75, REFUSED: 78 });
const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT), '..');
const STOP_MARGIN_MS = 5000; // Leave time for TERM/KILL and AMB's own scope cancellation.
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function nightWindow(now = new Date()) {
  const p = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offset = local - Math.floor(now.getTime() / 1000) * 1000;
  const end = Date.UTC(+p.year, +p.month - 1, +p.day, 6) - offset;
  return { allowed: +p.hour >= 3 && +p.hour < 6, end };
}

export function commands(task) {
  if (task === 'build') return [
    ['pnpm', '--filter', '@bs/people', 'build'],
    ['pnpm', '--filter', '@bs/agents', 'build'],
  ];
  if (task === 'check') return [
    ['pnpm', 'lint'], ['pnpm', 'typecheck'], ['pnpm', 'test'],
  ];
  throw new Error('REFUSED');
}

export function parseArgs(args) {
  const opts = { task: 'check', execute: false };
  const names = { '--task': 'task', '--workspace': 'workspace', '--workspace-id': 'workspaceId',
    '--source': 'source', '--admitted': 'admitted' };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (seen.has(key)) throw new Error('REFUSED');
    seen.add(key);
    if (key === '--execute') opts.execute = true;
    else if (names[key] && args[i + 1] && !args[i + 1].startsWith('--')) opts[names[key]] = args[++i];
    else throw new Error('REFUSED');
  }
  commands(opts.task);
  if (opts.admitted && !opts.execute) throw new Error('REFUSED');
  if (opts.execute && (!isAbsolute(opts.workspace || '') ||
      !/^w[0-9a-f]{16}$/.test(opts.workspaceId || '') || !/^[0-9a-f]{40}$/.test(opts.source || ''))) {
    throw new Error('REFUSED');
  }
  return opts;
}

function inspect(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 5000,
    maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function guardWorkspace(opts, { read = inspect, root = ROOT, cwd = process.cwd() } = {}) {
  const ws = realpathSync(opts.workspace);
  if (ws !== opts.workspace || realpathSync(root) !== ws || realpathSync(cwd) !== ws) throw new Error('REFUSED');
  const git = (...args) => read('git', args, ws);
  const top = git('rev-parse', '--show-toplevel');
  const common = realpathSync(git('rev-parse', '--path-format=absolute', '--git-common-dir'));
  const id = 'w' + createHash('sha256').update(common + '\0' + ws).digest('hex').slice(0, 16);
  if (top !== ws || dirname(common) === ws || id !== opts.workspaceId ||
      git('rev-parse', 'HEAD') !== opts.source || git('status', '--porcelain=v1', '--untracked-files=all')) {
    throw new Error('REFUSED');
  }
  const context = JSON.parse(read('amb', ['context'], ws));
  if (context.id !== id || context.path !== ws || context.project !== 'build-something') throw new Error('REFUSED');
}

export function acquireLock(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o077)) throw new Error('REFUSED');
  const path = join(dir, 'run.lock');
  let fd;
  try { fd = openSync(path, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('LOCKED'); throw error; }
  const token = randomUUID();
  try { writeFileSync(fd, JSON.stringify({ token, pid: process.pid })); }
  catch (error) { closeSync(fd); unlinkSync(path); throw error; }
  const owned = fstatSync(fd);
  return { token, release() {
    try {
      const current = lstatSync(path);
      if (current.ino === owned.ino && current.dev === owned.dev) unlinkSync(path);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    finally { closeSync(fd); }
  } };
}

export function guardAdmission(opts, dir, { env = process.env,
  cgroup = () => readFileSync('/proc/self/cgroup', 'utf8'),
  alive = (pid) => process.kill(pid, 0) } = {}) {
  const job = env.AMB_JOB || '';
  if (!/^[0-9a-f]{32}$/.test(job) || env.AMB_WORKSPACE !== opts.workspaceId ||
      !cgroup().includes(`amb-job-${job}.scope`)) throw new Error('REFUSED');
  const path = join(dir, 'run.lock');
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o077)) throw new Error('REFUSED');
  const lease = JSON.parse(readFileSync(path, 'utf8'));
  if (lease.token !== opts.admitted || !Number.isSafeInteger(lease.pid) || lease.pid <= 1) throw new Error('REFUSED');
  alive(lease.pid); // No stale lock takeover, even if the owner was killed.
}

// Every command gets its own process group; never signal other workspaces/jobs.
// AMB additionally owns the heavy scope. Its SIGTERM handler cancels that scope.
export function runProcess(argv, { cwd, deadline, now = Date.now, signal, graceMs = 1000,
  stdio = 'ignore' } = {}) {
  if (now() >= deadline) return Promise.resolve(STATUS.DEFERRED_WINDOW);
  if (signal?.aborted) return Promise.resolve(signal.reason || 143);
  const started = performance.now(), budget = deadline - now();
  const expired = () => now() >= deadline || performance.now() - started >= budget;
  return new Promise((resolveResult) => {
    let child, interval, killer, outcome, stopping = false, done = false;
    const finish = (code) => {
      if (done) return;
      done = true;
      clearInterval(interval); clearTimeout(killer);
      signal?.removeEventListener('abort', cancel);
      resolveResult(code);
    };
    const groupSignal = (sig) => {
      try { process.kill(-child.pid, sig); return true; }
      catch (error) { if (error.code === 'ESRCH') return false; throw error; }
    };
    const stop = (code) => {
      if (done || stopping) return;
      stopping = true; outcome = code;
      if (!groupSignal('SIGTERM')) { finish(outcome); return; }
      killer = setTimeout(() => { groupSignal('SIGKILL'); finish(outcome); }, graceMs);
    };
    const cancel = () => stop(signal.reason || 143);
    try { child = spawn(argv[0], argv.slice(1), { cwd, detached: true, shell: false, stdio }); }
    catch { finish(STATUS.FAILED); return; }
    child.on('error', () => finish(STATUS.FAILED));
    child.on('exit', (code) => stop(expired() ? STATUS.DEFERRED_WINDOW : code === null ? STATUS.FAILED : code));
    signal?.addEventListener('abort', cancel, { once: true });
    interval = setInterval(() => {
      if (expired()) stop(STATUS.DEFERRED_WINDOW);
    }, 100);
    if (signal?.aborted) cancel();
  });
}

export async function runTasks({ task, cwd, guard, run = runProcess, now = Date.now, signal,
  log = () => {} }) {
  for (const [index, argv] of commands(task).entries()) {
    // Executed AFTER AMB admission, and again before each phase.
    let window = nightWindow(new Date(now()));
    if (!window.allowed || now() >= window.end - STOP_MARGIN_MS) return STATUS.DEFERRED_WINDOW;
    guard();
    window = nightWindow(new Date(now()));
    if (!window.allowed || now() >= window.end - STOP_MARGIN_MS) return STATUS.DEFERRED_WINDOW;
    log(`phase=${task}:${index + 1}`);
    // One attempt: exit codes/output cannot reliably classify transient failures.
    const rc = await run(argv, { cwd, deadline: window.end - STOP_MARGIN_MS, now, signal });
    if (rc) return [75, 130, 143].includes(rc) ? rc : STATUS.FAILED;
  }
  return STATUS.OK;
}

export async function main(args = process.argv.slice(2)) {
  let lock;
  const controller = new AbortController();
  const handlers = new Map([['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 143]]
    .map(([name, code]) => [name, () => controller.abort(code)]));
  try {
    const opts = parseArgs(args);
    if (!opts.execute) {
      console.log(JSON.stringify({ status: 'PLAN', task: opts.task, timezone: ZONE,
        window: '[03:00,06:00)', commands: commands(opts.task), attemptsPerPhase: 1 }));
      return STATUS.OK;
    }
    if (!nightWindow().allowed) return STATUS.DEFERRED_WINDOW;
    if (process.platform !== 'linux') return STATUS.REFUSED;
    guardWorkspace(opts);
    const dir = join(homedir(), '.local', 'state', 'build-something-nightly', opts.workspaceId);
    if (dir.startsWith(opts.workspace + '/')) return STATUS.REFUSED;
    for (const [name, handler] of handlers) process.on(name, handler);
    if (opts.admitted) {
      return await runTasks({ task: opts.task, cwd: opts.workspace, signal: controller.signal,
        guard: () => { guardAdmission(opts, dir); guardWorkspace(opts); },
        log: (line) => console.log(line) });
    }
    // Require a fresh queue admission, not a nested invocation inside a daytime job.
    if (process.env.AMB_JOB || /amb-job-[0-9a-f]{32}\.scope/.test(readFileSync('/proc/self/cgroup', 'utf8'))) {
      return STATUS.REFUSED;
    }
    lock = acquireLock(dir);
    const window = nightWindow();
    if (!window.allowed) return STATUS.DEFERRED_WINDOW;
    const rc = await runProcess(['amb', 'run', opts.task, '--', process.execPath, SCRIPT,
      ...args, '--admitted', lock.token], { cwd: opts.workspace,
      deadline: window.end - STOP_MARGIN_MS, signal: controller.signal, stdio: 'inherit' });
    return [0, 75, 130, 143].includes(rc) ? rc : STATUS.FAILED;
  } catch (error) {
    return error.message === 'LOCKED' ? STATUS.LOCKED : STATUS.REFUSED;
  } finally {
    for (const [name, handler] of handlers) process.removeListener(name, handler);
    lock?.release();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT) {
  main().then((code) => {
    if (code || process.argv.includes('--execute')) {
      console.log(`status=${Object.keys(STATUS).find((name) => STATUS[name] === code) || 'CANCELLED'}`);
    }
    process.exitCode = code;
  }).catch(() => { console.log('status=REFUSED'); process.exitCode = STATUS.REFUSED; });
}
