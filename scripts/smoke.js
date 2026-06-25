const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.SMOKE_PORT || 3100);
const url = `http://localhost:${port}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-game-smoke-'));
const smokePassword = 'test-password';
const bestFriendPair = ['baduk', 'johyunwoo'];
const bestFriendComboCost = 8;
const smokeDeck = ['osj', 'heoseon', 'johyunwoo', 'seongjoo', 'peach', 'bbatman', 'jimin', 'yushin'];
const dagwasilDeck = ['dagwasil', 'seongjoo', 'peach', 'jimin', 'bbatman', 'yushin', 'mythos', 'johyunwoo'];
const cherryTreeDeck = ['cherryTree', 'seongjoo', 'peach', 'jimin', 'bbatman', 'yushin', 'mythos', 'johyunwoo'];
const giantHyeonjikDeck = ['giantHyeonjik', 'seongjoo', 'peach', 'jimin', 'bbatman', 'yushin', 'mythos', 'johyunwoo'];
const kkongMeteorDeck = ['kkong', 'seongjoo', 'peach', 'jimin', 'bbatman', 'yushin', 'mythos', 'johyunwoo'];
const targetDummyDeck = ['peach', 'seongjoo', 'jimin', 'bbatman', 'yushin', 'mythos', 'johyunwoo', 'osj'];

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
      SESSION_SECRET: 'smoke-test-secret',
      START_COUNTDOWN_MS: '0',
      TOURNAMENT_BREAK_MS: '200',
      TOURNAMENT_FINAL_BREAK_MS: '300'
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
  await Promise.all(accounts.map(expectSessionUser));
  await expectRankings(accounts[0], accounts.map((account) => account.user.username));
  await expectTiers(accounts[0]);
  await expectDeckSave(accounts[0], smokeDeck);
  await expectSessionUser(await login(accounts[0].user.username));
  const result = await runClientSmoke(accounts);
  const dagwasil = await expectDagwasilImmediateSpawn(accounts);
  const cherryTree = await expectCherryTreeAttackFlow(accounts);
  const giantHyeonjik = await expectGiantHyeonjikIgnoresUnits(accounts);
  const kkongMeteor = await expectKkongMeteorDamageDelayed(accounts);
  const twoVersusTwoAccounts = await Promise.all([
    signup(`연습유저${Date.now()}C`),
    signup(`연습유저${Date.now()}D`),
    signup(`연습유저${Date.now()}E`),
    signup(`연습유저${Date.now()}F`),
    signup(`연습유저${Date.now()}G`),
    signup(`연습유저${Date.now()}H`),
    signup(`연습유저${Date.now()}I`)
  ]);
  const twoVersusTwo = await expectTwoVersusTwoRoom(twoVersusTwoAccounts.slice(0, 4), twoVersusTwoAccounts.slice(4));
  const tournamentAccounts = await Promise.all([
    signup(`토너유저${Date.now()}A`),
    signup(`토너유저${Date.now()}B`),
    signup(`토너유저${Date.now()}C`)
  ]);
  const tournament = await expectTournamentMode(tournamentAccounts);
  const expectedOpeningHand = smokeDeck.slice(0, 4).join('|');
  const actualOpeningHand = (result.initialHands[0] || []).join('|');
  if (actualOpeningHand !== expectedOpeningHand) {
    throw new Error(`Saved deck was not used for player 1. Expected ${expectedOpeningHand}, got ${actualOpeningHand}.`);
  }
  console.log(JSON.stringify({ ...result, dagwasil, cherryTree, giantHyeonjik, kkongMeteor, twoVersusTwo, tournament }));
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
    body: JSON.stringify({ username, password: smokePassword })
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

async function login(username) {
  const response = await fetch(`${url}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: smokePassword })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Smoke login failed.');
  }
  const rawCookie = response.headers.get('set-cookie');
  if (!rawCookie) throw new Error('Smoke login did not receive a session cookie.');
  return {
    user: body.user,
    cookie: rawCookie.split(';')[0]
  };
}

