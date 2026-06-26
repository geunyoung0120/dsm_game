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
const CHAT_MIN_INTERVAL_MS = 700;
const CHAT_MAX_LENGTH = 120;
const CHAT_HISTORY_LIMIT = 60;
const ARENA = { width: 900, height: 620 };
const FIELD_CENTER_X = ARENA.width / 2;
const DEPLOY_X_MIN = 48;
const DEPLOY_X_MAX = ARENA.width - 48;
const TOP_DEPLOY_Y_MIN = 42;
const TOP_DEPLOY_Y_MAX = 282;
const BOTTOM_DEPLOY_Y_MIN = 338;
const BOTTOM_DEPLOY_Y_MAX = ARENA.height - 42;
const TICK_MS = 50;
const BROADCAST_MS = 100;
const GAME_DURATION_MS = Number(process.env.GAME_DURATION_MS || 180000);
const TOURNAMENT_FINAL_DURATION_MS = Number(process.env.TOURNAMENT_FINAL_DURATION_MS || 300000);
const SUDDEN_DEATH_MAX_MS = Number(process.env.SUDDEN_DEATH_MAX_MS || 90000);
const START_COUNTDOWN_MS = Number(process.env.START_COUNTDOWN_MS || 3000);
const START_SIGNAL_MS = 700;
const MAX_ELIXIR = 10;
const ELIXIR_PER_SECOND = 1 / 2.8;
const DOUBLE_ELIXIR_REMAINING_MS = 60000;
const TRIPLE_ELIXIR_REMAINING_MS = 20000;
const TOURNAMENT_FINAL_DOUBLE_ELIXIR_REMAINING_MS = 100000;
const TOURNAMENT_FINAL_TRIPLE_ELIXIR_REMAINING_MS = 40000;
const DOUBLE_ELIXIR_MULTIPLIER = 2;
const TRIPLE_ELIXIR_MULTIPLIER = 3;
const MAX_SPECTATORS_PER_ROOM = 2;
const KIMGEUNYOUNG_TIME_EXTENSION_MS = 30000;
const TOWER_HP = {
  king: 9200,
  princess: 5400
};
const BEST_FRIEND_PAIR = ['baduk', 'johyunwoo'];
const BEST_FRIEND_COMBO_COST = 8;
const KKONGHO_MAX_ELIXIR_BONUS = 2;
const DEFAULT_DEPLOY_DELAY_MS = 650;
const ROOM_MODES = {
  '1v1': { key: '1v1', label: '1대1', maxPlayers: 2 },
  '2v2': { key: '2v2', label: '2대2', maxPlayers: 4 },
  tournament: { key: 'tournament', label: '토너먼트 모드', maxPlayers: 0 }
};
const TOURNAMENT_MIN_PARTICIPANTS = 3;
const TOURNAMENT_BREAK_MS = Number(process.env.TOURNAMENT_BREAK_MS || 60000);
const TOURNAMENT_FINAL_BREAK_MS = Number(process.env.TOURNAMENT_FINAL_BREAK_MS || 120000);

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
    maxHp: 646,
    damage: 83,
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
    healPerSecond: 40.1625,
    healIntervalMs: 600,
    healRange: 81,
    followDistance: 72,
    decayPerSecond: 8
  },
  baduk: {
    id: 'baduk',
    name: '박바둑',
    cost: 8,
    role: '카오스 딜러',
    maxHp: 1300,
    damage: 100,
    range: 74,
    speed: 40,
    attackMs: 1850,
    radius: 23,
    chaosRadius: 105,
    chaosEnemyDamage: 100,
    chaosFriendlyDamage: 29
  },
  badukFart: {
    id: 'badukFart',
    name: '바둑이 방구',
    cost: 3,
    role: '마법 장판',
    spell: true,
    spellType: 'area-dot',
    durationMs: 4000,
    damagePerSecond: 60,
    radius: 59
  },
  dagwasil: {
    id: 'dagwasil',
    name: '다과실',
    cost: 5,
    role: '건물 소환',
    building: true,
    maxHp: 1320,
    damage: 0,
    range: 0,
    speed: 0,
    attackMs: 0,
    radius: 34,
    buildingDurationMs: 20000,
    spawnMinionMs: 4000,
    spawnImmediately: true,
    spawnPair: ['nerdMale', 'nerdFemale']
  },
  kkong: {
    id: 'kkong',
    name: '꽁',
    cost: 4,
    role: '마법 폭격',
    spell: true,
    spellType: 'meteor',
    damage: 500,
    radius: 40,
    impactDelayMs: 620
  },
  cherryTree: {
    id: 'cherryTree',
    name: '진해 벚꽃나무',
    cost: 5,
    role: '건물 원거리',
    building: true,
    maxHp: 1700,
    damage: 100,
    range: 175,
    speed: 0,
    attackMs: 1000,
    radius: 34,
    buildingDurationMs: 20000,
    cherryAttack: true
  },
  giantHyeonjik: {
    id: 'giantHyeonjik',
    name: '자이언트 ZICK',
    cost: 7,
    role: '건물 파괴',
    maxHp: 2200,
    damage: 150,
    range: 44,
    speed: 36,
    attackMs: 1200,
    radius: 31,
    buildingDestroyer: true
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
    maxHp: 50,
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
    cost: 3,
    role: '단일 폭딜',
    maxHp: 618,
    damage: 89,
    range: 134,
    speed: 44,
    attackMs: 1225,
    radius: 16,
    windupMs: 180
  },
  mythos: {
    id: 'mythos',
    name: '미토스건휘',
    cost: 5,
    role: '변신 딜러',
    maxHp: 850,
    damage: 63,
    awakenedDamage: 108,
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
    cost: 2,
    role: '근접 연타',
    maxHp: 585,
    damage: 36,
    range: 42,
    speed: 57,
    attackMs: 717,
    radius: 16,
    female: true
  },
  seongjoo: {
    id: 'seongjoo',
    name: '성주',
    cost: 3,
    role: '원거리 딜러',
    maxHp: 224,
    damage: 59,
    range: 185,
    speed: 42,
    attackMs: 686,
    radius: 15,
    female: true
  },
  johyunwoo: {
    id: 'johyunwoo',
    name: '조현우',
    cost: 4,
    role: '근접 단일',
    maxHp: 656,
    damage: 88,
    rageThreshold: 0.2,
    rageDamageMultiplier: 1.5,
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
    maxHp: 2300,
    damage: 80,
    range: 43,
    speed: 41,
    attackMs: 1155,
    radius: 24,
    oneUse: true,
    tankMinionId: 'geunyoungTank',
    spawnMinionMs: 1500,
    timeExtensionMs: KIMGEUNYOUNG_TIME_EXTENSION_MS
  },
  kimrui: {
    id: 'kimrui',
    name: '김루이',
    cost: 4,
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
  heoseon: {
    id: 'heoseon',
    name: '허선',
    cost: 8,
    role: '폭발형 딜러',
    maxHp: 450,
    damage: 0,
    range: 16,
    speed: 37,
    attackMs: 275,
    radius: 14,
    female: true,
    berserker: true,
    berserkerThreshold: 0.243,
    berserkerMaxHp: 900,
    berserkerDamage: 70,
    berserkerSpeed: 95,
    berserkerAttackMs: 303,
    berserkerSplashRadius: 47
  },
  taegeonBumperCar: {
    id: 'taegeonBumperCar',
    name: '태건 범퍼카',
    cost: 1,
    role: '자폭 돌진',
    maxHp: 120,
    damage: 200,
    range: 22,
    speed: 95,
    attackMs: 0,
    radius: 16,
    suicideRusher: true,
    explosionDamage: 200,
    explosionRadius: 76,
    detonationRange: 18
  },
  osj: {
    id: 'osj',
    name: 'OSJ',
    cost: 6,
    role: '밀치기형 탱커',
    maxHp: 1200,
    damage: 20,
    range: 96,
    speed: 38,
    attackMs: 2500,
    radius: 22,
    pusher: true,
    pushWidth: 132,
    pushDistance: 112
  },
  geunyoungTank: {
    id: 'geunyoungTank',
    name: '광주 탱크',
    cost: 0,
    role: '소환 탱커',
    playable: false,
    maxHp: 190,
    damage: 17,
    range: 32,
    speed: 37,
    attackMs: 1155,
    radius: 16
  },
  nerdMale: {
    id: 'nerdMale',
    name: '너드남',
    cost: 0,
    role: '다과실 소환수',
    playable: false,
    maxHp: 180,
    damage: 32,
    range: 32,
    speed: 48,
    attackMs: 717,
    radius: 15
  },
  nerdFemale: {
    id: 'nerdFemale',
    name: '너드녀',
    cost: 0,
    role: '다과실 소환수',
    playable: false,
    maxHp: 140,
    damage: 32,
    range: 142,
    speed: 42,
    attackMs: 717,
    radius: 15,
    female: true
  }
};

