#!/usr/bin/env node
// Start JobDash with one command: DynamoDB Local (Docker), the API and the frontend.
//   npm start      production mode (builds the frontend first)
//   npm run dev    development mode (watch / hot reload)
// Ctrl+C stops the API, the frontend and the DynamoDB Local container. Data stays in the Docker volume.

import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import readline from 'node:readline';

const dev = process.argv.includes('--dev');
const DB_PORT = 8000;
const API_PORT = 8787;
const WEB_PORT = 3000;
const APP_URL = `http://localhost:${WEB_PORT}`;

const color = process.stdout.isTTY;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const log = (message) => console.log(`${paint('1;36', '[jobdash]')} ${message}`);
const fail = (message) => {
  console.error(`${paint('1;31', '[jobdash]')} ${message}`);
};

/** @type {Set<import('node:child_process').ChildProcess>} */
const children = new Set();
let shuttingDown = false;

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function checkDocker() {
  const version = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  if (version.error || version.status !== 0) {
    fail('docker compose が見つかりません。Docker（Docker Desktop など）をインストールしてください。');
    return false;
  }
  const info = spawnSync('docker', ['info'], { stdio: 'ignore' });
  if (info.status !== 0) {
    fail('Docker に接続できません。Docker Desktop を起動してから、もう一度実行してください。');
    fail(
      'WSL の場合は Docker Desktop の Settings → Resources → WSL Integration で、使用中のディストリビューションを有効にしてください。',
    );
    return false;
  }
  return true;
}

function stopDatabase() {
  log('DynamoDB Local を停止しています（データは残ります）...');
  spawnSync('docker', ['compose', 'stop'], { stdio: 'inherit' });
}

/** Run an npm script with each output line prefixed by a label. Resolves with the exit code. */
function run(label, labelColor, args) {
  // --silent: npm would report the servers' exit on Ctrl+C as a failure; exit codes are reported by this script
  const child = spawn('npm', ['--silent', ...args], {
    // Own process group, so that Ctrl+C reaches only this script and we can stop the whole tree
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(color ? { FORCE_COLOR: '1' } : {}) },
  });
  children.add(child);
  const prefix = paint(labelColor, `[${label}]`);
  for (const stream of [child.stdout, child.stderr]) {
    readline.createInterface({ input: stream }).on('line', (line) => console.log(`${prefix} ${line}`));
  }
  return new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      children.delete(child);
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

function killChildren() {
  // SIGINT, like Ctrl+C in a terminal: the servers exit quietly on it, while SIGTERM makes npm report a failure
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGINT');
    } catch {
      // Already exited
    }
  }
}

async function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  killChildren();
  const deadline = Date.now() + 10_000;
  while (children.size > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      // Already exited
    }
  }
  stopDatabase();
  process.exit(exitCode);
}

let firstSignalAt = 0;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (shuttingDown) {
      // A single Ctrl+C arrives twice: from the terminal and forwarded by npm. Ignore that duplicate.
      if (Date.now() - firstSignalAt < 1000) return;
      // A later Ctrl+C: give up waiting
      fail('強制終了しました。DynamoDB Local が動いたままの場合は `docker compose stop` で停止してください。');
      process.exit(130);
    }
    firstSignalAt = Date.now();
    console.log('');
    log('終了しています...');
    void shutdown(0);
  });
}

async function main() {
  for (const port of [API_PORT, WEB_PORT]) {
    if (await canConnect(port)) {
      fail(`ポート ${port} はすでに使われています。JobDash を別のターミナルで起動していないか確認してください。`);
      process.exit(1);
    }
  }
  if (!checkDocker()) process.exit(1);

  log('DynamoDB Local を起動しています...');
  if (spawnSync('docker', ['compose', 'up', '-d'], { stdio: 'inherit' }).status !== 0) {
    fail('DynamoDB Local を起動できませんでした。');
    process.exit(1);
  }
  if (!(await waitForPort(DB_PORT, 60_000))) {
    fail(`DynamoDB Local（ポート ${DB_PORT}）が応答しません。`);
    return shutdown(1);
  }

  if (!dev) {
    log('フロントエンドをビルドしています...');
    const code = await run('build', '35', ['run', 'build', '-w', 'frontend']);
    if (code !== 0) {
      fail('フロントエンドのビルドに失敗しました。');
      return shutdown(1);
    }
    if (shuttingDown) return;
  }

  const script = dev ? 'dev' : 'start';
  for (const [label, labelColor, workspace] of [
    ['api', '33', 'backend'],
    ['web', '32', 'frontend'],
  ]) {
    void run(label, labelColor, ['run', script, '-w', workspace]).then((code) => {
      if (shuttingDown) return;
      fail(`${label} が終了しました（終了コード ${code}）。すべて停止します。`);
      void shutdown(1);
    });
  }

  const ready = (await waitForPort(API_PORT, 60_000)) && (await waitForPort(WEB_PORT, 60_000));
  if (shuttingDown) return;
  if (!ready) {
    fail('API またはフロントエンドが起動しませんでした。上のログを確認してください。');
    return shutdown(1);
  }
  log(`起動しました → ${paint('1', APP_URL)}`);
  log('終了するには Ctrl+C を押してください。');
}

void main();