async function expectSessionUser(account) {
  const response = await fetch(`${url}/api/me`, {
    headers: { Cookie: account.cookie }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Smoke session lookup failed.');
  }
  if (!body.user || body.user.username !== account.user.username) {
    throw new Error('Smoke session user did not match the authenticated account.');
  }
}

async function expectRankings(account, expectedUsernames) {
  const response = await fetch(`${url}/api/rankings`, {
    headers: { Cookie: account.cookie }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Smoke rankings lookup failed.');
  }
  if (!Array.isArray(body.rankings)) {
    throw new Error('Smoke rankings response did not include a rankings array.');
  }
  for (const username of expectedUsernames) {
    const entry = body.rankings.find((ranking) => ranking.username === username);
    if (!entry || !entry.rank || !entry.tier || !Number.isInteger(entry.trophies)) {
      throw new Error('Smoke rankings did not include the expected user entry.');
    }
  }
}

async function expectTiers(account) {
  const response = await fetch(`${url}/api/tiers`, {
    headers: { Cookie: account.cookie }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Smoke tiers lookup failed.');
  }
  if (!Array.isArray(body.tiers) || body.tiers.length === 0) {
    throw new Error('Smoke tiers response did not include a tiers array.');
  }
  const currentTier = body.tiers.find((tier) => tier.key === account.user.tierKey);
  if (!currentTier || !currentTier.name || !Number.isInteger(currentTier.min)) {
    throw new Error('Smoke tiers did not include the current user tier.');
  }
  if (!body.tiers.some((tier) => tier.max === null)) {
    throw new Error('Smoke tiers did not expose the open-ended top tier.');
  }
}

async function expectDeckSave(account, deck) {
  const initial = await fetch(`${url}/api/deck`, {
    headers: { Cookie: account.cookie }
  });
  const initialBody = await initial.json();
  if (!initial.ok) {
    throw new Error(initialBody.error || 'Smoke deck lookup failed.');
  }
  if (!Array.isArray(initialBody.deck) || !initialBody.cards || !initialBody.cards.osj) {
    throw new Error('Smoke deck response did not include deck state and card pool.');
  }

  const response = await fetch(`${url}/api/deck`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: account.cookie },
    body: JSON.stringify({ deck })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Smoke deck save failed.');
  }
  if (!Array.isArray(body.deck) || body.deck.join('|') !== deck.join('|')) {
    throw new Error('Smoke deck save did not return the saved deck.');
  }
}

async function runClientSmoke(accounts) {
  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  const welcomed = await Promise.all(clients.map((client) => once(client, 'welcome')));
  const cardsByClient = welcomed.map((payload) => payload.cards);
  expectHeoseonNerf(cardsByClient[0]);

  clients[0].emit('create-room', { name: '스모크 테스트 방', password: '' });
  const joined = await once(clients[0], 'room-joined', '1v1 host room-joined');
  clients[1].emit('join-room', { roomId: joined.room.id, password: '' });
  await once(clients[1], 'room-joined', '1v1 guest room-joined');
  await delay(150);

  return runPlayableSmoke(cardsByClient);
}

function runPlayableSmoke(cardsByClient) {
  return new Promise((resolve, reject) => {
    const welcomedSlots = [0, 1];
    const initialHands = [null, null];
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
          if (!initialHands[slot] && player) {
            initialHands[slot] = [...player.hand];
          }
          if (!playedSlots.has(slot) && player) {
            const handIndex = player.hand.findIndex((id) => cards[id] && effectiveSmokeCost(player, cards[id]) <= player.elixir && id !== 'kkongho');
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
            hands: state.players.map((player) => player.hand),
            initialHands
          });
        }
      });
    });
  }).finally(() => {
    for (const client of clients) client.disconnect();
  });
}

async function expectCherryTreeAttackFlow(accounts) {
  await expectDeckSave(accounts[0], cherryTreeDeck);
  await expectDeckSave(accounts[1], targetDummyDeck);

  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  await Promise.all(clients.map((client) => once(client, 'welcome')));
  clients[0].emit('create-room', { name: '벚꽃나무 스모크 테스트 방', password: '' });
  const joined = await once(clients[0], 'room-joined', 'cherry host room-joined');
  clients[1].emit('join-room', { roomId: joined.room.id, password: '' });
  await once(clients[1], 'room-joined', 'cherry guest room-joined');
  await Promise.all([
    waitForState(clients[0], (payload) => {
      return payload.status === 'playing' && payload.players[0] && Array.isArray(payload.players[0].hand) && payload.players[0].hand[0] === 'cherryTree';
    }, 'cherry host playing state'),
    waitForState(clients[1], (payload) => {
      return payload.status === 'playing' && payload.players[1] && Array.isArray(payload.players[1].hand) && payload.players[1].hand[0] === 'peach';
    }, 'cherry guest playing state')
  ]);
  await delay(150);

  const deployedPromise = waitForState(clients[0], (payload) => {
    return payload.units.some((unit) => unit.cardId === 'cherryTree') && payload.units.some((unit) => unit.cardId === 'peach');
  }, 'deployed cherry tree and target');
  const cherryShotPromise = onceEffect(clients[0], (effect) => effect.type === 'cherry-shot' && effect.cardId === 'cherryTree', 'cherry-shot effect', 7000);
  clients[0].emit('play-card', { handIndex: 0, x: 450, y: 338 });
  clients[1].emit('play-card', { handIndex: 0, x: 450, y: 282 });
  await deployedPromise;
  await cherryShotPromise;

  for (const client of clients) client.disconnect();
  return true;
}

