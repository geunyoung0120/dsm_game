const VIEW = { width: 900, height: 760 };
const ARENA_H = 620;
const CARD_H = 108;

const CARD_THEME = {
  zzangga: { fill: 0xe4536d, stroke: 0xffd6df, short: '짱' },
  bbatman: { fill: 0x46b9a5, stroke: 0xc7fff4, short: '힐' },
  baduk: { fill: 0x8c6a54, stroke: 0xffd2a8, short: '박' },
  kkongho: { fill: 0xf4df70, stroke: 0xfff8c9, short: '승' },
  yushin: { fill: 0x7f7fd5, stroke: 0xdad8ff, short: '군' },
  jimin: { fill: 0x4f8de8, stroke: 0xd5e9ff, short: '딜' },
  mythos: { fill: 0xf08a35, stroke: 0xffdfb8, short: '각' },
  peach: { fill: 0xf184b5, stroke: 0xffdeee, short: '복' }
};

const TOWER_THEME = {
  0: { fill: 0x2f75d6, stroke: 0xcbe1ff },
  1: { fill: 0xd94f45, stroke: 0xffd5d1 }
};

class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.socket = null;
    this.slot = null;
    this.cards = {};
    this.state = null;
    this.effects = [];
    this.selectedHandIndex = null;
    this.cardBounds = [];
    this.textPool = [];
    this.usedTextCount = 0;
    this.notice = '';
  }

  create() {
    this.g = this.add.graphics();
    this.socket = io();

    this.socket.on('welcome', (payload) => {
      this.slot = payload.slot;
      this.cards = payload.cards || {};
    });

    this.socket.on('notice', (message) => {
      this.notice = message;
    });

    this.socket.on('state', (state) => {
      this.state = state;
      if (!this.cards || Object.keys(this.cards).length === 0) {
        this.cards = buildFallbackCards(state);
      }
    });

    this.socket.on('effect', (effect) => {
      this.effects.push({ ...effect, bornAt: this.time.now });
    });

    this.input.on('pointerdown', (pointer) => this.handlePointer(pointer));
  }

  update() {
    this.usedTextCount = 0;
    this.g.clear();

    this.drawBoard();
    if (this.state) {
      this.drawSpawnPreview();
      this.drawTowers();
      this.drawUnits();
      this.drawEffects();
      this.drawHud();
      this.drawCards();
      this.drawOverlay();
    } else {
      this.drawCenteredText('서버 연결 중...', VIEW.width / 2, VIEW.height / 2, 24, '#f7f2e8');
    }

    this.hideUnusedText();
  }

  handlePointer(pointer) {
    if (!this.state || this.slot === null || this.slot === undefined) return;

    const cardIndex = this.cardBounds.findIndex((bounds) => {
      return pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.w && pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.h;
    });

    if (cardIndex >= 0) {
      const player = this.state.players[this.slot];
      const cardId = player && player.hand[cardIndex];
      const card = this.cards[cardId];
      if (!card || this.state.status !== 'playing') return;
      if (player.elixir + 0.001 < card.cost) return;
      if (cardId === 'kkongho' && player.usedKkongho) return;
      this.selectedHandIndex = this.selectedHandIndex === cardIndex ? null : cardIndex;
      return;
    }

    if (pointer.y > ARENA_H || this.selectedHandIndex === null || this.state.status !== 'playing') return;
    if (!this.isInOwnSpawnZone(pointer.x, pointer.y)) return;

    this.socket.emit('play-card', {
      handIndex: this.selectedHandIndex,
      x: pointer.x,
      y: pointer.y
    });
    this.selectedHandIndex = null;
  }

  drawBoard() {
    this.g.fillStyle(0x273828, 1);
    this.g.fillRect(0, 0, VIEW.width, ARENA_H);

    this.g.fillStyle(0x334734, 1);
    this.g.fillRect(0, 0, VIEW.width, 282);
    this.g.fillStyle(0x2c593e, 1);
    this.g.fillRect(0, 338, VIEW.width, 282);

    this.g.fillStyle(0x487aa0, 1);
    this.g.fillRect(0, 286, VIEW.width, 48);
    this.g.lineStyle(3, 0xd8c073, 1);
    this.g.lineBetween(0, 286, VIEW.width, 286);
    this.g.lineBetween(0, 334, VIEW.width, 334);

    this.g.lineStyle(5, 0xcaa862, 1);
    this.g.lineBetween(315, 286, 315, 334);
    this.g.lineBetween(585, 286, 585, 334);

    this.g.lineStyle(1, 0xffffff, 0.12);
    this.g.lineBetween(VIEW.width / 2, 0, VIEW.width / 2, ARENA_H);

    this.g.fillStyle(0x191b1f, 1);
    this.g.fillRect(0, ARENA_H, VIEW.width, VIEW.height - ARENA_H);
  }

  drawSpawnPreview() {
    if (this.slot === null || this.slot === undefined || this.selectedHandIndex === null || this.state.status !== 'playing') return;
    const zone = this.slot === 0 ? { y: 338, h: ARENA_H - 380 } : { y: 42, h: 240 };
    this.g.fillStyle(this.slot === 0 ? 0x4f8de8 : 0xe4536d, 0.13);
    this.g.fillRect(48, zone.y, VIEW.width - 96, zone.h);
    this.g.lineStyle(2, this.slot === 0 ? 0xcbe1ff : 0xffd5d1, 0.7);
    this.g.strokeRect(48, zone.y, VIEW.width - 96, zone.h);
  }

  drawTowers() {
    for (const tower of this.state.towers) {
      const theme = TOWER_THEME[tower.owner];
      const alive = tower.hp > 0;
      const radius = tower.type === 'king' ? 38 : 30;

      this.g.fillStyle(alive ? theme.fill : 0x30343a, 1);
      this.g.lineStyle(4, alive ? theme.stroke : 0x666666, 1);
      this.g.fillRoundedRect(tower.x - radius, tower.y - radius, radius * 2, radius * 2, 8);
      this.g.strokeRoundedRect(tower.x - radius, tower.y - radius, radius * 2, radius * 2, 8);

      this.g.fillStyle(0x111318, 0.92);
      this.g.fillRect(tower.x - 42, tower.y - radius - 18, 84, 8);
      this.g.fillStyle(tower.owner === 0 ? 0x82b8ff : 0xff8f86, 1);
      this.g.fillRect(tower.x - 42, tower.y - radius - 18, 84 * hpRatio(tower), 8);

      const label = tower.type === 'king' ? 'KING' : 'PRIN';
      this.drawCenteredText(label, tower.x, tower.y - 6, 13, '#ffffff');
      this.drawCenteredText(String(Math.max(0, tower.hp)), tower.x, tower.y + 12, 11, '#f7f2e8');
    }
  }

  drawUnits() {
    for (const unit of this.state.units) {
      const card = this.cards[unit.cardId] || {};
      const theme = CARD_THEME[unit.cardId] || { fill: 0xf1f1f1, stroke: 0xffffff, short: '?' };
      const radius = this.getVisualRadius(unit.cardId);

      if (unit.invincible) {
        this.g.fillStyle(0xfff4a7, 0.24);
        this.g.fillCircle(unit.x, unit.y, radius + 10);
      }
      if (unit.awakened) {
        this.g.lineStyle(3, 0xffee64, 0.9);
        this.g.strokeCircle(unit.x, unit.y, radius + 8);
      }
      if (unit.windup) {
        this.g.lineStyle(3, 0xffffff, 0.75);
        this.g.strokeCircle(unit.x, unit.y, radius + 13);
      }

      this.drawCharacter(unit, theme, radius);

      this.g.fillStyle(0x111318, 0.92);
      this.g.fillRect(unit.x - 24, unit.y - radius - 13, 48, 6);
      this.g.fillStyle(unit.owner === 0 ? 0x7ab4ff : 0xff847a, 1);
      this.g.fillRect(unit.x - 24, unit.y - radius - 13, 48 * hpRatio(unit), 6);

      this.drawCenteredText(theme.short, unit.x, unit.y - 8, 14, '#111318');
      this.drawCenteredText(card.name || unit.cardId, unit.x, unit.y + radius + 12, 10, '#ffffff');
      if (unit.action) {
        this.drawCenteredText(unit.action, unit.x, unit.y - radius - 25, 10, '#fff4a7');
      }
    }
  }

  drawCharacter(unit, theme, radius) {
    const x = unit.x;
    const y = unit.y;
    const dir = unit.owner === 0 ? -1 : 1;
    const outline = unit.owner === 0 ? 0xcbe1ff : 0xffd5d1;
    const skin = 0xf0c0a2;
    const dark = 0x17191d;
    const white = 0xf7f2e8;

    this.g.lineStyle(2, outline, 1);

    if (unit.cardId === 'zzangga') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 9, y - 14, 18, 31, 5);
      this.g.strokeRoundedRect(x - 9, y - 14, 18, 31, 5);
      this.g.fillStyle(skin, 1);
      this.g.fillEllipse(x, y - 25, 21, 16);
      this.g.strokeEllipse(x, y - 25, 21, 16);
      this.g.fillStyle(0x3a2418, 1);
      this.g.fillCircle(x - dir * 13, y - 25, 6);
      this.g.lineStyle(3, 0x3a2418, 1);
      this.g.lineBetween(x - dir * 16, y - 20, x - dir * 24, y - 13);
      this.g.lineStyle(1, dark, 1);
      this.g.strokeCircle(x - 4, y - 26, 3);
      this.g.strokeCircle(x + 4, y - 26, 3);
      this.g.lineBetween(x - 1, y - 26, x + 1, y - 26);
      this.g.lineStyle(2, white, unit.action ? 0.9 : 0.35);
      this.g.lineBetween(x + dir * 5, y - 16, x + dir * 18, y - 11);
    } else if (unit.cardId === 'bbatman') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 6, y - 10, 12, 25, 4);
      this.g.strokeRoundedRect(x - 6, y - 10, 12, 25, 4);
      this.g.fillStyle(0xb56f3d, 1);
      this.g.fillEllipse(x, y - 21, 16, 14);
      this.g.strokeEllipse(x, y - 21, 16, 14);
      this.g.lineStyle(3, 0x1b1f22, 1);
      this.g.lineBetween(x - 8, y + 17, x - 16, y + 20);
      this.g.lineBetween(x + 8, y + 17, x + 16, y + 20);
      if (unit.action === '힐') {
        this.g.lineStyle(3, 0xc7fff4, 0.95);
        this.g.lineBetween(x - 16, y - 1, x + 16, y - 1);
        this.g.lineBetween(x, y - 17, x, y + 15);
      }
    } else if (unit.cardId === 'baduk') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillEllipse(x, y + 1, 38, 34);
      this.g.strokeEllipse(x, y + 1, 38, 34);
      this.g.fillStyle(skin, 1);
      this.g.fillEllipse(x, y - 22, 24, 18);
      this.g.strokeEllipse(x, y - 22, 24, 18);
      this.g.lineStyle(2, dark, 1);
      this.g.strokeCircle(x - 5, y - 23, 3);
      this.g.strokeCircle(x + 5, y - 23, 3);
      this.g.lineBetween(x - 12, y + 2, x - 26, y + 12);
      this.g.lineBetween(x + 12, y + 2, x + 26, y + 12);
    } else if (unit.cardId === 'yushin') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 7, y - 7, 14, 18, 4);
      this.g.strokeRoundedRect(x - 7, y - 7, 14, 18, 4);
      this.g.fillStyle(skin, 1);
      this.g.fillRoundedRect(x - 7, y - 18, 14, 12, 4);
      this.g.strokeRoundedRect(x - 7, y - 18, 14, 12, 4);
      this.g.fillStyle(0xffe2a8, 1);
      this.g.fillCircle(x + dir * 12, y - 1, 5);
      this.g.fillCircle(x - dir * 10, y + 3, 4);
    } else if (unit.cardId === 'jimin') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 7, y - 18, 14, 38, 5);
      this.g.strokeRoundedRect(x - 7, y - 18, 14, 38, 5);
      this.g.fillStyle(skin, 1);
      this.g.fillEllipse(x, y - 29, 20, 16);
      this.g.strokeEllipse(x, y - 29, 20, 16);
      this.g.lineStyle(3, white, unit.windup ? 1 : 0.75);
      this.g.lineBetween(x + dir * 7, y - 9, x + dir * 24, y - 18);
      this.g.fillStyle(white, 1);
      this.g.fillCircle(x + dir * 27, y - 19, 3);
    } else if (unit.cardId === 'mythos') {
      this.g.fillStyle(unit.awakened ? 0xffd84c : theme.fill, 1);
      this.g.fillRoundedRect(x - 10, y - 13, 20, 31, 5);
      this.g.strokeRoundedRect(x - 10, y - 13, 20, 31, 5);
      this.g.fillStyle(skin, 1);
      this.g.fillRoundedRect(x - 9, y - 27, 18, 15, 4);
      this.g.strokeRoundedRect(x - 9, y - 27, 18, 15, 4);
      this.g.fillStyle(unit.awakened ? 0xfff176 : 0x30231f, 1);
      const spike = unit.awakened ? 19 : 10;
      this.g.fillTriangle(x - 9, y - 28, x - 4, y - 28 - spike, x - 1, y - 28);
      this.g.fillTriangle(x - 2, y - 28, x + 2, y - 30 - spike, x + 5, y - 28);
      this.g.fillTriangle(x + 5, y - 28, x + 10, y - 27 - spike, x + 10, y - 27);
      this.g.lineStyle(1, dark, unit.awakened ? 0 : 1);
      this.g.strokeCircle(x - 4, y - 22, 2);
      this.g.strokeCircle(x + 4, y - 22, 2);
    } else if (unit.cardId === 'peach') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 10, y - 11, 20, 29, 6);
      this.g.strokeRoundedRect(x - 10, y - 11, 20, 29, 6);
      this.g.fillStyle(skin, 1);
      this.g.fillEllipse(x, y - 23, 19, 15);
      this.g.strokeEllipse(x, y - 23, 19, 15);
      this.g.lineStyle(3, 0xefff9f, 1);
      this.g.lineBetween(x + dir * 8, y - 6, x + dir * 24, y - 18);
      this.g.strokeCircle(x + dir * 28, y - 22, 8);
      this.g.fillStyle(0xd8ff70, 1);
      this.g.fillCircle(x - dir * 13, y - 4, 3);
    } else {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - radius, y - radius, radius * 2, radius * 2, 6);
      this.g.strokeRoundedRect(x - radius, y - radius, radius * 2, radius * 2, 6);
    }

    this.drawCenteredText(theme.short, x, y - 5, unit.cardId === 'yushin' ? 9 : 11, '#111318');
  }

  drawEffects() {
    const now = this.time.now;
    this.effects = this.effects.filter((effect) => now - effect.bornAt < this.effectDuration(effect.type));

    for (const effect of this.effects) {
      const age = now - effect.bornAt;
      const t = Phaser.Math.Clamp(age / this.effectDuration(effect.type), 0, 1);
      const alpha = 1 - t;

      if (effect.type === 'ascension-start') {
        this.g.fillStyle(0xfff6b0, 0.18 + 0.14 * Math.sin(age / 90));
        this.g.fillRect(0, 0, VIEW.width, ARENA_H);
        this.g.lineStyle(8, 0xfff2a8, alpha);
        this.g.lineBetween(effect.x, 0, effect.x, ARENA_H);
        this.drawCenteredText('대승천', VIEW.width / 2, ARENA_H / 2, 42, '#fff7cb');
      } else if (effect.type === 'ascension-end') {
        this.g.fillStyle(0xfff8d3, alpha * 0.75);
        this.g.fillRect(0, 0, VIEW.width, ARENA_H);
      } else if (effect.type === 'sonic') {
        this.drawAttackTrail(effect, 0xffd6df, alpha, t, 4);
        if (Number.isFinite(effect.fromX) && Number.isFinite(effect.fromY)) {
          this.g.lineStyle(4, 0xffd6df, alpha * 0.8);
          this.g.lineBetween(effect.fromX, effect.fromY, effect.x - 48 - t * 30, effect.y);
          this.g.lineBetween(effect.fromX, effect.fromY, effect.x + 48 + t * 30, effect.y);
        }
        this.g.lineStyle(5, 0xffd6df, alpha);
        this.g.strokeCircle(effect.x, effect.y, 35 + t * 78);
        this.g.strokeCircle(effect.x, effect.y, 60 + t * 84);
      } else if (effect.type === 'chaos') {
        this.g.lineStyle(4, 0xffc47c, alpha);
        this.g.strokeCircle(effect.x, effect.y, 30 + t * (effect.radius || 105));
        this.g.lineStyle(3, 0xffffff, alpha * 0.8);
        this.g.lineBetween(effect.x - 38, effect.y - 18, effect.x + 38, effect.y + 18);
        this.g.lineBetween(effect.x + 22, effect.y - 42, effect.x - 22, effect.y + 42);
      } else if (effect.type === 'awaken') {
        this.g.lineStyle(5, 0xffee64, alpha);
        this.g.strokeCircle(effect.x, effect.y, 18 + t * 90);
        this.g.lineStyle(2, 0xffffff, alpha);
        this.g.lineBetween(effect.x - 30, effect.y + 30, effect.x + 15, effect.y - 38);
        this.g.lineBetween(effect.x + 20, effect.y + 28, effect.x - 10, effect.y - 42);
      } else if (effect.type === 'windup') {
        this.g.fillStyle(0x111318, alpha * 0.8);
        this.g.fillRoundedRect(effect.x - 29, effect.y - 54, 58, 24, 8);
        this.g.lineStyle(2, 0xffffff, alpha);
        this.g.strokeRoundedRect(effect.x - 29, effect.y - 54, 58, 24, 8);
        this.drawCenteredText('드립...', effect.x, effect.y - 50, 13, '#ffffff');
      } else if (effect.type === 'punchline') {
        this.drawAttackTrail(effect, 0xffffff, alpha, t, 3);
        this.g.fillStyle(0xffffff, alpha);
        this.g.fillCircle(effect.x, effect.y, 11 + t * 20);
        this.g.lineStyle(3, 0x4f8de8, alpha);
        this.g.lineBetween(effect.x - 26, effect.y, effect.x + 26, effect.y);
        this.g.lineBetween(effect.x, effect.y - 26, effect.x, effect.y + 26);
        this.drawCenteredText('멘붕', effect.x, effect.y - 28, 16, '#ffffff');
      } else if (effect.type === 'tower-shot') {
        this.drawAttackTrail(effect, 0xfff2a8, alpha, t, 4);
        this.g.fillStyle(0xffffff, alpha);
        this.g.fillCircle(effect.x, effect.y, 8 + t * 16);
      } else if (effect.type === 'hit') {
        this.drawCardHitEffect(effect, t, alpha);
      } else if (effect.type === 'spawn') {
        this.g.lineStyle(3, 0xffffff, alpha);
        this.g.strokeCircle(effect.x, effect.y, 16 + t * 36);
      } else if (effect.type === 'sudden-death') {
        this.drawCenteredText('서든 데스', VIEW.width / 2, 308, 36, '#fff4a7');
      }
    }
  }

  drawCardHitEffect(effect, t, alpha) {
    const color = CARD_THEME[effect.cardId] ? CARD_THEME[effect.cardId].stroke : 0xffffff;
    this.drawAttackTrail(effect, color, alpha, t, effect.cardId === 'yushin' ? 2 : 3);

    if (effect.cardId === 'peach') {
      this.g.lineStyle(4, 0xefff9f, alpha);
      this.g.strokeCircle(effect.x - 12 + t * 18, effect.y - 8, 16 + t * 8);
      this.g.fillStyle(0xd8ff70, alpha);
      this.g.fillCircle(effect.x, effect.y, 7);
      this.g.lineStyle(2, 0xffffff, alpha);
      this.g.lineBetween(effect.x - 5, effect.y, effect.x + 5, effect.y);
    } else if (effect.cardId === 'yushin') {
      this.g.fillStyle(0xffe2a8, alpha);
      this.g.fillCircle(effect.x - 9, effect.y, 6 + t * 5);
      this.g.fillCircle(effect.x + 2, effect.y - 5, 6 + t * 5);
      this.g.fillCircle(effect.x + 10, effect.y + 4, 6 + t * 5);
    } else if (effect.cardId === 'mythos') {
      this.g.lineStyle(4, 0xffee64, alpha);
      this.g.lineBetween(effect.x - 24, effect.y + 20, effect.x + 26, effect.y - 24);
      this.g.lineStyle(2, 0xffffff, alpha);
      this.g.lineBetween(effect.x - 8, effect.y + 22, effect.x + 12, effect.y - 26);
    } else if (effect.cardId === 'baduk') {
      this.g.lineStyle(4, 0xffc47c, alpha);
      this.g.strokeCircle(effect.x, effect.y, 16 + t * 22);
      this.g.lineBetween(effect.x - 30, effect.y + 8, effect.x - 8, effect.y - 3);
      this.g.lineBetween(effect.x + 7, effect.y - 4, effect.x + 32, effect.y + 10);
    } else if (effect.cardId === 'zzangga') {
      this.g.lineStyle(3, 0xffd6df, alpha);
      this.g.strokeCircle(effect.x, effect.y, 13 + t * 28);
      this.g.strokeCircle(effect.x, effect.y, 25 + t * 30);
    } else {
      this.g.fillStyle(0xffffff, alpha);
      this.g.fillCircle(effect.x, effect.y, 8 + t * 16);
    }
  }

  drawAttackTrail(effect, color, alpha, t, width) {
    if (!Number.isFinite(effect.fromX) || !Number.isFinite(effect.fromY)) return;

    const px = Phaser.Math.Linear(effect.fromX, effect.x, t);
    const py = Phaser.Math.Linear(effect.fromY, effect.y, t);
    this.g.lineStyle(width, color, alpha * 0.45);
    this.g.lineBetween(effect.fromX, effect.fromY, effect.x, effect.y);
    this.g.fillStyle(color, alpha);
    this.g.fillCircle(px, py, width + 2);
  }

  drawHud() {
    const p0 = this.state.players[0];
    const p1 = this.state.players[1];
    const me = this.slot === null || this.slot === undefined ? null : this.state.players[this.slot];
    const time = formatTime(this.state.remainingMs);

    this.g.fillStyle(0x111318, 0.82);
    this.g.fillRoundedRect(16, 12, 260, 58, 8);
    this.g.fillRoundedRect(624, 12, 260, 58, 8);
    this.g.fillRoundedRect(360, 12, 180, 58, 8);

    this.drawText(`P1 HP ${p0 ? p0.totalTowerHp : 0}`, 32, 24, 16, '#cbe1ff');
    this.drawText(`P2 HP ${p1 ? p1.totalTowerHp : 0}`, 640, 24, 16, '#ffd5d1');
    this.drawCenteredText(this.state.suddenDeath ? 'SUDDEN' : time, 450, 27, 22, '#f7f2e8');
    this.drawCenteredText(this.state.message || '', 450, 54, 12, '#d6d0c6');

    if (me) {
      this.drawElixir(me.elixir);
      this.drawText(`내 진영: ${this.slot === 0 ? '아래' : '위'}`, 32, 50, 12, '#d6d0c6');
    } else {
      this.drawCenteredText(this.notice || '관전 중', 450, 650, 18, '#f7f2e8');
    }
  }

  drawElixir(elixir) {
    const x = 603;
    const y = 642;
    const w = 260;
    const h = 18;
    this.g.fillStyle(0x262b33, 1);
    this.g.fillRoundedRect(x, y, w, h, 8);
    this.g.fillStyle(0xb86dff, 1);
    this.g.fillRoundedRect(x, y, w * Phaser.Math.Clamp(elixir / 10, 0, 1), h, 8);
    this.drawCenteredText(`${elixir.toFixed(1)} / 10`, x + w / 2, y + 1, 13, '#ffffff');
  }

  drawCards() {
    this.cardBounds = [];
    const player = this.slot === null || this.slot === undefined ? null : this.state.players[this.slot];
    const startX = 28;
    const gap = 14;
    const w = 128;
    const y = 638;

    for (let i = 0; i < 4; i += 1) {
      const x = startX + i * (w + gap);
      this.cardBounds.push({ x, y, w, h: CARD_H });

      const cardId = player && player.hand[i];
      const card = this.cards[cardId];
      const theme = CARD_THEME[cardId] || { fill: 0x3a3d45, stroke: 0x6f7480, short: '?' };
      const disabled = !player || !card || this.state.status !== 'playing' || player.elixir < card.cost || (cardId === 'kkongho' && player.usedKkongho);
      const selected = this.selectedHandIndex === i;

      this.g.fillStyle(disabled ? 0x282b31 : theme.fill, disabled ? 0.7 : 1);
      this.g.lineStyle(selected ? 4 : 2, selected ? 0xffffff : theme.stroke, selected ? 1 : 0.8);
      this.g.fillRoundedRect(x, y, w, CARD_H, 8);
      this.g.strokeRoundedRect(x, y, w, CARD_H, 8);

      if (!card) {
        this.drawCenteredText('-', x + w / 2, y + 46, 24, '#d6d0c6');
        continue;
      }

      this.g.fillStyle(0x111318, 0.78);
      this.g.fillCircle(x + 23, y + 23, 17);
      this.drawCenteredText(String(card.cost), x + 23, y + 14, 17, '#ffffff');
      this.drawCenteredText(theme.short, x + w / 2, y + 33, 30, disabled ? '#b9b9b9' : '#111318');
      this.drawCenteredText(card.name, x + w / 2, y + 69, 15, '#ffffff');
      this.drawCenteredText(card.role, x + w / 2, y + 91, 10, '#f5ead8');
    }
  }

  drawOverlay() {
    if (this.state.freezeMs > 0) {
      this.g.fillStyle(0xfff3b5, 0.11);
      this.g.fillRect(0, 0, VIEW.width, ARENA_H);
    }

    if (this.state.status === 'waiting') {
      this.g.fillStyle(0x0c0e11, 0.62);
      this.g.fillRect(0, 0, VIEW.width, ARENA_H);
      this.drawCenteredText('상대 접속 대기 중', VIEW.width / 2, 286, 30, '#f7f2e8');
      this.drawCenteredText('두 번째 브라우저 탭을 열면 자동으로 시작됩니다.', VIEW.width / 2, 326, 16, '#d6d0c6');
    }

    if (this.state.status === 'ended') {
      this.g.fillStyle(0x0c0e11, 0.68);
      this.g.fillRect(0, 0, VIEW.width, ARENA_H);
      const result = this.state.winner === null ? '무승부' : `플레이어 ${this.state.winner + 1} 승리`;
      this.drawCenteredText(result, VIEW.width / 2, 276, 34, '#f7f2e8');
      this.drawCenteredText(this.state.reason || '', VIEW.width / 2, 318, 17, '#d6d0c6');
      this.drawCenteredText('새 경기를 시작하려면 새로고침하거나 서버를 재시작하세요.', VIEW.width / 2, 358, 14, '#d6d0c6');
    }
  }

  isInOwnSpawnZone(x, y) {
    if (x < 48 || x > VIEW.width - 48) return false;
    if (this.slot === 0) return y >= 338 && y <= ARENA_H - 42;
    return y >= 42 && y <= 282;
  }

  getVisualRadius(cardId) {
    if (cardId === 'yushin') return 10;
    if (cardId === 'baduk') return 23;
    if (cardId === 'bbatman') return 15;
    return 18;
  }

  effectDuration(type) {
    if (type === 'ascension-start') return 2500;
    if (type === 'ascension-end') return 850;
    if (type === 'sudden-death') return 1600;
    if (type === 'sonic') return 950;
    if (type === 'chaos') return 950;
    if (type === 'awaken') return 1200;
    if (type === 'windup') return 820;
    if (type === 'punchline') return 1050;
    if (type === 'tower-shot') return 450;
    if (type === 'hit') return 520;
    return 700;
  }

  drawText(text, x, y, size, color) {
    const item = this.getText();
    item.setText(text);
    item.setPosition(x, y);
    item.setStyle({ fontSize: `${size}px`, color, fontFamily: 'Inter, Pretendard, sans-serif', align: 'left' });
    item.setOrigin(0, 0);
    item.setVisible(true);
    return item;
  }

  drawCenteredText(text, x, y, size, color) {
    const item = this.getText();
    item.setText(text);
    item.setPosition(x, y);
    item.setStyle({ fontSize: `${size}px`, color, fontFamily: 'Inter, Pretendard, sans-serif', align: 'center' });
    item.setOrigin(0.5, 0);
    item.setVisible(true);
    return item;
  }

  getText() {
    if (!this.textPool[this.usedTextCount]) {
      this.textPool[this.usedTextCount] = this.add.text(0, 0, '', { resolution: 2 });
    }
    return this.textPool[this.usedTextCount++];
  }

  hideUnusedText() {
    for (let i = this.usedTextCount; i < this.textPool.length; i += 1) {
      this.textPool[i].setVisible(false);
    }
  }
}

function hpRatio(entity) {
  if (!entity || !entity.maxHp) return 0;
  return Phaser.Math.Clamp(entity.hp / entity.maxHp, 0, 1);
}

function formatTime(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildFallbackCards(state) {
  const cards = {};
  for (const player of state.players || []) {
    for (const id of player.hand || []) {
      if (!cards[id]) {
        cards[id] = { id, name: id, cost: 0, role: '' };
      }
    }
  }
  return cards;
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#121417',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW.width,
    height: VIEW.height
  },
  scene: BattleScene
});