const CARD_IDS = Object.keys(CARDS).filter((id) => CARDS[id].playable !== false);
const DECK_SIZE = 8;
const FINAL_DECK_SIZE = 10;
const HAND_SIZE = 4;
const FINAL_HAND_SIZE = 5;
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
    tournament_wins INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_decks (
    user_id INTEGER PRIMARY KEY,
    cards TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_final_decks (
    user_id INTEGER PRIMARY KEY,
    cards TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    creator_user_id INTEGER NOT NULL,
    participant_target INTEGER NOT NULL,
    stake INTEGER NOT NULL,
    pool INTEGER NOT NULL DEFAULT 0,
    state_json TEXT NOT NULL,
    bracket_json TEXT NOT NULL,
    winner_user_id INTEGER,
    winner_username TEXT,
    winner_won_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    FOREIGN KEY (creator_user_id) REFERENCES users(id),
    FOREIGN KEY (winner_user_id) REFERENCES users(id)
  )
`);

ensureUserColumn('tournament_wins', 'INTEGER NOT NULL DEFAULT 0');

const statements = {
  createUser: db.prepare(`
    INSERT INTO users (username, password_hash, trophies, tier, loss_counter, created_at, updated_at)
    VALUES (?, ?, 0, ?, 0, ?, ?)
  `),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  listRankings: db.prepare(`
    SELECT id, username, trophies, tier
    FROM users
    ORDER BY trophies DESC, username COLLATE NOCASE ASC
  `),
  createTournament: db.prepare(`
    INSERT INTO tournaments (
      id, name, status, creator_user_id, participant_target, stake, pool,
      state_json, bracket_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateTournamentState: db.prepare(`
    UPDATE tournaments
    SET status = ?, pool = ?, state_json = ?, bracket_json = ?, winner_user_id = ?,
      winner_username = ?, winner_won_at = ?, updated_at = ?, started_at = ?, ended_at = ?
    WHERE id = ?
  `),
  latestTournamentWinner: db.prepare(`
    SELECT winner_user_id, winner_username, winner_won_at
    FROM tournaments
    WHERE status = 'completed' AND winner_user_id IS NOT NULL
    ORDER BY winner_won_at DESC, ended_at DESC
    LIMIT 1
  `),
  listCompletedTournaments: db.prepare(`
    SELECT id, name, status, participant_target, stake, pool, state_json, bracket_json,
      winner_user_id, winner_username, winner_won_at, created_at, started_at, ended_at
    FROM tournaments
    WHERE status = 'completed'
    ORDER BY COALESCE(winner_won_at, ended_at, created_at) ASC, created_at ASC
  `),
  getCompletedTournamentById: db.prepare(`
    SELECT id, name, status, participant_target, stake, pool, state_json, bracket_json,
      winner_user_id, winner_username, winner_won_at, created_at, started_at, ended_at
    FROM tournaments
    WHERE status = 'completed' AND id = ?
  `),
  getDeck: db.prepare('SELECT cards FROM user_decks WHERE user_id = ?'),
  upsertDeck: db.prepare(`
    INSERT INTO user_decks (user_id, cards, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET cards = excluded.cards, updated_at = excluded.updated_at
  `),
  getFinalDeck: db.prepare('SELECT cards FROM user_final_decks WHERE user_id = ?'),
  upsertFinalDeck: db.prepare(`
    INSERT INTO user_final_decks (user_id, cards, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET cards = excluded.cards, updated_at = excluded.updated_at
  `),
  updateUserStats: db.prepare(`
    UPDATE users
    SET trophies = ?, tier = ?, loss_counter = ?, updated_at = ?
    WHERE id = ?
  `),
  incrementTournamentWins: db.prepare(`
    UPDATE users
    SET tournament_wins = tournament_wins + 1, updated_at = ?
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

app.get('/api/rankings', requireAuthApi, (req, res) => {
  res.json({ rankings: publicRankings() });
});

app.get('/api/tournament-winner', requireAuthApi, (req, res) => {
  res.json({ winner: publicLatestTournamentWinner() });
});

app.get('/api/tournaments', requireAuthApi, (req, res) => {
  res.json({ tournaments: publicTournamentHistory() });
});

app.get('/api/tournaments/:id', requireAuthApi, (req, res) => {
  const detail = publicTournamentDetail(req.params.id);
  if (!detail) {
    res.status(404).json({ error: '토너먼트 기록을 찾을 수 없습니다.' });
    return;
  }
  res.json({ tournament: detail });
});

app.get('/api/tiers', requireAuthApi, (req, res) => {
  res.json({ tiers: publicTiers(), user: publicUser(req.user) });
});

app.get('/api/deck', requireAuthApi, (req, res) => {
  const deckSize = normalizeDeckSize(req.query && req.query.deckSize);
  res.json({
    deck: getSavedDeck(req.user.id, deckSize) || [],
    deckSize,
    cards: publicPlayableCards()
  });
});

app.put('/api/deck', requireAuthApi, (req, res) => {
  const deckSize = normalizeDeckSize(req.body && req.body.deckSize);
  const deck = req.body && req.body.deck;
  const validation = validateDeck(deck, deckSize);
  if (validation.error) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const statement = deckSize === FINAL_DECK_SIZE ? statements.upsertFinalDeck : statements.upsertDeck;
  statement.run(req.user.id, JSON.stringify(validation.deck), new Date().toISOString());
  res.json({
    deck: validation.deck,
    deckSize,
    cards: publicPlayableCards()
  });
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
const tournaments = new Map();
const tournamentBreakTimers = new Map();

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
  socket.data.spectatingRoomId = null;
  socket.data.tournamentId = null;
  socket.data.lastPlayCardAt = 0;
  socket.data.lastChatAt = 0;
  socket.data.badEventCount = 0;
  next();
});

io.on('connection', (socket) => {
  socket.emit('welcome', {
    arena: ARENA,
    cards: CARDS,
    deckCostRange: [DECK_COST_MIN, DECK_COST_MAX],
    user: socket.data.user,
    tournamentWinner: publicLatestTournamentWinner()
  });
  socket.emit('profile', socket.data.user);
  socket.emit('tournament-winner', publicLatestTournamentWinner());
  socket.emit('rooms', publicRooms());
  socket.emit('spectator-rooms', publicSpectatorRooms());

  socket.on('create-room', (payload = {}) => {
    if (!canUseSocketAction(socket)) return;
    createRoomForSocket(socket, payload);
  });

  socket.on('join-room', (payload = {}) => {
    if (!canUseSocketAction(socket)) return;
    joinRoomForSocket(socket, payload);
  });

  socket.on('request-spectator-rooms', () => {
    if (!canUseSocketAction(socket)) return;
    socket.emit('spectator-rooms', publicSpectatorRooms());
  });

  socket.on('watch-room', (payload = {}) => {
    if (!canUseSocketAction(socket)) return;
    joinSpectatorRoom(socket, payload);
  });

  socket.on('watch-tournament-match', (payload = {}) => {
    if (!canUseSocketAction(socket)) return;
    switchTournamentSpectatorMatch(socket, payload);
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

  socket.on('battle-chat', (payload = {}) => {
    if (!canUseSocketAction(socket)) return;
    sendBattleChat(socket, payload);
  });

  socket.on('request-rematch', () => {
    if (!canUseSocketAction(socket)) return;
    requestRematch(socket);
  });

  socket.on('restart', () => {
    if (!canUseSocketAction(socket)) return;
    requestRematch(socket);
  });

  socket.on('disconnect', () => {
    markTournamentParticipantDisconnected(socket);
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
  const mode = normalizeRoomMode(payload.mode);
  const modeDefinition = ROOM_MODES[mode];
  if (mode === 'tournament') {
    createTournamentRoomForSocket(socket, payload, { name, password });
    return;
  }
  const requestedTeam = mode === '2v2' ? normalizeRoomTeam(payload.team) : null;
  if (mode === '2v2' && requestedTeam === null) {
    socket.emit('room-error', '2대2는 시작할 팀을 선택하세요.');
    return;
  }
  const room = {
    id: crypto.randomUUID(),
    name,
    mode,
    modeLabel: modeDefinition.label,
    maxPlayers: modeDefinition.maxPlayers,
    passwordHash: password ? bcrypt.hashSync(password, 8) : '',
    createdAt: Date.now(),
    spectators: new Map(),
    game: createGameState(mode)
  };
  room.game.message = waitingRoomMessage(room);
  rooms.set(room.id, room);
  const slot = assignSocketToRoom(socket, room, requestedTeam);
  if (slot === null) {
    rooms.delete(room.id);
    socket.emit('room-error', '선택한 팀에 들어갈 수 없습니다.');
    return;
  }
  socket.emit('room-joined', { room: publicRoomDetail(room), slot: socket.data.slot });
  broadcastState(room);
  emitRooms();
}

function createTournamentRoomForSocket(socket, payload, normalized) {
  const creator = statements.getUserById.get(socket.data.user.id);
  if (!creator) {
    socket.emit('room-error', '계정을 찾을 수 없습니다.');
    return;
  }

  const participantTarget = normalizeTournamentParticipantCount(payload.participantCount);
  if (!participantTarget) {
    socket.emit('room-error', '토너먼트 참가 인원은 3명 이상이어야 합니다.');
    return;
  }

  const stake = normalizeTournamentStake(payload.stake);
  if (stake === null) {
    socket.emit('room-error', '트로피 참가비는 0개 이상 정수로 입력하세요.');
    return;
  }
  if (stake > 0 && (Number(creator.trophies) || 0) < stake && !payload.allowDebt) {
    socket.emit('room-error', '참가비가 부족합니다. 빚을 지고 참가하려면 다시 확인해주세요.');
    return;
  }

  const now = new Date().toISOString();
  const room = {
    id: crypto.randomUUID(),
    name: normalized.name,
    mode: 'tournament',
    modeLabel: ROOM_MODES.tournament.label,
    maxPlayers: participantTarget,
    passwordHash: normalized.password ? bcrypt.hashSync(normalized.password, 8) : '',
    createdAt: Date.now(),
    creatorUserId: creator.id,
    tournamentId: null,
    spectators: new Map(),
    game: createGameState('tournament')
  };
  room.game.message = waitingRoomMessage(room);

  const tournament = createTournamentRecord(room, {
    creatorUserId: creator.id,
    participantTarget,
    stake,
    now
  });
  room.tournamentId = tournament.id;
  tournaments.set(tournament.id, tournament);

  try {
    statements.createTournament.run(
      tournament.id,
      tournament.name,
      tournament.status,
      tournament.creatorUserId,
      tournament.participantTarget,
      tournament.stake,
      tournament.pool,
      JSON.stringify(persistableTournamentState(tournament)),
      JSON.stringify(tournament.rounds),
      now,
      now
    );
  } catch (error) {
    tournaments.delete(tournament.id);
    throw error;
  }

  rooms.set(room.id, room);
  const joinResult = assignSocketToTournamentRoom(socket, room, { allowDebt: Boolean(payload.allowDebt) });
  if (!joinResult.ok) {
    rooms.delete(room.id);
    tournament.status = 'cancelled';
    tournament.endedAt = new Date().toISOString();
    tournament.updatedAt = tournament.endedAt;
    persistTournamentState(tournament);
    tournaments.delete(tournament.id);
    socket.emit('room-error', joinResult.error || '토너먼트 방을 만들 수 없습니다.');
    return;
  }
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
  if (getConnectedPlayerCount(room) >= room.maxPlayers) {
    socket.emit('room-error', '이미 가득 찬 방입니다.');
    emitRooms();
    return;
  }
  const requestedTeam = room.mode === '2v2' ? normalizeRoomTeam(payload.team) : null;
  if (room.mode === '2v2' && requestedTeam === null) {
    socket.emit('room-error', '2대2는 참가할 팀을 선택하세요.');
    return;
  }
  if (room.mode === '2v2' && !hasOpenTeamSlot(room, requestedTeam)) {
    socket.emit('room-error', `${teamLabel(requestedTeam)}은 이미 가득 찼습니다.`);
    emitRooms();
    return;
  }
  if (room.passwordHash && !bcrypt.compareSync(normalizeRoomPassword(payload.password), room.passwordHash)) {
    socket.emit('room-error', '방 비밀번호가 올바르지 않습니다.');
    return;
  }

  if (room.mode === 'tournament') {
    leaveCurrentRoom(socket, { disconnecting: false, silent: true });
    const joinResult = assignSocketToTournamentRoom(socket, room, { allowDebt: Boolean(payload.allowDebt) });
    if (!joinResult.ok) {
      socket.emit('room-error', joinResult.error || '토너먼트 방에 참가할 수 없습니다.');
      emitRooms();
      return;
    }
    room.game.message = waitingRoomMessage(room);
    socket.emit('room-joined', { room: publicRoomDetail(room), slot: socket.data.slot });
    broadcastState(room);
    if (getConnectedPlayerCount(room) === room.maxPlayers) {
      startTournament(room);
    }
    emitRooms();
    return;
  }

  leaveCurrentRoom(socket, { disconnecting: false, silent: true });
  const slot = assignSocketToRoom(socket, room, requestedTeam);
  if (slot === null) {
    socket.emit('room-error', room.mode === '2v2' ? `${teamLabel(requestedTeam)}은 이미 가득 찼습니다.` : '이미 가득 찬 방입니다.');
    emitRooms();
    return;
  }
  room.game.message = waitingRoomMessage(room);
  socket.emit('room-joined', { room: publicRoomDetail(room), slot: socket.data.slot });
  broadcastState(room);

  if (getConnectedPlayerCount(room) === room.maxPlayers) {
    startMatch(room);
  }
  emitRooms();
}

function joinSpectatorRoom(socket, payload) {
  if (isInPlayingRoom(socket)) {
    socket.emit('room-error', '진행 중인 경기 중에는 관전할 수 없습니다.');
    return;
  }

  const roomId = String((payload && payload.roomId) || '');
  const room = rooms.get(roomId);
  if (!room || room.game.status !== 'playing') {
    socket.emit('room-error', '관전할 수 없는 방입니다.');
    emitRooms();
    return;
  }
  const maxSpectators = getMaxSpectators(room);
  if (Number.isFinite(maxSpectators) && getSpectatorCount(room) >= maxSpectators && !(room.spectators && room.spectators.has(socket.id))) {
    socket.emit('room-error', '관전자 자리가 가득 찼습니다.');
    emitRooms();
    return;
  }

  leaveCurrentRoom(socket, { disconnecting: false, silent: true });
  if (!room.spectators) room.spectators = new Map();
  room.spectators.set(socket.id, {
    userId: socket.data.user.id,
    username: socket.data.user.username
  });
  socket.data.spectatingRoomId = room.id;
  socket.data.roomId = null;
  socket.data.slot = null;
  socket.join(roomChannel(room.id));

  socket.emit('spectator-joined', { room: publicRoomDetail(room), spectator: true });
  socket.emit('state', serializeState(room, null, { spectator: true }));
  broadcastSpectatorCount(room);
  broadcastState(room);
  emitRooms();
}

function sendBattleChat(socket, payload = {}) {
  const spectator = Boolean(socket.data.spectatingRoomId);
  const room = socket.data.roomId ? rooms.get(socket.data.roomId) : socket.data.spectatingRoomId ? rooms.get(socket.data.spectatingRoomId) : null;
  const slot = socket.data.slot;
  if (!room || room.game.status !== 'playing') {
    registerBadSocketEvent(socket);
    return;
  }

  const now = Date.now();
  if (now - (socket.data.lastChatAt || 0) < CHAT_MIN_INTERVAL_MS) {
    socket.emit('chat-error', '채팅은 잠시 후 다시 보낼 수 있습니다.');
    return;
  }

  const text = normalizeChatText(payload.text);
  if (!text) return;

  const player = !spectator && slot !== null && slot !== undefined ? room.game.players[slot] : null;
  if (!spectator && (!player || !player.connected || player.socketId !== socket.id)) {
    registerBadSocketEvent(socket);
    return;
  }

  const requestedChannel = payload.channel === 'team' && !spectator ? 'team' : 'all';
  const channel = room.mode === '2v2' && !spectator ? requestedChannel : 'all';
  const message = {
    id: `m${room.game.nextChatId++}`,
    at: now,
    channel,
    targetTeam: channel === 'team' ? player.team : null,
    senderSlot: player ? player.slot : null,
    senderTeam: player ? player.team : null,
    spectator,
    username: spectator ? socket.data.user.username : player.username || '플레이어',
    text
  };

  socket.data.lastChatAt = now;
  room.game.chatMessages.push(message);
  if (room.game.chatMessages.length > CHAT_HISTORY_LIMIT) {
    room.game.chatMessages = room.game.chatMessages.slice(-CHAT_HISTORY_LIMIT);
  }
  broadcastBattleChat(room, message);
}

function normalizeChatText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_MAX_LENGTH);
}

function broadcastBattleChat(room, message) {
  const socketIds = io.sockets.adapter.rooms.get(roomChannel(room.id));
  if (!socketIds) return;
  const publicMessage = publicChatMessage(message);
  for (const socketId of socketIds) {
    const socket = io.of('/').sockets.get(socketId);
    if (socket && canSeeChatMessage(room, socket, message)) {
      socket.emit('battle-chat', publicMessage);
    }
  }
}

function canSeeChatMessage(room, socket, message) {
  if (message.channel !== 'team') return true;
  if (socket.data.roomId !== room.id) return false;
  const slot = socket.data.slot;
  const player = slot !== null && slot !== undefined ? room.game.players[slot] : null;
  return Boolean(player && player.team === message.targetTeam);
}

function visibleChatMessages(room, viewerSlot = null, spectator = false) {
  const viewer = !spectator && viewerSlot !== null && viewerSlot !== undefined
    ? room.game.players[viewerSlot]
    : null;
  return (room.game.chatMessages || [])
    .filter((message) => message.channel !== 'team' || (viewer && viewer.team === message.targetTeam))
    .map(publicChatMessage);
}

function publicChatMessage(message) {
  return {
    id: message.id,
    at: message.at,
    channel: message.channel,
    team: message.targetTeam,
    senderSlot: message.senderSlot,
    senderTeam: message.senderTeam,
    spectator: Boolean(message.spectator),
    username: message.username,
    text: message.text
  };
}

function assignSocketToRoom(socket, room, requestedTeam = null) {
  const user = statements.getUserById.get(socket.data.user.id);
  if (!user) {
    socket.emit('room-error', '계정을 찾을 수 없습니다.');
    return null;
  }

  const existingSlot = room.game.players.findIndex((player) => player.userId === user.id);
  const slot = existingSlot >= 0 ? existingSlot : findAvailableRoomSlot(room, requestedTeam);
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

function findAvailableRoomSlot(room, requestedTeam = null) {
  const players = room.game.players;
  if (room.mode === '2v2' && requestedTeam !== null) {
    return players.findIndex((player) => player.team === requestedTeam && !player.connected && !player.userId);
  }
  return players.findIndex((player) => !player.connected && !player.userId);
}

function leaveCurrentRoom(socket, options = {}) {
  if (socket.data.spectatingRoomId) {
    leaveSpectatorRoom(socket, options);
    if (!socket.data.roomId) return;
  }

  const roomId = socket.data.roomId;
  const slot = socket.data.slot;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room && slot !== null && slot !== undefined) {
    const player = room.game.players[slot];
    if (player && player.socketId === socket.id) {
      if (room.mode === 'tournament' && room.game.status === 'waiting') {
        const result = removeTournamentWaitingParticipant(socket, room, player, options);
        if (!result || !result.cleanedUp) {
          socket.leave(roomChannel(roomId));
          socket.data.roomId = null;
          socket.data.slot = null;
          if (!options.disconnecting && !options.silent) {
            socket.emit('room-left');
          }
        }
        emitRooms();
        return;
      }
      if (room.tournament && room.game.status === 'playing') {
        markTournamentParticipantDisconnected(socket);
      }
      player.connected = false;
      player.socketId = null;
      if (room.game.status === 'playing') {
        endMatch(room, getOpponentTeam(player.team), '상대 연결 종료');
        if (getConnectedPlayerCount(room) === 0) {
          rooms.delete(room.id);
        }
      } else {
        clearRoomPlayer(player);
        if (getConnectedPlayerCount(room) === 0 || getKnownPlayerCount(room) === 0) {
          rooms.delete(room.id);
        } else {
          room.game.status = 'waiting';
          room.game.message = waitingRoomMessage(room);
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

function leaveSpectatorRoom(socket, options = {}) {
  const roomId = socket.data.spectatingRoomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room && room.spectators) {
    room.spectators.delete(socket.id);
    broadcastSpectatorCount(room);
    broadcastState(room);
  }

  socket.leave(roomChannel(roomId));
  socket.data.spectatingRoomId = null;
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

function defaultGameRules() {
  return {
    final: false,
    durationMs: GAME_DURATION_MS,
    deckSize: DECK_SIZE,
    handSize: HAND_SIZE,
    towerHpMultiplier: 1,
    doubleElixirRemainingMs: DOUBLE_ELIXIR_REMAINING_MS,
    tripleElixirRemainingMs: TRIPLE_ELIXIR_REMAINING_MS,
    startCountdownMs: START_COUNTDOWN_MS
  };
}

function finalGameRules() {
  return {
    final: true,
    durationMs: TOURNAMENT_FINAL_DURATION_MS,
    deckSize: FINAL_DECK_SIZE,
    handSize: FINAL_HAND_SIZE,
    towerHpMultiplier: 1.5,
    doubleElixirRemainingMs: TOURNAMENT_FINAL_DOUBLE_ELIXIR_REMAINING_MS,
    tripleElixirRemainingMs: TOURNAMENT_FINAL_TRIPLE_ELIXIR_REMAINING_MS,
    startCountdownMs: START_COUNTDOWN_MS
  };
}

function gameRulesForRoom(room) {
  const rules = room && room.tournament && room.tournament.phase === 'final'
    ? finalGameRules()
    : defaultGameRules();
  if (room && room.mode === '2v2') {
    rules.startCountdownMs = 0;
    rules.towerHpMultiplier = 1.5;
  }
  return rules;
}

function publicGameRules(rules = defaultGameRules()) {
  return {
    final: Boolean(rules.final),
    durationMs: rules.durationMs || GAME_DURATION_MS,
    deckSize: rules.deckSize || DECK_SIZE,
    handSize: rules.handSize || HAND_SIZE,
    towerHpMultiplier: rules.towerHpMultiplier || 1,
    doubleElixirRemainingMs: rules.doubleElixirRemainingMs || DOUBLE_ELIXIR_REMAINING_MS,
    tripleElixirRemainingMs: rules.tripleElixirRemainingMs || TRIPLE_ELIXIR_REMAINING_MS,
    startCountdownMs: rules.startCountdownMs || 0
  };
}

function isInStartCountdown(game, now = Date.now()) {
  return Boolean(game && game.status === 'playing' && game.countdownEndsAt && now < game.countdownEndsAt);
}

function createGameState(mode = '1v1') {
  const definition = ROOM_MODES[mode] || ROOM_MODES['1v1'];
  return {
    status: 'waiting',
    message: '상대 접속 대기 중',
    mode: definition.key,
    players: Array.from({ length: definition.maxPlayers }, (_, slot) => createPlayer(slot)),
    towers: [],
    units: [],
    spellZones: [],
    pendingSpawns: [],
    pendingImpacts: [],
    chatMessages: [],
    nextUnitId: 1,
    nextSpellId: 1,
    nextChatId: 1,
    rules: defaultGameRules(),
    startedAt: 0,
    endsAt: 0,
    countdownEndsAt: 0,
    suddenDeath: false,
    suddenDeathEndsAt: 0,
    freezeUntil: 0,
    pendingAscensionAt: 0,
    elixirBoostLockedUntil: 0,
    elixirBoostLockedMultiplier: 1,
    lastTickAt: Date.now(),
    lastBroadcastAt: 0,
    winner: null,
    winnerName: '',
    reason: '',
    trophyChanges: null,
    trophiesSettled: false
  };
}

function createPlayer(slot) {
  return {
    slot,
    team: slot % 2,
    userId: null,
    username: '',
    trophies: 0,
    tier: getTierForTrophies(0).name,
    tierIcon: getTierForTrophies(0).icon,
    socketId: null,
    connected: false,
    elixir: 5,
    maxElixir: MAX_ELIXIR,
    hand: [],
    cycle: [],
    usedOneTimeCards: {},
    rematchAccepted: false
  };
}

function clearRoomPlayer(player) {
  const slot = player.slot;
  Object.assign(player, createPlayer(slot));
}

function resetPlayerForMatch(player, rules = defaultGameRules()) {
  const deck = deckForPlayer(player.userId, rules);
  player.elixir = 5;
  player.maxElixir = MAX_ELIXIR;
  player.hand = deck.slice(0, rules.handSize || HAND_SIZE);
  player.cycle = deck.slice(rules.handSize || HAND_SIZE);
  player.usedOneTimeCards = {};
  player.rematchAccepted = false;
}

function deckForPlayer(userId, rules = defaultGameRules()) {
  const deckSize = rules.deckSize || DECK_SIZE;
  if (rules.final) {
    return getSavedDeck(userId, FINAL_DECK_SIZE) || expandedFinalDeck(userId);
  }
  return getSavedDeck(userId, deckSize) || shuffledDeck(deckSize);
}

function expandedFinalDeck(userId) {
  const baseDeck = getSavedDeck(userId, DECK_SIZE) || shuffledDeck(DECK_SIZE);
  const extras = shuffle(CARD_IDS.filter((cardId) => !baseDeck.includes(cardId))).slice(0, FINAL_DECK_SIZE - baseDeck.length);
  return [...baseDeck, ...extras].slice(0, FINAL_DECK_SIZE);
}

function shuffledDeck(deckSize = DECK_SIZE) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const deck = shuffle([...CARD_IDS]).slice(0, deckSize);
    const totalCost = deck.reduce((sum, id) => sum + CARDS[id].cost, 0);
    if (deckSize !== DECK_SIZE || (totalCost >= DECK_COST_MIN && totalCost <= DECK_COST_MAX)) {
      return deck;
    }
  }

  throw new Error(`카드 ${deckSize}장의 덱을 만들 수 없습니다.`);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function createTowers(mode = '1v1', rules = defaultGameRules()) {
  const hpMultiplier = rules.towerHpMultiplier || (mode === '2v2' ? 1.5 : 1);
  return [
    createTower(0, 'king', ARENA.width / 2, 560, hpMultiplier),
    createTower(0, 'princess-left', 255, 492, hpMultiplier),
    createTower(0, 'princess-right', 645, 492, hpMultiplier),
    createTower(1, 'king', ARENA.width / 2, 60, hpMultiplier),
    createTower(1, 'princess-left', 255, 128, hpMultiplier),
    createTower(1, 'princess-right', 645, 128, hpMultiplier)
  ];
}

function createTower(owner, type, x, y, hpMultiplier = 1) {
  const isKing = type === 'king';
  const baseHp = isKing ? TOWER_HP.king : TOWER_HP.princess;
  const maxHp = Math.round(baseHp * hpMultiplier);
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
    nextAttackAt: 0,
    awakened: !isKing
  };
}

function startMatch(room) {
  const game = room.game;
  if (getConnectedPlayerCount(room) !== room.maxPlayers || game.players.some((player) => !player.connected)) {
    game.status = 'waiting';
    game.message = waitingRoomMessage(room);
    game.winner = null;
    return;
  }

  const rules = gameRulesForRoom(room);
  for (const player of game.players) {
    refreshPlayerProfile(player);
    resetPlayerForMatch(player, rules);
  }

  const now = Date.now();
  game.status = 'playing';
  game.message = '전투 중';
  game.rules = rules;
  game.towers = createTowers(room.mode, rules);
  game.units = [];
  game.spellZones = [];
  game.pendingSpawns = [];
  game.pendingImpacts = [];
  game.chatMessages = [];
  game.nextUnitId = 1;
  game.nextSpellId = 1;
  game.nextChatId = 1;
  game.startedAt = now;
  game.countdownEndsAt = now + (rules.startCountdownMs || 0);
  game.endsAt = game.countdownEndsAt + rules.durationMs;
  game.suddenDeath = false;
  game.suddenDeathEndsAt = 0;
  game.freezeUntil = 0;
  game.pendingAscensionAt = 0;
  game.elixirBoostLockedUntil = 0;
  game.elixirBoostLockedMultiplier = 1;
  game.winner = null;
  game.winnerName = '';
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
  if (isInStartCountdown(game, now)) return;
  if (game.freezeUntil > now) return;

  const player = game.players[slot];
  if (!player || !player.connected) return;
  const handIndex = Number(payload.handIndex);
  if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= (game.rules.handSize || HAND_SIZE)) return;

  const cardId = player.hand[handIndex];
  const card = CARDS[cardId];
  if (!card || card.playable === false) return;
  if (card.oneUse && player.usedOneTimeCards[card.id]) return;
  const bestFriendCombo = getBestFriendCombo(player, card.id);
  const elixirCost = bestFriendCombo ? bestFriendCombo.cost : card.cost;
  if (player.elixir + 0.0001 < elixirCost) return;

  const x = Number(payload.x);
  const y = Number(payload.y);
  if (!isValidPlayPoint(game, card, player.team, x, y)) return;

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
    broadcastEffect(room, { type: 'best-friend-combo', owner: player.team, x, y });
    queueBestFriendCombo(room, player.team, x, y);
    broadcastState(room);
    return;
  }

  if (card.id === 'kkongho') {
    player.maxElixir = Math.max(player.maxElixir || MAX_ELIXIR, MAX_ELIXIR + KKONGHO_MAX_ELIXIR_BONUS);
    triggerAscension(room, player.team, x, y);
    broadcastState(room);
    return;
  }

  if (card.spell) {
    castSpellCard(room, player.team, card, x, y);
    broadcastState(room);
    return;
  }

  queueSpawnCard(room, player.team, card.id, x, y);
  broadcastState(room);
}

function isValidPlayPoint(game, card, team, x, y) {
  if (card && card.spell) return isValidSpellTargetPoint(x, y);
  return isValidSpawnPoint(game, team, x, y);
}

function isValidSpawnPoint(game, team, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < DEPLOY_X_MIN || x > DEPLOY_X_MAX) return false;
  if (isBaseDeployZone(team, y)) return true;
  return isExpandedDeployZone(game, team, x, y);
}

function isBaseDeployZone(team, y) {
  if (team === 0) return y >= BOTTOM_DEPLOY_Y_MIN && y <= BOTTOM_DEPLOY_Y_MAX;
  return y >= TOP_DEPLOY_Y_MIN && y <= TOP_DEPLOY_Y_MAX;
}

function isExpandedDeployZone(game, team, x, y) {
  if (!game || !Array.isArray(game.towers)) return false;

  const enemyTeam = 1 - team;
  const inEnemySide = team === 0
    ? y >= TOP_DEPLOY_Y_MIN && y <= TOP_DEPLOY_Y_MAX
    : y >= BOTTOM_DEPLOY_Y_MIN && y <= BOTTOM_DEPLOY_Y_MAX;
  if (!inEnemySide) return false;

  if (x <= FIELD_CENTER_X && isPrincessTowerDestroyed(game, enemyTeam, 'princess-left')) return true;
  if (x >= FIELD_CENTER_X && isPrincessTowerDestroyed(game, enemyTeam, 'princess-right')) return true;
  return false;
}

function isPrincessTowerDestroyed(game, owner, type) {
  return game.towers.some((tower) => tower.owner === owner && tower.type === type && tower.hp <= 0);
}

function isValidSpellTargetPoint(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return x >= 28 && x <= ARENA.width - 28 && y >= 28 && y <= ARENA.height - 28;
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

function queueSpawnCard(room, owner, cardId, x, y, extras = {}) {
  const card = CARDS[cardId];
  if (!card) return;
  const delayMs = extras.delayMs || getDeployDelayMs(cardId);
  room.game.pendingSpawns.push({
    owner,
    cardId,
    x,
    y,
    extras: extras.unitExtras || {},
    readyAt: Date.now() + delayMs
  });
  broadcastEffect(room, { type: 'deploy', owner, cardId, x, y, delayMs, label: deployLabel(cardId) });
}

function spawnCard(room, owner, cardId, x, y, extras = {}) {
  const card = CARDS[cardId];
  const count = card.spawnCount || 1;
  const offsets = formationOffsets(count);
  const spawnedUnits = [];

  for (let i = 0; i < count; i += 1) {
    const unit = spawnUnit(room, owner, cardId, x + offsets[i].x, y + offsets[i].y, extras);
    if (unit) spawnedUnits.push(unit);
  }

  broadcastEffect(room, { type: 'spawn', owner, cardId, x, y });
  if (cardId === 'kimgeunyoung' && spawnedUnits.length > 0) {
    triggerKingReturn(room, owner, spawnedUnits[0].x, spawnedUnits[0].y, card);
  }
}

function queueBestFriendCombo(room, owner, x, y) {
  const offsets = [
    { cardId: 'baduk', x: -28, y: 0 },
    { cardId: 'johyunwoo', x: 28, y: 0 }
  ];

  for (const offset of offsets) {
    const comboX = clamp(x + offset.x, 48, ARENA.width - 48);
    queueSpawnCard(room, owner, offset.cardId, comboX, y, {
      delayMs: 760,
      unitExtras: {
        action: '절친 출격',
        actionDurationMs: 700
      }
    });
  }
}

function spawnUnit(room, owner, cardId, x, y, extras = {}) {
  const game = room.game;
  const card = CARDS[cardId];
  if (!card || !card.maxHp) return null;

  const now = Date.now();
  const { actionDurationMs, ...unitExtras } = extras;
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
    nextHealAt: now,
    nextSkillAt: now + 700,
    nextChaosAt: now + randomBetween(2500, 5600),
    nextSummonAt: card.spawnImmediately ? now : now + (card.spawnMinionMs || 1000),
    targetLockId: null,
    windupUntil: 0,
    windupTargetId: null,
    attachedToId: null,
    attachedById: null,
    awakened: false,
    berserked: false,
    furious: false,
    bumperExploded: false,
    invincibleUntil: 0,
    action: '',
    actionUntil: 0,
    ...unitExtras
  };
  if (actionDurationMs && unit.action && !unit.actionUntil) {
    unit.actionUntil = now + actionDurationMs;
  }
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

function castSpellCard(room, owner, card, x, y) {
  const game = room.game;
  const now = Date.now();
  if (card.spellType === 'meteor') {
    const impactDelayMs = card.impactDelayMs || 620;
    const impact = {
      owner,
      cardId: card.id,
      x: clamp(x, 28, ARENA.width - 28),
      y: clamp(y, 28, ARENA.height - 28),
      radius: card.radius,
      damage: card.damage,
      readyAt: now + impactDelayMs
    };
    game.pendingImpacts.push(impact);
    broadcastEffect(room, {
      type: 'meteor',
      owner,
      cardId: card.id,
      x: impact.x,
      y: impact.y,
      radius: impact.radius,
      damage: impact.damage,
      impactDelayMs
    });
    return;
  }

  const zone = {
    id: `s${game.nextSpellId++}`,
    owner,
    cardId: card.id,
    x: clamp(x, 28, ARENA.width - 28),
    y: clamp(y, 28, ARENA.height - 28),
    radius: card.radius,
    damagePerSecond: card.damagePerSecond,
    startedAt: now,
    expiresAt: now + card.durationMs
  };
  game.spellZones.push(zone);
  broadcastEffect(room, {
    type: 'gas-zone',
    owner,
    cardId: card.id,
    x: zone.x,
    y: zone.y,
    radius: zone.radius,
    durationMs: card.durationMs
  });
}

function applyAreaDamage(room, origin, damage, radius, owner, now) {
  for (const unit of room.game.units) {
    if (unit.owner === owner || unit.hp <= 0) continue;
    if (distance(origin, unit) <= radius + getTargetRadius(unit)) {
      applyDamageToUnit(room, unit, damage, owner, now);
    }
  }

  for (const tower of room.game.towers) {
    if (tower.owner === owner || tower.hp <= 0) continue;
    if (distance(origin, tower) <= radius + getTargetRadius(tower)) {
      applyDamage(room, tower, damage, owner, now);
    }
  }
}

function processPendingSpawns(room, now) {
  const game = room.game;
  if (!Array.isArray(game.pendingSpawns) || game.pendingSpawns.length === 0) return;

  const remaining = [];
  for (const pending of game.pendingSpawns) {
    if (pending.readyAt > now) {
      remaining.push(pending);
      continue;
    }
    spawnCard(room, pending.owner, pending.cardId, pending.x, pending.y, pending.extras);
  }
  game.pendingSpawns = remaining;
}

function processPendingImpacts(room, now) {
  const game = room.game;
  if (!Array.isArray(game.pendingImpacts) || game.pendingImpacts.length === 0) return;

  const remaining = [];
  for (const impact of game.pendingImpacts) {
    if (impact.readyAt > now) {
      remaining.push(impact);
      continue;
    }
    applyAreaDamage(room, impact, impact.damage, impact.radius, impact.owner, now);
    broadcastEffect(room, {
      type: 'meteor-impact',
      owner: impact.owner,
      cardId: impact.cardId,
      x: impact.x,
      y: impact.y,
      radius: impact.radius,
      damage: impact.damage
    });
  }
  game.pendingImpacts = remaining;
}

function getDeployDelayMs(cardId) {
  const delays = {
    yushin: 520,
    peach: 560,
    seongjoo: 600,
    bbatman: 680,
    jimin: 700,
    johyunwoo: 720,
    zzangga: 760,
    kimrui: 780,
    baduk: 820,
    dagwasil: 760,
    cherryTree: 760,
    giantHyeonjik: 900,
    taegeonBumperCar: 360,
    osj: 880,
    mythos: 900,
    heoseon: 920,
    kimgeunyoung: 950
  };
  return delays[cardId] || DEFAULT_DEPLOY_DELAY_MS;
}

function deployLabel(cardId) {
  const labels = {
    zzangga: '폭소 준비',
    bbatman: '회복 원 전개',
    baduk: '혼돈 등장',
    dagwasil: '다과실 개장',
    cherryTree: '벚꽃 개화',
    giantHyeonjik: '거인 출격',
    yushin: '군단 집결',
    jimin: '드립 장전',
    mythos: '기운 상승',
    peach: '라켓 준비',
    seongjoo: '키보드 부팅',
    johyunwoo: '절친 출격',
    kimgeunyoung: '왕의 귀환',
    kimrui: '흡혈 접근',
    heoseon: '폭발 예고',
    taegeonBumperCar: '범퍼 시동',
    osj: '퇴장 준비'
  };
  return labels[cardId] || '소환 준비';
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
  if (isInStartCountdown(game, now)) {
    return;
  }

  if (game.pendingAscensionAt && now >= game.pendingAscensionAt) {
    for (const unit of game.units) {
      if (unit.cardId === 'kimrui') detachRui(room, unit, now, false);
    }
    game.units = [];
    game.pendingSpawns = [];
    game.pendingImpacts = [];
    game.pendingAscensionAt = 0;
    broadcastEffect(room, { type: 'ascension-end' });
  }

  if (game.freezeUntil > now) {
    return;
  }

  processPendingSpawns(room, now);
  processPendingImpacts(room, now);

  const elixirMultiplier = getElixirMultiplier(game, now);
  for (const player of game.players) {
    player.elixir = Math.min(player.maxElixir || MAX_ELIXIR, player.elixir + ELIXIR_PER_SECOND * elixirMultiplier * deltaSeconds);
  }

  updateSpellZones(room, now, deltaSeconds);
  updateUnits(room, now, deltaSeconds);
  updateTowers(room, now);
  removeDeadUnits(room);
  checkWinConditions(room, now);
}

function updateSpellZones(room, now, deltaSeconds) {
  const game = room.game;
  if (!Array.isArray(game.spellZones) || game.spellZones.length === 0) return;

  const activeZones = [];
  for (const zone of game.spellZones) {
    if (now >= zone.expiresAt) continue;

    const damage = zone.damagePerSecond * deltaSeconds;
    for (const unit of game.units) {
      if (unit.owner === zone.owner || unit.hp <= 0) continue;
      if (distance(zone, unit) <= zone.radius + getTargetRadius(unit)) {
        applyDamageToUnit(room, unit, damage, zone.owner, now);
      }
    }

    for (const tower of game.towers) {
      if (tower.owner === zone.owner || tower.hp <= 0) continue;
      if (distance(zone, tower) <= zone.radius + getTargetRadius(tower)) {
        applyDamage(room, tower, damage, zone.owner, now);
      }
    }

    activeZones.push(zone);
  }
  game.spellZones = activeZones;
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

    if (card.decayPerSecond) {
      unit.hp = Math.max(0, unit.hp - card.decayPerSecond * deltaSeconds);
      if (unit.hp <= 0) continue;
    }

    if (unit.attachedById && !findEntityById(game, unit.attachedById)) {
      unit.attachedById = null;
    }

    if (card.building) {
      updateBuilding(room, unit, card, deltaSeconds, now);
      continue;
    }

    if (card.suicideRusher) {
      updateSuicideRusher(room, unit, card, deltaSeconds, now);
      continue;
    }

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

    if (card.tankMinionId) {
      maybeSpawnTankMinion(room, unit, card, now);
    }

    if (card.berserker && !unit.berserked) {
      updateDormantBerserker(room, unit, card, deltaSeconds, now);
      continue;
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

function updateBuilding(room, unit, card, deltaSeconds, now) {
  if (card.buildingDurationMs) {
    unit.hp = Math.max(0, unit.hp - (unit.maxHp / (card.buildingDurationMs / 1000)) * deltaSeconds);
    if (unit.hp <= 0) return;
  }

  if (card.spawnPair && now >= unit.nextSummonAt) {
    spawnBuildingPair(room, unit, card, now);
  }

  if (card.cherryAttack && now >= unit.nextAttackAt) {
    const targets = room.game.units.filter((other) => {
      if (other.owner === unit.owner || other.hp <= 0) return false;
      const otherCard = CARDS[other.cardId];
      if (otherCard && otherCard.building) return false;
      return distance(unit, other) <= card.range + getTargetRadius(other);
    });
    const target = nearest(unit, targets);
    if (target) {
      applyDamageToUnit(room, target, card.damage, unit.owner, now);
      unit.action = '벚꽃 투척';
      unit.actionUntil = now + 320;
      broadcastEffect(room, {
        type: 'cherry-shot',
        owner: unit.owner,
        cardId: unit.cardId,
        fromX: unit.x,
        fromY: unit.y,
        x: target.x,
        y: target.y
      });
    }
    unit.nextAttackAt = now + card.attackMs;
  }
}

function spawnBuildingPair(room, unit, card, now) {
  const dir = unit.owner === 0 ? 1 : -1;
  const offsets = [
    { cardId: card.spawnPair[0], x: -22, y: dir * 36 },
    { cardId: card.spawnPair[1], x: 22, y: dir * 36 }
  ];

  for (const offset of offsets) {
    const minion = spawnUnit(room, unit.owner, offset.cardId, unit.x + offset.x, unit.y + offset.y, {
      action: '다과실 출동',
      actionUntil: now + 480
    });
    if (minion) {
      broadcastEffect(room, { type: 'snack-spawn', owner: unit.owner, cardId: minion.cardId, x: minion.x, y: minion.y });
    }
  }

  unit.nextSummonAt = now + card.spawnMinionMs;
  unit.action = '너드 소환';
  unit.actionUntil = now + 520;
}

function updateDormantBerserker(room, unit, card, deltaSeconds, now) {
  const target = findUnitTarget(room.game, unit, card);
  if (!target) return;

  const stopDistance = getTargetRadius(target) + 2;
  if (distance(unit, target) > stopDistance) {
    moveToward(unit, target, getUnitSpeed(unit, card) * deltaSeconds);
  }
  unit.action = '평소';
  unit.actionUntil = now + 200;
}

function updateSuicideRusher(room, unit, card, deltaSeconds, now) {
  const target = findSuicideTarget(room.game, unit);
  if (!target) {
    unit.action = '대상 탐색';
    unit.actionUntil = now + 200;
    return;
  }

  const triggerDistance = (card.detonationRange || card.range || 18) + getTargetRadius(target);
  if (distance(unit, target) > triggerDistance) {
    moveToward(unit, target, card.speed * deltaSeconds);
  }

  unit.action = '범퍼 돌진';
  unit.actionUntil = now + 200;

  if (distance(unit, target) <= triggerDistance) {
    detonateBumper(room, unit, now);
  }
}

function findSuicideTarget(game, unit) {
  const enemyUnits = game.units.filter((other) => other.owner !== unit.owner && other.hp > 0);
  const enemyTowers = getAttackableEnemyTowers(game, unit.owner);
  return nearest(unit, [...enemyUnits, ...enemyTowers]);
}

function updateHealer(room, unit, card, deltaSeconds, now) {
  const game = room.game;
  const healTargets = game.units.filter((other) => {
    if (other.id === unit.id || other.owner !== unit.owner || other.hp <= 0) return false;
    const otherCard = CARDS[other.cardId];
    return otherCard && otherCard.female && distance(unit, other) <= card.healRange + getTargetRadius(other);
  });

  if (healTargets.length > 0) {
    const didHeal = applyHealerPulse(unit, card, healTargets, deltaSeconds, now);
    unit.action = didHeal ? '범위 힐' : '힐 대기';
    unit.actionUntil = now + 200;
    return;
  }

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

  const didHeal = applyHealerPulse(unit, card, [target], deltaSeconds, now);
  unit.action = didHeal ? '범위 힐' : '힐 대기';
  unit.actionUntil = now + 200;
}

function applyHealerPulse(unit, card, targets, deltaSeconds, now) {
  if (!targets.length) return false;

  const healIntervalMs = card.healIntervalMs || 0;
  if (healIntervalMs > 0 && now < (unit.nextHealAt || 0)) return false;

  const healAmount = healIntervalMs > 0
    ? card.healPerSecond * (healIntervalMs / 1000)
    : card.healPerSecond * deltaSeconds;

  for (const target of targets) {
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
  }

  if (healIntervalMs > 0) {
    unit.nextHealAt = now + healIntervalMs;
  }

  return true;
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
    const baseDamage = target.owner === unit.owner ? card.chaosFriendlyDamage : card.chaosEnemyDamage;
    const damage = Math.round(baseDamage);
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

function triggerKingReturn(room, owner, x, y, card) {
  const game = room.game;
  if (game.status !== 'playing') return;

  const now = Date.now();
  const extensionMs = card.timeExtensionMs || 0;
  if (extensionMs <= 0) return;

  const multiplierBeforeExtension = getElixirMultiplier(game, now);
  if (game.suddenDeath) {
    game.suddenDeathEndsAt += extensionMs;
  } else {
    game.endsAt += extensionMs;
  }

  if (multiplierBeforeExtension > 1) {
    game.elixirBoostLockedUntil = Math.max(game.elixirBoostLockedUntil || 0, now + extensionMs);
    game.elixirBoostLockedMultiplier = Math.max(game.elixirBoostLockedMultiplier || 1, multiplierBeforeExtension);
  }

  game.message = multiplierBeforeExtension > 1
    ? `왕의 귀환: +30초, X${multiplierBeforeExtension} 유지`
    : '왕의 귀환: 전투 시간 +30초';
  broadcastEffect(room, {
    type: 'king-return',
    owner,
    cardId: 'kimgeunyoung',
    x,
    y,
    extensionMs,
    multiplier: multiplierBeforeExtension
  });
  broadcastState(room);
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
    const allYushinTargets = game.units.filter((other) => {
      return other.owner === target.owner && other.cardId === 'yushin' && other.hp > 0;
    });
    const targetLimit = Math.min(allYushinTargets.length, 2 + Math.floor(Math.random() * 2));
    const extraTargets = shuffle(allYushinTargets.filter((other) => other.id !== target.id));
    const yushinTargets = [target, ...extraTargets.slice(0, Math.max(0, targetLimit - 1))];
    broadcastEffect(room, { type: 'jimin-yushin-counter', owner: unit.owner, x: unit.x, y: unit.y });
    for (const yushin of yushinTargets) {
      applyDamageToUnit(room, yushin, card.damage, unit.owner, now);
      broadcastEffect(room, { type: 'punchline', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: yushin.x, y: yushin.y });
    }
    return;
  }

  applyDamage(room, target, card.damage, unit.owner, now);
  lockTowerTargetAfterHit(game, unit, target);
  broadcastEffect(room, { type: 'punchline', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
}

function performAttack(room, unit, card, target, now) {
  const game = room.game;
  const damage = getUnitDamage(unit, card);

  if (unit.cardId === 'heoseon' && unit.berserked) {
    performBerserkerAttack(room, unit, card, target, damage, now);
    return;
  }

  if (card.pusher) {
    performPushAttack(room, unit, card, target, damage, now);
    return;
  }

  if (unit.cardId === 'zzangga' && now >= unit.nextSkillAt) {
    const enemies = game.units.filter((other) => {
      return other.owner !== unit.owner && other.hp > 0 && distance(target, other) <= 98;
    });
    for (const enemy of enemies) {
      applyDamageToUnit(room, enemy, damage, unit.owner, now);
    }
    applyDamage(room, target, damage, unit.owner, now);
    lockTowerTargetAfterHit(game, unit, target);
    unit.nextSkillAt = now + card.skillCooldownMs;
    unit.action = '음파 폭소';
    unit.actionUntil = now + 500;
    broadcastEffect(room, { type: 'sonic', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
  } else {
    applyDamage(room, target, damage, unit.owner, now);
    lockTowerTargetAfterHit(game, unit, target);
    broadcastEffect(room, { type: 'hit', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
  }

  unit.nextAttackAt = now + getAttackMs(unit, card);
}

function performPushAttack(room, unit, card, target, damage, now) {
  const game = room.game;
  const targets = getFrontPushTargets(game, unit, card);

  if (targets.length === 0) {
    applyDamage(room, target, damage, unit.owner, now);
    lockTowerTargetAfterHit(game, unit, target);
  } else {
    const pushDir = unit.owner === 0 ? -1 : 1;
    for (const enemy of targets) {
      applyDamageToUnit(room, enemy, damage, unit.owner, now);
      enemy.targetLockId = null;
      const enemyCard = CARDS[enemy.cardId];
      if (!enemyCard || !enemyCard.building) {
        const sideStep = Math.sign(enemy.x - unit.x) * Math.min(18, card.pushDistance * 0.18);
        enemy.x = clamp(enemy.x + sideStep, 16, ARENA.width - 16);
        enemy.y = clamp(enemy.y + pushDir * card.pushDistance, 16, ARENA.height - 16);
      }
    }
  }

  unit.action = '잡상인들 다 나가!';
  unit.actionUntil = now + 650;
  broadcastEffect(room, {
    type: 'push',
    owner: unit.owner,
    cardId: unit.cardId,
    fromX: unit.x,
    fromY: unit.y,
    x: target.x,
    y: target.y,
    range: card.range,
    width: card.pushWidth
  });
  unit.nextAttackAt = now + getAttackMs(unit, card);
}

function getFrontPushTargets(game, unit, card) {
  const forward = unit.owner === 0 ? -1 : 1;
  const width = card.pushWidth || 110;

  return game.units.filter((other) => {
    if (other.owner === unit.owner || other.hp <= 0) return false;
    const otherRadius = getTargetRadius(other);
    const forwardDistance = (other.y - unit.y) * forward;
    if (forwardDistance < -otherRadius || forwardDistance > card.range + otherRadius) return false;
    return Math.abs(other.x - unit.x) <= width / 2 + otherRadius;
  });
}

function performBerserkerAttack(room, unit, card, target, damage, now) {
  const game = room.game;
  const splashRadius = card.berserkerSplashRadius || 0;
  const hitUnitIds = new Set();
  let hitCount = 0;

  if (target.entity === 'tower') {
    applyDamage(room, target, damage, unit.owner, now);
    lockTowerTargetAfterHit(game, unit, target);
    hitCount += 1;
  } else if (target.entity === 'unit') {
    hitUnitIds.add(target.id);
  }

  if (splashRadius > 0) {
    for (const other of game.units) {
      if (other.owner === unit.owner || other.hp <= 0) continue;
      if (distance(target, other) <= splashRadius) {
        hitUnitIds.add(other.id);
      }
    }
  }

  for (const targetId of hitUnitIds) {
    const enemy = findEntityById(game, targetId);
    if (enemy && enemy.entity === 'unit' && enemy.hp > 0) {
      applyDamageToUnit(room, enemy, damage, unit.owner, now);
      hitCount += 1;
    }
  }

  if (hitCount > 0) {
    unit.action = '폭주 난타';
    unit.actionUntil = now + 180;
    broadcastEffect(room, {
      type: 'berserk-hit',
      owner: unit.owner,
      cardId: unit.cardId,
      fromX: unit.x,
      fromY: unit.y,
      x: target.x,
      y: target.y,
      radius: splashRadius
    });
  }

  unit.nextAttackAt = now + getAttackMs(unit, card);
}

function updateTowers(room, now) {
  const game = room.game;
  for (const tower of game.towers) {
    if (tower.hp <= 0 || now < tower.nextAttackAt) continue;
    if (tower.type === 'king' && !tower.awakened) continue;

    const enemies = game.units.filter((unit) => unit.owner !== tower.owner && unit.hp > 0 && distance(tower, unit) <= tower.range);
    const target = nearest(tower, enemies);
    if (!target) continue;

    applyDamageToUnit(room, target, tower.damage, tower.owner, now);
    tower.nextAttackAt = now + tower.attackMs;
    broadcastEffect(room, { type: 'tower-shot', owner: tower.owner, fromX: tower.x, fromY: tower.y, x: target.x, y: target.y });
  }
}

function findUnitTarget(game, unit, card) {
  if (unit.targetLockId) {
    const lockedTarget = findEntityById(game, unit.targetLockId);
    if (lockedTarget && isValidTowerLock(game, unit, lockedTarget)) {
      return lockedTarget;
    }
    unit.targetLockId = null;
  }

  if (card.buildingDestroyer) {
    return findBuildingDestroyerTarget(game, unit, card);
  }

  const attackableUnits = game.units.filter((other) => {
    return other.owner !== unit.owner && other.hp > 0 && distance(unit, other) <= Math.max(card.range + getTargetRadius(other), 170);
  });
  const nearUnit = nearest(unit, attackableUnits);
  if (nearUnit) return nearUnit;

  const towers = getAttackableEnemyTowers(game, unit.owner);
  return nearest(unit, towers);
}

function findBuildingDestroyerTarget(game, unit, card) {
  const enemyBuildings = game.units.filter((other) => {
    if (other.owner === unit.owner || other.hp <= 0) return false;
    const otherCard = CARDS[other.cardId];
    return Boolean(otherCard && otherCard.building);
  });
  return nearest(unit, [...enemyBuildings, ...getAttackableEnemyTowers(game, unit.owner)]);
}

function isValidTowerLock(game, unit, target) {
  if (!target || target.entity !== 'tower' || target.owner === unit.owner || target.hp <= 0) return false;
  return getAttackableEnemyTowers(game, unit.owner).some((tower) => tower.id === target.id);
}

function lockTowerTargetAfterHit(game, unit, target) {
  if (target && target.entity === 'tower' && isValidTowerLock(game, unit, target)) {
    unit.targetLockId = target.id;
  }
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
    if (target.type === 'king') awakenKingTower(room, target, now);
    target.hp = Math.max(0, target.hp - amount);
  }
}

function awakenKingTower(room, tower, now) {
  if (!tower || tower.awakened || tower.hp <= 0) return;
  tower.awakened = true;
  tower.nextAttackAt = Math.max(tower.nextAttackAt || 0, now + 350);
  broadcastEffect(room, {
    type: 'king-tower-awaken',
    owner: tower.owner,
    x: tower.x,
    y: tower.y
  });
}

function applyDamageToUnit(room, unit, amount, sourceOwner, now, options = {}) {
  if (!unit || unit.hp <= 0) return;
  if (unit.invincibleUntil && unit.invincibleUntil > now) return;

  if (unit.cardId === 'kimrui' && unit.attachedToId && sourceOwner !== unit.owner && !options.leechDrain) {
    detachRui(room, unit, now);
  }

  unit.hp = Math.max(0, unit.hp - amount);

  if (shouldTriggerFury(unit)) {
    triggerFury(room, unit, now);
  }

  if (unit.cardId === 'heoseon' && shouldTriggerBerserker(unit)) {
    triggerBerserker(room, unit, now);
    return;
  }

  if (unit.hp <= 0) {
    detonateBumper(room, unit, now);
    return;
  }

  if (unit.cardId === 'mythos' && !unit.awakened && unit.hp > 0 && unit.hp <= unit.maxHp * 0.5) {
    unit.awakened = true;
    unit.invincibleUntil = now + CARDS.mythos.awakenMs;
    unit.action = '각성';
    unit.actionUntil = unit.invincibleUntil;
    broadcastEffect(room, { type: 'awaken', owner: unit.owner, x: unit.x, y: unit.y });
  }
}

function shouldTriggerBerserker(unit) {
  const card = CARDS[unit.cardId];
  return Boolean(card && card.berserker && !unit.berserked && unit.hp <= unit.maxHp * card.berserkerThreshold);
}

function shouldTriggerFury(unit) {
  const card = CARDS[unit.cardId];
  return Boolean(card && card.rageThreshold && !unit.furious && unit.hp > 0 && unit.hp <= unit.maxHp * card.rageThreshold);
}

function triggerFury(room, unit, now) {
  unit.furious = true;
  unit.nextAttackAt = Math.min(unit.nextAttackAt || now, now + 120);
  unit.action = '명존쎄!';
  unit.actionUntil = now + 950;
  broadcastEffect(room, { type: 'johyunwoo-rage', owner: unit.owner, cardId: unit.cardId, x: unit.x, y: unit.y });
}

function triggerBerserker(room, unit, now) {
  const card = CARDS[unit.cardId];
  unit.berserked = true;
  unit.maxHp = card.berserkerMaxHp;
  unit.hp = unit.maxHp;
  unit.nextAttackAt = now;
  unit.action = '폭발 상태';
  unit.actionUntil = now + 850;
  broadcastEffect(room, { type: 'berserk', owner: unit.owner, cardId: unit.cardId, x: unit.x, y: unit.y });
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

function detonateBumper(room, unit, now) {
  const card = CARDS[unit.cardId];
  if (!card || !card.suicideRusher || unit.bumperExploded) return;

  unit.bumperExploded = true;
  unit.hp = 0;
  const radius = card.explosionRadius || 72;
  const damage = card.explosionDamage || card.damage || 0;

  for (const enemy of room.game.units) {
    if (enemy.id === unit.id || enemy.owner === unit.owner || enemy.hp <= 0) continue;
    if (distance(unit, enemy) <= radius + getTargetRadius(enemy)) {
      applyDamageToUnit(room, enemy, damage, unit.owner, now);
    }
  }

  for (const tower of room.game.towers) {
    if (tower.owner === unit.owner || tower.hp <= 0) continue;
    if (distance(unit, tower) <= radius + getTargetRadius(tower)) {
      applyDamage(room, tower, damage, unit.owner, now);
    }
  }

  broadcastEffect(room, {
    type: 'bumper-explosion',
    owner: unit.owner,
    cardId: unit.cardId,
    x: unit.x,
    y: unit.y,
    radius
  });
}

function removeDeadUnits(room) {
  const game = room.game;
  const now = Date.now();
  for (const unit of game.units) {
    if (unit.hp > 0) continue;
    if (unit.cardId === 'taegeonBumperCar') {
      detonateBumper(room, unit, now);
    }
    if (unit.cardId === 'kimrui') {
      detachRui(room, unit, now, false);
    }
    if (unit.attachedById) {
      const rui = findEntityById(game, unit.attachedById);
      if (rui) detachRui(room, rui, now, false);
    }
  }
  game.units = game.units.filter((unit) => unit.hp > 0);
}

function checkWinConditions(room, now) {
  const game = room.game;
  const destroyedKings = game.towers.filter((tower) => tower.type === 'king' && tower.hp <= 0);
  if (destroyedKings.length >= 2) {
    endMatch(room, null, '양쪽 킹타워 파괴');
    return;
  }
  if (destroyedKings.length === 1) {
    endMatch(room, getOpponentTeam(destroyedKings[0].owner), '킹타워 파괴');
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
  if (room.tournament && winner === null) {
    winner = tournamentTiebreakerWinner(room);
    reason = `${reason} · 토너먼트 판정승`;
  }
  game.status = 'ended';
  game.winner = winner;
  game.winnerName = winnerNameForRoom(room, winner);
  game.reason = reason;
  game.message = winner === null
    ? `무승부: ${reason}`
    : room.mode === '2v2'
      ? `${teamLabel(winner)} 승리: ${reason}`
      : `${game.winnerName || teamLabel(winner)} 승: ${reason}`;
  game.freezeUntil = 0;
  game.pendingAscensionAt = 0;
  for (const player of game.players) {
    player.rematchAccepted = false;
  }
  if (room.tournament) {
    game.trophyChanges = game.players.map(() => null);
    game.trophiesSettled = true;
  } else {
    settleTrophies(room, winner, reason);
  }
  broadcastEffect(room, { type: 'match-end', winner, winnerName: game.winnerName, reason });
  broadcastState(room);
  emitRooms();
  if (room.tournament) {
    completeTournamentMatchFromRoom(room, winner, reason);
  }
}

function winnerNameForRoom(room, winner) {
  if (winner === null || winner === undefined || room.mode === '2v2') return '';
  const player = room.game.players.find((candidate) => candidate.team === winner && candidate.userId);
  return player ? player.username : '';
}

function requestRematch(socket) {
  const room = socket.data.roomId ? rooms.get(socket.data.roomId) : null;
  const slot = socket.data.slot;
  if (!room || slot === null || slot === undefined || room.game.status !== 'ended') {
    registerBadSocketEvent(socket);
    return;
  }
  if (room.tournament) {
    socket.emit('room-error', '토너먼트 경기는 재경기를 할 수 없습니다.');
    return;
  }
  if (getConnectedPlayerCount(room) !== room.maxPlayers) {
    socket.emit('room-error', '모든 플레이어가 방에 있어야 재경기를 할 수 있습니다.');
    return;
  }

  const player = room.game.players[slot];
  if (!player || !player.connected || player.socketId !== socket.id) {
    registerBadSocketEvent(socket);
    return;
  }

  player.rematchAccepted = true;
  const ready = room.game.players.every((candidate) => candidate.connected && candidate.rematchAccepted);
  if (ready) {
    startMatch(room);
    return;
  }

  room.game.message = '재경기 동의 대기 중';
  broadcastState(room);
}

function settleTrophies(room, winner, reason) {
  const game = room.game;
  if (game.trophiesSettled) return;
  game.trophiesSettled = true;
  game.trophyChanges = game.players.map(() => null);
  if (winner === null) return;

  const winnerDelta = trophyDeltaForWin(reason);
  for (const player of game.players) {
    if (!player.userId) continue;
    game.trophyChanges[player.slot] = player.team === winner
      ? updateUserTrophies(player.userId, { winDelta: winnerDelta })
      : updateUserTrophies(player.userId, { loss: true });
  }

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

function getOpponentTeam(team) {
  return team === 0 ? 1 : 0;
}

function teamLabel(team) {
  return team === 0 ? '아래 진영' : '위 진영';
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
  let damage = card.damage;
  if (unit.cardId === 'mythos' && unit.awakened) damage = card.awakenedDamage;
  if (card.berserker && unit.berserked) damage = card.berserkerDamage;
  if (card.rageDamageMultiplier && unit.furious) damage *= card.rageDamageMultiplier;
  return Math.round(damage);
}

function getUnitSpeed(unit, card) {
  if (unit.cardId === 'mythos' && unit.awakened) return card.awakenedSpeed;
  if (card.berserker && unit.berserked) return card.berserkerSpeed;
  return card.speed;
}

function getAttackMs(unit, card) {
  if (unit.cardId === 'mythos' && unit.awakened) return card.awakenedAttackMs;
  if (card.berserker && unit.berserked) return card.berserkerAttackMs;
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
  const endsAt = game.suddenDeath ? game.suddenDeathEndsAt : game.endsAt;
  if (!endsAt) return 1;
  const remainingMs = endsAt - now;
  const rules = game.rules || defaultGameRules();
  const doubleRemainingMs = rules.doubleElixirRemainingMs || DOUBLE_ELIXIR_REMAINING_MS;
  const tripleRemainingMs = rules.tripleElixirRemainingMs || TRIPLE_ELIXIR_REMAINING_MS;
  let multiplier = 1;
  if (remainingMs <= tripleRemainingMs) multiplier = TRIPLE_ELIXIR_MULTIPLIER;
  else if (game.suddenDeath || remainingMs <= doubleRemainingMs) multiplier = DOUBLE_ELIXIR_MULTIPLIER;
  if ((game.elixirBoostLockedUntil || 0) > now) {
    multiplier = Math.max(multiplier, game.elixirBoostLockedMultiplier || 1);
  }
  return multiplier;
}

function broadcastEffect(room, effect) {
  io.to(roomChannel(room.id)).emit('effect', { ...effect, at: Date.now() });
}

function broadcastSpectatorCount(room) {
  io.to(roomChannel(room.id)).emit('spectator-count', {
    roomId: room.id,
    count: getSpectatorCount(room),
    max: MAX_SPECTATORS_PER_ROOM
  });
}

function broadcastState(room) {
  const game = room.game;
  game.lastBroadcastAt = Date.now();
  const socketIds = io.sockets.adapter.rooms.get(roomChannel(room.id));
  if (!socketIds) return;
  for (const socketId of socketIds) {
    const socket = io.of('/').sockets.get(socketId);
    if (socket) {
      socket.emit('state', serializeState(room, socket.data.slot, { spectator: socket.data.spectatingRoomId === room.id }));
    }
  }
}

function serializeState(room, viewerSlot = null, options = {}) {
  const game = room.game;
  const now = Date.now();
  const spectator = Boolean(options.spectator);
  const startCountdownMs = Math.max(0, (game.countdownEndsAt || 0) - now);
  const startSignalMs = startCountdownMs > 0 ? 0 : Math.max(0, (game.countdownEndsAt || 0) + START_SIGNAL_MS - now);
  return {
    room: publicRoomDetail(room),
    arena: ARENA,
    mode: room.mode,
    maxPlayers: room.maxPlayers,
    spectator,
    spectatorCount: getSpectatorCount(room),
    maxSpectators: getMaxSpectators(room),
    status: game.status,
    message: game.message,
    winner: game.winner,
    winnerName: game.winnerName || '',
    reason: game.reason,
    remainingMs: Math.max(0, (game.suddenDeath ? game.suddenDeathEndsAt : game.endsAt) - now),
    startCountdownMs,
    startSignalMs,
    suddenDeath: game.suddenDeath,
    elixirMultiplier: getElixirMultiplier(game, now),
    rules: publicGameRules(game.rules),
    chatMessages: visibleChatMessages(room, viewerSlot, spectator),
    freezeMs: Math.max(0, game.freezeUntil - now),
    trophyChange: spectator || viewerSlot === null || viewerSlot === undefined ? null : game.trophyChanges && game.trophyChanges[viewerSlot],
    tournament: room.tournamentId ? publicTournamentState(tournaments.get(room.tournamentId), room.tournament && room.tournament.matchId) : null,
    players: game.players.map((player) => ({
      slot: player.slot,
      team: player.team,
      username: player.username,
      trophies: player.trophies,
      tier: player.tier,
      tierIcon: player.tierIcon,
      connected: player.connected,
      elixir: Number(player.elixir.toFixed(2)),
      maxElixir: player.maxElixir || MAX_ELIXIR,
      hand: spectator || player.slot === viewerSlot ? player.hand : [],
      handSize: player.hand.filter(Boolean).length,
      usedOneTimeCards: Object.keys(player.usedOneTimeCards || {}),
      rematchAccepted: Boolean(player.rematchAccepted),
      totalTowerHp: totalTowerHp(game, player.team)
    })),
    towers: game.towers.map((tower) => ({
      id: tower.id,
      owner: tower.owner,
      type: tower.type,
      x: tower.x,
      y: tower.y,
      hp: Math.ceil(tower.hp),
      maxHp: tower.maxHp,
      awakened: Boolean(tower.awakened)
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
      berserked: unit.berserked,
      furious: unit.furious,
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
  const trophies = Number(user.trophies) || 0;
  const tier = getTierForTrophies(trophies);
  const nextTier = trophies < tier.min
    ? tier
    : TIER_DEFINITIONS.find((candidate) => candidate.min > trophies);
  return {
    id: user.id,
    username: user.username,
    trophies,
    tier: tier.name,
    tierIcon: tier.icon,
    tierKey: tier.key,
    tierMin: tier.min,
    tierMax: Number.isFinite(tier.max) ? tier.max : null,
    nextTier: nextTier ? {
      key: nextTier.key,
      name: nextTier.name,
      icon: nextTier.icon,
      min: nextTier.min
    } : null,
    lossCounter: Math.max(0, Number(user.loss_counter) || 0),
    tournamentWins: Math.max(0, Number(user.tournament_wins) || 0)
  };
}

function publicRankings() {
  return statements.listRankings.all().map((user, index) => {
    const trophies = Number(user.trophies) || 0;
    const tier = getTierForTrophies(trophies);
    return {
      rank: index + 1,
      username: user.username,
      trophies,
      tier: tier.name,
      tierIcon: tier.icon
    };
  });
}

function publicLatestTournamentWinner() {
  const row = statements.latestTournamentWinner.get();
  if (!row || !row.winner_user_id) return null;
  return {
    userId: row.winner_user_id,
    username: row.winner_username,
    wonAt: row.winner_won_at
  };
}

function publicTournamentHistory() {
  return statements.listCompletedTournaments.all().map((row, index) => publicTournamentSummary(row, index + 1));
}

function publicTournamentSummary(row, number) {
  const title = `제 ${number}회 토너먼트 대회`;
  const state = safeJsonParse(row.state_json, {});
  const pool = Math.max(0, Number(row.pool) || 0);
  const prizes = state.prizes || {
    winnerPrize: pool,
    runnerUpPrize: 0
  };
  const runnerUp = state.runnerUp || null;
  return {
    id: row.id,
    number,
    title,
    name: row.name,
    status: row.status,
    winnerUserId: row.winner_user_id,
    winnerUsername: row.winner_username,
    wonAt: row.winner_won_at || row.ended_at,
    date: row.winner_won_at || row.ended_at,
    stake: Math.max(0, Number(row.stake) || 0),
    pool,
    winnerPrize: Math.max(0, Number(prizes.winnerPrize) || 0),
    runnerUpPrize: Math.max(0, Number(prizes.runnerUpPrize) || 0),
    runnerUpUserId: runnerUp ? runnerUp.userId : null,
    runnerUpUsername: runnerUp ? runnerUp.username : '',
    participantTarget: Math.max(0, Number(row.participant_target) || 0)
  };
}

function publicTournamentDetail(id) {
  const rows = statements.listCompletedTournaments.all();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const row = statements.getCompletedTournamentById.get(id);
  if (!row) return null;

  const state = safeJsonParse(row.state_json, {});
  const participants = Array.isArray(state.participants) ? state.participants : [];
  const participantMap = new Map(participants.map((participant) => [participant.userId, participant]));
  const bracket = safeJsonParse(row.bracket_json, []);
  const summary = publicTournamentSummary(row, index + 1);

  return {
    ...summary,
    createdAt: row.created_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    participantCount: participants.length || summary.participantTarget,
    participants: participants.map((participant) => ({
      userId: participant.userId,
      username: participant.username,
      eliminated: Boolean(participant.eliminated)
    })),
    rounds: publicSavedTournamentRounds(bracket, participantMap)
  };
}

function publicSavedTournamentRounds(rounds, participantMap) {
  if (!Array.isArray(rounds)) return [];
  return rounds.map((round) => ({
    id: round.id,
    index: round.index,
    label: round.label,
    phase: round.phase,
    status: round.status,
    matches: Array.isArray(round.matches) ? round.matches.map((match) => ({
      id: match.id,
      label: match.label,
      phase: match.phase,
      status: match.status,
      bye: Boolean(match.bye),
      participants: (match.participantUserIds || []).map((userId) => publicSavedParticipant(participantMap, userId)),
      participantUserIds: match.participantUserIds || [],
      winnerUserId: match.winnerUserId,
      winner: publicSavedParticipant(participantMap, match.winnerUserId),
      loserUserIds: match.loserUserIds || [],
      score: match.score || null,
      startedAt: match.startedAt || null,
      endedAt: match.endedAt || null,
      rules: match.rules || null
    })) : []
  }));
}

function publicSavedParticipant(participantMap, userId) {
  if (!userId) return null;
  const participant = participantMap.get(userId);
  return participant ? {
    userId: participant.userId,
    username: participant.username,
    eliminated: Boolean(participant.eliminated)
  } : {
    userId,
    username: '알 수 없음',
    eliminated: false
  };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function publicTiers() {
  return TIER_DEFINITIONS.map((tier) => ({
    key: tier.key,
    name: tier.name,
    icon: tier.icon,
    min: tier.min,
    max: Number.isFinite(tier.max) ? tier.max : null
  }));
}

function publicPlayableCards() {
  const cards = {};
  for (const id of CARD_IDS) {
    const card = CARDS[id];
    cards[id] = {
      id: card.id,
      name: card.name,
      cost: card.cost,
      role: card.role,
      spell: Boolean(card.spell),
      building: Boolean(card.building)
    };
  }
  return cards;
}

function getSavedDeck(userId, deckSize = DECK_SIZE) {
  if (!userId) return null;
  const row = deckSize === FINAL_DECK_SIZE
    ? statements.getFinalDeck.get(userId)
    : statements.getDeck.get(userId);
  if (!row) return null;

  try {
    const parsed = JSON.parse(row.cards);
    const validation = validateDeck(parsed, deckSize);
    return validation.error ? null : validation.deck;
  } catch {
    return null;
  }
}

function validateDeck(value, deckSize = DECK_SIZE) {
  if (!Array.isArray(value)) {
    return { error: `덱은 카드 ${deckSize}장으로 구성해야 합니다.` };
  }

  const deck = value.map((cardId) => String(cardId || ''));
  if (deck.length !== deckSize) {
    return { error: `덱은 정확히 ${deckSize}장을 선택해야 합니다.` };
  }

  const unique = new Set(deck);
  if (unique.size !== deckSize) {
    return { error: '같은 카드는 덱에 한 번만 넣을 수 있습니다.' };
  }

  for (const cardId of deck) {
    const card = CARDS[cardId];
    if (!card || card.playable === false) {
      return { error: '사용할 수 없는 카드가 포함되어 있습니다.' };
    }
  }

  return { deck };
}

function normalizeDeckSize(value) {
  const size = Number(value);
  return size === FINAL_DECK_SIZE ? FINAL_DECK_SIZE : DECK_SIZE;
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

function normalizeRoomMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return ROOM_MODES[mode] ? mode : '1v1';
}

function normalizeRoomTeam(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const team = Number(normalized);
  return Number.isInteger(team) && (team === 0 || team === 1) ? team : null;
}

function publicRooms() {
  return [...rooms.values()]
    .filter((room) => room.game.status === 'waiting' && getConnectedPlayerCount(room) < room.maxPlayers)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(publicRoomDetail);
}

function publicSpectatorRooms() {
  return [...rooms.values()]
    .filter((room) => room.game.status === 'playing' && canListSpectatorRoom(room))
    .sort((a, b) => {
      const tournamentOrder = Number(Boolean(b.tournament)) - Number(Boolean(a.tournament));
      if (tournamentOrder !== 0) return tournamentOrder;
      return b.game.startedAt - a.game.startedAt;
    })
    .map(publicSpectatorRoomDetail);
}

function publicSpectatorRoomDetail(room) {
  const players = room.game.players
    .filter((player) => player.userId)
    .map((player) => ({
      username: player.username,
      team: player.team,
      connected: player.connected
    }));
  const maxSpectators = getMaxSpectators(room);
  return {
    id: room.id,
    name: room.name,
    mode: room.mode,
    modeLabel: room.modeLabel,
    battleLabel: spectatorBattleLabel(room),
    tournament: room.tournament ? {
      id: room.tournament.id,
      matchId: room.tournament.matchId,
      roundLabel: room.tournament.roundLabel,
      phase: room.tournament.phase
    } : null,
    players,
    spectatorCount: getSpectatorCount(room),
    maxSpectators,
    full: Number.isFinite(maxSpectators) && getSpectatorCount(room) >= maxSpectators
  };
}

function publicRoomDetail(room) {
  const maxSpectators = getMaxSpectators(room);
  return {
    id: room.id,
    name: room.name,
    mode: room.mode,
    modeLabel: room.modeLabel,
    locked: Boolean(room.passwordHash),
    status: room.game.status,
    players: room.game.players
      .filter((player) => player.userId)
      .map((player) => ({
        username: player.username,
        trophies: player.trophies,
        tier: player.tier,
        tierIcon: player.tierIcon,
        team: player.team,
        connected: player.connected
      })),
    teams: room.mode === '2v2' ? publicRoomTeams(room) : [],
    playerCount: getConnectedPlayerCount(room),
    maxPlayers: room.maxPlayers,
    stake: room.mode === 'tournament' && room.tournamentId && tournaments.get(room.tournamentId)
      ? tournaments.get(room.tournamentId).stake
      : 0,
    tournament: room.tournamentId ? publicTournamentState(tournaments.get(room.tournamentId), room.tournament && room.tournament.matchId) : null,
    spectatorCount: getSpectatorCount(room),
    maxSpectators
  };
}

function emitRooms() {
  io.emit('rooms', publicRooms());
  io.emit('spectator-rooms', publicSpectatorRooms());
}

function getConnectedPlayerCount(room) {
  return room.game.players.filter((player) => player.connected).length;
}

function getSpectatorCount(room) {
  return room && room.spectators ? room.spectators.size : 0;
}

function spectatorBattleLabel(room) {
  const players = room.game.players.filter((player) => player.userId);
  if (room.tournament) {
    const first = players[0] ? players[0].username : 'Player 1';
    const second = players[1] ? players[1].username : 'Player 2';
    return `${room.tournament.roundLabel} · ${first} vs ${second}`;
  }
  if (room.mode === '2v2') {
    const bottom = players.filter((player) => player.team === 0).map((player) => player.username).join(', ') || '아래 진영';
    const top = players.filter((player) => player.team === 1).map((player) => player.username).join(', ') || '위 진영';
    return `${bottom} vs ${top}`;
  }
  const first = players[0] ? players[0].username : 'Player 1';
  const second = players[1] ? players[1].username : 'Player 2';
  return `${first} vs ${second}`;
}

function getTeamCapacity(room) {
  return room.mode === '2v2' ? room.maxPlayers / 2 : 1;
}

function getConnectedTeamCount(room, team) {
  return room.game.players.filter((player) => player.team === team && player.connected).length;
}

function hasOpenTeamSlot(room, team) {
  return getConnectedTeamCount(room, team) < getTeamCapacity(room) && findAvailableRoomSlot(room, team) >= 0;
}

function publicRoomTeams(room) {
  return [0, 1].map((team) => {
    const count = getConnectedTeamCount(room, team);
    const capacity = getTeamCapacity(room);
    return {
      team,
      label: teamLabel(team),
      count,
      capacity,
      full: count >= capacity
    };
  });
}

function getKnownPlayerCount(room) {
  return room.game.players.filter((player) => player.userId).length;
}

function waitingRoomMessage(room) {
  if (room.mode === 'tournament') {
    return `${getConnectedPlayerCount(room)}/${room.maxPlayers} 명 참가중`;
  }
  const remaining = Math.max(0, room.maxPlayers - getConnectedPlayerCount(room));
  return remaining > 0 ? `${remaining}명 더 들어오면 시작합니다` : '전투 준비 중';
}

function createTournamentRecord(room, options) {
  return {
    id: room.id,
    lobbyRoomId: room.id,
    name: room.name,
    status: 'waiting',
    creatorUserId: options.creatorUserId,
    participantTarget: options.participantTarget,
    stake: options.stake,
    pool: 0,
    participants: [],
    rounds: [],
    currentRoundIndex: -1,
    activeMatchIds: [],
    break: null,
    winner: null,
    winnerWonAt: null,
    createdAt: options.now,
    updatedAt: options.now,
    startedAt: null,
    endedAt: null
  };
}

function assignSocketToTournamentRoom(socket, room, options = {}) {
  const tournament = tournaments.get(room.tournamentId);
  if (!tournament || tournament.status !== 'waiting') {
    return { ok: false, error: '참가할 수 없는 토너먼트입니다.' };
  }

  const user = statements.getUserById.get(socket.data.user.id);
  if (!user) return { ok: false, error: '계정을 찾을 수 없습니다.' };
  if (tournament.participants.some((participant) => participant.userId === user.id && participant.connected)) {
    return { ok: false, error: '이미 참가 중인 토너먼트입니다.' };
  }
  if (getConnectedPlayerCount(room) >= room.maxPlayers) {
    return { ok: false, error: '이미 가득 찬 토너먼트입니다.' };
  }

  const profile = deductTournamentStake(user.id, tournament.stake, { allowDebt: Boolean(options.allowDebt) });
  if (!profile) {
    return { ok: false, error: '참가비가 부족합니다. 빚을 지고 참가하려면 다시 확인해주세요.' };
  }

  let slot = room.game.players.findIndex((player) => !player.userId);
  if (slot < 0) {
    slot = room.game.players.length;
    room.game.players.push(createPlayer(slot));
  }

  const player = room.game.players[slot];
  Object.assign(player, profile, {
    slot,
    userId: profile.id,
    socketId: socket.id,
    connected: true
  });

  const participant = {
    userId: profile.id,
    username: profile.username,
    trophies: profile.trophies,
    tier: profile.tier,
    tierIcon: profile.tierIcon,
    slot,
    socketId: socket.id,
    connected: true,
    stakePaid: true,
    eliminated: false,
    currentMatchId: null
  };
  tournament.participants.push(participant);
  tournament.pool = tournament.participants.filter((candidate) => candidate.stakePaid).length * tournament.stake;
  tournament.updatedAt = new Date().toISOString();

  socket.data.user = profile;
  socket.data.roomId = room.id;
  socket.data.slot = slot;
  socket.data.tournamentId = tournament.id;
  socket.join(roomChannel(room.id));
  socket.emit('profile', profile);
  persistTournamentState(tournament);
  return { ok: true, slot };
}

function removeTournamentWaitingParticipant(socket, room, player, options = {}) {
  const tournament = tournaments.get(room.tournamentId);
  if (!tournament || tournament.status !== 'waiting') return { cleanedUp: false };
  const participant = tournament.participants.find((candidate) => candidate.userId === player.userId);
  if (!participant) return { cleanedUp: false };

  if (room.creatorUserId === player.userId) {
    cancelTournamentBeforeStart(room, '방장이 나가 토너먼트가 취소되었습니다.');
    return { cleanedUp: true };
  }

  refundTournamentParticipant(tournament, participant);
  participant.connected = false;
  participant.socketId = null;
  participant.stakePaid = false;
  tournament.participants = tournament.participants.filter((candidate) => candidate.userId !== participant.userId);
  tournament.pool = tournament.participants.filter((candidate) => candidate.stakePaid).length * tournament.stake;
  tournament.updatedAt = new Date().toISOString();
  clearRoomPlayer(player);
  room.game.message = waitingRoomMessage(room);
  socket.data.tournamentId = null;
  emitProfileToUser(participant.userId);
  persistTournamentState(tournament);
  if (!options.disconnecting) broadcastState(room);
  return { cleanedUp: false };
}

function cancelTournamentBeforeStart(room, reason) {
  const tournament = tournaments.get(room.tournamentId);
  if (!tournament || tournament.status !== 'waiting') return;
  tournament.status = 'cancelled';
  tournament.endedAt = new Date().toISOString();
  tournament.updatedAt = tournament.endedAt;

  for (const participant of tournament.participants) {
    refundTournamentParticipant(tournament, participant);
    const participantSocket = participant.socketId ? io.of('/').sockets.get(participant.socketId) : null;
    if (participantSocket) {
      participantSocket.leave(roomChannel(room.id));
      participantSocket.data.roomId = null;
      participantSocket.data.slot = null;
      participantSocket.data.tournamentId = null;
      participantSocket.emit('room-error', reason);
      participantSocket.emit('room-left');
    }
    emitProfileToUser(participant.userId);
  }

  tournament.pool = 0;
  rooms.delete(room.id);
  persistTournamentState(tournament);
}

function startTournament(room) {
  const tournament = tournaments.get(room.tournamentId);
  if (!tournament || tournament.status !== 'waiting') return;
  const readyParticipants = tournament.participants.filter((participant) => participant.connected && participant.stakePaid);
  if (readyParticipants.length !== tournament.participantTarget) return;

  const now = new Date().toISOString();
  tournament.status = 'playing';
  tournament.startedAt = now;
  tournament.updatedAt = now;
  tournament.pool = readyParticipants.length * tournament.stake;
  room.game.status = 'tournament';
  room.game.message = '토너먼트 진행 중';
  rooms.delete(room.id);

  createNextTournamentRound(tournament, readyParticipants.map((participant) => participant.userId));
  persistTournamentState(tournament);
  broadcastTournamentState(tournament);
  emitRooms();
  startReadyTournamentMatches(tournament);
}

function createNextTournamentRound(tournament, participantUserIds) {
  const roundIndex = tournament.rounds.length;
  const size = participantUserIds.length;
  const round = {
    id: `r${roundIndex + 1}`,
    index: roundIndex,
    label: tournamentRoundLabel(size),
    phase: tournamentRoundPhase(size),
    status: 'upcoming',
    matches: []
  };

  const seeded = shuffle([...participantUserIds]);
  if (seeded.length % 2 === 1) {
    const byeUserId = seeded.pop();
    round.matches.push({
      id: `${round.id}-m1`,
      roundIndex,
      matchIndex: 0,
      label: `${round.label} 부전승`,
      phase: round.phase,
      participantUserIds: [byeUserId, null],
      status: 'completed',
      bye: true,
      winnerUserId: byeUserId,
      loserUserIds: [],
      roomId: null,
      rules: null,
      score: { reason: '부전승' },
      startedAt: null,
      endedAt: new Date().toISOString()
    });
  }

  for (let i = 0; i < seeded.length; i += 2) {
    round.matches.push({
      id: `${round.id}-m${round.matches.length + 1}`,
      roundIndex,
      matchIndex: round.matches.length,
      label: round.label,
      phase: round.phase,
      participantUserIds: [seeded[i], seeded[i + 1]],
      status: 'upcoming',
      bye: false,
      winnerUserId: null,
      loserUserIds: [],
      roomId: null,
      rules: tournamentMatchRules(round.phase),
      score: null,
      startedAt: null,
      endedAt: null
    });
  }

  tournament.rounds.push(round);
  tournament.currentRoundIndex = roundIndex;
  return round;
}

function startReadyTournamentMatches(tournament) {
  if (!tournament || tournament.status !== 'playing') return;
  const round = tournament.rounds[tournament.currentRoundIndex];
  if (!round) return;

  const activeMatches = round.matches.filter((match) => match.status === 'playing');
  if (round.phase === 'regular') {
    for (const match of round.matches.filter((candidate) => candidate.status === 'upcoming')) {
      startTournamentMatch(tournament, match);
    }
  } else if (activeMatches.length === 0) {
    const nextMatch = round.matches.find((candidate) => candidate.status === 'upcoming');
    if (nextMatch) startTournamentMatch(tournament, nextMatch);
  }

  updateTournamentRoundStatus(round);
  if (round.matches.every((match) => match.status === 'completed')) {
    advanceTournamentAfterRound(tournament, round);
    return;
  }
  routeTournamentSpectators(tournament);
  persistTournamentState(tournament);
  broadcastTournamentState(tournament);
  emitRooms();
}

function startTournamentMatch(tournament, match) {
  if (!match || match.status !== 'upcoming') return;
  const participants = match.participantUserIds
    .filter((userId) => userId)
    .map((userId) => tournament.participants.find((participant) => participant.userId === userId));
  if (participants.length < 2) return;

  const connected = participants.filter((participant) => participant && participant.connected && participant.socketId && io.of('/').sockets.has(participant.socketId));
  if (connected.length < 2) {
    const winner = connected[0] || participants[0];
    completeTournamentMatch(tournament, match, winner.userId, '상대 연결 종료', {
      reason: '상대 연결 종료',
      forfeit: true
    });
    return;
  }

  const phase = match.phase;
  match.rules = tournamentMatchRules(phase);
  const room = {
    id: crypto.randomUUID(),
    name: `${tournament.name} · ${match.label}`,
    mode: '1v1',
    modeLabel: '토너먼트 경기',
    maxPlayers: 2,
    passwordHash: '',
    createdAt: Date.now(),
    spectators: new Map(),
    tournamentId: tournament.id,
    tournament: {
      id: tournament.id,
      matchId: match.id,
      roundIndex: match.roundIndex,
      roundLabel: match.label,
      phase
    },
    game: createGameState('1v1')
  };
  rooms.set(room.id, room);

  for (const participant of participants) {
    const participantSocket = io.of('/').sockets.get(participant.socketId);
    if (!participantSocket) continue;
    detachSocketForTournamentTransition(participantSocket);
    const slot = assignSocketToRoom(participantSocket, room, null);
    participant.currentMatchId = match.id;
    participantSocket.data.tournamentId = tournament.id;
    participantSocket.emit('room-joined', { room: publicRoomDetail(room), slot });
  }

  match.status = 'playing';
  match.roomId = room.id;
  match.startedAt = new Date().toISOString();
  tournament.activeMatchIds = activeTournamentMatches(tournament).map((candidate) => candidate.id);
  startMatch(room);
}

function completeTournamentMatchFromRoom(room, winnerTeam, reason) {
  const tournament = tournaments.get(room.tournamentId);
  if (!tournament) return;
  const match = findTournamentMatch(tournament, room.tournament.matchId);
  if (!match || match.status === 'completed') return;
  const winnerPlayer = room.game.players.find((player) => player.team === winnerTeam && player.userId);
  if (!winnerPlayer) return;
  completeTournamentMatch(tournament, match, winnerPlayer.userId, reason, {
    reason,
    winnerTeam,
    towerHp: [totalTowerHp(room.game, 0), totalTowerHp(room.game, 1)]
  });
}

function completeTournamentMatch(tournament, match, winnerUserId, reason, score = {}) {
  if (!tournament || !match || match.status === 'completed') return;
  match.status = 'completed';
  match.winnerUserId = winnerUserId;
  match.loserUserIds = match.participantUserIds.filter((userId) => userId && userId !== winnerUserId);
  match.score = { ...score, reason };
  match.endedAt = new Date().toISOString();

  for (const participant of tournament.participants) {
    if (participant.currentMatchId === match.id) participant.currentMatchId = null;
    if (match.loserUserIds.includes(participant.userId)) participant.eliminated = true;
  }

  tournament.activeMatchIds = activeTournamentMatches(tournament).map((candidate) => candidate.id);
  const round = tournament.rounds[match.roundIndex];
  updateTournamentRoundStatus(round);

  if (round && round.matches.every((candidate) => candidate.status === 'completed')) {
    advanceTournamentAfterRound(tournament, round);
  } else {
    startReadyTournamentMatches(tournament);
  }
}

function advanceTournamentAfterRound(tournament, round) {
  if (!round) return;
  round.status = 'completed';
  const winners = round.matches
    .map((match) => match.winnerUserId)
    .filter((userId) => userId);

  if (winners.length <= 1) {
    finishTournament(tournament, winners[0]);
    return;
  }

  startTournamentBreak(tournament, winners);
}

function startTournamentBreak(tournament, nextUserIds) {
  if (!tournament || !Array.isArray(nextUserIds) || nextUserIds.length <= 1) return;
  const nowMs = Date.now();
  const nextPhase = tournamentRoundPhase(nextUserIds.length);
  const durationMs = nextPhase === 'final' ? TOURNAMENT_FINAL_BREAK_MS : TOURNAMENT_BREAK_MS;
  tournament.status = 'break';
  tournament.activeMatchIds = [];
  tournament.break = {
    active: true,
    nextUserIds,
    nextRoundLabel: tournamentRoundLabel(nextUserIds.length),
    nextRoundPhase: nextPhase,
    deckSize: nextPhase === 'final' ? FINAL_DECK_SIZE : DECK_SIZE,
    handSize: nextPhase === 'final' ? FINAL_HAND_SIZE : HAND_SIZE,
    rules: nextPhase === 'final' ? publicGameRules(finalGameRules()) : publicGameRules(defaultGameRules()),
    startedAt: new Date(nowMs).toISOString(),
    endsAt: new Date(nowMs + durationMs).toISOString(),
    durationMs
  };
  tournament.updatedAt = new Date().toISOString();

  if (tournamentBreakTimers.has(tournament.id)) {
    clearTimeout(tournamentBreakTimers.get(tournament.id));
  }
  tournamentBreakTimers.set(tournament.id, setTimeout(() => finishTournamentBreak(tournament.id), durationMs));
  persistTournamentState(tournament);
  broadcastTournamentState(tournament);
  emitRooms();
}

function finishTournamentBreak(tournamentId) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.status !== 'break' || !tournament.break) return;
  const nextUserIds = Array.isArray(tournament.break.nextUserIds) ? tournament.break.nextUserIds : [];
  tournamentBreakTimers.delete(tournament.id);
  tournament.status = 'playing';
  tournament.break = null;
  tournament.updatedAt = new Date().toISOString();
  createNextTournamentRound(tournament, nextUserIds);
  persistTournamentState(tournament);
  broadcastTournamentState(tournament);
  startReadyTournamentMatches(tournament);
}

function tournamentMatchRules(phase) {
  return phase === 'final' ? publicGameRules(finalGameRules()) : null;
}

function tournamentPrizeSplit(pool) {
  const total = Math.max(0, Number(pool) || 0);
  const winnerPrize = Math.min(total, Math.max(0, Math.round(total * 0.7)));
  return {
    pool: total,
    winnerPrize,
    runnerUpPrize: Math.max(0, total - winnerPrize),
    winnerPercent: 70,
    runnerUpPercent: 30
  };
}

function tournamentRunnerUp(tournament, winnerUserId) {
  if (!tournament || !winnerUserId) return null;
  const rounds = Array.isArray(tournament.rounds) ? tournament.rounds : [];
  const finalRound = [...rounds].reverse().find((round) => {
    return round && Array.isArray(round.matches) && round.matches.some((match) => {
      return match && match.status === 'completed' && match.winnerUserId === winnerUserId && !match.bye;
    });
  });
  const finalMatch = finalRound && finalRound.matches.find((match) => {
    return match && match.status === 'completed' && match.winnerUserId === winnerUserId && !match.bye;
  });
  const runnerUpUserId = finalMatch
    ? (finalMatch.loserUserIds && finalMatch.loserUserIds[0]) || (finalMatch.participantUserIds || []).find((userId) => userId && userId !== winnerUserId)
    : null;
  return runnerUpUserId
    ? tournament.participants.find((participant) => participant.userId === runnerUpUserId) || null
    : null;
}

function finishTournament(tournament, winnerUserId) {
  if (!tournament || tournament.status === 'completed') return;
  const winner = tournament.participants.find((participant) => participant.userId === winnerUserId);
  const runnerUp = tournamentRunnerUp(tournament, winnerUserId);
  const prizeSplit = tournamentPrizeSplit(tournament.pool);
  const now = new Date().toISOString();
  if (tournamentBreakTimers.has(tournament.id)) {
    clearTimeout(tournamentBreakTimers.get(tournament.id));
    tournamentBreakTimers.delete(tournament.id);
  }
  tournament.status = 'completed';
  tournament.activeMatchIds = [];
  tournament.break = null;
  tournament.winner = winner ? {
    userId: winner.userId,
    username: winner.username
  } : null;
  tournament.runnerUp = runnerUp ? {
    userId: runnerUp.userId,
    username: runnerUp.username
  } : null;
  tournament.prizes = prizeSplit;
  tournament.winnerWonAt = now;
  tournament.endedAt = now;
  tournament.updatedAt = now;

  if (winner) {
    awardTournamentPrize(winner.userId, prizeSplit.winnerPrize, { incrementWins: true });
    if (runnerUp && prizeSplit.runnerUpPrize > 0) {
      awardTournamentPrize(runnerUp.userId, prizeSplit.runnerUpPrize);
    }
    for (const participant of tournament.participants) {
      emitProfileToUser(participant.userId);
    }
  }

  persistTournamentState(tournament);
  broadcastTournamentState(tournament);
  if (winner) {
    broadcastTournamentEffect(tournament, {
      type: 'tournament-celebration',
      username: winner.username
    });
  }
  io.emit('tournament-winner', publicLatestTournamentWinner());
  emitRooms();
}

function broadcastTournamentEffect(tournament, effect) {
  const sentRooms = new Set();
  for (const room of rooms.values()) {
    if (room.tournamentId !== tournament.id) continue;
    sentRooms.add(room.id);
    broadcastEffect(room, effect);
  }
  for (const socket of io.of('/').sockets.values()) {
    if (socket.data.tournamentId === tournament.id) {
      const currentRoomId = socket.data.roomId || socket.data.spectatingRoomId;
      if (!currentRoomId || !sentRooms.has(currentRoomId)) {
        socket.emit('effect', { ...effect, at: Date.now() });
      }
    }
  }
}

function routeTournamentSpectators(tournament) {
  const activeRooms = activeTournamentMatches(tournament)
    .map((match) => rooms.get(match.roomId))
    .filter((room) => room && room.game.status === 'playing');
  if (activeRooms.length === 0) return;

  for (const participant of tournament.participants) {
    if (!participant.connected || !participant.socketId) continue;
    const participantSocket = io.of('/').sockets.get(participant.socketId);
    if (!participantSocket) continue;
    const playingMatch = activeTournamentMatches(tournament).find((match) => {
      return match.participantUserIds.includes(participant.userId);
    });
    if (playingMatch) continue;

    const currentSpectating = participantSocket.data.spectatingRoomId
      ? rooms.get(participantSocket.data.spectatingRoomId)
      : null;
    if (currentSpectating && currentSpectating.tournamentId === tournament.id && currentSpectating.game.status === 'playing') continue;
    joinTournamentSpectatorSocket(participantSocket, activeRooms[0]);
  }
}

function switchTournamentSpectatorMatch(socket, payload = {}) {
  const tournament = tournamentForSocket(socket, payload.tournamentId);
  if (!tournament || tournament.status !== 'playing') {
    socket.emit('room-error', '전환할 토너먼트 경기가 없습니다.');
    return;
  }
  if (isSocketPlayingActiveTournamentMatch(socket, tournament)) {
    socket.emit('room-error', '진행 중인 본인 경기는 관전 전환을 할 수 없습니다.');
    return;
  }

  const activeRooms = activeTournamentMatches(tournament)
    .map((match) => rooms.get(match.roomId))
    .filter((room) => room && room.game.status === 'playing');
  if (activeRooms.length === 0) {
    socket.emit('room-error', '진행 중인 토너먼트 경기가 없습니다.');
    return;
  }

  const requestedMatchId = String(payload.matchId || '');
  let nextRoom = requestedMatchId
    ? activeRooms.find((room) => room.tournament && room.tournament.matchId === requestedMatchId)
    : null;
  if (!nextRoom) {
    const currentRoomId = socket.data.spectatingRoomId || socket.data.roomId;
    const currentIndex = Math.max(0, activeRooms.findIndex((room) => room.id === currentRoomId));
    const direction = payload.direction === 'prev' ? -1 : 1;
    nextRoom = activeRooms[(currentIndex + direction + activeRooms.length) % activeRooms.length];
  }
  joinTournamentSpectatorSocket(socket, nextRoom);
}

function joinTournamentSpectatorSocket(socket, room) {
  if (!room || !room.tournament || room.game.status !== 'playing') return;
  detachSocketForTournamentTransition(socket);
  if (!room.spectators) room.spectators = new Map();
  room.spectators.set(socket.id, {
    userId: socket.data.user.id,
    username: socket.data.user.username
  });
  socket.data.spectatingRoomId = room.id;
  socket.data.roomId = null;
  socket.data.slot = null;
  socket.data.tournamentId = room.tournament.id;
  socket.join(roomChannel(room.id));
  socket.emit('spectator-joined', { room: publicRoomDetail(room), spectator: true });
  socket.emit('state', serializeState(room, null, { spectator: true }));
  broadcastSpectatorCount(room);
  broadcastState(room);
  emitRooms();
}

function detachSocketForTournamentTransition(socket) {
  if (socket.data.spectatingRoomId) {
    const spectatingRoom = rooms.get(socket.data.spectatingRoomId);
    if (spectatingRoom && spectatingRoom.spectators) {
      spectatingRoom.spectators.delete(socket.id);
      broadcastSpectatorCount(spectatingRoom);
      broadcastState(spectatingRoom);
    }
    socket.leave(roomChannel(socket.data.spectatingRoomId));
    socket.data.spectatingRoomId = null;
  }

  if (socket.data.roomId) {
    socket.leave(roomChannel(socket.data.roomId));
    socket.data.roomId = null;
    socket.data.slot = null;
  }
}

function markTournamentParticipantDisconnected(socket) {
  const tournamentId = socket.data.tournamentId;
  if (!tournamentId) return;
  const tournament = tournaments.get(tournamentId);
  if (!tournament || (tournament.status !== 'playing' && tournament.status !== 'break')) return;
  const participant = tournament.participants.find((candidate) => candidate.userId === socket.data.user.id);
  if (!participant) return;
  participant.connected = false;
  participant.socketId = null;
  participant.currentMatchId = null;
  tournament.updatedAt = new Date().toISOString();
  persistTournamentState(tournament);
}

function activeTournamentMatches(tournament) {
  return tournament.rounds
    .flatMap((round) => round.matches)
    .filter((match) => match.status === 'playing');
}

function findTournamentMatch(tournament, matchId) {
  return tournament.rounds
    .flatMap((round) => round.matches)
    .find((match) => match.id === matchId);
}

function updateTournamentRoundStatus(round) {
  if (!round) return;
  if (round.matches.every((match) => match.status === 'completed')) {
    round.status = 'completed';
  } else if (round.matches.some((match) => match.status === 'playing')) {
    round.status = 'playing';
  } else {
    round.status = 'upcoming';
  }
}

function tournamentRoundLabel(size) {
  if (size <= 2) return '결승';
  if (size <= 4) return '4강';
  return `${nextPowerOfTwo(size)}강`;
}

function tournamentRoundPhase(size) {
  if (size <= 2) return 'final';
  if (size <= 4) return 'semifinal';
  return 'regular';
}

function nextPowerOfTwo(value) {
  let current = 1;
  while (current < value) current *= 2;
  return current;
}

function tournamentTiebreakerWinner(room) {
  const hp0 = totalTowerHp(room.game, 0);
  const hp1 = totalTowerHp(room.game, 1);
  if (hp0 !== hp1) return hp0 > hp1 ? 0 : 1;
  const connected = room.game.players.filter((player) => player.connected && player.userId);
  if (connected.length === 1) return connected[0].team;
  return Math.random() < 0.5 ? 0 : 1;
}

function publicTournamentState(tournament, viewingMatchId = null) {
  if (!tournament) return null;
  return {
    id: tournament.id,
    name: tournament.name,
    status: tournament.status,
    participantCount: tournament.participants.filter((participant) => participant.stakePaid).length,
    participantTarget: tournament.participantTarget,
    stake: tournament.stake,
    pool: tournament.pool,
    currentRoundIndex: tournament.currentRoundIndex,
    activeMatchIds: [...tournament.activeMatchIds],
    viewingMatchId,
    break: publicTournamentBreak(tournament.break),
    winner: tournament.winner,
    runnerUp: tournament.runnerUp || null,
    prizes: tournament.prizes || tournamentPrizeSplit(tournament.pool),
    winnerWonAt: tournament.winnerWonAt,
    participants: tournament.participants.map((participant) => ({
      userId: participant.userId,
      username: participant.username,
      connected: participant.connected,
      eliminated: participant.eliminated
    })),
    rounds: tournament.rounds.map((round) => ({
      id: round.id,
      index: round.index,
      label: round.label,
      phase: round.phase,
      status: round.status,
      matches: round.matches.map((match) => ({
        id: match.id,
        label: match.label,
        phase: match.phase,
        status: match.status,
        bye: Boolean(match.bye),
        roomId: match.roomId,
        participantUserIds: match.participantUserIds,
        participants: match.participantUserIds.map((userId) => publicTournamentParticipant(tournament, userId)),
        winnerUserId: match.winnerUserId,
        loserUserIds: match.loserUserIds,
        score: match.score,
        rules: match.rules || null
      }))
    }))
  };
}

function publicTournamentBreak(breakState) {
  if (!breakState || !breakState.active) return null;
  const endsAtMs = new Date(breakState.endsAt).getTime();
  return {
    active: true,
    nextUserIds: Array.isArray(breakState.nextUserIds) ? breakState.nextUserIds : [],
    nextRoundLabel: breakState.nextRoundLabel,
    nextRoundPhase: breakState.nextRoundPhase,
    deckSize: breakState.deckSize || DECK_SIZE,
    handSize: breakState.handSize || HAND_SIZE,
    rules: breakState.rules || null,
    startedAt: breakState.startedAt,
    endsAt: breakState.endsAt,
    durationMs: breakState.durationMs || TOURNAMENT_BREAK_MS,
    remainingMs: Math.max(0, endsAtMs - Date.now())
  };
}

function publicTournamentParticipant(tournament, userId) {
  if (!userId) return null;
  const participant = tournament.participants.find((candidate) => candidate.userId === userId);
  if (!participant) return { userId, username: '대기 중' };
  return {
    userId: participant.userId,
    username: participant.username,
    eliminated: participant.eliminated,
    connected: participant.connected
  };
}

function broadcastTournamentState(tournament) {
  for (const room of rooms.values()) {
    if (room.tournamentId === tournament.id) broadcastState(room);
  }
  for (const socket of io.of('/').sockets.values()) {
    if (socket.data.tournamentId === tournament.id) {
      const currentRoom = socket.data.roomId ? rooms.get(socket.data.roomId) : socket.data.spectatingRoomId ? rooms.get(socket.data.spectatingRoomId) : null;
      socket.emit('tournament-state', publicTournamentState(tournament, currentRoom && currentRoom.tournament && currentRoom.tournament.matchId));
    }
  }
}

function persistableTournamentState(tournament) {
  return {
    id: tournament.id,
    lobbyRoomId: tournament.lobbyRoomId,
    name: tournament.name,
    status: tournament.status,
    creatorUserId: tournament.creatorUserId,
    participantTarget: tournament.participantTarget,
    stake: tournament.stake,
    pool: tournament.pool,
    participants: tournament.participants.map((participant) => ({
      userId: participant.userId,
      username: participant.username,
      connected: participant.connected,
      stakePaid: participant.stakePaid,
      eliminated: participant.eliminated,
      currentMatchId: participant.currentMatchId
    })),
    currentRoundIndex: tournament.currentRoundIndex,
    activeMatchIds: tournament.activeMatchIds,
    break: tournament.break,
    winner: tournament.winner,
    runnerUp: tournament.runnerUp || null,
    prizes: tournament.prizes || null,
    winnerWonAt: tournament.winnerWonAt,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    startedAt: tournament.startedAt,
    endedAt: tournament.endedAt
  };
}

function persistTournamentState(tournament) {
  if (!tournament) return;
  const now = new Date().toISOString();
  tournament.updatedAt = tournament.updatedAt || now;
  statements.updateTournamentState.run(
    tournament.status,
    tournament.pool,
    JSON.stringify(persistableTournamentState(tournament)),
    JSON.stringify(tournament.rounds),
    tournament.winner ? tournament.winner.userId : null,
    tournament.winner ? tournament.winner.username : null,
    tournament.winnerWonAt,
    tournament.updatedAt,
    tournament.startedAt,
    tournament.endedAt,
    tournament.id
  );
}

function tournamentForSocket(socket, requestedTournamentId = '') {
  const direct = String(requestedTournamentId || socket.data.tournamentId || '');
  if (direct && tournaments.has(direct)) return tournaments.get(direct);
  const currentRoom = socket.data.roomId ? rooms.get(socket.data.roomId) : socket.data.spectatingRoomId ? rooms.get(socket.data.spectatingRoomId) : null;
  return currentRoom && currentRoom.tournamentId ? tournaments.get(currentRoom.tournamentId) : null;
}

function isSocketPlayingActiveTournamentMatch(socket, tournament) {
  if (!socket.data.roomId) return false;
  const room = rooms.get(socket.data.roomId);
  return Boolean(room && room.tournamentId === tournament.id && room.game.status === 'playing');
}

function deductTournamentStake(userId, stake, options = {}) {
  const amount = Math.max(0, Number(stake) || 0);
  return adjustTournamentTrophies(userId, -amount, {
    requireBalance: amount > 0 && !options.allowDebt,
    allowNegative: true
  });
}

function refundTournamentParticipant(tournament, participant) {
  if (!participant || !participant.stakePaid) return null;
  const profile = adjustTournamentTrophies(participant.userId, tournament.stake, { allowNegative: true });
  participant.stakePaid = false;
  return profile;
}

function awardTournamentPrize(userId, amount, options = {}) {
  const transaction = db.transaction(() => {
    const profile = adjustTournamentTrophies(userId, amount, { allowNegative: true });
    if (options.incrementWins) statements.incrementTournamentWins.run(new Date().toISOString(), userId);
    return profile;
  });
  return transaction();
}

function adjustTournamentTrophies(userId, delta, options = {}) {
  const user = statements.getUserById.get(userId);
  if (!user) return null;
  const currentTrophies = Number(user.trophies) || 0;
  if (options.requireBalance && currentTrophies + delta < 0) return null;
  const nextTrophies = currentTrophies + delta;
  const trophies = options.allowNegative ? nextTrophies : Math.max(0, nextTrophies);
  const lossCounter = Math.max(0, Number(user.loss_counter) || 0);
  const tier = getTierForTrophies(trophies);
  statements.updateUserStats.run(trophies, tier.name, lossCounter, new Date().toISOString(), userId);
  return publicUser(statements.getUserById.get(userId));
}

function normalizeTournamentParticipantCount(value) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < TOURNAMENT_MIN_PARTICIPANTS) return null;
  return count;
}

function normalizeTournamentStake(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const stake = Number(value);
  if (!Number.isSafeInteger(stake) || stake < 0) return null;
  return stake;
}

function canListSpectatorRoom(room) {
  const maxSpectators = getMaxSpectators(room);
  return !Number.isFinite(maxSpectators) || getSpectatorCount(room) < maxSpectators;
}

function getMaxSpectators(room) {
  return room && room.tournament ? null : MAX_SPECTATORS_PER_ROOM;
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
  if (!Number.isInteger(payload.handIndex) || payload.handIndex < 0 || payload.handIndex >= FINAL_HAND_SIZE) return false;
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

function ensureUserColumn(columnName, definition) {
  const columns = db.prepare('PRAGMA table_info(users)').all();
  if (columns.some((column) => column.name === columnName)) return;
  db.exec(`ALTER TABLE users ADD COLUMN ${columnName} ${definition}`);
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