async function expectDagwasilImmediateSpawn(accounts) {
  await expectDeckSave(accounts[0], dagwasilDeck);
  await expectDeckSave(accounts[1], targetDummyDeck);

  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  await Promise.all(clients.map((client) => once(client, 'welcome')));
  clients[0].emit('create-room', { name: '다과실 즉시 소환 스모크 테스트 방', password: '' });
  const joined = await once(clients[0], 'room-joined', 'dagwasil host room-joined');
  clients[1].emit('join-room', { roomId: joined.room.id, password: '' });
  await once(clients[1], 'room-joined', 'dagwasil guest room-joined');
  await waitForState(clients[0], (payload) => {
    return payload.status === 'playing' && payload.players[0] && Array.isArray(payload.players[0].hand) && payload.players[0].hand[0] === 'dagwasil' && payload.players[0].elixir >= 5;
  }, 'dagwasil host playing state');
  await delay(150);

  const startedAt = Date.now();
  const deployedStatePromise = waitForState(clients[0], (payload) => {
    const ids = payload.units.map((unit) => unit.cardId);
    return ids.includes('dagwasil') && ids.includes('nerdMale') && ids.includes('nerdFemale');
  }, 'dagwasil immediate minions');
  clients[0].emit('play-card', { handIndex: 0, x: 450, y: 338 });
  await deployedStatePromise;
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > 3000) {
    throw new Error(`Dagwasil minions did not spawn immediately enough. Took ${elapsedMs}ms.`);
  }

  for (const client of clients) client.disconnect();
  return true;
}

async function expectGiantHyeonjikIgnoresUnits(accounts) {
  await expectDeckSave(accounts[0], giantHyeonjikDeck);
  await expectDeckSave(accounts[1], targetDummyDeck);

  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  await Promise.all(clients.map((client) => once(client, 'welcome')));
  clients[0].emit('create-room', { name: '자이언트 ZICK 스모크 테스트 방', password: '' });
  const joined = await once(clients[0], 'room-joined', 'giant host room-joined');
  clients[1].emit('join-room', { roomId: joined.room.id, password: '' });
  await once(clients[1], 'room-joined', 'giant guest room-joined');
  await Promise.all([
    waitForState(clients[0], (payload) => {
      return payload.status === 'playing' && payload.players[0] && Array.isArray(payload.players[0].hand) && payload.players[0].hand[0] === 'giantHyeonjik' && payload.players[0].elixir >= 6;
    }, 'giant host playing state'),
    waitForState(clients[1], (payload) => {
      return payload.status === 'playing' && payload.players[1] && Array.isArray(payload.players[1].hand) && payload.players[1].hand[0] === 'peach';
    }, 'giant guest playing state')
  ]);
  await delay(150);

  const deployedPromise = waitForState(clients[0], (payload) => {
    return payload.units.some((unit) => unit.cardId === 'giantHyeonjik') && payload.units.some((unit) => unit.cardId === 'peach');
  }, 'deployed giant and target unit');
  const noUnitHitPromise = expectNoEffect(clients[0], (effect) => {
    return effect.type === 'hit' && effect.cardId === 'giantHyeonjik' && Math.abs(effect.x - 450) <= 45 && Math.abs(effect.y - 282) <= 45;
  }, 'giant ZICK unit hit', 1700);
  clients[0].emit('play-card', { handIndex: 0, x: 450, y: 338 });
  clients[1].emit('play-card', { handIndex: 0, x: 450, y: 282 });
  await deployedPromise;
  await noUnitHitPromise;

  for (const client of clients) client.disconnect();
  return true;
}

async function expectKkongMeteorDamageDelayed(accounts) {
  await expectDeckSave(accounts[0], kkongMeteorDeck);
  await expectDeckSave(accounts[1], targetDummyDeck);

  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  await Promise.all(clients.map((client) => once(client, 'welcome')));
  clients[0].emit('create-room', { name: '꽁 지연 데미지 스모크 테스트 방', password: '' });
  const joined = await once(clients[0], 'room-joined', 'kkong host room-joined');
  clients[1].emit('join-room', { roomId: joined.room.id, password: '' });
  await once(clients[1], 'room-joined', 'kkong guest room-joined');
  const readyState = await waitForState(clients[0], (payload) => {
    return payload.status === 'playing' && payload.players[0] && Array.isArray(payload.players[0].hand) && payload.players[0].hand[0] === 'kkong' && payload.players[0].elixir >= 4;
  }, 'kkong host playing state');
  const initialHp = enemyLeftPrincessHp(readyState);
  if (initialHp !== 5400) {
    throw new Error(`Unexpected initial enemy princess tower HP for Kkong test: ${initialHp}.`);
  }
  await delay(150);

  const meteorEffectPromise = onceEffect(clients[0], (effect) => effect.type === 'meteor' && effect.cardId === 'kkong' && effect.impactDelayMs >= 600, 'kkong meteor travel effect');
  clients[0].emit('play-card', { handIndex: 0, x: 255, y: 128 });
  await meteorEffectPromise;

  await delay(180);
  const beforeImpactState = await waitForState(clients[0], (payload) => payload.status === 'playing', 'kkong pre-impact tower state');
  const beforeImpactHp = enemyLeftPrincessHp(beforeImpactState);
  if (beforeImpactHp !== initialHp) {
    throw new Error(`Kkong damaged before impact. Expected ${initialHp}, got ${beforeImpactHp}.`);
  }

  const afterImpactState = await waitForState(clients[0], (payload) => enemyLeftPrincessHp(payload) === initialHp - 500, 'kkong post-impact tower damage');
  const afterImpactHp = enemyLeftPrincessHp(afterImpactState);
  if (afterImpactHp !== 4900) {
    throw new Error(`Kkong impact damage expected 4900 tower HP, got ${afterImpactHp}.`);
  }

  for (const client of clients) client.disconnect();
  return true;
}

