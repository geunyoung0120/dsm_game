const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.ALLOWED_ORIGINS || process.env.PUBLIC_ORIGIN || '');
const DATA_DIR = resolveDataDir();
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'game.sqlite');
const DB_DIR = path.dirname(DB_PATH);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-before-production';
const HTTP_RATE_WINDOW_MS = 60 * 1000;
const HTTP_RATE_LIMIT = Number(process.env.HTTP_RATE_LIMIT || 240);
const SOCKET_RATE_WINDOW_MS = 60 * 1000;
const SOCKET_CONNECTION_LIMIT = Number(process.env.SOCKET_CONNECTION_LIMIT || 30);
const SOCKET_BAD_EVENT_LIMIT = 12;
const PLAY_CARD_MIN_INTERVAL_MS = 80;
const ARENA = { width: 900, height: 620 };
const TICK_MS = 50;
const BROADCAST_MS = 100;
const GAME_DURATION_MS = Number(process.env.GAME_DURATION_MS || 180000);
const SUDDEN_DEATH_MAX_MS = Number(process.env.SUDDEN_DEATH_MAX_MS || 90000);
const MAX_ELIXIR = 10;
const ELIXIR_PER_SECOND = 1 / 2.8;
const DOUBLE_ELIXIR_REMAINING_MS = 60000;
const DOUBLE_ELIXIR_MULTIPLIER = 2;
const TOWER_HP = {
  king: 9200,
  princess: 5400
};
const BEST_FRIEND_PAIR = ['baduk', 'johyunwoo'];
const BEST_FRIEND_COMBO_COST = 8;

const TIER_DEFINITIONS = [
  { key: 'mayers', name: '마이어스', icon: '🪨', min: 0, max: 9 },
  { key: 'bronze', name: '브론즈', icon: '🥉', min: 10, max: 29 },
  { key: 'silver', name: '실버', icon: '🥈', min: 30, max: 59 },
  { key: 'gold', name: '골드', icon: '🥇', min: 60, max: 99 },
  { key: 'diamond', name: '다이아몬드', icon: '💎', min: 100, max: 149 },
  { key: 'master', name: '마스터', icon: '👑', min: 150, max: 199 },
  { key: 'champion', name: '챔피언', icon: '🏆', min: 200, max: Infinity }
];

const CARDS = {
  zzangga: {
    id: 'zzangga',
    name: '짱가',
    cost: 5,
    role: '광역 딜러',
    maxHp: 760,
    damage: 98,
    range: 126,
    speed: 46,
    attackMs: 1500,
    radius: 19,
    female: true,
    skillCooldownMs: 4200
  },
  bbatman: {
    id: 'bbatman',
    name: '빼트맨',
    cost: 2,
    role: '힐러 지원',
    maxHp: 410,
    damage: 0,
    range: 0,
    speed: 76,
    attackMs: 0,
    radius: 15,
    healer: true,
    healPerSecond: 70,
    healRange: 62,
    followDistance: 46
  },
  baduk: {
    id: 'baduk',
    name: '박바둑',
    cost: 8,
    role: '카오스 딜러',
    maxHp: 1540,
    damage: 116,
    range: 74,
    speed: 40,
    attackMs: 1850,
    radius: 23,
    chaosRadius: 105,
    chaosEnemyDamage: 140,
    chaosFriendlyDamage: 29
  },
  kkongho: {
    id: 'kkongho',
    name: '꽁호',
    cost: 10,
    role: '필드 리셋',
    oneUse: true
  },
  yushin: {
    id: 'yushin',
    name: '유신',
    cost: 4,
    role: '군단 근접',
    maxHp: 78,
    damage: 19,
    range: 30,
    speed: 78,
    attackMs: 560,
    radius: 10,
    spawnCount: 8
  },
  jimin: {
    id: 'jimin',
    name: '지민',
    cost: 4,
    role: '단일 폭딜',
    maxHp: 650,
    damage: 296,
    range: 134,
    speed: 44,
    attackMs: 1225,
    radius: 18,
    windupMs: 380
  },
  mythos: {
    id: 'mythos',
    name: '미토스건휘',
    cost: 5,
    role: '변신 딜러',
    maxHp: 850,
    damage: 38,
    awakenedDamage: 102,
    range: 36,
    speed: 44,
    awakenedSpeed: 70,
    attackMs: 1000,
    awakenedAttackMs: 650,
    radius: 19,
    awakenMs: 950
  },
  peach: {
    id: 'peach',
    name: '복숭아',
    cost: 3,
    role: '근접 연타',
    maxHp: 585,
    damage: 36,
    range: 42,
    speed: 57,
    attackMs: 430,
    radius: 16,
    female: true
  },
  seongjoo: {
    id: 'seongjoo',
    name: '성주',
    cost: 3,
    role: '원거리 딜러',
    maxHp: 280,
    damage: 66,
    range: 185,
    speed: 42,
    attackMs: 520,
    radius: 15
  },
  johyunwoo: {
    id: 'johyunwoo',
    name: '조현우',
    cost: 6,
    role: '근접 단일',
    maxHp: 820,
    damage: 216,
    range: 42,
    speed: 54,
    attackMs: 1050,
    radius: 18
  },
  kimgeunyoung: {
    id: 'kimgeunyoung',
    name: '대.근.영',
    cost: 10,
    role: '탱커 소환',
    maxHp: 1850,
    damage: 160,
    range: 48,
    speed: 45,
    attackMs: 1050,
    radius: 24,
    oneUse: true,
    tankMinionId: 'geunyoungTank',
    spawnMinionMs: 1700
  },
  kimrui: {
    id: 'kimrui',
    name: '김루이',
    cost: 3,
    role: '흡혈 부착',
    maxHp: 430,
    damage: 0,
    range: 34,
    speed: 68,
    attackMs: 0,
    radius: 16,
    leech: true,
    attachRange: 34,
    drainPerSecond: 70,
    regenPerSecond: 52
  },
  geunyoungTank: {
    id: 'geunyoungTank',
    name: '근영 탱커',
    cost: 0,
    role: '소환 탱커',
    playable: false,
    maxHp: 520,
    damage: 42,
    range: 36,
    speed: 41,
    attackMs: 1050,
    radius: 16
  }
};

const CARD_IDS = Object.keys(CARDS).filter((id) => CARDS[id].playable !== false);
const DECK_SIZE = 8;
const DECK_COST_MIN = 40;
const DECK_COST_MAX = 55;

fs.mkdirSync(DB_DIR, { recursive: true });
warnIfDatabaseIsEphemeral();
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    trophies INTEGER NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT '마이어스',
    loss_counter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires INTEGER NOT NULL
  )
