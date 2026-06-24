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
  peach: { fill: 0xf184b5, stroke: 0xffdeee, short: '복' },
  seongjoo: { fill: 0x65c7f7, stroke: 0xd3f4ff, short: '성' },
  johyunwoo: { fill: 0x9aa0a6, stroke: 0xf0f2f5, short: '현' },
  kimgeunyoung: { fill: 0xe8c547, stroke: 0xfff2ad, short: '근' },
  kimrui: { fill: 0x8f5fbf, stroke: 0xe4d6ff, short: '루' },
  geunyoungTank: { fill: 0x5d6b73, stroke: 0xcbd3d8, short: '탱' }
};

const CHARACTER_DETAILS = [
  {
    id: 'zzangga',
    name: '짱가',
    cost: '5',
    type: '광역 딜러',
    ability: '크게 웃고 소리치며 전방 부채꼴 음파를 발사한다. 범위 안 적들에게 동시에 피해를 준다. 스킬 재사용 대기 중에는 단일 일반 공격을 사용한다.',
    appearance: '둥근 안경을 쓰고 포니테일을 한 키 큰 여학생. 교복을 입고 있다.',
    trait: '스킬 사용 시 입을 크게 벌리고 웃으며 비명을 지르고, 전방에 부채꼴 음파 파동이 퍼진다.'
  },
  {
    id: 'bbatman',
    name: '빼트맨',
    cost: '3',
    type: '힐러 / 지원가',
    ability: '필드에서 가장 가까운 여학생 캐릭터를 자동으로 따라가며 지속적으로 체력을 회복시킨다. 여학생 캐릭터가 없으면 멈춰 서서 회복을 하지 못한다.',
    appearance: '키가 작고 마른 남학생. 삭발 머리, 매우 탄 피부, 운동을 잘할 것 같은 체형이다.',
    trait: '공격하지 못하는 순수 힐러다. 여학생 캐릭터를 따라잡기 위해 이동속도가 빠르다.'
  },
  {
    id: 'baduk',
    name: '박바둑',
    cost: '8',
    type: '카오스 / 리스크 딜러',
    ability: '갑자기 예측하기 어려운 행동을 하며 범위 안 적들에게 매우 큰 피해를 준다. 같은 범위의 아군도 약한 피해를 받는다. 스킬 발동 시점은 무작위다.',
    appearance: '삭발에 안경을 쓴 통통한 남학생. 교복을 입고 있다.',
    trait: '체력이 매우 높고 위험 부담이 크다. 갑자기 눕기, 혼자 돌기, 하늘 보고 소리치기 같은 행동을 한다.'
  },
  {
    id: 'kkongho',
    name: '꽁호',
    cost: '10',
    type: '필드 리셋',
    ability: '소환되면 화면이 멈추고 전장 중앙에서 기도한다. 하늘에서 거대한 빛이 떨어져 모든 유닛이 승천해 사라진다. 꽁호 자신도 함께 사라진다.',
    appearance: '안경을 쓴 평범한 남학생. 전형적인 기독교 학생 느낌이다.',
    trait: '한 경기에서 한 번만 사용할 수 있다. 타워에는 피해를 주지 않고 유닛만 제거한다.'
  },
  {
    id: 'yushin',
    name: '유신',
    cost: '4',
    type: '군단 근접 딜러',
    ability: '소환 즉시 똑같이 생긴 유신 8명이 동시에 뛰쳐나온다. 각자 근접 거리에서 빠른 주먹 공격을 한다.',
    appearance: '키가 작고 애기 같은 얼굴의 남학생. 교복을 입고 주먹을 들고 있다.',
    trait: '개별 능력치는 약하지만 8명이 합쳐지면 높은 압박을 만든다. 이동속도가 빠른 돌진형 카드다.'
  },
  {
    id: 'jimin',
    name: '지민',
    cost: '4',
    type: '단일 폭딜',
    ability: '공격 전 손가락으로 가리키며 드립을 치는 동작을 한다. 그 후 한 대상에게 게임 내 최고 수준의 단일 피해를 준다.',
    appearance: '키가 크고 비율이 좋은 남학생. 교복을 입고 있다.',
    trait: '드립 동작 중에는 완전히 무방비라 피격되면 공격이 취소될 수 있다. 공격속도는 매우 느리지만 한 방 피해가 크다.'
  },
  {
    id: 'mythos',
    name: '미토스건휘',
    cost: '5',
    type: '변신형 딜러',
    ability: '체력이 절반 이하가 되면 자동으로 초싸이언처럼 각성한다. 각성 중에는 잠시 무적이고, 이후 공격력, 공격속도, 이동속도가 크게 오른다.',
    appearance: '평소에는 살짝 네모난 얼굴과 안경, 내려앉은 머리의 평범한 남학생이다. 변신 후에는 머리가 솟고 안경이 날아간다.',
    trait: '변신은 한 번 발동하면 유지된다. 빼트맨에게 회복을 받으면 체력 절반 도달이 늦어진다.'
  },
  {
    id: 'peach',
    name: '복숭아',
    cost: '3',
    type: '근접 딜러',
    ability: '테니스 라켓을 빠르게 휘둘러 근접 단일 대상을 연속 공격한다. 한 번 피해는 낮지만 공격속도가 매우 빠르다.',
    appearance: '예쁜 여학생. 보통 키와 체형이며 교복을 입고 테니스 라켓을 들고 있다.',
    trait: '여학생 캐릭터라 빼트맨의 회복 대상이 된다. 공격 시 테니스공 느낌의 타격 효과가 나타난다.'
  },
  {
    id: 'seongjoo',
    name: '성주',
    cost: '3',
    type: '원거리 딜러',
    ability: '뒤쪽에서 키보드를 빠르게 두드리며 원거리 공격을 한다. 공격속도가 빠르고 피해도 준수하지만 체력이 매우 낮다.',
    appearance: '마른 남학생. 헝클어진 머리가 얼굴 전체를 가리고, 머리카락 아래 안경과 마스크를 쓰고 있다.',
    trait: '매우 빨리 쓰러지는 후방 딜러다. 먼저 제거하지 않으면 빠른 타자로 계속 피해를 준다.'
  },
  {
    id: 'johyunwoo',
    name: '조현우',
    cost: '6',
    type: '근접 단일 딜러',
    ability: '근접 거리에서 한 대상에게 매우 강력한 단일 공격을 한다. 단순하지만 위협적인 딜러다.',
    appearance: '특별히 튀는 점이 없는 아주 평범한 남학생이다.',
    trait: '체력은 보통이지만 공격력이 매우 높다. 별다른 기믹 없이 정직하게 강한 카드다.'
  },
  {
    id: 'kimgeunyoung',
    name: '김.근.영',
    cost: '10',
    type: '탱커 소환 + 근접 딜러',
    ability: '이동하는 동안 1초마다 탱커 하수인을 하나씩 소환한다. 근접 거리에서는 강력한 킥복싱 단일 공격을 한다.',
    appearance: '잘생긴 남학생이다.',
    trait: '한 경기에서 한 번만 사용할 수 있다. 매우 높은 능력치와 탱커 하수인 압박으로 꽁호와 함께 최고 위협 카드다.'
  },
  {
    id: 'kimrui',
    name: '김루이',
    cost: '3',
    type: '흡혈 / 부착 딜러',
    ability: '적 캐릭터 하나에게 달라붙어 지속적으로 체력을 흡수한다. 붙어 있는 동안 자신의 체력을 천천히 회복한다.',
    appearance: '눈 아래까지 내려온 헝클어진 머리의 남학생. 불안정하고 초조해 보인다.',
    trait: '붙은 대상은 루이를 공격하지 못하고 묶인다. 떼어내려면 대상의 아군 유닛이 루이를 직접 공격해야 한다.'
  }
];