async function expectTwoVersusTwoRoom(accounts, spectatorAccounts) {
  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  await Promise.all(clients.map((client) => once(client, 'welcome')));
  clients[0].emit('create-room', { name: '2대2 스모크 테스트 방', password: '', mode: '2v2', team: 1 });
  const hostJoin = await once(clients[0], 'room-joined', '2v2 host room-joined');
  if (!hostJoin.room || hostJoin.room.mode !== '2v2' || hostJoin.room.maxPlayers !== 4) {
    throw new Error('2v2 room did not expose the expected mode and capacity.');
  }

  clients[1].emit('join-room', { roomId: hostJoin.room.id, password: '', team: 1 });
  await once(clients[1], 'room-joined', '2v2 second top team room-joined');

  clients[2].emit('join-room', { roomId: hostJoin.room.id, password: '', team: 1 });
  const fullTeamError = await once(clients[2], 'room-error', '2v2 full team room-error');
  if (!String(fullTeamError).includes('이미 가득 찼습니다')) {
    throw new Error(`2v2 full team did not reject a third player. Got: ${fullTeamError}`);
  }
  await delay(120);

  for (let i = 2; i < clients.length; i += 1) {
    clients[i].emit('join-room', { roomId: hostJoin.room.id, password: '', team: 0 });
    await once(clients[i], 'room-joined', `2v2 bottom team player ${i} room-joined`);
  }

  const state = await waitForState(clients[3], (payload) => payload.status === 'playing', '2v2 playing state');
  const teams = state.players.map((player) => player.team).join('|');
  if (state.players.length !== 4 || teams !== '0|1|0|1') {
    throw new Error(`2v2 room did not assign balanced teams. Got ${teams}.`);
  }
  if (!state.room || state.room.playerCount !== 4 || state.room.maxPlayers !== 4) {
    throw new Error('2v2 room state did not report all four players.');
  }
  const kingTower = state.towers.find((tower) => tower.type === 'king');
  const princessTower = state.towers.find((tower) => tower.type === 'princess-left');
  if (!kingTower || kingTower.maxHp !== 13800 || !princessTower || princessTower.maxHp !== 8100) {
    throw new Error('2v2 tower HP did not use the expected 1.5x values.');
  }

  const chatResult = await expectBattleChatFlow(clients);
  const spectatorResult = await expectSpectatorFlow(hostJoin.room.id, spectatorAccounts);

  for (const client of clients) client.disconnect();
  return {
    status: state.status,
    players: state.players.length,
    teams: state.players.map((player) => player.team),
    rejectedFullTeam: true,
    kingTowerHp: kingTower.maxHp,
    chat: chatResult,
    spectator: spectatorResult
  };
}

async function expectBattleChatFlow(roomClients) {
  const allMessage = `전체-${Date.now()}`;
  const allReceivedByBottom = onceBattleChat(roomClients[2], (message) => message.channel === 'all' && message.text === allMessage, 'all chat on opposing team');
  roomClients[0].emit('battle-chat', { channel: 'all', text: allMessage });
  await allReceivedByBottom;

  await delay(750);

  const teamMessage = `팀-${Date.now()}`;
  const teamReceivedByMate = onceBattleChat(roomClients[1], (message) => message.channel === 'team' && message.text === teamMessage, 'team chat on same team');
  const notReceivedByBottom = expectNoBattleChat(roomClients[2], (message) => message.channel === 'team' && message.text === teamMessage, 'opposing team chat leak');
  roomClients[0].emit('battle-chat', { channel: 'team', text: teamMessage });
  await teamReceivedByMate;
  await notReceivedByBottom;

  return true;
}