`);

const statements = {
  createUser: db.prepare(`
    INSERT INTO users (username, password_hash, trophies, tier, loss_counter, created_at, updated_at)
    VALUES (?, ?, 0, ?, 0, ?, ?)
  `),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  updateUserStats: db.prepare(`
    UPDATE users
    SET trophies = ?, tier = ?, loss_counter = ?, updated_at = ?
    WHERE id = ?
  `)
};

class SqliteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.getSession = database.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
    this.setSession = database.prepare(`
      INSERT INTO sessions (sid, data, expires)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires
    `);
    this.destroySession = database.prepare('DELETE FROM sessions WHERE sid = ?');
    this.touchSession = database.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
  }

  get(sid, callback) {
    try {
      const row = this.getSession.get(sid);
      if (!row) {
        callback(null);
        return;
      }
      if (row.expires <= Date.now()) {
        this.destroySession.run(sid);
        callback(null);
        return;
      }
      callback(null, JSON.parse(row.data));
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sess, callback) {
    try {
      this.setSession.run(sid, JSON.stringify(sess), sessionExpiresAt(sess));
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback) {
    try {
      this.destroySession.run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sess, callback) {
    try {
      this.touchSession.run(sessionExpiresAt(sess), sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

const sessionMiddleware = session({
  store: new SqliteSessionStore(db),
  name: 'dsm.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
});

const io = new Server(server, {
  maxHttpBufferSize: 1024,
  pingInterval: 25000,
  pingTimeout: 20000,
  allowRequest: (req, callback) => {
    if (!isAllowedOrigin(req.headers.origin, req.headers.host)) {
      callback('허용되지 않은 접속 출처입니다.', false);
      return;
    }
    if (!checkSocketConnectionRate(clientIpFromRequest(req))) {
      callback('접속 요청이 너무 많습니다.', false);
      return;
    }
    callback(null, true);
  }
});

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(applySecurityHeaders);
app.use(limitHttpRequests);
app.use(express.json({ limit: '12kb' }));
app.use(sessionMiddleware);

io.engine.use(sessionMiddleware);

app.get('/healthz', (req, res) => {
  res.type('text/plain').send('ok');
});

app.get('/api/me', requireAuthApi, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/signup', asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body && req.body.username);
  const password = String((req.body && req.body.password) || '');
  const validationError = validateAuthInput(username, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  if (statements.getUserByUsername.get(username)) {
    res.status(409).json({ error: '이미 사용 중인 이름입니다.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const tier = getTierForTrophies(0).name;
  const result = statements.createUser.run(username, passwordHash, tier, now, now);
  const user = statements.getUserById.get(result.lastInsertRowid);
  await establishSession(req, user.id);
  res.status(201).json({ user: publicUser(user) });
}));

app.post('/api/login', asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body && req.body.username);
  const password = String((req.body && req.body.password) || '');
  if (!username || !password) {
    res.status(400).json({ error: '이름과 비밀번호를 입력하세요.' });
    return;
  }

  const user = statements.getUserByUsername.get(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: '이름 또는 비밀번호가 올바르지 않습니다.' });
    return;
  }

  await establishSession(req, user.id);
  res.json({ user: publicUser(user) });
}));

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('dsm.sid');
    res.json({ ok: true });
  });
});

app.get('/api/rooms', requireAuthApi, (req, res) => {
  res.json({ rooms: publicRooms() });
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (['.html', '.js', '.css'].includes(path.extname(filePath))) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));
app.use('/vendor/phaser', express.static(path.join(__dirname, 'node_modules/phaser/dist'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

const httpRateBuckets = new Map();
const socketRateBuckets = new Map();
const rooms = new Map();

io.use((socket, next) => {
  const sessionData = socket.request.session;
  const userId = sessionData && sessionData.userId;
  if (!userId) {
    next(new Error('로그인이 필요합니다.'));
    return;
  }

  const user = statements.getUserById.get(userId);
  if (!user) {
    next(new Error('계정을 찾을 수 없습니다.'));
    return;
  }

  socket.data.user = publicUser(user);
  socket.data.slot = null;
  socket.data.roomId = null;
  socket.data.lastPlayCardAt = 0;
  socket.data.badEventCount = 0;
  next();
});

io.on('connection', (socket) => {
  socket.emit('welcome', {
    arena: ARENA,
    cards: CARDS,
    deckCostRange: [DECK_COST_MIN, DECK_COST_MAX],
    user: socket.data.user
  });
  socket.emit('profile', socket.data.user);
  socket.emit('rooms', publicRooms());

  socket.on('create-room', (payload = {}) => {
    if (!canUseSocketAction(socket)) return;
    createRoomForSocket(socket, payload);
  });

  socket.on('join-room', (payload = {}) => {
    if (!canUseSocketAction(socket)) return;
    joinRoomForSocket(socket, payload);
  });

  socket.on('leave-room', () => {
    leaveCurrentRoom(socket, { disconnecting: false });
  });

  socket.on('play-card', (payload) => {
    if (!canUseSocketAction(socket)) return;
    const room = socket.data.roomId ? rooms.get(socket.data.roomId) : null;
    const slot = socket.data.slot;
    if (!room || slot === null || slot === undefined) {
      registerBadSocketEvent(socket);
      return;
    }
    if (!isValidPlayCardPayload(payload)) {
      registerBadSocketEvent(socket);
      return;
    }
    playCard(room, slot, payload);
  });

  socket.on('restart', () => {
    const room = socket.data.roomId ? rooms.get(socket.data.roomId) : null;
    if (!room || room.game.status !== 'ended' || getConnectedPlayerCount(room) !== 2) {
      registerBadSocketEvent(socket);
      return;
    }
    startMatch(room);
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket, { disconnecting: true });
  });
});

function createRoomForSocket(socket, payload) {
  if (isInPlayingRoom(socket)) {
    socket.emit('room-error', '진행 중인 경기가 끝난 뒤 새 방을 만들 수 있습니다.');
    return;
  }
  if (!clearOtherWaitingSocketForUser(socket)) return;

  leaveCurrentRoom(socket, { disconnecting: false, silent: true });

  const name = normalizeRoomName(payload.name);
  if (!name) {
    socket.emit('room-error', '방 이름을 입력하세요.');
    return;
  }

  const password = normalizeRoomPassword(payload.password);
  const room = {
    id: crypto.randomUUID(),
    name,
    passwordHash: password ? bcrypt.hashSync(password, 8) : '',
    createdAt: Date.now(),
    game: createGameState()
  };
  rooms.set(room.id, room);
  assignSocketToRoom(socket, room);
  socket.emit('room-joined', { room: publicRoomDetail(room), slot: socket.data.slot });
  broadcastState(room);
  emitRooms();
}

function joinRoomForSocket(socket, payload) {
  if (isInPlayingRoom(socket)) {
    socket.emit('room-error', '진행 중인 경기가 끝난 뒤 다른 방에 들어갈 수 있습니다.');
    return;
  }
  if (!clearOtherWaitingSocketForUser(socket)) return;

  const roomId = String((payload && payload.roomId) || '');
  const room = rooms.get(roomId);
  if (!room || room.game.status !== 'waiting') {
    socket.emit('room-error', '참가할 수 없는 방입니다.');
    emitRooms();
    return;
  }
  if (getConnectedPlayerCount(room) >= 2) {
    socket.emit('room-error', '이미 가득 찬 방입니다.');
    emitRooms();
    return;
  }
  if (room.passwordHash && !bcrypt.compareSync(normalizeRoomPassword(payload.password), room.passwordHash)) {
    socket.emit('room-error', '방 비밀번호가 올바르지 않습니다.');
    return;
  }

  leaveCurrentRoom(socket, { disconnecting: false, silent: true });
  assignSocketToRoom(socket, room);
  socket.emit('room-joined', { room: publicRoomDetail(room), slot: socket.data.slot });
  broadcastState(room);

  if (getConnectedPlayerCount(room) === 2) {
    startMatch(room);
  }
  emitRooms();
}

function assignSocketToRoom(socket, room) {
  const user = statements.getUserById.get(socket.data.user.id);
  if (!user) {
    socket.emit('room-error', '계정을 찾을 수 없습니다.');
    return null;
  }

  const existingSlot = room.game.players.findIndex((player) => player.userId === user.id);
  const slot = existingSlot >= 0 ? existingSlot : room.game.players.findIndex((player) => !player.connected && !player.userId);
  if (slot < 0) return null;

  const player = room.game.players[slot];
  Object.assign(player, publicUser(user), {
    slot,
    userId: user.id,
    socketId: socket.id,
    connected: true
  });
  socket.data.user = publicUser(user);
  socket.data.roomId = room.id;
  socket.data.slot = slot;
  socket.join(roomChannel(room.id));
  return slot;
}

function leaveCurrentRoom(socket, options = {}) {
  const roomId = socket.data.roomId;
  const slot = socket.data.slot;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room && slot !== null && slot !== undefined) {
    const player = room.game.players[slot];
    if (player && player.socketId === socket.id) {
      player.connected = false;
      player.socketId = null;
      if (room.game.status === 'playing') {
        endMatch(room, 1 - slot, '상대 연결 종료');
      } else {
        clearRoomPlayer(player);
        if (getKnownPlayerCount(room) === 0) {
          rooms.delete(room.id);
        } else {
          room.game.status = 'waiting';
          room.game.message = '상대 접속 대기 중';
          broadcastState(room);
        }
      }
    }
  }

  socket.leave(roomChannel(roomId));
  socket.data.roomId = null;
  socket.data.slot = null;
  if (!options.disconnecting && !options.silent) {
    socket.emit('room-left');
  }
  emitRooms();
}

function isInPlayingRoom(socket) {
  const room = socket.data.roomId ? rooms.get(socket.data.roomId) : null;
  return Boolean(room && room.game.status === 'playing');
}

function clearOtherWaitingSocketForUser(socket) {
  const userId = socket.data.user && socket.data.user.id;
  if (!userId) return true;

  for (const other of io.of('/').sockets.values()) {
    if (other.id === socket.id || !other.data.user || other.data.user.id !== userId || !other.data.roomId) continue;
    const room = rooms.get(other.data.roomId);
    if (room && room.game.status === 'playing') {
      socket.emit('room-error', '이미 진행 중인 경기가 있습니다.');
      return false;
    }
    leaveCurrentRoom(other, { disconnecting: false });
  }
  return true;
}

function createGameState() {
  return {
    status: 'waiting',
    message: '상대 접속 대기 중',
    players: [createPlayer(0), createPlayer(1)],
    towers: [],
    units: [],
    nextUnitId: 1,
    startedAt: 0,
    endsAt: 0,
    suddenDeath: false,
    suddenDeathEndsAt: 0,
    freezeUntil: 0,
    pendingAscensionAt: 0,
    lastTickAt: Date.now(),
    lastBroadcastAt: 0,
    winner: null,
    reason: '',
    trophyChanges: null,
    trophiesSettled: false
  };
}

function createPlayer(slot) {
  return {
    slot,
    userId: null,
    username: '',
    trophies: 0,
    tier: getTierForTrophies(0).name,
    tierIcon: getTierForTrophies(0).icon,
    socketId: null,
    connected: false,
    elixir: 5,
    hand: [],
    cycle: [],
    usedOneTimeCards: {}
  };
}

function clearRoomPlayer(player) {
  const slot = player.slot;
  Object.assign(player, createPlayer(slot));
}

function resetPlayerForMatch(player) {
  const deck = shuffledDeck();
  player.elixir = 5;
  player.hand = deck.slice(0, 4);
  player.cycle = deck.slice(4);
  player.usedOneTimeCards = {};
}

function shuffledDeck() {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const deck = shuffle([...CARD_IDS]).slice(0, DECK_SIZE);
    const totalCost = deck.reduce((sum, id) => sum + CARDS[id].cost, 0);
    if (totalCost >= DECK_COST_MIN && totalCost <= DECK_COST_MAX) {
      return deck;
    }
  }

  throw new Error(`카드 8장의 총 코스트가 ${DECK_COST_MIN}-${DECK_COST_MAX} 범위인 덱을 만들 수 없습니다.`);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function createTowers() {
  return [
    createTower(0, 'king', ARENA.width / 2, 560),
    createTower(0, 'princess-left', 255, 492),
    createTower(0, 'princess-right', 645, 492),
    createTower(1, 'king', ARENA.width / 2, 60),
    createTower(1, 'princess-left', 255, 128),
    createTower(1, 'princess-right', 645, 128)
  ];
}

function createTower(owner, type, x, y) {
  const isKing = type === 'king';
  const maxHp = isKing ? TOWER_HP.king : TOWER_HP.princess;
  return {
    entity: 'tower',
    id: `p${owner}-${type}`,
    owner,
    type,
    x,
    y,
    hp: maxHp,
    maxHp,
    range: isKing ? 210 : 190,
    damage: isKing ? 58 : 46,
    attackMs: isKing ? 950 : 900,
    nextAttackAt: 0
  };
}

function startMatch(room) {
  const game = room.game;
  if (!game.players[0].connected || !game.players[1].connected) {
    game.status = 'waiting';
    game.message = '상대 접속 대기 중';
    game.winner = null;
    return;
  }

  for (const player of game.players) {
    refreshPlayerProfile(player);
    resetPlayerForMatch(player);
  }

  const now = Date.now();
  game.status = 'playing';
  game.message = '전투 중';
  game.towers = createTowers();
  game.units = [];
  game.nextUnitId = 1;
  game.startedAt = now;
  game.endsAt = now + GAME_DURATION_MS;
  game.suddenDeath = false;
  game.suddenDeathEndsAt = 0;
  game.freezeUntil = 0;
  game.pendingAscensionAt = 0;
  game.winner = null;
  game.reason = '';
  game.trophyChanges = null;
  game.trophiesSettled = false;
  game.lastTickAt = now;
  broadcastEffect(room, { type: 'match-start' });
  broadcastState(room);
}

function playCard(room, slot, payload = {}) {
  const game = room.game;
  if (game.status !== 'playing') return;
  const now = Date.now();
  if (game.freezeUntil > now) return;

  const player = game.players[slot];
  const handIndex = Number(payload.handIndex);
  if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex > 3) return;

  const cardId = player.hand[handIndex];
  const card = CARDS[cardId];
  if (!card || card.playable === false) return;
  if (card.oneUse && player.usedOneTimeCards[card.id]) return;
  const bestFriendCombo = getBestFriendCombo(player, card.id);
  const elixirCost = bestFriendCombo ? bestFriendCombo.cost : card.cost;
  if (player.elixir + 0.0001 < elixirCost) return;

  const x = Number(payload.x);
  const y = Number(payload.y);
  if (!isValidSpawnPoint(slot, x, y)) return;

  player.elixir = Math.max(0, player.elixir - elixirCost);

  if (bestFriendCombo) {
    advanceHandSlots(player, bestFriendCombo.handIndexes, true);
  } else if (card.oneUse) {
    player.usedOneTimeCards[card.id] = true;
    advanceHand(player, handIndex, false);
  } else {
    advanceHand(player, handIndex, true);
  }

  if (bestFriendCombo) {
    broadcastEffect(room, { type: 'best-friend-combo', owner: slot, x, y });
    spawnBestFriendCombo(room, slot, x, y);
    broadcastState(room);
    return;
  }

  if (card.id === 'kkongho') {
    triggerAscension(room, slot, x, y);
    broadcastState(room);
    return;
  }

  spawnCard(room, slot, card.id, x, y);
  broadcastState(room);
}

function isValidSpawnPoint(slot, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 48 || x > ARENA.width - 48) return false;
  if (slot === 0) return y >= 338 && y <= ARENA.height - 42;
  return y >= 42 && y <= 282;
}

function advanceHand(player, handIndex, requeuePlayedCard) {
  advanceHandSlots(player, [handIndex], requeuePlayedCard);
}

function advanceHandSlots(player, handIndexes, requeuePlayedCards) {
  const uniqueIndexes = [...new Set(handIndexes)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < player.hand.length)
    .sort((a, b) => a - b);
  const playedCards = uniqueIndexes.map((index) => player.hand[index]).filter(Boolean);

  if (requeuePlayedCards) {
    for (const playedCard of playedCards) {
      player.cycle.push(playedCard);
    }
  }

  for (const index of uniqueIndexes) {
    player.hand[index] = player.cycle.shift() || null;
  }
}

function spawnCard(room, owner, cardId, x, y) {
  const card = CARDS[cardId];
  const count = card.spawnCount || 1;
  const offsets = formationOffsets(count);

  for (let i = 0; i < count; i += 1) {
    spawnUnit(room, owner, cardId, x + offsets[i].x, y + offsets[i].y);
  }

  broadcastEffect(room, { type: 'spawn', owner, cardId, x, y });
}

function spawnBestFriendCombo(room, owner, x, y) {
  const offsets = [
    { cardId: 'baduk', x: -28, y: 0 },
    { cardId: 'johyunwoo', x: 28, y: 0 }
  ];

  for (const offset of offsets) {
    spawnCard(room, owner, offset.cardId, clamp(x + offset.x, 48, ARENA.width - 48), y + offset.y);
  }
}

function spawnUnit(room, owner, cardId, x, y, extras = {}) {
  const game = room.game;
  const card = CARDS[cardId];
  if (!card || !card.maxHp) return null;

  const now = Date.now();
  const unit = {
    entity: 'unit',
    id: `u${game.nextUnitId++}`,
    owner,
    cardId,
    x: clamp(x, 28, ARENA.width - 28),
    y: clamp(y, 28, ARENA.height - 28),
    hp: card.maxHp,
    maxHp: card.maxHp,
    nextAttackAt: now + Math.floor(Math.random() * 320),
    nextSkillAt: now + 700,
    nextChaosAt: now + randomBetween(2500, 5600),
    nextSummonAt: now + (card.spawnMinionMs || 1000),
    windupUntil: 0,
    windupTargetId: null,
    attachedToId: null,
    attachedById: null,
    awakened: false,
    invincibleUntil: 0,
    action: '',
    actionUntil: 0,
    ...extras
  };
  game.units.push(unit);
  return unit;
}

function formationOffsets(count) {
  if (count === 1) return [{ x: 0, y: 0 }];
  const offsets = [];
  const cols = 4;
  const spacing = 24;
  for (let i = 0; i < count; i += 1) {
    offsets.push({
      x: (i % cols - 1.5) * spacing,
      y: (Math.floor(i / cols) - 0.5) * spacing
    });
  }
  return offsets;
}

function triggerAscension(room, owner, x, y) {
  const game = room.game;
  const now = Date.now();
  game.freezeUntil = now + 2550;
  game.pendingAscensionAt = now + 1900;
  broadcastEffect(room, { type: 'ascension-start', owner, x, y });
}

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const game = room.game;
    const deltaSeconds = Math.min(0.1, (now - game.lastTickAt) / 1000);
    game.lastTickAt = now;

    if (game.status === 'playing') {
      tickGame(room, now, deltaSeconds);
    }

    if ((game.status === 'playing' || game.status === 'ended') && now - game.lastBroadcastAt >= BROADCAST_MS) {
      broadcastState(room);
    }
  }
}, TICK_MS);

function tickGame(room, now, deltaSeconds) {
  const game = room.game;
  if (game.pendingAscensionAt && now >= game.pendingAscensionAt) {
    for (const unit of game.units) {
      if (unit.cardId === 'kimrui') detachRui(room, unit, now, false);
    }
    game.units = [];
    game.pendingAscensionAt = 0;
    broadcastEffect(room, { type: 'ascension-end' });
  }

  if (game.freezeUntil > now) {
    return;
  }

  const elixirMultiplier = getElixirMultiplier(game, now);
  for (const player of game.players) {
    player.elixir = Math.min(MAX_ELIXIR, player.elixir + ELIXIR_PER_SECOND * elixirMultiplier * deltaSeconds);
  }

  updateUnits(room, now, deltaSeconds);
  updateTowers(room, now);
  removeDeadUnits(room);
  checkWinConditions(room, now);
}

function updateUnits(room, now, deltaSeconds) {
  const game = room.game;
  for (const unit of game.units) {
    if (unit.hp <= 0) continue;
    if (unit.actionUntil && unit.actionUntil <= now) {
      unit.action = '';
      unit.actionUntil = 0;
    }

    const card = CARDS[unit.cardId];
    if (!card) continue;

    if (unit.attachedById && findEntityById(game, unit.attachedById)) {
      unit.action = '묶임';
      unit.actionUntil = now + 200;
      continue;
    }
    unit.attachedById = null;

    if (card.healer) {
      updateHealer(room, unit, card, deltaSeconds, now);
      continue;
    }

    if (card.leech) {
      updateRui(room, unit, card, deltaSeconds, now);
      continue;
    }

    if (unit.cardId === 'baduk') {
      updateBadukChaos(room, unit, card, now);
    }

    if (unit.windupUntil) {
      resolveWindup(room, unit, card, now);
      continue;
    }

    const target = findUnitTarget(game, unit, card);
    if (!target) continue;

    const distanceToTarget = distance(unit, target);
    const attackRange = card.range + getTargetRadius(target);
    if (distanceToTarget > attackRange) {
      if (card.tankMinionId) {
        maybeSpawnTankMinion(room, unit, card, now);
      }
      moveToward(unit, target, getUnitSpeed(unit, card) * deltaSeconds);
      continue;
    }

    if (now < unit.nextAttackAt) continue;

    if (unit.cardId === 'jimin') {
      unit.windupUntil = now + card.windupMs;
      unit.windupTargetId = target.id;
      unit.action = '드립 준비';
      unit.actionUntil = unit.windupUntil;
      broadcastEffect(room, { type: 'windup', owner: unit.owner, cardId: unit.cardId, x: unit.x, y: unit.y });
      continue;
    }

    performAttack(room, unit, card, target, now);
  }
}

function updateHealer(room, unit, card, deltaSeconds, now) {
  const game = room.game;
  const candidates = game.units.filter((other) => {
    if (other.id === unit.id || other.owner !== unit.owner || other.hp <= 0) return false;
    const otherCard = CARDS[other.cardId];
    return otherCard && otherCard.female;
  });

  const target = nearest(unit, candidates);
  if (!target) {
    unit.action = '대기';
    unit.actionUntil = now + 200;
    return;
  }

  const targetDistance = distance(unit, target);
  if (targetDistance > card.followDistance) {
    moveToward(unit, target, card.speed * deltaSeconds);
    unit.action = '추적';
    unit.actionUntil = now + 200;
    return;
  }

  target.hp = Math.min(target.maxHp, target.hp + card.healPerSecond * deltaSeconds);
  unit.action = '힐';
  unit.actionUntil = now + 200;
}

function updateRui(room, unit, card, deltaSeconds, now) {
  const game = room.game;
  if (unit.attachedToId) {
    const target = findEntityById(game, unit.attachedToId);
    if (!target || target.entity !== 'unit' || target.hp <= 0) {
      detachRui(room, unit, now);
      return;
    }

    unit.x = target.x + (unit.owner === 0 ? -16 : 16);
    unit.y = target.y - 6;
    target.attachedById = unit.id;
    applyDamageToUnit(room, target, card.drainPerSecond * deltaSeconds, unit.owner, now, { leechDrain: true });
    unit.hp = Math.min(unit.maxHp, unit.hp + card.regenPerSecond * deltaSeconds);
    unit.action = '흡혈';
    unit.actionUntil = now + 220;
    return;
  }

  const attachable = game.units.filter((other) => {
    return other.owner !== unit.owner && other.hp > 0 && !other.attachedById && distance(unit, other) <= card.attachRange + getTargetRadius(other);
  });
  const latchTarget = nearest(unit, attachable);
  if (latchTarget) {
    unit.attachedToId = latchTarget.id;
    latchTarget.attachedById = unit.id;
    unit.action = '부착';
    unit.actionUntil = now + 400;
    broadcastEffect(room, { type: 'leech', owner: unit.owner, fromX: unit.x, fromY: unit.y, x: latchTarget.x, y: latchTarget.y });
    return;
  }

  const enemyUnits = game.units.filter((other) => other.owner !== unit.owner && other.hp > 0 && !other.attachedById);
  const target = nearest(unit, enemyUnits);
  if (target) {
    moveToward(unit, target, card.speed * deltaSeconds);
    unit.action = '추적';
    unit.actionUntil = now + 200;
    return;
  }

  const fallbackTower = nearest(unit, getAttackableEnemyTowers(game, unit.owner));
  if (fallbackTower) {
    moveToward(unit, fallbackTower, card.speed * deltaSeconds);
  }
}

function updateBadukChaos(room, unit, card, now) {
  const game = room.game;
  if (now < unit.nextChaosAt) return;

  const targets = game.units.filter((other) => other.id !== unit.id && other.hp > 0 && distance(unit, other) <= card.chaosRadius);
  for (const target of targets) {
    const damage = target.owner === unit.owner ? card.chaosFriendlyDamage : card.chaosEnemyDamage;
    applyDamageToUnit(room, target, damage, unit.owner, now);
  }

  unit.nextChaosAt = now + randomBetween(3600, 7200);
  unit.action = randomChaosAction();
  unit.actionUntil = now + 720;
  broadcastEffect(room, { type: 'chaos', owner: unit.owner, x: unit.x, y: unit.y, radius: card.chaosRadius });
}

function maybeSpawnTankMinion(room, unit, card, now) {
  if (now < unit.nextSummonAt) return;

  const dir = unit.owner === 0 ? 1 : -1;
  const x = unit.x + randomBetween(-24, 25);
  const y = unit.y + dir * randomBetween(18, 32);
  const minion = spawnUnit(room, unit.owner, card.tankMinionId, x, y, {
    action: '호위',
    actionUntil: now + 420
  });
  unit.nextSummonAt = now + card.spawnMinionMs;
  if (minion) {
    broadcastEffect(room, { type: 'summon-minion', owner: unit.owner, cardId: card.tankMinionId, x: minion.x, y: minion.y });
  }
}

function resolveWindup(room, unit, card, now) {
  const game = room.game;
  if (now < unit.windupUntil) return;

  const target = findEntityById(game, unit.windupTargetId);
  unit.windupUntil = 0;
  unit.windupTargetId = null;
  unit.action = '';
  unit.actionUntil = 0;
  unit.nextAttackAt = now + card.attackMs;

  if (!target || getHp(target) <= 0 || distance(unit, target) > card.range + getTargetRadius(target) + 14) {
    return;
  }

  if (unit.cardId === 'jimin' && target.entity === 'unit' && target.cardId === 'yushin') {
    const yushinTargets = game.units.filter((other) => {
      return other.owner === target.owner && other.cardId === 'yushin' && other.hp > 0;
    });
    broadcastEffect(room, { type: 'jimin-yushin-counter', owner: unit.owner, x: unit.x, y: unit.y });
    for (const yushin of yushinTargets) {
      applyDamageToUnit(room, yushin, card.damage, unit.owner, now);
      broadcastEffect(room, { type: 'punchline', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: yushin.x, y: yushin.y });
    }
    return;
  }

  applyDamage(room, target, card.damage, unit.owner, now);
  broadcastEffect(room, { type: 'punchline', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
}

function performAttack(room, unit, card, target, now) {
  const game = room.game;
  const damage = getUnitDamage(unit, card);

  if (unit.cardId === 'zzangga' && now >= unit.nextSkillAt) {
    const enemies = game.units.filter((other) => {
      return other.owner !== unit.owner && other.hp > 0 && distance(target, other) <= 98;
    });
    for (const enemy of enemies) {
      applyDamageToUnit(room, enemy, damage, unit.owner, now);
    }
    applyDamage(room, target, damage, unit.owner, now);
    unit.nextSkillAt = now + card.skillCooldownMs;
    unit.action = '음파 폭소';
    unit.actionUntil = now + 500;
    broadcastEffect(room, { type: 'sonic', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
  } else {
    applyDamage(room, target, damage, unit.owner, now);
    broadcastEffect(room, { type: 'hit', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
  }

  unit.nextAttackAt = now + getAttackMs(unit, card);
}

function updateTowers(room, now) {
  const game = room.game;
  for (const tower of game.towers) {
    if (tower.hp <= 0 || now < tower.nextAttackAt) continue;

    const enemies = game.units.filter((unit) => unit.owner !== tower.owner && unit.hp > 0 && distance(tower, unit) <= tower.range);
    const target = nearest(tower, enemies);
    if (!target) continue;

    applyDamageToUnit(room, target, tower.damage, tower.owner, now);
    tower.nextAttackAt = now + tower.attackMs;
    broadcastEffect(room, { type: 'tower-shot', owner: tower.owner, fromX: tower.x, fromY: tower.y, x: target.x, y: target.y });
  }
}

function findUnitTarget(game, unit, card) {
  const attackableUnits = game.units.filter((other) => {
    return other.owner !== unit.owner && other.hp > 0 && distance(unit, other) <= Math.max(card.range + getTargetRadius(other), 170);
  });
  const nearUnit = nearest(unit, attackableUnits);
  if (nearUnit) return nearUnit;

  const towers = getAttackableEnemyTowers(game, unit.owner);
  return nearest(unit, towers);
}

function getAttackableEnemyTowers(game, owner) {
  const defender = 1 - owner;
  const kingVulnerable = isKingVulnerable(game, defender);
  return game.towers.filter((tower) => {
    if (tower.owner !== defender || tower.hp <= 0) return false;
    return tower.type !== 'king' || kingVulnerable;
  });
}

function isKingVulnerable(game, owner) {
  return game.towers.some((tower) => tower.owner === owner && tower.type !== 'king' && tower.hp <= 0);
}

function applyDamage(room, target, amount, sourceOwner, now) {
  if (!target) return;
  if (target.entity === 'unit') {
    applyDamageToUnit(room, target, amount, sourceOwner, now);
  } else if (target.entity === 'tower') {
    target.hp = Math.max(0, target.hp - amount);
  }
}

function applyDamageToUnit(room, unit, amount, sourceOwner, now, options = {}) {
  if (!unit || unit.hp <= 0) return;
  if (unit.invincibleUntil && unit.invincibleUntil > now) return;

  if (unit.cardId === 'kimrui' && unit.attachedToId && sourceOwner !== unit.owner && !options.leechDrain) {
    detachRui(room, unit, now);
  }

  const previousHp = unit.hp;
  unit.hp = Math.max(0, unit.hp - amount);

  if (unit.cardId === 'jimin' && unit.windupUntil && unit.hp < previousHp) {
    unit.windupUntil = 0;
    unit.windupTargetId = null;
    unit.action = '취소';
    unit.actionUntil = now + 450;
    unit.nextAttackAt = now + 900;
    broadcastEffect(room, { type: 'interrupt', owner: unit.owner, x: unit.x, y: unit.y });
  }

  if (unit.cardId === 'mythos' && !unit.awakened && unit.hp > 0 && unit.hp <= unit.maxHp * 0.5) {
    unit.awakened = true;
    unit.invincibleUntil = now + CARDS.mythos.awakenMs;
    unit.action = '각성';
    unit.actionUntil = unit.invincibleUntil;
    broadcastEffect(room, { type: 'awaken', owner: unit.owner, x: unit.x, y: unit.y });
  }
}

function detachRui(room, unit, now = Date.now(), emitEffect = true) {
  if (!unit || unit.cardId !== 'kimrui' || !unit.attachedToId) return;
  const target = findEntityById(room.game, unit.attachedToId);
  if (target && target.attachedById === unit.id) {
    target.attachedById = null;
  }
  unit.attachedToId = null;
  unit.action = '이탈';
  unit.actionUntil = now + 420;
  if (emitEffect) {
    broadcastEffect(room, { type: 'leech-detach', owner: unit.owner, x: unit.x, y: unit.y });
  }
}

function removeDeadUnits(room) {
  const game = room.game;
  for (const unit of game.units) {
    if (unit.hp > 0) continue;
    if (unit.cardId === 'kimrui') {
      detachRui(room, unit, Date.now(), false);
    }
    if (unit.attachedById) {
      const rui = findEntityById(game, unit.attachedById);
      if (rui) detachRui(room, rui, Date.now(), false);
    }
  }
  game.units = game.units.filter((unit) => unit.hp > 0);
}

function checkWinConditions(room, now) {
  const game = room.game;
  const destroyedKing = game.towers.find((tower) => tower.type === 'king' && tower.hp <= 0);
  if (destroyedKing) {
    endMatch(room, 1 - destroyedKing.owner, '킹타워 파괴');
    return;
  }

  if (!game.suddenDeath && now >= game.endsAt) {
    const hp0 = totalTowerHp(game, 0);
    const hp1 = totalTowerHp(game, 1);
    if (hp0 !== hp1) {
      endMatch(room, hp0 > hp1 ? 0 : 1, '제한 시간 종료');
      return;
    }

    game.suddenDeath = true;
    game.suddenDeathEndsAt = now + SUDDEN_DEATH_MAX_MS;
    game.message = '서든 데스';
    broadcastEffect(room, { type: 'sudden-death' });
  }

  if (game.suddenDeath) {
    const hp0 = totalTowerHp(game, 0);
    const hp1 = totalTowerHp(game, 1);
    if (hp0 !== hp1) {
      endMatch(room, hp0 > hp1 ? 0 : 1, '서든 데스 HP 우위');
      return;
    }
    if (now >= game.suddenDeathEndsAt) {
      endMatch(room, null, '서든 데스 무승부');
    }
  }
}

function endMatch(room, winner, reason) {
  const game = room.game;
  if (game.status === 'ended') return;
  game.status = 'ended';
  game.winner = winner;
  game.reason = reason;
  game.message = winner === null ? `무승부: ${reason}` : `${game.players[winner].username || `플레이어 ${winner + 1}`} 승리: ${reason}`;
  game.freezeUntil = 0;
  game.pendingAscensionAt = 0;
  settleTrophies(room, winner, reason);
  broadcastEffect(room, { type: 'match-end', winner, reason });
  broadcastState(room);
  emitRooms();
}

function settleTrophies(room, winner, reason) {
  const game = room.game;
  if (game.trophiesSettled) return;
  game.trophiesSettled = true;
  game.trophyChanges = [null, null];
  if (winner === null) return;

  const loser = 1 - winner;
  const winnerDelta = trophyDeltaForWin(reason);
  game.trophyChanges[winner] = updateUserTrophies(game.players[winner].userId, { winDelta: winnerDelta });
  game.trophyChanges[loser] = updateUserTrophies(game.players[loser].userId, { loss: true });

  for (const player of game.players) {
    refreshPlayerProfile(player);
    emitProfileToUser(player.userId);
  }
}

function trophyDeltaForWin(reason) {
  if (reason === '킹타워 파괴') return 2;
  return 1;
}

function updateUserTrophies(userId, options) {
  const user = statements.getUserById.get(userId);
  if (!user) return null;

  let trophies = Math.max(0, Number(user.trophies) || 0);
  let lossCounter = Math.max(0, Number(user.loss_counter) || 0);
  let delta = 0;

  if (options.winDelta) {
    delta = options.winDelta;
    trophies += delta;
  } else if (options.loss) {
    lossCounter += 1;
    if (lossCounter >= 2) {
      delta = trophies > 0 ? -1 : 0;
      trophies = Math.max(0, trophies - 1);
      lossCounter = 0;
    }
  }

  const tier = getTierForTrophies(trophies);
  statements.updateUserStats.run(trophies, tier.name, lossCounter, new Date().toISOString(), userId);
  return {
    userId,
    delta,
    trophies,
    tier: tier.name,
    tierIcon: tier.icon,
    lossCounter
  };
}

function totalTowerHp(game, owner) {
  return Math.round(
    game.towers
      .filter((tower) => tower.owner === owner)
      .reduce((sum, tower) => sum + Math.max(0, tower.hp), 0)
  );
}

function findEntityById(game, id) {
  return game.units.find((unit) => unit.id === id) || game.towers.find((tower) => tower.id === id) || null;
}

function getHp(target) {
  return target.hp || 0;
}

function getTargetRadius(target) {
  if (target.entity === 'tower') return target.type === 'king' ? 42 : 34;
  const card = CARDS[target.cardId];
  return card ? card.radius : 16;
}

function getUnitDamage(unit, card) {
  if (unit.cardId === 'mythos' && unit.awakened) return card.awakenedDamage;
  return card.damage;
}

function getUnitSpeed(unit, card) {
  if (unit.cardId === 'mythos' && unit.awakened) return card.awakenedSpeed;
  return card.speed;
}

function getAttackMs(unit, card) {
  if (unit.cardId === 'mythos' && unit.awakened) return card.awakenedAttackMs;
  return card.attackMs;
}

function getBestFriendCombo(player, selectedCardId) {
  if (!BEST_FRIEND_PAIR.includes(selectedCardId)) return null;

  const handIndexes = BEST_FRIEND_PAIR.map((cardId) => player.hand.indexOf(cardId));
  if (handIndexes.some((index) => index < 0)) return null;

  return {
    cardIds: BEST_FRIEND_PAIR,
    handIndexes,
    cost: BEST_FRIEND_COMBO_COST
  };
}

function moveToward(unit, target, amount) {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.0001) return;

  unit.x += (dx / length) * amount;
  unit.y += (dy / length) * amount;
  unit.x = clamp(unit.x, 16, ARENA.width - 16);
  unit.y = clamp(unit.y, 16, ARENA.height - 16);
}

function nearest(origin, items) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of items) {
    const currentDistance = distance(origin, item);
    if (currentDistance < bestDistance) {
      best = item;
      bestDistance = currentDistance;
    }
  }
  return best;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

function randomChaosAction() {
  const actions = ['드러눕기', '빙글빙글', '하늘 보기'];
  return actions[Math.floor(Math.random() * actions.length)];
}

function getElixirMultiplier(game, now) {
  if (game.status !== 'playing') return 1;
  if (game.suddenDeath) return DOUBLE_ELIXIR_MULTIPLIER;
  if (!game.endsAt) return 1;
  return game.endsAt - now <= DOUBLE_ELIXIR_REMAINING_MS ? DOUBLE_ELIXIR_MULTIPLIER : 1;
}

function broadcastEffect(room, effect) {
  io.to(roomChannel(room.id)).emit('effect', { ...effect, at: Date.now() });
}

function broadcastState(room) {
  const game = room.game;
  game.lastBroadcastAt = Date.now();
  const socketIds = io.sockets.adapter.rooms.get(roomChannel(room.id));
  if (!socketIds) return;
  for (const socketId of socketIds) {
    const socket = io.of('/').sockets.get(socketId);
    if (socket) {
      socket.emit('state', serializeState(room, socket.data.slot));
    }
  }
}

function serializeState(room, viewerSlot = null) {
  const game = room.game;
  const now = Date.now();
  return {
    room: publicRoomDetail(room),
    arena: ARENA,
    status: game.status,
    message: game.message,
    winner: game.winner,
    reason: game.reason,
    remainingMs: Math.max(0, (game.suddenDeath ? game.suddenDeathEndsAt : game.endsAt) - now),
    suddenDeath: game.suddenDeath,
    elixirMultiplier: getElixirMultiplier(game, now),
    freezeMs: Math.max(0, game.freezeUntil - now),
    trophyChange: viewerSlot === null || viewerSlot === undefined ? null : game.trophyChanges && game.trophyChanges[viewerSlot],
    players: game.players.map((player) => ({
      slot: player.slot,
      username: player.username,
      trophies: player.trophies,
      tier: player.tier,
      tierIcon: player.tierIcon,
      connected: player.connected,
      elixir: Number(player.elixir.toFixed(2)),
      hand: player.slot === viewerSlot ? player.hand : [],
      handSize: player.hand.filter(Boolean).length,
      usedOneTimeCards: Object.keys(player.usedOneTimeCards || {}),
      totalTowerHp: totalTowerHp(game, player.slot)
    })),
    towers: game.towers.map((tower) => ({
      id: tower.id,
      owner: tower.owner,
      type: tower.type,
      x: tower.x,
      y: tower.y,
      hp: Math.ceil(tower.hp),
      maxHp: tower.maxHp
    })),
    units: game.units.map((unit) => ({
      id: unit.id,
      owner: unit.owner,
      cardId: unit.cardId,
      x: Number(unit.x.toFixed(1)),
      y: Number(unit.y.toFixed(1)),
      hp: Math.ceil(unit.hp),
      maxHp: unit.maxHp,
      awakened: unit.awakened,
      invincible: unit.invincibleUntil > now,
      attached: Boolean(unit.attachedToId),
      suppressed: Boolean(unit.attachedById),
      action: unit.action,
      windup: unit.windupUntil > now
    }))
  };
}

function getTierForTrophies(trophies) {
  const value = Math.max(0, Number(trophies) || 0);
  return TIER_DEFINITIONS.find((tier) => value >= tier.min && value <= tier.max) || TIER_DEFINITIONS[TIER_DEFINITIONS.length - 1];
}

function publicUser(user) {
  const trophies = Math.max(0, Number(user.trophies) || 0);
  const tier = getTierForTrophies(trophies);
  return {
    id: user.id,
    username: user.username,
    trophies,
    tier: tier.name,
    tierIcon: tier.icon,
    tierKey: tier.key,
    lossCounter: Math.max(0, Number(user.loss_counter) || 0)
  };
}

function refreshPlayerProfile(player) {
  if (!player.userId) return;
  const user = statements.getUserById.get(player.userId);
  if (!user) return;
  Object.assign(player, publicUser(user), { userId: user.id });
}

function emitProfileToUser(userId) {
  const user = statements.getUserById.get(userId);
  if (!user) return;
  const profile = publicUser(user);
  for (const socket of io.of('/').sockets.values()) {
    if (socket.data.user && socket.data.user.id === userId) {
      socket.data.user = profile;
      socket.emit('profile', profile);
    }
  }
}

function normalizeUsername(value) {
  return String(value || '').trim();
}

function validateAuthInput(username, password) {
  if (!/^[A-Za-z0-9가-힣_-]{2,20}$/.test(username)) {
    return '이름은 한글, 영문, 숫자, 밑줄, 하이픈으로 2~20자만 사용할 수 있습니다.';
  }
  if (password.length < 6 || password.length > 72) {
    return '비밀번호는 6~72자로 입력하세요.';
  }
  return '';
}

function establishSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }
      req.session.userId = userId;
      req.session.save((saveError) => {
        if (saveError) reject(saveError);
        else resolve();
      });
    });
  });
}

function sessionExpiresAt(sess) {
  const expires = sess && sess.cookie && sess.cookie.expires;
  if (expires) return new Date(expires).getTime();
  const maxAge = sess && sess.cookie && sess.cookie.originalMaxAge;
  return Date.now() + (Number(maxAge) || 24 * 60 * 60 * 1000);
}

function requireAuthApi(req, res, next) {
  const userId = req.session && req.session.userId;
  if (!userId) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return;
  }
  const user = statements.getUserById.get(userId);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: '계정을 찾을 수 없습니다.' });
    return;
  }
  req.user = user;
  next();
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function normalizeRoomName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

function normalizeRoomPassword(value) {
  return String(value || '').trim().slice(0, 32);
}

function publicRooms() {
  return [...rooms.values()]
    .filter((room) => room.game.status === 'waiting' && getConnectedPlayerCount(room) < 2)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(publicRoomDetail);
}

function publicRoomDetail(room) {
  return {
    id: room.id,
    name: room.name,
    locked: Boolean(room.passwordHash),
    status: room.game.status,
    players: room.game.players
      .filter((player) => player.userId)
      .map((player) => ({
        username: player.username,
        trophies: player.trophies,
        tier: player.tier,
        tierIcon: player.tierIcon,
        connected: player.connected
      })),
    playerCount: getConnectedPlayerCount(room),
    maxPlayers: 2
  };
}

function emitRooms() {
  io.emit('rooms', publicRooms());
}

function getConnectedPlayerCount(room) {
  return room.game.players.filter((player) => player.connected).length;
}

function getKnownPlayerCount(room) {
  return room.game.players.filter((player) => player.userId).length;
}

function roomChannel(roomId) {
  return `room:${roomId}`;
}

function applySecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'"
    ].join('; ')
  );

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
}

function limitHttpRequests(req, res, next) {
  const key = req.ip || clientIpFromRequest(req);
  if (!consumeRateBucket(httpRateBuckets, key, HTTP_RATE_WINDOW_MS, HTTP_RATE_LIMIT)) {
    res.status(429).type('text/plain').send('요청이 너무 많습니다. 잠시 후 다시 시도하세요.');
    return;
  }
  next();
}

function canUseSocketAction(socket) {
  const now = Date.now();
  if (now - (socket.data.lastPlayCardAt || 0) < PLAY_CARD_MIN_INTERVAL_MS) {
    registerBadSocketEvent(socket);
    return false;
  }
  socket.data.lastPlayCardAt = now;
  return true;
}

function registerBadSocketEvent(socket) {
  socket.data.badEventCount = (socket.data.badEventCount || 0) + 1;
  if (socket.data.badEventCount >= SOCKET_BAD_EVENT_LIMIT) {
    socket.disconnect(true);
  }
}

function isValidPlayCardPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (!Number.isInteger(payload.handIndex) || payload.handIndex < 0 || payload.handIndex > 3) return false;
  if (!Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return false;
  return payload.x >= 0 && payload.x <= ARENA.width && payload.y >= 0 && payload.y <= ARENA.height;
}

function checkSocketConnectionRate(ip) {
  return consumeRateBucket(socketRateBuckets, ip, SOCKET_RATE_WINDOW_MS, SOCKET_CONNECTION_LIMIT);
}

function consumeRateBucket(store, key, windowMs, limit) {
  const now = Date.now();
  const bucketKey = key || 'unknown';
  const bucket = store.get(bucketKey);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    store.set(bucketKey, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function cleanupRateBuckets() {
  const now = Date.now();
  for (const [key, bucket] of httpRateBuckets) {
    if (now - bucket.startedAt > HTTP_RATE_WINDOW_MS * 2) httpRateBuckets.delete(key);
  }
  for (const [key, bucket] of socketRateBuckets) {
    if (now - bucket.startedAt > SOCKET_RATE_WINDOW_MS * 2) socketRateBuckets.delete(key);
  }
}

function cleanupEndedRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    const empty = getConnectedPlayerCount(room) === 0;
    const staleEnded = room.game.status === 'ended' && now - room.game.lastBroadcastAt > 10 * 60 * 1000;
    if (empty || staleEnded) rooms.delete(roomId);
  }
  emitRooms();
}

function clientIpFromRequest(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.socket.remoteAddress || 'unknown';
}

function parseAllowedOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

function isAllowedOrigin(origin, host) {
  if (!origin) return true;

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.includes(parsed.origin);
  }

  return Boolean(host && parsed.host === host);
}

function resolveDataDir() {
  return process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
}

function warnIfDatabaseIsEphemeral() {
  const hasExplicitPersistentPath = Boolean(process.env.DB_PATH || process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH);
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !hasExplicitPersistentPath) {
    console.warn('WARNING: SQLite database is using the app filesystem. Attach a Railway Volume or set DATA_DIR/DB_PATH to keep accounts after deploys.');
  }
}

setInterval(cleanupRateBuckets, 60 * 1000).unref();
setInterval(cleanupEndedRooms, 5 * 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`Friends Tower Defense running at http://localhost:${PORT}`);
  console.log(`SQLite database path: ${DB_PATH}`);
});