const TOWER_THEME = {
  0: { fill: 0x2f75d6, stroke: 0xcbe1ff },
  1: { fill: 0xd94f45, stroke: 0xffd5d1 }
};

let phaserGame = null;

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
      if (card.oneUse && (player.usedOneTimeCards || []).includes(card.id)) return;
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

      const label = tower.type === 'king' ? '왕' : '공주';
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
      if (unit.attached || unit.suppressed) {
        this.g.lineStyle(3, 0xe4d6ff, 0.9);
        this.g.strokeCircle(unit.x, unit.y, radius + 11);
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
    } else if (unit.cardId === 'seongjoo') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 7, y - 9, 14, 24, 5);
      this.g.strokeRoundedRect(x - 7, y - 9, 14, 24, 5);
      this.g.fillStyle(0x1a1717, 1);
      this.g.fillEllipse(x, y - 22, 23, 18);
      this.g.fillEllipse(x, y - 29, 28, 15);
      this.g.lineStyle(1, white, 0.8);
      this.g.strokeCircle(x - 4, y - 22, 3);
      this.g.strokeCircle(x + 4, y - 22, 3);
      this.g.fillStyle(0xd3f4ff, 1);
      this.g.fillRoundedRect(x - 16, y + 3, 32, 10, 3);
      this.g.lineStyle(1, dark, 0.8);
      this.g.lineBetween(x - 10, y + 7, x + 10, y + 7);
    } else if (unit.cardId === 'johyunwoo') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 9, y - 12, 18, 31, 5);
      this.g.strokeRoundedRect(x - 9, y - 12, 18, 31, 5);
      this.g.fillStyle(skin, 1);
      this.g.fillEllipse(x, y - 24, 20, 16);
      this.g.strokeEllipse(x, y - 24, 20, 16);
      this.g.lineStyle(4, white, 0.85);
      this.g.lineBetween(x + dir * 8, y - 4, x + dir * 24, y - 14);
    } else if (unit.cardId === 'kimgeunyoung') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 13, y - 16, 26, 38, 6);
      this.g.strokeRoundedRect(x - 13, y - 16, 26, 38, 6);
      this.g.fillStyle(skin, 1);
      this.g.fillEllipse(x, y - 31, 24, 18);
      this.g.strokeEllipse(x, y - 31, 24, 18);
      this.g.fillStyle(0x2c2218, 1);
      this.g.fillEllipse(x, y - 36, 24, 8);
      this.g.lineStyle(4, 0xfff2ad, 0.95);
      this.g.lineBetween(x - dir * 7, y + 12, x + dir * 25, y + 2);
    } else if (unit.cardId === 'kimrui') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 8, y - 10, 16, 26, 5);
      this.g.strokeRoundedRect(x - 8, y - 10, 16, 26, 5);
      this.g.fillStyle(0x18151d, 1);
      this.g.fillEllipse(x, y - 23, 24, 20);
      this.g.fillEllipse(x, y - 29, 25, 14);
      this.g.lineStyle(3, 0xe4d6ff, unit.attached ? 1 : 0.45);
      this.g.strokeCircle(x, y - 2, 18);
    } else if (unit.cardId === 'geunyoungTank') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 11, y - 11, 22, 28, 5);
      this.g.strokeRoundedRect(x - 11, y - 11, 22, 28, 5);
      this.g.fillStyle(0xaeb7bd, 1);
      this.g.fillRoundedRect(x - 9, y - 23, 18, 12, 4);
      this.g.strokeRoundedRect(x - 9, y - 23, 18, 12, 4);
      this.g.lineStyle(3, 0xcbd3d8, 0.85);
      this.g.lineBetween(x - 16, y + 3, x + 16, y + 3);
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
      } else if (effect.type === 'summon-minion') {
        this.g.lineStyle(3, 0xcbd3d8, alpha);
        this.g.strokeCircle(effect.x, effect.y, 12 + t * 30);
        this.drawCenteredText('호위', effect.x, effect.y - 26, 13, '#cbd3d8');
      } else if (effect.type === 'leech') {
        this.drawAttackTrail(effect, 0xe4d6ff, alpha, t, 3);
        this.g.lineStyle(4, 0xe4d6ff, alpha);
        this.g.strokeCircle(effect.x, effect.y, 14 + t * 34);
        this.drawCenteredText('부착', effect.x, effect.y - 30, 13, '#e4d6ff');
      } else if (effect.type === 'leech-detach') {
        this.g.lineStyle(3, 0xe4d6ff, alpha);
        this.g.strokeCircle(effect.x, effect.y, 24 + t * 34);
        this.drawCenteredText('이탈', effect.x, effect.y - 30, 13, '#e4d6ff');
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
    } else if (effect.cardId === 'seongjoo') {
      this.g.fillStyle(0xd3f4ff, alpha);
      this.g.fillRoundedRect(effect.x - 18, effect.y - 9, 36, 18, 4);
      this.g.fillStyle(0x111318, alpha);
      this.g.fillRect(effect.x - 12, effect.y - 4, 5, 3);
      this.g.fillRect(effect.x - 3, effect.y - 4, 5, 3);
      this.g.fillRect(effect.x + 6, effect.y - 4, 5, 3);
    } else if (effect.cardId === 'johyunwoo') {
      this.g.lineStyle(5, 0xf0f2f5, alpha);
      this.g.lineBetween(effect.x - 22, effect.y + 18, effect.x + 22, effect.y - 18);
      this.g.fillStyle(0xffffff, alpha);
      this.g.fillCircle(effect.x, effect.y, 9 + t * 16);
    } else if (effect.cardId === 'kimgeunyoung') {
      this.g.lineStyle(5, 0xfff2ad, alpha);
      this.g.lineBetween(effect.x - 28, effect.y + 22, effect.x + 30, effect.y - 18);
      this.g.lineStyle(3, 0xffffff, alpha);
      this.g.strokeCircle(effect.x, effect.y, 18 + t * 24);
    } else if (effect.cardId === 'kimrui') {
      this.g.lineStyle(4, 0xe4d6ff, alpha);
      this.g.strokeCircle(effect.x, effect.y, 12 + t * 30);
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
    const doubleElixir = (this.state.elixirMultiplier || 1) > 1;

    this.g.fillStyle(0x111318, 0.82);
    this.g.fillRoundedRect(16, 12, 260, 58, 8);
    this.g.fillRoundedRect(624, 12, 260, 58, 8);
    this.g.fillRoundedRect(360, 12, 180, doubleElixir ? 74 : 58, 8);

    this.drawText(`1번 체력 ${p0 ? p0.totalTowerHp : 0}`, 32, 24, 16, '#cbe1ff');
    this.drawText(`2번 체력 ${p1 ? p1.totalTowerHp : 0}`, 640, 24, 16, '#ffd5d1');
    this.drawCenteredText(this.state.suddenDeath ? '서든' : time, 450, doubleElixir ? 20 : 27, 22, '#f7f2e8');
    if (doubleElixir) {
      this.g.fillStyle(0xb86dff, 1);
      this.g.fillRoundedRect(424, 48, 52, 20, 6);
      this.drawCenteredText('X2', 450, 48, 15, '#ffffff');
      this.drawCenteredText(this.state.message || '', 450, 70, 10, '#d6d0c6');
    } else {
      this.drawCenteredText(this.state.message || '', 450, 54, 12, '#d6d0c6');
    }

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
      const usedOneTime = card && card.oneUse && player && (player.usedOneTimeCards || []).includes(card.id);
      const disabled = !player || !card || this.state.status !== 'playing' || player.elixir < card.cost || usedOneTime;
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
    if (cardId === 'kimgeunyoung') return 24;
    if (cardId === 'baduk') return 23;
    if (cardId === 'bbatman') return 15;
    if (cardId === 'seongjoo') return 15;
    if (cardId === 'kimrui') return 16;
    if (cardId === 'geunyoungTank') return 16;
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
    if (type === 'summon-minion') return 700;
    if (type === 'leech') return 760;
    if (type === 'leech-detach') return 620;
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

function setupShell() {
  const homeScreen = document.getElementById('home-screen');
  const encyclopediaScreen = document.getElementById('encyclopedia-screen');
  const gameFrame = document.getElementById('game-frame');
  const startButton = document.getElementById('start-game');
  const encyclopediaButton = document.getElementById('open-encyclopedia');
  const backButton = document.getElementById('back-home');

  renderCharacterGrid();

  startButton.addEventListener('click', () => {
    homeScreen.classList.add('hidden');
    encyclopediaScreen.classList.add('hidden');
    gameFrame.classList.remove('hidden');
    startGame();
  });

  encyclopediaButton.addEventListener('click', () => {
    homeScreen.classList.add('hidden');
    gameFrame.classList.add('hidden');
    encyclopediaScreen.classList.remove('hidden');
  });

  backButton.addEventListener('click', () => {
    encyclopediaScreen.classList.add('hidden');
    gameFrame.classList.add('hidden');
    homeScreen.classList.remove('hidden');
  });
}

function startGame() {
  if (phaserGame) return;

  phaserGame = new Phaser.Game({
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
}

function renderCharacterGrid() {
  const grid = document.getElementById('character-grid');
  if (!grid) return;

  grid.replaceChildren();

  for (const character of CHARACTER_DETAILS) {
    const theme = CARD_THEME[character.id] || { fill: 0xcaa862 };
    const article = document.createElement('article');
    article.className = `character-card character-card-${character.id}`;
    article.dataset.theme = theme.short;

    const heading = document.createElement('h2');
    heading.textContent = character.name;
    article.appendChild(heading);

    const details = document.createElement('dl');
    addDetail(details, '엘릭서 비용', character.cost);
    addDetail(details, '타입', character.type);
    addDetail(details, '능력', character.ability);
    addDetail(details, '외형', character.appearance);
    addDetail(details, '특징', character.trait);
    article.appendChild(details);

    grid.appendChild(article);
  }
}

function addDetail(parent, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  parent.append(term, description);
}

setupShell();