async function expectSpectatorFlow(roomId, accounts) {
  const spectatorClients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));
  clients.push(...spectatorClients);

  await Promise.all(spectatorClients.map((client) => once(client, 'welcome')));

  const roomsPromise = once(spectatorClients[0], 'spectator-rooms', 'spectator room list');
  spectatorClients[0].emit('request-spectator-rooms');
  const rooms = await roomsPromise;
  if (!Array.isArray(rooms) || !rooms.some((room) => room.id === roomId && room.spectatorCount === 0)) {
    throw new Error('Active battle was not listed for spectators.');
  }

  await delay(100);
  const firstStatePromise = waitForState(spectatorClients[0], (payload) => {
    return payload.spectator && payload.spectatorCount === 1 && payload.players.every((player) => Array.isArray(player.hand) && player.hand.length > 0);
  }, 'first spectator state with all hands');
  const firstJoinPromise = once(spectatorClients[0], 'spectator-joined', 'first spectator joined');
  spectatorClients[0].emit('watch-room', { roomId });
  const [, spectatorState] = await Promise.all([firstJoinPromise, firstStatePromise]);
  if (spectatorState.players.some((player) => !Number.isFinite(player.elixir))) {
    throw new Error('Spectator state did not expose player elixir values.');
  }

  await delay(120);
  const spectatorMessage = `관전-${Date.now()}`;
  const spectatorChatPromise = onceBattleChat(clients[0], (message) => message.spectator && message.text === spectatorMessage, 'spectator battle chat');
  spectatorClients[0].emit('battle-chat', { channel: 'all', text: spectatorMessage });
  await spectatorChatPromise;

  await delay(100);
  const secondStatePromise = waitForState(spectatorClients[0], (payload) => payload.spectator && payload.spectatorCount === 2, 'spectator count 2');
  const secondJoinPromise = once(spectatorClients[1], 'spectator-joined', 'second spectator joined');
  spectatorClients[1].emit('watch-room', { roomId });
  await Promise.all([secondJoinPromise, secondStatePromise]);

  const fullRoomsPromise = once(spectatorClients[2], 'spectator-rooms', 'full spectator room list');
  spectatorClients[2].emit('request-spectator-rooms');
  const fullRooms = await fullRoomsPromise;
  if (Array.isArray(fullRooms) && fullRooms.some((room) => room.id === roomId)) {
    throw new Error('Full spectator room was still listed.');
  }

  await delay(100);
  const fullErrorPromise = once(spectatorClients[2], 'room-error', 'full spectator room-error');
  spectatorClients[2].emit('watch-room', { roomId });
  const fullError = await fullErrorPromise;
  if (!String(fullError).includes('관전자 자리가 가득 찼습니다')) {
    throw new Error(`Full spectator room did not reject a third watcher. Got: ${fullError}`);
  }

  return {
    listed: true,
    count: 2,
    fullRejected: true
  };
}

