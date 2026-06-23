const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ARENA = { width: 900, height: 620 };
const TICK_MS = 50;
const BROADCAST_MS = 100;
const GAME_DURATION_MS = 180000;
const SUDDEN_DEATH_MAX_MS = 90000;
const MAX_ELIXIR = 10;
const ELIXIR_PER_SECOND = 1 / 2.8;
const TOWER_HP = {
  king: 4600,
  princess: 2700
};

const CARDS = {
  zzangga: {
    id: 'zzangga',
    name: '짱가',
    cost: 5,
    role: '광역 딜러',
    maxHp: 760,
    damage: 122,
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
    cost: 3,
    role: '힐러',
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
    damage: 145,
    range: 74,
    speed: 40,
    attackMs: 1850,
    radius: 23,
    chaosRadius: 105,
    chaosEnemyDamage: 175,
    chaosFriendlyDamage: 36
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
    role: '군단',
    maxHp: 155,
    damage: 24,
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
    damage: 370,
    range: 134,
    speed: 44,
    attackMs: 2450,
    radius: 18,
    windupMs: 760
  },
  mythos: {
    id: 'mythos',
    name: '미토스건휘',
    cost: 6,
    role: '변신 딜러',
    maxHp: 850,
    damage: 48,
    awakenedDamage: 128,
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
    damage: 45,
    range: 42,
    speed: 57,
    attackMs: 430,
    radius: 16,
    female: true
  }
};

const CARD_IDS = Object.keys(CARDS);
const DECK_COST_MIN = 40;
const DECK_COST_MAX = 55;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/phaser', express.static(path.join(__dirname, 'node_modules/phaser/dist')));

const game = {
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
  reason: ''
};

function createPlayer(slot) {
  return {
    slot,
    socketId: null,
    connected: false,
    elixir: 5,
    hand: [],
    cycle: [],
    usedKkongho: false
  };
}

function resetPlayerForMatch(player) {
  const deck = shuffledDeck();
  player.elixir = 5;
  player.hand = deck.slice(0, 4);
  player.cycle = deck.slice(4);
  player.usedKkongho = false;
}

function shuffledDeck() {
  const deck = [...CARD_IDS];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const totalCost = deck.reduce((sum, id) => sum + CARDS[id].cost, 0);
  if (totalCost < DECK_COST_MIN || totalCost > DECK_COST_MAX) {
    throw new Error(`Deck cost ${totalCost} is outside ${DECK_COST_MIN}-${DECK_COST_MAX}.`);
  }
  return deck;
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
    damage: isKing ? 72 : 58,
    attackMs: isKing ? 950 : 900,
    nextAttackAt: 0
  };
}

function startMatch() {
  if (!game.players[0].connected || !game.players[1].connected) {
    game.status = 'waiting';
    game.message = '상대 접속 대기 중';
    game.winner = null;
    return;
  }

  for (const player of game.players) {
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
  game.lastTickAt = now;
  broadcastEffect({ type: 'match-start' });
  broadcastState();
}

function assignSlot(socketId) {
  const openSlot = game.players.find((player) => !player.connected);
  if (!openSlot) return null;
  openSlot.socketId = socketId;
  openSlot.connected = true;
  return openSlot.slot;
}

io.on('connection', (socket) => {
  const slot = assignSlot(socket.id);

  socket.emit('welcome', {
    slot,
    arena: ARENA,
    cards: CARDS,
    deckCostRange: [DECK_COST_MIN, DECK_COST_MAX]
  });

  if (slot === null) {
    socket.emit('notice', '현재 방이 가득 차서 관전자로 접속했습니다.');
  }

  if (game.players[0].connected && game.players[1].connected && game.status !== 'playing') {
    startMatch();
  } else {
    broadcastState();
  }

  socket.on('play-card', (payload) => {
    if (slot === null) return;
    playCard(slot, payload);
  });

  socket.on('restart', () => {
    if (slot === null) return;
    startMatch();
  });

  socket.on('disconnect', () => {
    if (slot !== null && game.players[slot].socketId === socket.id) {
      game.players[slot].connected = false;
      game.players[slot].socketId = null;
      if (game.status === 'playing') {
        endMatch(1 - slot, '상대 연결 종료');
      } else {
        game.status = 'waiting';
        game.message = '상대 접속 대기 중';
        broadcastState();
      }
    }
  });
});

function playCard(slot, payload = {}) {
  if (game.status !== 'playing') return;
  const now = Date.now();
  if (game.freezeUntil > now) return;

  const player = game.players[slot];
  const handIndex = Number(payload.handIndex);
  if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex > 3) return;

  const cardId = player.hand[handIndex];
  const card = CARDS[cardId];
  if (!card) return;
  if (card.id === 'kkongho' && player.usedKkongho) return;
  if (player.elixir + 0.0001 < card.cost) return;

  const x = Number(payload.x);
  const y = Number(payload.y);
  if (!isValidSpawnPoint(slot, x, y)) return;

  player.elixir = Math.max(0, player.elixir - card.cost);

  if (card.id === 'kkongho') {
    player.usedKkongho = true;
    advanceHand(player, handIndex, false);
    triggerAscension(slot, x, y);
    broadcastState();
    return;
  }

  spawnCard(slot, card.id, x, y);
  advanceHand(player, handIndex, true);
  broadcastState();
}

