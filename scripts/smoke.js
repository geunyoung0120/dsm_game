const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.SMOKE_PORT || 3100);
const url = `http://localhost:${port}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-game-smoke-'));

let serverProcess = null;
let clients = [];
let finished = false;

main().catch((error) => {
  console.error(error.message || error);
  cleanup();
  process.exit(1);
});

async function main() {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      SESSION_SECRET: 'smoke-test-secret'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', (chunk) => {
    if (!finished) process.stderr.write(chunk);
  });

  await waitForServerReady(serverProcess);
  await expectUnauthSocketRejected();
  const accounts = await Promise.all([
    signup(`연습유저${Date.now()}A`),
    signup(`연습유저${Date.now()}B`)
  ]);
  const result = await runClientSmoke(accounts);
  console.log(JSON.stringify(result));
  cleanup();
}

function waitForServerReady(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Smoke server did not start in time.')), 5000);

    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Smoke server exited early with code ${code}.`));
    });

    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      if (text.includes(`http://localhost:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

function expectUnauthSocketRejected() {
  return new Promise((resolve, reject) => {
    const client = io(url, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 2000
    });
    const timer = setTimeout(() => {
      client.disconnect();
      reject(new Error('Unauthenticated socket was not rejected in time.'));
    }, 3000);
    client.once('connect', () => {
      clearTimeout(timer);
      client.disconnect();
      reject(new Error('Unauthenticated socket connected unexpectedly.'));
    });
    client.once('connect_error', () => {
      clearTimeout(timer);
      client.disconnect();
      resolve();
    });
  });
}

async function signup(username) {
  const response = await fetch(`${url}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'test-password' })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Smoke signup failed.');
  }
  const rawCookie = response.headers.get('set-cookie');
  if (!rawCookie) throw new Error('Smoke signup did not receive a session cookie.');
  return {
    user: body.user,
    cookie: rawCookie.split(';')[0]
  };
}

async function runClientSmoke(accounts) {
  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  const welcomed = await Promise.all(clients.map((client) => once(client, 'welcome')));
  const cardsByClient = welcomed.map((payload) => payload.cards);

  clients[0].emit('create-room', { name: '스모크 테스트 방', password: '' });
  const joined = await once(clients[0], 'room-joined');
  clients[1].emit('join-room', { roomId: joined.room.id, password: '' });
  await once(clients[1], 'room-joined');
  await delay(150);

  return runPlayableSmoke(cardsByClient);
}

function runPlayableSmoke(cardsByClient) {
  return new Promise((resolve, reject) => {
    const welcomedSlots = [0, 1];
    let observedUnits = 0;
    const playedSlots = new Set();

    const timer = setTimeout(() => {
      reject(new Error('Smoke clients did not reach a playable state in time.'));
    }, 20000);

    clients.forEach((client, index) => {
      client.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      client.on('state', (state) => {
        if (state.status === 'playing') {
          const slot = index;
          const player = state.players[slot];
          const cards = cardsByClient[index];
          if (!playedSlots.has(slot) && player) {
            const handIndex = player.hand.findIndex((id) => cards[id] && cards[id].cost <= player.elixir && id !== 'kkongho');
            if (handIndex >= 0) {
              client.emit('play-card', {
                handIndex,
                x: 450,
                y: slot === 0 ? 500 : 120
              });
              playedSlots.add(slot);
            }
          }
        }

        observedUnits = Math.max(observedUnits, state.units.length);
        if (playedSlots.size === 2 && observedUnits > 0) {
          clearTimeout(timer);
          resolve({
            users: accountsSummary(),
            slots: welcomedSlots,
            status: state.status,
            room: state.room && state.room.name,
            units: observedUnits,
            hands: state.players.map((player) => player.hand)
          });
        }
      });
    });
  }).finally(() => {
    for (const client of clients) client.disconnect();
  });
}

function once(client, eventName) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}.`)), 5000);
    client.once(eventName, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
    client.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accountsSummary() {
  return clients.map((client) => Boolean(client.connected));
}

function cleanup() {
  finished = true;
  for (const client of clients) client.disconnect();
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {}
}