async function expectTournamentMode(accounts) {
  seedSmokeTrophies(accounts, 10);
  clients = accounts.map((account) => io(url, {
    transports: ['websocket'],
    extraHeaders: { Cookie: account.cookie }
  }));

  await Promise.all(clients.map((client) => once(client, 'welcome')));
  clients[0].emit('create-room', {
    name: '토너먼트 스모크 테스트 방',
    password: '',
    mode: 'tournament',
    participantCount: 3,
    stake: 5
  });
  const hostJoin = await once(clients[0], 'room-joined', 'tournament host room-joined');
  if (!hostJoin.room || hostJoin.room.mode !== 'tournament' || hostJoin.room.stake !== 5 || hostJoin.room.maxPlayers !== 3) {
    throw new Error('Tournament room did not expose mode, stake, and participant count.');
  }

  clients[1].emit('join-room', { roomId: hostJoin.room.id, password: '' });
  await once(clients[1], 'room-joined', 'tournament second room-joined');
  clients[2].emit('join-room', { roomId: hostJoin.room.id, password: '' });
  await once(clients[2], 'room-joined', 'tournament third room-joined');

  const openingStates = await Promise.all(clients.map((client, index) => waitForState(client, (payload) => {
    return payload.tournament
      && payload.tournament.status === 'playing'
      && payload.tournament.pool === 15
      && payload.tournament.rounds.length === 1
      && payload.status === 'playing';
  }, `tournament opening state ${index}`)));
  const activeIndexes = openingStates
    .map((state, index) => state.spectator ? null : index)
    .filter((index) => index !== null);
  const byeIndex = openingStates.findIndex((state) => state.spectator);
  if (activeIndexes.length !== 2 || byeIndex < 0) {
    throw new Error('Three-player tournament did not start with one bye spectator and one active match.');
  }

  await delay(120);
  const spectatorRoomsPromise = once(clients[byeIndex], 'spectator-rooms', 'tournament spectator room list');
  clients[byeIndex].emit('request-spectator-rooms');
  const spectatorRooms = await spectatorRoomsPromise;
  if (!Array.isArray(spectatorRooms) || !spectatorRooms[0] || !spectatorRooms[0].tournament || spectatorRooms[0].tournament.phase !== 'semifinal') {
    throw new Error('Tournament match was not listed at the top of spectator rooms with round metadata.');
  }

  clients[activeIndexes[1]].disconnect();
  await delay(50);

  const finalistIndexes = [activeIndexes[0], byeIndex];
  const breakStates = await Promise.all(finalistIndexes.map((index) => waitForState(clients[index], (payload) => {
    return payload.tournament
      && payload.tournament.status === 'break'
      && payload.tournament.break
      && payload.tournament.break.nextRoundPhase === 'final'
      && payload.tournament.break.deckSize === 10
      && payload.tournament.break.remainingMs > 0;
  }, `tournament final break state ${index}`)));
  if (breakStates.some((state) => !state.tournament.break.rules || !state.tournament.break.rules.final)) {
    throw new Error('Tournament final break did not expose final rules.');
  }

  const finalStates = await Promise.all(finalistIndexes.map((index) => waitForState(clients[index], (payload) => {
    if (!payload.tournament || payload.tournament.status !== 'playing' || payload.spectator) return false;
    const matches = payload.tournament.rounds.flatMap((round) => round.matches || []);
    const current = matches.find((match) => match.id === payload.tournament.viewingMatchId);
    return current && current.label === '결승' && current.status === 'playing';
  }, `tournament final state ${index}`)));
  if (finalStates.some((state) => state.maxSpectators !== null)) {
    throw new Error('Tournament final did not expose unlimited spectators.');
  }
  const finalState = finalStates[0];
  const finalKingTower = finalState.towers.find((tower) => tower.type === 'king');
  const finalPrincessTower = finalState.towers.find((tower) => tower.type === 'princess-left');
  const finalViewer = finalState.players.find((player) => player.username === accounts[finalistIndexes[0]].user.username);
  if (!finalState.rules || !finalState.rules.final || finalState.rules.durationMs !== 300000 || finalState.rules.handSize !== 5 || !finalViewer || finalViewer.hand.length !== 5) {
    throw new Error('Tournament final did not expose the expected special rules and five-card hand.');
  }
  if (!finalKingTower || finalKingTower.maxHp !== 13800 || !finalPrincessTower || finalPrincessTower.maxHp !== 8100) {
    throw new Error('Tournament final tower HP did not use the expected 1.5x values.');
  }

  const winnerIndex = activeIndexes[0];
  const loserIndex = byeIndex;
  const winnerEventPromise = once(clients[winnerIndex], 'tournament-winner', 'latest tournament winner event');
  clients[loserIndex].disconnect();
  const winnerEvent = await winnerEventPromise;
  if (!winnerEvent || winnerEvent.username !== accounts[winnerIndex].user.username || !winnerEvent.wonAt) {
    throw new Error('Tournament winner event did not include the expected champion and date.');
  }

  await delay(200);
  const winnerProfile = await fetchSessionUser(accounts[winnerIndex]);
  const runnerUpProfile = await fetchSessionUser(accounts[loserIndex]);
  if (winnerProfile.trophies !== 16 || winnerProfile.tournamentWins !== 1) {
    throw new Error(`Tournament winner profile expected 16 trophies and 1 win. Got ${winnerProfile.trophies}, ${winnerProfile.tournamentWins}.`);
  }
  if (runnerUpProfile.trophies !== 9) {
    throw new Error(`Tournament runner-up profile expected 9 trophies. Got ${runnerUpProfile.trophies}.`);
  }
  const latestWinner = await fetchTournamentWinner(accounts[winnerIndex]);
  if (!latestWinner || latestWinner.username !== accounts[winnerIndex].user.username || !latestWinner.wonAt) {
    throw new Error('Tournament latest winner API did not return the final winner.');
  }
  const history = await fetchTournamentHistory(accounts[winnerIndex]);
  const completed = history.find((entry) => entry.winnerUsername === accounts[winnerIndex].user.username);
  if (!completed || !completed.title || !completed.date) {
    throw new Error('Tournament history API did not list the completed tournament.');
  }
  const detail = await fetchTournamentDetail(accounts[winnerIndex], completed.id);
  if (!detail || detail.winnerUsername !== accounts[winnerIndex].user.username || detail.runnerUpUsername !== accounts[loserIndex].user.username || detail.pool !== 15 || detail.winnerPrize !== 11 || detail.runnerUpPrize !== 4 || !Array.isArray(detail.rounds) || detail.rounds.length < 2) {
    throw new Error('Tournament detail API did not expose bracket results.');
  }

  for (const client of clients) client.disconnect();
  return {
    pool: 15,
    winner: winnerProfile.username,
    trophies: winnerProfile.trophies,
    tournamentWins: winnerProfile.tournamentWins
  };
}

function seedSmokeTrophies(accounts, trophies) {
  const database = new Database(path.join(dataDir, 'game.sqlite'));
  const statement = database.prepare('UPDATE users SET trophies = ?, tier = ?, updated_at = ? WHERE username = ?');
  const now = new Date().toISOString();
  for (const account of accounts) {
    statement.run(trophies, trophies >= 10 ? '브론즈' : '마이어스', now, account.user.username);
  }
  database.close();
}