function isValidSpawnPoint(slot, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 48 || x > ARENA.width - 48) return false;
  if (slot === 0) return y >= 338 && y <= ARENA.height - 42;
  return y >= 42 && y <= 282;
}

function advanceHand(player, handIndex, requeuePlayedCard) {
  const playedCard = player.hand[handIndex];
  if (requeuePlayedCard && playedCard) {
    player.cycle.push(playedCard);
  }
  player.hand[handIndex] = player.cycle.shift() || null;
}

function spawnCard(owner, cardId, x, y) {
  const card = CARDS[cardId];
  const count = card.spawnCount || 1;
  const offsets = formationOffsets(count);

  for (let i = 0; i < count; i += 1) {
    const unit = {
      entity: 'unit',
      id: `u${game.nextUnitId++}`,
      owner,
      cardId,
      x: clamp(x + offsets[i].x, 28, ARENA.width - 28),
      y: clamp(y + offsets[i].y, 28, ARENA.height - 28),
      hp: card.maxHp,
      maxHp: card.maxHp,
      nextAttackAt: Date.now() + Math.floor(Math.random() * 320),
      nextSkillAt: Date.now() + 700,
      nextChaosAt: Date.now() + randomBetween(2500, 5600),
      windupUntil: 0,
      windupTargetId: null,
      awakened: false,
      invincibleUntil: 0,
      action: '',
      actionUntil: 0
    };
    game.units.push(unit);
  }

  broadcastEffect({ type: 'spawn', owner, cardId, x, y });
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

function triggerAscension(owner, x, y) {
  const now = Date.now();
  game.freezeUntil = now + 2550;
  game.pendingAscensionAt = now + 1900;
  broadcastEffect({ type: 'ascension-start', owner, x, y });
}

setInterval(() => {
  const now = Date.now();
  const deltaSeconds = Math.min(0.1, (now - game.lastTickAt) / 1000);
  game.lastTickAt = now;

  if (game.status === 'playing') {
    tickGame(now, deltaSeconds);
  }

  if (now - game.lastBroadcastAt >= BROADCAST_MS) {
    broadcastState();
  }
}, TICK_MS);

function tickGame(now, deltaSeconds) {
  if (game.pendingAscensionAt && now >= game.pendingAscensionAt) {
    game.units = [];
    game.pendingAscensionAt = 0;
    broadcastEffect({ type: 'ascension-end' });
  }

  if (game.freezeUntil > now) {
    return;
  }

  for (const player of game.players) {
    player.elixir = Math.min(MAX_ELIXIR, player.elixir + ELIXIR_PER_SECOND * deltaSeconds);
  }

  updateUnits(now, deltaSeconds);
  updateTowers(now);
  removeDeadUnits();
  checkWinConditions(now);
}

function updateUnits(now, deltaSeconds) {
  for (const unit of game.units) {
    if (unit.hp <= 0) continue;
    if (unit.actionUntil && unit.actionUntil <= now) {
      unit.action = '';
      unit.actionUntil = 0;
    }

    const card = CARDS[unit.cardId];
    if (!card) continue;

    if (card.healer) {
      updateHealer(unit, card, deltaSeconds);
      continue;
    }

    if (unit.cardId === 'baduk') {
      updateBadukChaos(unit, card, now);
    }

    if (unit.windupUntil) {
      resolveWindup(unit, card, now);
      continue;
    }

    const target = findUnitTarget(unit, card);
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
      broadcastEffect({ type: 'windup', owner: unit.owner, cardId: unit.cardId, x: unit.x, y: unit.y });
      continue;
    }

    performAttack(unit, card, target, now);
  }
}

