import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireLock, ambProfile, commands, guardAdmission, guardWorkspace, main, nightWindow, parseArgs,
  runProcess, runTasks, STATUS } from './ubuntu-nightly.mjs';

const at = (iso) => Date.parse(iso);
const night = () => at('2026-10-18T06:00:00Z'); // 03:00 Buenos Aires
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'bs-nightly-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const PREPARE = ['pnpm', 'install', '--offline', '--frozen-lockfile', '--ignore-scripts'];

test('prepare is explicit, fixed offline argv with setup admission; existing profiles stay unchanged', async () => {
  assert.deepEqual(commands('prepare'), [PREPARE]);
  assert.equal(parseArgs(['--task', 'prepare']).execute, false);
  assert.equal(await main(['--task', 'prepare']), 0); // PLAN only; no Git/AMB/install.
  assert.deepEqual(['prepare', 'check', 'build'].map(ambProfile), ['setup', 'check', 'build']);
  assert.throws(() => ambProfile('setup'), /REFUSED/);
  assert.throws(() => parseArgs(['--task', 'prepare', '--online']), /REFUSED/);
});

test('prepare inherits post-admission window guards and propagates cancellation to its own child', async () => {
  let starts = 0, guards = 0;
  const opts = { task: 'prepare', guard: () => { guards++; },
    run: async () => { starts++; return 0; }, now: () => at('2026-10-18T09:00:00Z') };
  assert.equal(await runTasks(opts), STATUS.DEFERRED_WINDOW);
  assert.equal(starts, 0); assert.equal(guards, 0);
  let clock = at('2026-10-18T08:59:54Z');
  assert.equal(await runTasks({ ...opts, now: () => clock,
    guard: () => { clock = at('2026-10-18T09:00:00Z'); } }), STATUS.DEFERRED_WINDOW);
  assert.equal(starts, 0);
  const controller = new AbortController();
  let timer;
  try {
    const rc = await runTasks({ ...opts, now: night, signal: controller.signal,
      run: async (argv, admitted) => {
        starts++;
        assert.deepEqual(argv, PREPARE);
        assert.equal(admitted.deadline, at('2026-10-18T08:59:55Z'));
        timer = setTimeout(() => controller.abort(143), 100);
        // Simulated install process only: no package manager or fake job clock.
        return runProcess([process.execPath, '-e', 'setInterval(()=>{},100)'],
          { ...admitted, now: Date.now, deadline: Date.now() + 2000, graceMs: 30 });
      } });
    assert.equal(rc, 143); assert.equal(starts, 1); assert.equal(guards, 1);
  } finally { clearTimeout(timer); }
});

test('failed prepare is terminal; inert oneshot orders tasks without ignoring failure before check/build', async () => {
  for (const failure of [1, 125]) {
    const calls = [];
    const rc = await runTasks({ task: 'prepare', now: night, guard() {},
      run: async (argv) => { calls.push(argv); return failure; } });
    assert.equal(rc, STATUS.FAILED);
    assert.deepEqual(calls, [PREPARE]); // Store miss/other failure: one attempt, no fallback.
  }
  const unit = readFileSync(new URL('../ops/ubuntu/build-something-nightly.service.example', import.meta.url), 'utf8');
  const starts = unit.split('\n').filter((line) => line.startsWith('ExecStart='));
  assert.match(unit, /^Type=oneshot$/m);
  assert.deepEqual(starts.map((line) => line.match(/--task (\w+)/)[1]), ['prepare', 'check', 'build']);
  assert.equal(new Set(starts.map((line) => line.replace(/--task \w+/, '--task TASK'))).size, 1);
  for (const line of starts) assert.match(line, /^ExecStart=\/REPLACE_ABSOLUTE_NODE /);
  assert.doesNotMatch(unit, /^SuccessExitStatus=/m);
  assert.match(unit, /^TimeoutStartSec=3h$/m);
  assert.match(unit, /^TimeoutStopSec=4s$/m);
  assert.match(unit, /^KillMode=control-group$/m);
  assert.match(unit, /^Restart=no$/m);
  // This checks systemd's stop-on-failure contract statically, without starting a unit.
});