async function fetchSessionUser(account) {
  const response = await fetch(`${url}/api/me`, {
    headers: { Cookie: account.cookie }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Session user lookup failed.');
  return body.user;
}

async function fetchTournamentWinner(account) {
  const response = await fetch(`${url}/api/tournament-winner`, {
    headers: { Cookie: account.cookie }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Tournament winner lookup failed.');
  return body.winner;
}

async function fetchTournamentHistory(account) {
  const response = await fetch(`${url}/api/tournaments`, {
    headers: { Cookie: account.cookie }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Tournament history lookup failed.');
  return body.tournaments || [];
}

async function fetchTournamentDetail(account, id) {
  const response = await fetch(`${url}/api/tournaments/${encodeURIComponent(id)}`, {
    headers: { Cookie: account.cookie }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Tournament detail lookup failed.');
  return body.tournament;
}

function effectiveSmokeCost(player, card) {
  if (!card) return Infinity;
  if (bestFriendPair.includes(card.id) && bestFriendPair.every((id) => player.hand.includes(id))) {
    return bestFriendComboCost;
  }
  return card.cost;
}

function expectHeoseonNerf(cards) {
  const heoseon = cards && cards.heoseon;
  if (!heoseon) {
    throw new Error('Smoke welcome payload did not include Heoseon.');
  }

  const expected = {
    cost: 8,
    maxHp: 450,
    range: 16,
    speed: 37,
    radius: 14,
    berserkerThreshold: 0.243,
    berserkerMaxHp: 900,
    berserkerDamage: 70,
    berserkerSpeed: 95,
    berserkerAttackMs: 303,
    berserkerSplashRadius: 47
  };

  for (const [key, value] of Object.entries(expected)) {
    if (heoseon[key] !== value) {
      throw new Error(`Heoseon ${key} expected ${value}, got ${heoseon[key]}.`);
    }
  }

  if (!cards.baduk || cards.baduk.damage !== 100 || cards.baduk.chaosEnemyDamage !== 100 || cards.baduk.chaosFriendlyDamage !== 29) {
    throw new Error('Baduk damage tuning was not present.');
  }
  if (!cards.zzangga || cards.zzangga.cost !== 4 || cards.zzangga.maxHp !== 646 || cards.zzangga.damage !== 83) {
    throw new Error('Zzangga latest tuning was not present.');
  }
  if (!cards.mythos || cards.mythos.damage !== 63 || cards.mythos.awakenedDamage !== 108) {
    throw new Error('Mythos damage tuning was not present.');
  }

  if (!cards.badukFart || !cards.badukFart.spell || cards.badukFart.damagePerSecond !== 60 || cards.badukFart.radius !== 59 || cards.badukFart.durationMs !== 4000) {
    throw new Error('Baduk fart spell card did not expose the expected spell fields.');
  }
  if (!cards.bbatman || cards.bbatman.healIntervalMs !== 600) {
    throw new Error('Bbatman heal interval was not present.');
  }
  const playableCount = Object.values(cards).filter((card) => card && card.playable !== false).length;
  if (playableCount !== 20) {
    throw new Error(`Playable card count expected 20, got ${playableCount}.`);
  }
  if (!cards.dagwasil || !cards.dagwasil.building || cards.dagwasil.cost !== 5 || cards.dagwasil.maxHp !== 1320 || cards.dagwasil.radius !== 34 || cards.dagwasil.buildingDurationMs !== 20000 || cards.dagwasil.spawnMinionMs !== 4000 || !cards.dagwasil.spawnImmediately) {
    throw new Error('Dagwasil building card did not expose the expected fields.');
  }
  if (!cards.nerdMale || cards.nerdMale.playable !== false || cards.nerdMale.maxHp !== 180 || cards.nerdMale.damage !== 32 || cards.nerdMale.attackMs !== 717) {
    throw new Error('Nerd male minion did not expose the expected fields.');
  }
  if (!cards.nerdFemale || cards.nerdFemale.playable !== false || cards.nerdFemale.maxHp !== 140 || cards.nerdFemale.damage !== 32 || cards.nerdFemale.range !== 142 || cards.nerdFemale.attackMs !== 717) {
    throw new Error('Nerd female minion did not expose the expected fields.');
  }
  if (!cards.kkong || !cards.kkong.spell || cards.kkong.spellType !== 'meteor' || cards.kkong.cost !== 4 || cards.kkong.damage !== 500 || cards.kkong.radius !== 40 || cards.kkong.impactDelayMs !== 620) {
    throw new Error('Kkong meteor spell card did not expose the expected fields.');
  }
  if (!cards.cherryTree || !cards.cherryTree.building || cards.cherryTree.cost !== 5 || cards.cherryTree.maxHp !== 2000 || cards.cherryTree.damage !== 100 || cards.cherryTree.range !== 175 || cards.cherryTree.attackMs !== 1000 || cards.cherryTree.buildingDurationMs !== 20000 || !cards.cherryTree.cherryAttack) {
    throw new Error('Cherry tree building card did not expose the expected fields.');
  }
  if (!cards.giantHyeonjik || cards.giantHyeonjik.cost !== 6 || cards.giantHyeonjik.maxHp !== 1800 || cards.giantHyeonjik.damage !== 120 || cards.giantHyeonjik.attackMs !== 1200 || cards.giantHyeonjik.radius !== 31 || !cards.giantHyeonjik.buildingDestroyer) {
    throw new Error('Giant ZICK card did not expose the expected building destroyer fields.');
  }
  if (!cards.taegeonBumperCar || cards.taegeonBumperCar.cost !== 1 || cards.taegeonBumperCar.speed !== 95 || cards.taegeonBumperCar.maxHp !== 120 || cards.taegeonBumperCar.damage !== 200 || cards.taegeonBumperCar.explosionDamage !== 200 || !cards.taegeonBumperCar.suicideRusher) {
    throw new Error('Taegeon bumper car did not expose the expected suicide rusher fields.');
  }
  if (!cards.seongjoo || cards.seongjoo.attackMs !== 686) {
    throw new Error('Seongjoo attack speed nerf was not present.');
  }
  if (!cards.osj || cards.osj.cost !== 6 || cards.osj.maxHp !== 1200 || cards.osj.damage !== 20) {
    throw new Error('OSJ latest tuning was not present.');
  }
  if (!cards.kimgeunyoung || cards.kimgeunyoung.maxHp !== 2300 || cards.kimgeunyoung.damage !== 80 || cards.kimgeunyoung.timeExtensionMs !== 30000) {
    throw new Error('Kim Geunyoung return tuning was not present.');
  }
  if (!cards.geunyoungTank || cards.geunyoungTank.maxHp !== 190 || cards.geunyoungTank.damage !== 17) {
    throw new Error('Geunyoung tank damage tuning was not present.');
  }
}

function enemyLeftPrincessHp(state) {
  if (!state || !Array.isArray(state.towers)) return null;
  const tower = state.towers.find((candidate) => candidate.owner === 1 && candidate.type === 'princess-left');
  return tower ? tower.hp : null;
}

function once(client, eventName, label = eventName) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), 5000);
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

function onceEffect(client, predicate, label = 'matching effect', timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), timeoutMs);
    const handleEffect = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      client.off('effect', handleEffect);
      resolve(payload);
    };
    client.on('effect', handleEffect);
    client.once('connect_error', (error) => {
      clearTimeout(timer);
      client.off('effect', handleEffect);
      reject(error);
    });
  });
}

function expectNoEffect(client, predicate, label = 'unexpected effect', timeoutMs = 700) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('effect', handleEffect);
      resolve();
    }, timeoutMs);
    client.on('effect', handleEffect);

    function handleEffect(effect) {
      if (!predicate(effect)) return;
      clearTimeout(timer);
      client.off('effect', handleEffect);
      reject(new Error(`Received ${label}.`));
    }
  });
}