function updateHealer(unit, card, deltaSeconds) {
  const candidates = game.units.filter((other) => {
    if (other.id === unit.id || other.owner !== unit.owner || other.hp <= 0) return false;
    const otherCard = CARDS[other.cardId];
    return otherCard && otherCard.female;
  });

  const target = nearest(unit, candidates);
  if (!target) {
    unit.action = '대기';
    unit.actionUntil = Date.now() + 200;
    return;
  }

  const targetDistance = distance(unit, target);
  if (targetDistance > card.followDistance) {
    moveToward(unit, target, card.speed * deltaSeconds);
    unit.action = '추적';
    unit.actionUntil = Date.now() + 200;
    return;
  }

  target.hp = Math.min(target.maxHp, target.hp + card.healPerSecond * deltaSeconds);
  unit.action = '힐';
  unit.actionUntil = Date.now() + 200;
}

function updateBadukChaos(unit, card, now) {
  if (now < unit.nextChaosAt) return;

  const targets = game.units.filter((other) => other.id !== unit.id && other.hp > 0 && distance(unit, other) <= card.chaosRadius);
  for (const target of targets) {
    const damage = target.owner === unit.owner ? card.chaosFriendlyDamage : card.chaosEnemyDamage;
    applyDamageToUnit(target, damage, unit.owner, now);
  }

  unit.nextChaosAt = now + randomBetween(3600, 7200);
  unit.action = randomChaosAction();
  unit.actionUntil = now + 720;
  broadcastEffect({ type: 'chaos', owner: unit.owner, x: unit.x, y: unit.y, radius: card.chaosRadius });
}