test('window is [03,06) Buenos Aires independently of host TZ, in summer and winter', () => {
  const previous = process.env.TZ;
  try {
    for (const tz of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = tz;
      for (const day of ['2026-01-18', '2026-07-18']) {
        for (const [time, allowed] of [['05:59:59.999', false], ['06:00:00.000', true],
          ['08:59:59.999', true], ['09:00:00.000', false]]) {
          const result = nightWindow(new Date(`${day}T${time}Z`));
          assert.equal(result.allowed, allowed, `${tz} ${day} ${time}`);
          assert.equal(result.end, at(`${day}T09:00:00Z`));
        }
      }
    }
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('manual default is PLAN without configuration; rejects force, shell commands and malformed pins', async () => {
  assert.equal(await main([]), 0);
  assert.equal(parseArgs(['--task', 'build']).execute, false);
  for (const args of [['--force'], ['--command', 'sh'], ['--task', 'deploy'],
    ['--admitted', 'fake'], ['--execute'], ['--task', 'check', '--task', 'build']]) {
    assert.throws(() => parseArgs(args), /REFUSED/);
  }
  assert.deepEqual(commands('build').map((a) => a.join(' ')), [
    'pnpm --filter @bs/people build', 'pnpm --filter @bs/agents build',
  ]);
});

test('workspace gate refuses dirty, different source/identity and the main checkout before AMB admission', (t) => {
  const base = fixture(t), ws = join(base, 'candidate'), common = join(base, 'main', '.git');
  mkdirSync(ws); mkdirSync(common, { recursive: true });
  const id = 'w' + createHash('sha256').update(common + '\0' + ws).digest('hex').slice(0, 16);
  const opts = { workspace: ws, workspaceId: id, source: 'd'.repeat(40) };
  let dirty = '', head = opts.source, contextId = id, ambCalls = 0;
  const read = (cmd, args) => {
    if (cmd === 'amb') { ambCalls++; return JSON.stringify({ id: contextId, path: ws, project: 'build-something' }); }
    if (args.includes('--show-toplevel')) return ws;
    if (args.includes('--git-common-dir')) return common;
    return args[0] === 'status' ? dirty : head;
  };
  const deps = { read, root: ws, cwd: ws };
  guardWorkspace(opts, deps);
  ambCalls = 0; dirty = '?? unexpected.mjs';
  assert.throws(() => guardWorkspace(opts, deps), /REFUSED/); assert.equal(ambCalls, 0);
  dirty = ''; head = 'e'.repeat(40);
  assert.throws(() => guardWorkspace(opts, deps), /REFUSED/); assert.equal(ambCalls, 0);
  head = opts.source; contextId = 'w' + '0'.repeat(16);
  assert.throws(() => guardWorkspace(opts, deps), /REFUSED/);
  assert.throws(() => guardWorkspace({ ...opts, workspace: join(base, 'main') },
    { ...deps, root: join(base, 'main'), cwd: join(base, 'main'),
      read: (cmd, args) => args.includes('--show-toplevel') ? join(base, 'main') : read(cmd, args) }), /REFUSED/);
});

test('exclusive lock refuses overlap/stale locks, releases owned lock and preserves replacements', (t) => {
  const dir = join(fixture(t), 'private'), path = join(dir, 'run.lock');
  const first = acquireLock(dir);
  const original = readFileSync(path, 'utf8');
  assert.throws(() => acquireLock(dir), /LOCKED/);
  assert.equal(readFileSync(path, 'utf8'), original);
  first.release(); assert.equal(existsSync(path), false);
  writeFileSync(path, JSON.stringify({ pid: 99999999, token: 'stale' }), { mode: 0o600 });
  assert.throws(() => acquireLock(dir), /LOCKED/);
  unlinkSync(path);
  const second = acquireLock(dir);
  unlinkSync(path); writeFileSync(path, 'foreign replacement');
  second.release(); assert.equal(readFileSync(path, 'utf8'), 'foreign replacement');
});

test('queue admission after 06:00 and a guard crossing the boundary never spawn heavy work', async () => {
  let starts = 0, guards = 0;
  const opts = { task: 'build', guard: () => { guards++; },
    run: async () => { starts++; return 0; }, now: () => at('2026-10-18T09:00:00Z') };
  assert.equal(await runTasks(opts), STATUS.DEFERRED_WINDOW);
  assert.equal(starts, 0); assert.equal(guards, 0);
  let clock = at('2026-10-18T08:59:54Z');
  assert.equal(await runTasks({ ...opts, now: () => clock,
    guard: () => { clock = at('2026-10-18T09:00:00Z'); } }), STATUS.DEFERRED_WINDOW);
  assert.equal(starts, 0);
});

test('internal wrapper requires an actual AMB scope, matching workspace and a live lock lease', (t) => {
  const dir = join(fixture(t), 'private'), lock = acquireLock(dir);
  t.after(() => lock.release());
  const opts = { workspaceId: 'w' + 'a'.repeat(16), admitted: lock.token };
  const job = 'b'.repeat(32);
  const deps = { env: { AMB_JOB: job, AMB_WORKSPACE: opts.workspaceId },
    cgroup: () => `0::/app-t3code.slice/amb-job-${job}.scope` };
  guardAdmission(opts, dir, deps);
  assert.throws(() => guardAdmission(opts, dir, { ...deps, cgroup: () => '0::/other.scope' }), /REFUSED/);
  assert.throws(() => guardAdmission(opts, dir, { ...deps, env: { ...deps.env, AMB_WORKSPACE: 'other' } }), /REFUSED/);
  assert.throws(() => guardAdmission({ ...opts, admitted: 'foreign' }, dir, deps), /REFUSED/);
  assert.throws(() => guardAdmission(opts, dir, { ...deps, alive() { throw new Error('dead owner'); } }), /dead owner/);
});

test('all failures are terminal: no retry of deterministic or ambiguous infrastructure exit codes', async () => {
  for (const failure of [1, 125, 429]) {
    const calls = [];
    const rc = await runTasks({ task: 'check', now: night, guard() {},
      run: async (argv) => { calls.push(argv); return failure; } });
    assert.equal(rc, STATUS.FAILED);
    assert.deepEqual(calls, [['pnpm', 'lint']]);
  }
});

test('builds are sequential, revalidate source per phase, and stop on an intervening source change', async () => {
  const calls = []; let guards = 0;
  await assert.rejects(runTasks({ task: 'build', now: night,
    guard: () => { if (++guards === 2) throw new Error('REFUSED'); },
    run: async (argv) => { calls.push(argv); return 0; } }), /REFUSED/);
  assert.deepEqual(calls, [['pnpm', '--filter', '@bs/people', 'build']]);
  calls.length = 0;
  assert.equal(await runTasks({ task: 'build', now: night, guard() {},
    run: async (argv, opts) => { calls.push(argv); assert.equal(opts.deadline, at('2026-10-18T08:59:55Z')); return 0; } }), 0);
  assert.deepEqual(calls, commands('build'));
});

test('expired deadline refuses spawn; running process group and TERM-ignoring descendants are killed', async (t) => {
  const dir = fixture(t), marker = join(dir, 'late-write'), pidfile = join(dir, 'descendant');
  const childCode = `process.on('SIGTERM',()=>{}); require('node:fs').writeFileSync(${JSON.stringify(pidfile)},String(process.pid)); setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'late'),1200); setInterval(()=>{},100);`;
  const parentCode = `process.on('SIGTERM',()=>{}); require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childCode)}],{stdio:'ignore'}); setInterval(()=>{},100);`;
  const argv = [process.execPath, '-e', parentCode];
  assert.equal(await runProcess(argv, { cwd: dir, deadline: Date.now() - 1 }), STATUS.DEFERRED_WINDOW);
  assert.equal(existsSync(pidfile), false);
  assert.equal(await runProcess(argv, { cwd: dir, deadline: Date.now() + 700, graceMs: 50 }), STATUS.DEFERRED_WINDOW);
  assert.equal(existsSync(pidfile), true, 'descendant must actually have started');
  const pid = readFileSync(pidfile, 'utf8');
  await delay(650);
  assert.equal(existsSync(marker), false);
  // An unreaped zombie is terminated and cannot consume CPU/write artifacts.
  if (existsSync(`/proc/${pid}/stat`)) assert.equal(readFileSync(`/proc/${pid}/stat`, 'utf8').split(' ')[2], 'Z');
});

test('cancellation cleans up own child; candidate failure leaves published bytes untouched', async (t) => {
  const dir = fixture(t), candidate = join(dir, 'candidate'), published = join(dir, 'published');
  mkdirSync(candidate); mkdirSync(published);
  const live = join(published, 'current.html'); writeFileSync(live, 'last-known-good');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(143), 100);
  assert.equal(await runProcess([process.execPath, '-e', 'setInterval(()=>{},100)'],
    { cwd: candidate, deadline: Date.now() + 2000, signal: controller.signal, graceMs: 30 }), 143);
  clearTimeout(timer);
  let attempts = 0;
  const rc = await runTasks({ task: 'build', cwd: candidate, now: night, guard() {},
    run: async () => { attempts++; return runProcess([process.execPath, '-e',
      "require('node:fs').writeFileSync('partial-build','candidate'); process.exit(1)"],
    { cwd: candidate, deadline: Date.now() + 2000, graceMs: 30 }); } });
  assert.equal(rc, STATUS.FAILED); assert.equal(attempts, 1);
  assert.equal(readFileSync(live, 'utf8'), 'last-known-good');
  assert.equal(readFileSync(join(candidate, 'partial-build'), 'utf8'), 'candidate');
});