function waitForState(client, predicate, label = 'matching state') {
  return new Promise((resolve, reject) => {
    let lastSummary = 'none';
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${label}. Last: ${lastSummary}`));
    }, 12000);

    client.on('state', function handleState(payload) {
      try {
        lastSummary = JSON.stringify({
          status: payload && payload.status,
          spectator: payload && payload.spectator,
          spectatorCount: payload && payload.spectatorCount,
          hands: payload && payload.players && payload.players.map((player) => Array.isArray(player.hand) ? player.hand.length : 0)
        });
        if (!predicate(payload)) return;
        clearTimeout(timer);
        client.off('state', handleState);
        resolve(payload);
      } catch (error) {
        clearTimeout(timer);
        client.off('state', handleState);
        reject(error);
      }
    });
  });
}

function accountsSummary() {
  return clients.map((client) => Boolean(client.connected));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceBattleChat(client, predicate, label = 'battle chat') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), 5000);
    client.on('battle-chat', handleMessage);
    client.once('connect_error', handleError);

    function handleMessage(message) {
      if (!predicate(message)) return;
      clearTimeout(timer);
      client.off('battle-chat', handleMessage);
      client.off('connect_error', handleError);
      resolve(message);
    }

    function handleError(error) {
      clearTimeout(timer);
      client.off('battle-chat', handleMessage);
      reject(error);
    }
  });
}

function expectNoBattleChat(client, predicate, label = 'unexpected battle chat', timeoutMs = 700) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('battle-chat', handleMessage);
      resolve();
    }, timeoutMs);
    client.on('battle-chat', handleMessage);

    function handleMessage(message) {
      if (!predicate(message)) return;
      clearTimeout(timer);
      client.off('battle-chat', handleMessage);
      reject(new Error(`Received ${label}.`));
    }
  });
}

function cleanup() {
  finished = true;
  for (const client of clients) client.disconnect();
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {}
}