function resolveWindup(unit, card, now) {
  if (now < unit.windupUntil) return;

  const target = findEntityById(unit.windupTargetId);
  unit.windupUntil = 0;
  unit.windupTargetId = null;
  unit.action = '';
  unit.actionUntil = 0;
  unit.nextAttackAt = now + card.attackMs;

  if (!target || getHp(target) <= 0 || distance(unit, target) > card.range + getTargetRadius(target) + 14) {
    return;
  }

  applyDamage(target, card.damage, unit.owner, now);
  broadcastEffect({ type: 'punchline', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
}

function performAttack(unit, card, target, now) {
  const damage = getUnitDamage(unit, card);

  if (unit.cardId === 'zzangga' && now >= unit.nextSkillAt) {
    const enemies = game.units.filter((other) => {
      return other.owner !== unit.owner && other.hp > 0 && distance(target, other) <= 98;
    });
    for (const enemy of enemies) {
      applyDamageToUnit(enemy, damage, unit.owner, now);
    }
    applyDamage(target, damage, unit.owner, now);
    unit.nextSkillAt = now + card.skillCooldownMs;
    unit.action = '음파 폭소';
    unit.actionUntil = now + 500;
    broadcastEffect({ type: 'sonic', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
  } else {
    applyDamage(target, damage, unit.owner, now);
    broadcastEffect({ type: 'hit', owner: unit.owner, cardId: unit.cardId, fromX: unit.x, fromY: unit.y, x: target.x, y: target.y });
  }

  unit.nextAttackAt = now + getAttackMs(unit, card);
}

function updateTowers(now) {
  for (const tower of game.towers) {
    if (tower.hp <= 0 || now < tower.nextAttackAt) continue;

    const enemies = game.units.filter((unit) => unit.owner !== tower.owner && unit.hp > 0 && distance(tower, unit) <= tower.range);
    const target = nearest(tower, enemies);
    if (!target) continue;

    applyDamageToUnit(target, tower.damage, tower.owner, now);
    tower.nextAttackAt = now + tower.attackMs;
    broadcastEffect({ type: 'tower-shot', owner: tower.owner, fromX: tower.x, fromY: tower.y, x: target.x, y: target.y });
  }
}

function findUnitTarget(unit, card) {
  const attackableUnits = game.units.filter((other) => {
    return other.owner !== unit.owner && other.hp > 0 && distance(unit, other) <= Math.max(card.range + getTargetRadius(other), 170);
  });
  const nearUnit = nearest(unit, attackableUnits);
  if (nearUnit) return nearUnit;

  const towers = getAttackableEnemyTowers(unit.owner);
  return nearest(unit, towers);
}

function getAttackableEnemyTowers(owner) {
  const defender = 1 - owner;
  const kingVulnerable = isKingVulnerable(defender);
  return game.towers.filter((tower) => {
    if (tower.owner !== defender || tower.hp <= 0) return false;
    return tower.type !== 'king' || kingVulnerable;
  });
}

function isKingVulnerable(owner) {
  return game.towers.some((tower) => tower.owner === owner && tower.type !== 'king' && tower.hp <= 0);
}

function applyDamage(target, amount, sourceOwner, now) {
  if (!target) return;
  if (target.entity === 'unit') {
    applyDamageToUnit(target, amount, sourceOwner, now);
  } else if (target.entity === 'tower') {
    target.hp = Math.max(0, target.hp - amount);
  }
}

function applyDamageToUnit(unit, amount, sourceOwner, now) {
  if (!unit || unit.hp <= 0) return;
  if (unit.invincibleUntil && unit.invincibleUntil > now) return;

  const previousHp = unit.hp;
  unit.hp = Math.max(0, unit.hp - amount);

  if (unit.cardId === 'jimin' && unit.windupUntil && unit.hp < previousHp) {
    unit.windupUntil = 0;
    unit.windupTargetId = null;
    unit.action = '취소';
    unit.actionUntil = now + 450;
    unit.nextAttackAt = now + 900;
    broadcastEffect({ type: 'interrupt', owner: unit.owner, x: unit.x, y: unit.y });
  }

  if (unit.cardId === 'mythos' && !unit.awakened && unit.hp > 0 && unit.hp <= unit.maxHp * 0.5) {
    unit.awakened = true;
    unit.invincibleUntil = now + CARDS.mythos.awakenMs;
    unit.action = '각성';
    unit.actionUntil = unit.invincibleUntil;
    broadcastEffect({ type: 'awaken', owner: unit.owner, x: unit.x, y: unit.y });
  }
}

function removeDeadUnits() {
  game.units = game.units.filter((unit) => unit.hp > 0);
}

function checkWinConditions(now) {
  const destroyedKing = game.towers.find((tower) => tower.type === 'king' && tower.hp <= 0);
  if (destroyedKing) {
    endMatch(1 - destroyedKing.owner, '킹타워 파괴');
    return;
  }

  if (!game.suddenDeath && now >= game.endsAt) {
    const hp0 = totalTowerHp(0);
    const hp1 = totalTowerHp(1);
    if (hp0 !== hp1) {
      endMatch(hp0 > hp1 ? 0 : 1, '제한 시간 종료');
      return;
    }

    game.suddenDeath = true;
    game.suddenDeathEndsAt = now + SUDDEN_DEATH_MAX_MS;
    game.message = '서든 데스';
    broadcastEffect({ type: 'sudden-death' });
  }

  if (game.suddenDeath) {
    const hp0 = totalTowerHp(0);
    const hp1 = totalTowerHp(1);
    if (hp0 !== hp1) {
      endMatch(hp0 > hp1 ? 0 : 1, '서든 데스 HP 우위');
      return;
    }
    if (now >= game.suddenDeathEndsAt) {
      endMatch(null, '서든 데스 무승부');
    }
  }
}

function endMatch(winner, reason) {
  game.status = 'ended';
  game.winner = winner;
  game.reason = reason;
  game.message = winner === null ? `무승부: ${reason}` : `플레이어 ${winner + 1} 승리: ${reason}`;
  game.freezeUntil = 0;
  game.pendingAscensionAt = 0;
  broadcastEffect({ type: 'match-end', winner, reason });
  broadcastState();
}

function totalTowerHp(owner) {
  return Math.round(
    game.towers
      .filter((tower) => tower.owner === owner)
      .reduce((sum, tower) => sum + Math.max(0, tower.hp), 0)
  );
}

function findEntityById(id) {
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

function broadcastEffect(effect) {
  io.emit('effect', { ...effect, at: Date.now() });
}

function broadcastState() {
  game.lastBroadcastAt = Date.now();
  io.emit('state', serializeState());
}

function serializeState() {
  const now = Date.now();
  return {
    arena: ARENA,
    status: game.status,
    message: game.message,
    winner: game.winner,
    reason: game.reason,
    remainingMs: Math.max(0, (game.suddenDeath ? game.suddenDeathEndsAt : game.endsAt) - now),
    suddenDeath: game.suddenDeath,
    freezeMs: Math.max(0, game.freezeUntil - now),
    players: game.players.map((player) => ({
      slot: player.slot,
      connected: player.connected,
      elixir: Number(player.elixir.toFixed(2)),
      hand: player.hand,
      usedKkongho: player.usedKkongho,
      totalTowerHp: totalTowerHp(player.slot)
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
      action: unit.action,
      windup: unit.windupUntil > now
    }))
  };
}

server.listen(PORT, () => {
  console.log(`Friends Tower Defense running at http://localhost:${PORT}`);
});
