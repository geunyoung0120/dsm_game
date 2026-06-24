const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.SMOKE_PORT || 3100);
const url = `http://localhost:${port}`;

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
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', (chunk) => {
    if (!finished) process.stderr.write(chunk);
  });

  await waitForServerReady(serverProcess);
  const result = await runClientSmoke();
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

function runClientSmoke() {
  return new Promise((resolve, reject) => {
    const welcomed = [];
    let cards = null;
    let observedUnits = 0;
    const playedSlots = new Set();

    const timer = setTimeout(() => {
      reject(new Error('Smoke clients did not reach a playable state in time.'));
    }, 20000);

    clients = [
      io(url, { transports: ['websocket'] }),
      io(url, { transports: ['websocket'] })
    ];

    clients.forEach((client, index) => {
      client.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      client.on('welcome', (payload) => {
        welcomed[index] = payload.slot;
        cards = payload.cards;
      });

      client.on('state', (state) => {
        if (state.status === 'playing' && cards) {
          const slot = welcomed[index];
          const player = state.players[slot];
          if (!playedSlots.has(slot) && player) {
            const handIndex = player.hand.findIndex((id) => cards[id] && cards[id].cost <= player.elixir && id !== 'kkongho');
            if (handIndex >= 0) {
              clients[index].emit('play-card', {
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
            slots: welcomed,
            status: state.status,
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

function cleanup() {
  finished = true;
  for (const client of clients) client.disconnect();
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
}
