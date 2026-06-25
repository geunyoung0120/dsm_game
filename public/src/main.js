const ARENA_W = 900;
const SIDEBAR_W = 220;
const FIELD_CENTER_X = ARENA_W / 2;
const VIEW = { width: ARENA_W + SIDEBAR_W, height: 760 };
const ARENA_H = 620;
const CARD_H = 108;
const DECK_SIZE = 8;
const DEPLOY_X_MIN = 48;
const DEPLOY_X_MAX = ARENA_W - 48;
const TOP_DEPLOY_Y_MIN = 42;
const TOP_DEPLOY_Y_MAX = 282;
const BOTTOM_DEPLOY_Y_MIN = 338;
const BOTTOM_DEPLOY_Y_MAX = ARENA_H - 42;
const BEST_FRIEND_PAIR = ['baduk', 'johyunwoo'];
const BEST_FRIEND_COMBO_COST = 8;
const THEME_STORAGE_KEY = 'dsm-game-theme';
const BBATMAN_HEAL_RANGE = 81;

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const PATCH_NOTICES = [
  {
    title: '바둑이 방구와 다과실 소환 조정',
    date: '2026.06.25',
    items: [
      '바둑이 방구 피해량 초당 60으로 감소',
      '바둑이 방구 4초 총 피해량 240으로 감소',
      '다과실 너드남·너드녀 반복 소환 주기 3초로 감소'
    ],
    details: [
      '바둑이 방구는 초당 피해량을 80에서 60으로 낮춰 4초 전체 피해량이 320에서 240으로 줄었다.',
      '다과실은 설치 직후 첫 너드남과 너드녀를 즉시 소환하는 규칙은 유지한다.',
      '첫 소환 이후 반복 소환 주기는 4초에서 3초로 줄여, 약해진 너드남과 너드녀가 더 자주 나오게 했다.'
    ]
  },
  {
    title: '다과실과 벚꽃나무 밸런스 조정',
    date: '2026.06.25',
    items: [
      '다과실 너드남 HP와 공격력 하향',
      '다과실 너드녀 HP와 공격력 하향',
      '다과실 설치 직후 첫 너드남·너드녀 즉시 소환',
      '진해 벚꽃나무 사거리를 성주보다 짧게 감소'
    ],
    details: [
      '너드남은 HP 200에서 180으로, 공격력 40에서 32로 낮췄다.',
      '너드녀는 HP 160에서 140으로, 공격력 40에서 32로 낮췄다.',
      '다과실은 건물이 실제로 설치되는 순간 너드남과 너드녀를 한 번 바로 소환하고, 이후에는 기존처럼 4초마다 추가 소환한다.',
      '진해 벚꽃나무 사거리는 260에서 175로 낮춰 성주 사거리 185보다 조금 짧게 조정했다.'
    ]
  },
  {
    title: '꽁 착탄 멈춤 긴급 수정',
    date: '2026.06.25',
    items: [
      '꽁 착탄 폭발 순간 화면이 멈출 수 있던 클라이언트 오류 수정',
      '이펙트 지속 시간 계산을 안전하게 공통 변수로 정리',
      '같은 오류를 막는 클라이언트 검사 추가'
    ],
    details: [
      '꽁 농구공이 착탄하는 프레임에 폭발 이펙트가 시작되면서 선언되지 않은 duration 값을 참조할 수 있었다.',
      '이펙트마다 지속 시간을 먼저 계산한 뒤 그 값을 이동, 폭발, 제거 판정에 함께 쓰도록 정리했다.',
      '앞으로 drawEffects 안에서 duration 없이 폭발 계산을 추가하면 검사에서 잡히도록 했다.'
    ]
  },
  {
    title: '꽁 착탄 판정과 밸런스·이름 조정',
    date: '2026.06.25',
    items: [
      '꽁은 농구공이 땅에 꽂힌 순간에만 피해 적용',
      '대.근.영 HP와 공격력 하향',
      '광주 탱크 HP와 공격력 10% 하향',
      '다과실 너드녀 HP 20% 하향',
      '거대 건물 파괴자 표시 이름을 자이언트 ZICK로 변경'
    ],
    details: [
      '꽁은 사용 즉시 피해가 들어가던 방식에서, 농구공이 운석처럼 날아와 착탄한 뒤 범위 피해가 들어가도록 바꿨다.',
      '꽁 이펙트도 착탄 전에는 농구공 비행만 보이고, 착탄 시점부터 폭발이 보이도록 조정했다.',
      '대.근.영 본체 HP는 2500에서 2300으로, 공격력은 89에서 80으로 낮췄다.',
      '대.근.영이 소환하는 광주 탱크는 HP 211에서 190으로, 공격력 19에서 17로 낮췄다.',
      '다과실에서 나오는 너드녀 HP는 200에서 160으로 낮췄다.',
      '건물만 공격하는 거대 유닛의 표시 이름을 자이언트 ZICK로 바꿨다.'
    ]
  },
  {
    title: '야클 로고 홈 버튼 적용',
    date: '2026.06.25',
    items: [
      '상단 야클 로고를 누르면 메인페이지로 이동',
      '로그인 전에는 로고 클릭 시 로그인 화면 유지',
      '로고 버튼 접근성 문구 추가'
    ],
    details: [
      '상단 고정 야클 로고를 단순 표시 영역에서 버튼으로 바꿔, 다른 화면에 있을 때 바로 메인페이지로 돌아갈 수 있게 했다.',
      '로그인하지 않은 상태에서는 이동할 홈 화면이 없으므로 로그인 화면으로 돌아가도록 처리했다.',
      '스크린리더에서도 버튼의 목적을 알 수 있게 aria-label을 메인페이지 이동으로 지정했다.'
    ]
  },
  {
    title: '진해 벚꽃나무 수정과 자이언트 ZICK 추가',
    date: '2026.06.25',
    items: [
      '벚꽃나무 공격 이펙트가 화면을 멈추게 하던 그래픽 호출 수정',
      '신규 건물 파괴자 카드 자이언트 ZICK 추가',
      '자이언트 ZICK는 적 캐릭터를 절대 공격하지 않고 건물만 공격',
      '카드 풀 20장 기준으로 랜덤 덱과 테스트 갱신',
      '벚꽃나무가 실제로 적을 공격하는 스모크 테스트 추가',
      '클라이언트 검사에 잘못된 타원 smoothness 인자 방지 추가'
    ],
    details: [
      '진해 벚꽃나무의 벚꽃잎 투사체를 그릴 때 Phaser의 fillEllipse 5번째 인자를 회전값처럼 넘기던 문제가 있었다. 이 인자는 실제로 점 개수 smoothness라서 잘못된 값이 들어가면 그래픽 루프가 불안정해질 수 있다.',
      '벚꽃잎 이펙트는 안전한 smoothness 값으로만 그리도록 바꿔 전투 화면이 멈추지 않게 했다.',
      '자이언트 ZICK는 6 엘릭서 캐릭터 카드다. HP 1800, 공격력 120, 공격 주기 1.2초의 거대한 근접 딜러로, 다과실과 진해 벚꽃나무 같은 건물 카드와 적 타워만 부순다.',
      '적 캐릭터가 바로 옆에 있어도 절대 공격하지 않고 지나가며, 공격 가능한 건물이나 타워가 없으면 유닛을 때리는 대신 새 건물 목표를 기다린다.',
      '스모크 테스트에서 벚꽃나무를 직접 설치하고 적 유닛을 가까이 배치해 cherry-shot 이펙트가 정상 발생하는지 검증하도록 추가했다.'
    ]
  },
  {
    title: '타워 파괴 후 배치 구역 확장',
    date: '2026.06.25',
    items: [
      '건물 카드는 이제 캐릭터처럼 기본적으로 내 전장에만 배치',
      '상대 공주타워를 부순 라인은 상대 진영에도 배치 가능',
      '배치 가능 영역 미리보기가 타워 파괴 상태에 따라 확장'
    ],
    details: [
      '다과실과 진해 벚꽃나무는 더 이상 마법 카드처럼 전체 전장에 설치되지 않고, 캐릭터 카드와 같은 배치 규칙을 따른다.',
      '아래 진영이 위쪽 왼쪽 공주타워를 부수면 위쪽 왼쪽 라인에, 위쪽 오른쪽 공주타워를 부수면 위쪽 오른쪽 라인에 캐릭터와 건물을 배치할 수 있다. 위 진영도 아래쪽 공주타워 파괴 상태에 따라 같은 방식으로 열린다.',
      '바둑이 방구와 꽁 같은 마법 카드는 기존처럼 전장 위치를 자유롭게 지정할 수 있다.',
      '전투 화면의 배치 미리보기와 서버의 실제 카드 사용 검증을 같은 규칙으로 맞춰, 클라이언트에서 보이는 영역과 실제 사용 가능 영역이 어긋나지 않게 했다.'
    ]
  },
  {
    title: '신규 건물 카드와 꽁 추가',
    date: '2026.06.25',
    items: [
      '빼트맨 힐 간격 0.6초로 증가',
      '신규 건물 카드 다과실, 진해 벚꽃나무 추가',
      '신규 마법 카드 꽁 추가로 카드 풀 19장 확장'
    ],
    details: [
      '빼트맨 회복은 0.4초마다 들어가던 방식에서 0.6초마다 한 번씩 들어가도록 늦춰, 범위 힐 유지력이 조금 더 약해졌다.',
      '다과실은 5 엘릭서 건물 카드다. 전장 위치를 지정해 배치하면 HP 1500 건물이 24초 동안 서서히 체력을 잃고, 4초마다 너드남 1명과 너드녀 1명을 동시에 소환한다.',
      '너드남은 HP 200, 공격력 40의 빠른 근접 소환수이고, 너드녀는 HP 200, 공격력 40의 빠른 원거리 소환수로 간식과 음료를 던진다.',
      '꽁은 5 엘릭서 마법 카드다. 지정 위치에 농구공이 운석처럼 떨어져 반지름 40 안의 적 유닛과 적 타워에 500 피해를 준다.',
      '진해 벚꽃나무는 5 엘릭서 건물 카드다. HP 2000이며 24초 동안 서서히 체력을 잃고, 1초마다 가장 가까운 적 유닛에게 벚꽃잎을 날려 100 피해를 준다.',
      '건물 카드는 마법 카드처럼 전장 위치를 클릭해 배치하고, 적에게 타겟팅되어 파괴될 수 있으며 움직이지 않는다. 손패, 덱 화면, 캐릭터 확인 페이지에 건물/마법 타입 표시를 추가했다.'
    ]
  },
  {
    title: '대.근.영과 허선 밸런스 조정',
    date: '2026.06.25',
    items: [
      '대.근.영 HP 2500으로 증가',
      '허선 폭발 상태 공격력 70으로 감소',
      '캐릭터 확인 페이지 최신 스탯 반영'
    ],
    details: [
      '대.근.영 본체 HP를 2376에서 2500으로 올려 왕의 귀환 이후 조금 더 오래 버티게 했다.',
      '허선 폭발 상태 공격력을 81에서 70으로 낮춰 폭발 후 근접 광역 압박력을 줄였다.',
      '서버 카드 수치, 캐릭터 확인 페이지, 자동 스모크 테스트 기대값을 모두 새 밸런스에 맞췄다.'
    ]
  },
  {
    title: '전투 채팅과 대.근.영 왕의 귀환',
    date: '2026.06.25',
    items: [
      '전투 중 전체 채팅 추가, 2대2 팀 채팅 추가',
      '대.근.영 등장 시 왕의 귀환 임팩트와 전투 시간 +30초',
      '대.근.영 공격력 10% 감소, 광주 탱크 공격력 40% 감소'
    ],
    details: [
      '전투 화면 아래 채팅창에서 상대와 대화할 수 있다. 2대2에서는 전체 채팅과 같은 팀에게만 보이는 팀 채팅을 선택할 수 있다.',
      '대.근.영이 실제로 전장에 등장하면 왕의 귀환 임팩트가 깔리고 전투 시간이 30초 추가된다.',
      '대.근.영이 X2 또는 X3 엘릭서 구간에 등장해 시간이 60초 또는 20초 밖으로 밀려나도, 추가된 30초 동안 당시 배율이 유지된다.',
      '대.근.영 본체 공격력은 99에서 89로 낮췄고, 광주 탱크 공격력은 32에서 19로 낮췄다.',
      '양쪽 킹타워가 같은 판정 틱에 동시에 파괴되면 특정 진영 승리가 아니라 무승부로 처리된다.'
    ]
  },
  {
    title: '타워 집중과 힐 밸런스 조정',
    date: '2026.06.25',
    items: [
      '타워 집중은 타워를 실제로 때린 뒤부터 적용',
      '바둑이 방구 범위 50% 감소, 피해량 초당 80으로 조정',
      '빼트맨 힐이 0.4초마다 한 번씩 적용되도록 변경'
    ],
    details: [
      '유닛은 타워를 단순히 타겟팅한 순간에는 아직 고정되지 않고, 타워에 실제 피해를 한 번 넣은 뒤부터 같은 타워를 계속 때린다.',
      '바둑이 방구 반지름은 118에서 59로 줄었고, 피해량은 초당 100에서 초당 80으로 낮아졌다. 4초 동안 총 320 피해를 줄 수 있다.',
      '빼트맨은 회복 범위 안 아군을 계속 보지만, 실제 회복은 0.4초 간격으로 묶어서 들어가도록 바뀌었다.'
    ]
  },
  {
    title: '바둑이 방구와 태건 범퍼카 조정',
    date: '2026.06.25',
    items: [
      '바둑이 방구 장판이 점점 커지지 않고 고정 크기로 생성',
      '바둑이 방구 피해량을 초당 100으로 증가',
      '태건 범퍼카 HP 120, 폭발 피해 200으로 변경'
    ],
    details: [
      '바둑이 방구는 사용한 위치 주변에 바로 정해진 크기의 가스 장판을 만들고, 전투 중 장판 반지름이 점점 커지지 않는다.',
      '가스 장판 안에 있는 적 유닛과 적 타워는 4초 동안 초당 100 피해를 받아 총 400 피해를 받을 수 있다.',
      '태건 범퍼카는 HP가 150에서 120으로 낮아졌고, 충돌하거나 사망할 때 발생하는 폭발 피해가 50에서 200으로 올랐다.'
    ]
  },
  {
    title: '대폭 업데이트!! 관전 모드와 신규 카드',
    date: '2026.06.25',
    items: [
      '진행 중인 경기를 최대 2명까지 관전 가능',
      '타워를 때리기 시작한 유닛은 타워 파괴 또는 OSJ 밀치기 전까지 타워 집중',
      '신규 마법 카드 바둑이 방구와 1코 자폭 돌진 태건 범퍼카 추가'
    ],
    details: [
      '방 선택 화면에서 관전하기를 누르면 현재 전투 중인 방 목록을 볼 수 있고, 관전자 수가 2명 미만인 경기만 입장할 수 있다.',
      '관전자 화면에서는 양쪽 손패, 엘릭서, 타워 HP, 관전자 수를 실시간으로 볼 수 있지만 카드는 낼 수 없다.',
      '유닛이 타워를 타겟팅하면 targetLock이 걸려 주변에 적 유닛이 와도 같은 타워를 계속 공격한다. 타워가 부서지거나 OSJ 밀치기에 맞아 위치가 밀리면 타겟을 다시 찾는다.',
      '빼트맨 힐 범위는 90에서 81로 10% 줄였다.',
      '바둑이 방구는 3 엘릭서 마법 카드로, 선택한 위치에 4초 동안 초당 20 피해를 주는 초록/노란 가스 장판을 만든다. 적 유닛과 적 타워 모두 피해를 받는다.',
      '태건 범퍼카는 1 엘릭서 자폭 돌진 유닛으로, HP 150과 폭발 피해 50을 가진다. 적에게 닿거나 사망하면 주변 적에게 폭발 피해를 준다.',
      '허선은 현재 수치에서 전체적으로 10% 추가 하향했고, 성주는 공격 주기를 572ms에서 686ms로 늘려 공속을 20% 늦췄다.'
    ]
  },
  {
    title: '마지막 20초와 키보드 카드 선택',
    date: '2026.06.25',
    items: [
      '경기 종료 20초 전부터 엘릭서 충전 속도 3배 적용',
      '전장에서 1~4 키로 손패 카드 선택 가능',
      '카드마다 숫자 배지를 표시해 키보드 선택 위치 확인'
    ],
    details: [
      '정규 시간 기준 마지막 60초부터는 기존처럼 X2가 적용되고, 마지막 20초부터는 X3가 우선 적용된다.',
      '서든 데스에서도 남은 시간이 20초 이하로 줄어들면 X3 충전으로 전환된다.',
      '오른쪽 경기 시간 표시 옆 배지가 현재 엘릭서 배율을 그대로 보여준다.',
      '전장 하단 손패는 왼쪽부터 1, 2, 3, 4 키로 선택할 수 있고, 클릭 선택과 동일하게 엘릭서 부족 및 1회용 사용 완료 상태를 막는다.'
    ]
  },
  {
    title: '대.근.영 상향과 지민·성주 조정',
    date: '2026.06.25',
    items: [
      '대.근.영과 광주 탱크 HP·공격력 10% 증가',
      '지민 비용 1 감소, 공격력 추가 10% 감소, HP 5% 감소',
      '성주 공격력 10% 감소'
    ],
    details: [
      '대.근.영 본체는 HP 2160에서 2376, 공격력 90에서 99로 올랐다.',
      '광주 탱크는 HP 192에서 211, 공격력 29에서 32로 올랐다.',
      '지민은 4 엘릭서에서 3 엘릭서가 되었고, HP는 650에서 618, 공격력은 110에서 89로 내려갔다. 성주 공격력은 66에서 59로 내려갔다.'
    ]
  },
  {
    title: '허선 10% 하향 밸런스 패치',
    date: '2026.06.25',
    items: [
      '허선 기본 HP, 사거리, 이동속도 10% 하향',
      '폭발 상태 HP, 공격력, 이동속도, 범위 10% 하향',
      '폭발 발동 조건을 HP 30% 이하에서 27% 이하로 조정'
    ],
    details: [
      '기본 HP는 500에서 450, 사거리는 20에서 18, 기본 이동속도는 45에서 41로 낮췄다.',
      '폭발 HP는 1000에서 900, 폭발 공격력은 100에서 90, 폭발 이동속도는 118에서 106, 폭발 범위는 58에서 52로 낮췄다.',
      '폭발 공격 주기는 0.25초에서 0.275초로 늘려 실제 공격 빈도도 10% 느려지게 했다.'
    ]
  },
  {
    title: '메인 로비 UI/UX 개편',
    date: '2026.06.24',
    items: [
      '메인 페이지를 전투 CTA 중심의 게임 로비형 화면으로 재구성',
      '프로필, 티어 진행도, 공지, 랭킹, 전장 정보를 한눈에 보이도록 재배치',
      '기존 색감은 유지하면서 아레나 비주얼과 카드 레일을 더 세련되게 개선'
    ],
    details: [
      '게임 시작, 덱짜기, 캐릭터 확인 버튼을 첫 화면의 가장 중요한 행동으로 올리고 버튼 크기와 배치를 정리했다.',
      '상단에는 전장 미니 비주얼을 넣어 야클의 카드 전투 느낌을 바로 전달하고, 프로필은 별도 상태 바처럼 분리했다.',
      '최신 공지와 TOP 3 랭킹은 메인 흐름을 가리지 않는 2열 정보 영역으로 정리했고, 모바일에서는 순서대로 자연스럽게 내려가게 했다.'
    ]
  },
  {
    title: '2대2 팀 선택과 조현우 분노',
    date: '2026.06.24',
    items: [
      '2대2 방에서 아래 진영 또는 위 진영을 직접 선택해 참가 가능',
      '이미 2명이 찬 팀은 참가 버튼 비활성화 및 서버 입장 차단',
      '조현우 HP 20% 이하에서 분노, 공격력 50% 증가와 명존쎄! 이펙트 추가'
    ],
    details: [
      '2대2 방을 만들 때 시작 팀을 고를 수 있고, 방 목록에서도 팀별 인원 현황을 보며 원하는 진영으로 들어갈 수 있다.',
      '팀별 정원은 2명이며 클라이언트 버튼 비활성화와 서버 검증을 모두 적용해 꽉 찬 팀으로는 들어갈 수 없다.',
      '조현우는 체력이 최대 HP의 20% 이하로 떨어지는 순간 한 번 분노 상태가 되며, 이후 기본 공격 피해가 88에서 132로 오른다.'
    ]
  },
  {
    title: '소환 임팩트와 절친 특성 개선',
    date: '2026.06.24',
    items: [
      '카드 소환 시 바로 등장하지 않고 짧은 소환 임팩트 후 등장',
      '캐릭터별 특성에 맞는 소환 준비 문구와 이펙트 추가',
      '박바둑·조현우 절친 특성의 스탯 감소 제거'
    ],
    details: [
      '일반 유닛은 카드 사용 후 약 0.5~0.95초의 배치 시간이 지나야 전장에 등장한다.',
      '유신은 군단 집결, 빼트맨은 회복 원 전개, 대.근.영은 탱크 호출처럼 카드별 소환 문구와 색상 이펙트가 표시된다.',
      '박바둑과 조현우가 절친 특성으로 함께 나올 때 더 이상 HP와 공격력이 낮아지지 않고 각 카드의 기본 스탯 그대로 등장한다.'
    ]
  },
  {
    title: '로그인 오류 긴급 수정',
    date: '2026.06.24',
    items: [
      '로그인 직후 clamp is not defined 오류 수정',
      '티어 진행 바 계산 안정성 보강'
    ],
    details: [
      '내 프로필의 다음 티어 진행 바를 계산하는 클라이언트 코드가 서버 전용 clamp 함수 이름을 잘못 참조하던 문제를 고쳤다.',
      '티어 시작값과 진행률을 브라우저에서 안전하게 숫자로 정규화하고 0~100% 범위 안에 고정했다.'
    ]
  },
  {
    title: '야클 로고와 성장 표시 개선',
    date: '2026.06.24',
    items: [
      '공지에 자세히 보기 버튼을 추가해 세부 변경 내용을 확인 가능',
      '내 프로필에 다음 티어까지의 진행 바 추가',
      '게임 이름을 야클로 정하고 상단 브랜드 로고 적용',
      '광주 탱크 HP와 공격력 20% 추가 하향'
    ],
    details: [
      '공지 카드는 기존처럼 요약을 먼저 보여주고, 자세히 보기를 누르면 밸런스 수치와 UI 변경 의도를 더 자세히 펼쳐 보여준다.',
      '내 프로필의 티어 카드에는 현재 티어 구간 안에서 다음 티어까지 얼마나 가까워졌는지 진행 바로 표시한다. 최고 티어에서는 바가 가득 찬 상태로 보인다.',
      '브라우저 제목, 로그인 첫 화면, 로비 이름, favicon, 화면 상단 브랜드 영역을 야클 기준으로 정리했다.',
      '광주 탱크는 이전 HP 240, 공격력 36에서 HP 192, 공격력 29로 낮아져 대.근.영의 지속 압박력이 줄었다.'
    ]
  },
  {
    title: '6월 24일 밸런스와 공지 개선',
    date: '2026.06.24',
    items: [
      '메인에는 최신 공지만 보이고 업데이트 목록에서 역대 공지를 날짜순으로 확인 가능',
      '꽁호 사용자는 해당 경기 최대 엘릭서가 12로 증가',
      '성주, 빼트맨, 대.근.영, 광주 탱크 밸런스 조정 및 2대2 타워 HP 1.5배 적용'
    ],
    details: [
      '메인 화면 공지 영역은 가장 최근 공지 하나만 표시하고, 업데이트 목록 보기 화면에서 모든 공지를 최신순으로 확인할 수 있게 했다.',
      '꽁호는 전장 유닛 제거 효과에 더해 사용자 최대 엘릭서를 해당 경기 동안 12로 올린다.',
      '성주 HP는 224, 빼트맨 힐량은 초당 47.25로 조정했고 빼트맨은 전장에 있는 동안 초당 8 체력을 잃는다.',
      '대.근.영 HP는 2160, 광주 탱크는 1.5초마다 HP 240 / 공격력 36으로 소환되며, 2대2 타워 HP는 1대1 대비 1.5배다.'
    ]
  },
  {
    title: '2대2 모드와 덱 화면 개편',
    date: '2026.06.24',
    items: [
      '방 만들기에서 1대1 또는 2대2 모드를 선택할 수 있게 변경',
      '덱짜기 화면을 위 8칸 배틀 덱, 아래 카드 풀 구조로 개편',
      '2대2에서는 같은 진영 플레이어가 타워와 승패를 공유'
    ],
    details: [
      '2대2 방은 4명이 모두 들어오면 자동 시작하며 0/2번 슬롯은 아래 진영, 1/3번 슬롯은 위 진영으로 배정된다.',
      '덱짜기 화면은 선택된 8장 슬롯을 위에 고정하고, 아래 카드 풀에서 눌러 채워 넣는 방식으로 정리했다.',
      'HUD, 종료 화면, 재경기 동의, 방 목록 표시를 1대1과 2대2 모두에서 자연스럽게 보이도록 조정했다.'
    ]
  },
  {
    title: '6월 24일 밸런스 패치',
    date: '2026.06.24',
    items: [
      '빼트맨 힐량 50% 감소, 주변 원 안 여학생 지속 회복으로 변경',
      '복숭아 공격 속도 40% 감소',
      'OSJ HP 20% 증가, 공격 쿨타임 2.5초로 조정'
    ],
    details: [
      '빼트맨은 단일 대상만 따라가며 회복하던 방식에서 주변 원 안의 회복 가능 아군을 모두 회복하는 방식으로 바뀌었다.',
      '복숭아 공격 주기는 430ms에서 717ms로 늘어나 2 엘릭서 근접 딜러 수준에 맞게 압박력이 낮아졌다.',
      'OSJ는 HP가 1200으로 증가한 대신 밀치기 공격 주기가 2.5초가 되어 진형 붕괴 빈도가 줄었다.'
    ]
  }
];

const CARD_THEME = {
  zzangga: { fill: 0xe4536d, stroke: 0xffd6df, short: '짱' },
  bbatman: { fill: 0x46b9a5, stroke: 0xc7fff4, short: '힐' },
  baduk: { fill: 0x8c6a54, stroke: 0xffd2a8, short: '박' },
  badukFart: { fill: 0xb7d94b, stroke: 0xf4ff91, short: '마법' },
  dagwasil: { fill: 0x9b6b47, stroke: 0xffd7a8, short: '과' },
  kkong: { fill: 0xd87a2c, stroke: 0xffd29a, short: '꽁' },
  cherryTree: { fill: 0xffb7d7, stroke: 0xffedf5, short: '벚' },
  giantHyeonjik: { fill: 0x6f5f86, stroke: 0xe3d7ff, short: 'Z' },
  kkongho: { fill: 0xf4df70, stroke: 0xfff8c9, short: '승' },
  yushin: { fill: 0x7f7fd5, stroke: 0xdad8ff, short: '군' },
  jimin: { fill: 0x4f8de8, stroke: 0xd5e9ff, short: '딜' },
  mythos: { fill: 0xf08a35, stroke: 0xffdfb8, short: '각' },
  peach: { fill: 0xf184b5, stroke: 0xffdeee, short: '복' },
  seongjoo: { fill: 0x65c7f7, stroke: 0xd3f4ff, short: '성' },
  johyunwoo: { fill: 0x9aa0a6, stroke: 0xf0f2f5, short: '현' },
  kimgeunyoung: { fill: 0xe8c547, stroke: 0xfff2ad, short: '대' },
  kimrui: { fill: 0x8f5fbf, stroke: 0xe4d6ff, short: '루' },
  heoseon: { fill: 0x323039, stroke: 0xff5b66, short: '허' },
  taegeonBumperCar: { fill: 0xff9b45, stroke: 0xffdf9f, short: '붕' },
  osj: { fill: 0x4a6f88, stroke: 0xd9eef8, short: 'OSJ' },
  geunyoungTank: { fill: 0x5d6b73, stroke: 0xcbd3d8, short: '탱' },
  nerdMale: { fill: 0x7b8170, stroke: 0xd3dac1, short: '남' },
  nerdFemale: { fill: 0x9a879a, stroke: 0xf0d7ef, short: '녀' }
};

const CHARACTER_DETAILS = [
  {
    id: 'zzangga',
    name: '짱가',
    cost: '5',
    type: '광역 딜러',
    stats: [
      ['HP', '760'],
      ['공격력', '98'],
      ['사거리', '126'],
      ['공격 주기', '1.5초'],
      ['이동속도', '46'],
      ['스킬 쿨', '4.2초']
    ],
    ability: '크게 웃고 소리치며 전방 부채꼴 음파를 발사한다. 범위 안 적들에게 동시에 피해를 준다. 스킬 재사용 대기 중에는 단일 일반 공격을 사용한다.',
    appearance: '둥근 안경을 쓰고 포니테일을 한 키 큰 여학생. 교복을 입고 있다.',
    trait: '스킬 사용 시 입을 크게 벌리고 웃으며 비명을 지르고, 전방에 부채꼴 음파 파동이 퍼진다.'
  },
  {
    id: 'bbatman',
    name: '빼트맨',
    cost: '2',
    type: '힐러 / 지원가',
    stats: [
      ['HP', '410'],
      ['공격력', '없음'],
      ['힐량', '초당 47.25'],
      ['힐 간격', '0.6초'],
      ['힐 범위', '81'],
      ['자가 피해', '초당 8'],
      ['이동속도', '76'],
      ['공격 주기', '없음']
    ],
    ability: '주변에 더 좁아진 회복 원을 만들고, 원 안에 있는 모든 여학생 또는 여학생으로 인식되는 아군을 0.6초마다 한 번씩 회복시킨다. 회복 대상이 원 밖에 있으면 가까운 대상 쪽으로 이동한다. 전장에 있는 동안에는 시간이 지날수록 체력이 조금씩 줄어든다.',
    appearance: '키가 작고 마른 남학생. 삭발 머리, 매우 탄 피부, 운동을 잘할 것 같은 체형이다.',
    trait: '공격하지 못하는 순수 힐러다. 힐량은 낮아졌고 회복이 0.6초 간격으로 들어가지만 여러 아군을 동시에 회복할 수 있다.'
  },
  {
    id: 'baduk',
    name: '박바둑',
    cost: '8',
    type: '카오스 / 리스크 딜러',
    stats: [
      ['HP', '1300'],
      ['공격력', '116'],
      ['사거리', '74'],
      ['공격 주기', '1.85초'],
      ['이동속도', '40'],
      ['카오스 피해', '적 140 / 아군 29'],
      ['절친 출격', '8 엘릭서 / 스탯 감소 없음']
    ],
    ability: '갑자기 예측하기 어려운 행동을 하며 범위 안 적들에게 매우 큰 피해를 준다. 같은 범위의 아군도 약한 피해를 받는다. 스킬 발동 시점은 무작위다. 조현우와 손패에 함께 있으면 8 엘릭서로 둘이 동시에 기본 스탯 그대로 출격하며 전장에 절친 특성 문구가 뜬다.',
    appearance: '삭발에 안경을 쓴 통통한 남학생. 교복을 입고 있다.',
    trait: 'HP가 1300으로 낮아졌지만 여전히 위험 부담이 큰 카오스 딜러다. 조현우와 절친 특성으로 나올 때도 스탯은 낮아지지 않는다.'
  },
  {
    id: 'badukFart',
    name: '바둑이 방구',
    cost: '3',
    type: '마법 / 범위 지속 피해',
    cardType: 'spell',
    stats: [
      ['카드 종류', '마법 카드'],
      ['피해량', '초당 60'],
      ['총 피해', '240'],
      ['지속 시간', '4초'],
      ['범위 형태', '원형 가스 장판 / 반지름 59'],
      ['소환 유닛', '없음']
    ],
    ability: '플레이어가 전장 위치 하나를 지정하면 그 지점 주변에 고정 크기의 초록/노란 가스 장판이 바로 생긴다. 4초 동안 장판 안에 있는 모든 적 유닛과 적 타워가 초당 60 피해를 받아 총 240 피해를 받을 수 있다. 유닛을 소환하지 않는 순수 마법 카드라 사용 즉시 효과가 발동한다.',
    appearance: '캐릭터가 직접 나오지 않고, 지정한 위치에 초록색과 노란색이 섞인 방구 가스 구름이 정해진 크기로 생긴다.',
    trait: '3 엘릭서로 좁은 지역을 강하게 압박할 수 있다. 적 유닛뿐 아니라 적 타워도 피해를 받지만, 범위가 줄어 정확한 위치 지정이 더 중요해졌다.'
  },
  {
    id: 'dagwasil',
    name: '다과실',
    cost: '5',
    type: '건물 / 소환 건물',
    cardType: 'building',
    stats: [
      ['카드 종류', '건물 카드'],
      ['건물 HP', '1500'],
      ['건물 크기', '공주 타워와 동일'],
      ['지속 시간', '24초 / 체력 서서히 감소'],
      ['첫 소환', '설치 직후 너드남 1명 + 너드녀 1명'],
      ['소환 주기', '이후 3초마다 너드남 1명 + 너드녀 1명'],
      ['너드남', 'HP 180 / 공격력 32 / 빠른 근접 공격'],
      ['너드녀', 'HP 140 / 공격력 32 / 빠른 원거리 공격']
    ],
    ability: '플레이어가 전장 위치 하나를 지정하면 그 위치에 다과실 건물이 배치된다. 건물은 움직이지 않고 적에게 타겟팅되어 파괴될 수 있다. 배치 후 24초 동안 체력이 조금씩 줄어들며, 설치 직후 너드남과 너드녀를 한 번 바로 소환하고 살아있는 동안 3초마다 다시 동시에 소환한다.',
    appearance: '공주 타워 정도 크기의 건물이며, 전면에 다과실 간판이 붙어 있다. 시간이 지나거나 공격을 받으면 HP 막대로 손상 상태를 확인할 수 있다. 소환되는 너드남과 너드녀는 후줄근하고 냄새나는 학생처럼 보인다.',
    trait: '5 엘릭서로 지속 병력을 만드는 건물 카드다. 너드남은 가까이 붙어서 빠르게 때리고, 너드녀는 뒤에서 간식과 음료를 던져 원거리 피해를 준다.'
  },
  {
    id: 'kkong',
    name: '꽁',
    cost: '5',
    type: '마법 / 순간 폭격',
    cardType: 'spell',
    stats: [
      ['카드 종류', '마법 카드'],
      ['피해량', '500'],
      ['충돌 반지름', '40'],
      ['효과 대상', '범위 안 적 유닛과 적 타워'],
      ['소환 유닛', '없음']
    ],
    ability: '플레이어가 전장 위치 하나를 지정하면 농구공이 운석처럼 위에서 떨어진다. 피해는 사용 즉시 들어가지 않고, 농구공이 지정 위치에 꽂힌 순간 충돌 지점 주변 반지름 40 안의 모든 적 유닛과 적 타워에 500 피해를 준다.',
    appearance: '하늘에서 농구공이 빠르게 떨어지고, 착지 지점에 큰 충돌 폭발이 생긴다.',
    trait: '좁은 범위에 큰 피해를 꽂는 5 엘릭서 마법 카드다. 바둑이 방구보다 범위가 작아서 정확도는 더 중요하지만, 한 번에 강한 피해를 넣을 수 있다.'
  },
  {
    id: 'cherryTree',
    name: '진해 벚꽃나무',
    cost: '5',
    type: '건물 / 벚꽃 원거리',
    cardType: 'building',
    stats: [
      ['카드 종류', '건물 카드'],
      ['건물 HP', '2000'],
      ['지속 시간', '24초 / 체력 서서히 감소'],
      ['공격력', '100'],
      ['공격 주기', '1초'],
      ['사거리', '175'],
      ['공격 대상', '가장 가까운 적 유닛']
    ],
    ability: '플레이어가 전장 위치 하나를 지정하면 벚꽃나무 건물이 배치된다. 건물은 움직이지 않고, 배치 후 24초 동안 체력이 조금씩 줄어든다. 살아있는 동안 1초마다 사거리 175 안의 가장 가까운 적 유닛에게 벚꽃잎을 날려 100 피해를 준다.',
    appearance: '분홍 벚꽃이 풍성한 나무가 전장에 서 있고, 공격할 때 아름다운 벚꽃잎이 적에게 날아간다.',
    trait: '24초 동안 유지되는 방어형 건물 카드다. HP가 높지만 시간이 지나면 스스로 무너지며, 적 유닛을 꾸준히 끊어내지만 직접 움직이지 않고 적에게 파괴될 수 있다.'
  },
  {
    id: 'giantHyeonjik',
    name: '자이언트 ZICK',
    cost: '6',
    type: '건물 특화 근접 딜러',
    stats: [
      ['HP', '1800'],
      ['공격력', '120'],
      ['공격 주기', '1.2초'],
      ['공격 타입', '단일 근접'],
      ['사거리', '근접'],
      ['이동속도', '36'],
      ['우선 대상', '건물 카드와 적 타워']
    ],
    ability: '소환되면 다과실, 진해 벚꽃나무 같은 적 건물 카드와 적 타워만 타겟팅한다. 적 캐릭터가 바로 옆에 있어도 절대 공격하지 않고 지나가며, 공격 가능한 건물이나 타워가 없으면 유닛을 때리는 대신 새 건물 목표를 기다린다.',
    appearance: '안경을 쓴 너드 느낌의 남학생이지만, 모든 캐릭터보다 훨씬 크다. 지금까지 가장 큰 대.근.영보다도 더 큰 덩치로 전장을 압박한다.',
    trait: '건물 카드의 하드 카운터다. HP가 매우 높아 건물에 도착하기 전 막기 어렵고, 적 유닛을 먼저 때리지 않기 때문에 상대 병력은 뒤쫓아가며 직접 잡아야 한다.'
  },
  {
    id: 'kkongho',
    name: '꽁호',
    cost: '10',
    type: '필드 리셋',
    stats: [
      ['HP', '없음'],
      ['공격력', '없음'],
      ['효과', '모든 유닛 제거'],
      ['사용 제한', '1회용'],
      ['타워 피해', '없음'],
      ['사용자 보너스', '최대 엘릭서 12']
    ],
    ability: '소환되면 화면이 멈추고 전장 중앙에서 기도한다. 하늘에서 거대한 빛이 떨어져 모든 유닛이 승천해 사라진다. 꽁호 자신도 함께 사라진다. 사용자는 그 경기 동안 최대 엘릭서가 12로 증가한다.',
    appearance: '안경을 쓴 평범한 남학생. 전형적인 기독교 학생 느낌이다.',
    trait: '한 경기에서 한 번만 사용할 수 있다. 타워에는 피해를 주지 않고 유닛만 제거한다.'
  },
  {
    id: 'yushin',
    name: '유신',
    cost: '4',
    type: '군단 근접 딜러',
    stats: [
      ['개별 HP', '50'],
      ['공격력', '19'],
      ['사거리', '30'],
      ['공격 주기', '0.56초'],
      ['이동속도', '78'],
      ['소환 수', '8명']
    ],
    ability: '소환 즉시 똑같이 생긴 유신 8명이 동시에 뛰쳐나온다. 각자 근접 거리에서 빠른 주먹 공격을 한다.',
    appearance: '키가 작고 애기 같은 얼굴의 남학생. 교복을 입고 주먹을 들고 있다.',
    trait: '개별 HP가 50으로 낮아져 광역 공격과 타워에 더 쉽게 정리된다. 이동속도가 빠른 돌진형 카드다.'
  },
  {
    id: 'jimin',
    name: '지민',
    cost: '3',
    type: '단일 폭딜',
    stats: [
      ['HP', '618'],
      ['공격력', '89'],
      ['사거리', '134'],
      ['공격 주기', '1.225초'],
      ['준비 시간', '0.18초'],
      ['이동속도', '44']
    ],
    ability: '공격 전 손가락으로 가리키며 드립을 치는 동작을 한다. 그 후 한 대상에게 단일 피해를 준다. 유신을 공격할 때는 머리 위에 인포 가위질! 문구가 뜨고 상대 유신 유닛 모두에게 피해를 준다.',
    appearance: '키가 크고 비율이 좋은 남학생. 교복을 입고 있다.',
    trait: '3 엘릭서 카드로 내려가 더 가볍게 쓸 수 있지만, HP와 공격력이 함께 낮아져 한 방 위력과 생존력은 줄었다.'
  },
  {
    id: 'mythos',
    name: '미토스건휘',
    cost: '5',
    type: '변신형 딜러',
    stats: [
      ['HP', '850'],
      ['공격력', '70'],
      ['각성 공격력', '120'],
      ['사거리', '36'],
      ['공격 주기', '1초 / 각성 0.65초'],
      ['이동속도', '44 / 각성 70']
    ],
    ability: '체력이 절반 이하가 되면 자동으로 초싸이언처럼 각성한다. 각성 중에는 잠시 무적이고, 이후 공격력, 공격속도, 이동속도가 크게 오른다.',
    appearance: '평소에는 살짝 네모난 얼굴과 안경, 내려앉은 머리의 평범한 남학생이다. 변신 후에는 머리가 솟고 안경이 날아간다.',
    trait: '기본 공격력이 70으로 올랐고 각성 공격력은 120이다. 변신은 한 번 발동하면 유지된다.'
  },
  {
    id: 'peach',
    name: '복숭아',
    cost: '2',
    type: '근접 딜러',
    stats: [
      ['HP', '585'],
      ['공격력', '36'],
      ['사거리', '42'],
      ['공격 주기', '0.717초'],
      ['이동속도', '57'],
      ['회복 대상', '가능']
    ],
    ability: '테니스 라켓을 휘둘러 근접 단일 대상을 연속 공격한다. 이전보다 공격 속도가 느려져 2 엘릭서 근접 딜러에 맞는 압박력을 가진다.',
    appearance: '예쁜 여학생. 보통 키와 체형이며 교복을 입고 테니스 라켓을 들고 있다.',
    trait: '2 엘릭서 근접 딜러다. 여학생 캐릭터라 빼트맨의 회복 대상이 된다.'
  },
  {
    id: 'seongjoo',
    name: '성주',
    cost: '3',
    type: '원거리 딜러',
    stats: [
      ['HP', '224'],
      ['공격력', '59'],
      ['사거리', '185'],
      ['공격 주기', '0.686초'],
      ['이동속도', '42'],
      ['회복 대상', '가능']
    ],
    ability: '뒤쪽에서 키보드를 두드리며 원거리 공격을 한다. 이번 패치로 공격 주기가 0.572초에서 0.686초로 20% 느려졌다.',
    appearance: '마른 남학생. 헝클어진 머리가 얼굴 전체를 가리고, 머리카락 아래 안경과 마스크를 쓰고 있다.',
    trait: '남자 캐릭터지만 모두가 여학생이라고 생각해서 빼트맨의 회복 대상이 된다. 체력이 낮고 공격력도 낮아졌지만, 방치하면 뒤에서 꾸준히 피해를 준다.'
  },
  {
    id: 'johyunwoo',
    name: '조현우',
    cost: '4',
    type: '근접 단일 딜러',
    stats: [
      ['HP', '656'],
      ['공격력', '88'],
      ['사거리', '42'],
      ['공격 주기', '1.05초'],
      ['이동속도', '54'],
      ['분노', 'HP 20% 이하 / 공격력 +50%'],
      ['절친 출격', '8 엘릭서 / 스탯 감소 없음']
    ],
    ability: '근접 거리에서 한 대상에게 단일 공격을 한다. HP와 공격력이 20% 낮아졌고 비용은 4 엘릭서다. HP가 20% 이하로 떨어지면 분노해서 명존쎄!를 외치고 공격력이 50% 강해진다. 박바둑과 손패에 함께 있으면 8 엘릭서로 둘이 동시에 기본 스탯 그대로 출격하며 전장에 절친 특성 문구가 뜬다.',
    appearance: '특별히 튀는 점이 없는 아주 평범한 남학생이다.',
    trait: '체력과 공격력이 더 낮아진 근접 단일 딜러다. 낮은 체력 구간에 들어가면 피해량이 88에서 132로 오른다. 박바둑과 절친 특성으로 나올 때도 스탯은 낮아지지 않는다.'
  },
  {
    id: 'kimgeunyoung',
    name: '대.근.영',
    cost: '10',
    type: '탱커 소환 + 근접 딜러',
    stats: [
      ['HP', '2300'],
      ['공격력', '80'],
      ['사거리', '43'],
      ['공격 주기', '1.155초'],
      ['이동속도', '41'],
      ['광주 탱크', '1.5초마다 HP 190 / 공격력 17'],
      ['출격 효과', '전투 시간 +30초']
    ],
    ability: '전장에 등장하는 순간 왕의 귀환 임팩트가 깔리며 전투 시간이 30초 추가된다. X2 또는 X3 엘릭서 구간에 등장했다면 추가된 30초 동안 그 배율이 유지된다. 전장에 있는 동안 항상 1.5초마다 HP 190, 공격력 17의 광주 탱크를 하나씩 소환한다. 본체는 HP 2300, 공격력 80의 근접 단일 공격을 한다.',
    appearance: '잘생긴 남학생이다.',
    trait: '한 경기에서 한 번만 사용할 수 있다. 본체와 광주 탱크가 다시 낮아졌지만, 전투 시간을 늘려 후반 변수를 만드는 카드다.'
  },
  {
    id: 'kimrui',
    name: '김루이',
    cost: '4',
    type: '흡혈 / 부착 딜러',
    stats: [
      ['HP', '430'],
      ['공격력', '흡혈 초당 70'],
      ['자가 회복', '초당 52'],
      ['부착 범위', '34'],
      ['이동속도', '68'],
      ['일반 공격', '없음']
    ],
    ability: '적 캐릭터 하나에게 달라붙어 낮아진 지속 피해로 체력을 흡수한다. 붙어 있는 동안 자신의 체력을 천천히 회복한다.',
    appearance: '눈 아래까지 내려온 헝클어진 머리의 남학생. 불안정하고 초조해 보인다.',
    trait: '붙은 대상도 이동과 공격을 계속할 수 있다. 흡혈 피해가 낮아져 제압력보다 방해 역할에 더 가까워졌다.'
  },
  {
    id: 'heoseon',
    name: '허선',
    cost: '9',
    type: '버서커 / 폭발형 딜러',
    stats: [
      ['기본 HP', '405'],
      ['폭발 HP', '810'],
      ['공격력', '평소 0 / 폭발 70'],
      ['사거리', '16'],
      ['공격 주기', '0.303초'],
      ['이동속도', '37 / 폭발 95'],
      ['변신 조건', 'HP 24.3% 이하'],
      ['폭발 범위', '47'],
      ['변신 회복', '즉시 최대 HP 100%']
    ],
    ability: '평소에는 공격력이 0이고 어떤 공격도 하지 않은 채 조용히 적 쪽으로 걸어간다. HP가 24.3% 이하로 떨어지는 순간 자동으로 폭발 상태가 되며 최대 HP가 405에서 810으로 바뀌고, 체력이 새 최대 HP의 100%로 완전히 회복된다. 폭발 상태에서는 공격력 70, 공격 주기 0.303초, 이동속도 95로 근접 범위의 여러 대상을 동시에 공격한다.',
    appearance: '키가 크고 마른 40대 중년 여성이다. 평소에는 침착하고 음산한 표정으로 천천히 움직이며, 폭발 상태가 되면 분노가 터진 얼굴과 어지러운 움직임으로 어두운 분위기를 몰고 다닌다.',
    trait: '1단계에서는 완전히 무해해서 상대가 방심하기 쉽다. 한 번 폭발 상태가 되면 되돌아가지 않지만, 이번 패치로 내구도, 발동 조건, 이동속도, 피해량, 공격 속도, 범위가 모두 낮아졌다.'
  },
  {
    id: 'taegeonBumperCar',
    name: '태건 범퍼카',
    cost: '1',
    type: '자폭 돌진 / 초저비용 압박',
    stats: [
      ['HP', '120'],
      ['폭발 피해', '200'],
      ['피해 범위', '주변 광역'],
      ['이동속도', '95'],
      ['엘릭서 비용', '1'],
      ['사망 효과', '무조건 폭발']
    ],
    ability: '소환되면 범퍼카를 타고 가장 가까운 적을 향해 매우 빠르게 돌진한다. 적에게 닿으면 즉시 폭발해 주변 모든 적에게 200 광역 피해를 준다. 돌진 중 적에게 먼저 죽어도 그 자리에서 반드시 폭발하므로 완전히 낭비되지 않는다.',
    appearance: '자동차에 집착하는 광기 어린 표정의 남학생이 범퍼카를 타고 전장으로 튀어나온다. 충돌하거나 죽는 순간 주황색 폭발 이펙트가 터진다.',
    trait: '게임에서 가장 낮은 1 엘릭서 카드다. HP가 120으로 매우 낮아 중간에 쉽게 잡히지만, 죽어도 200 피해로 폭발하기 때문에 수비 교란과 마무리 압박에 쓸 수 있다.'
  },
  {
    id: 'osj',
    name: 'OSJ',
    cost: '7',
    type: '탱커 / 밀치기형 탱커',
    stats: [
      ['HP', '1200'],
      ['공격력', '20'],
      ['공격 범위', '전방 범위'],
      ['밀치기 거리', '매우 큼'],
      ['공격 주기', '2.5초'],
      ['이동속도', '38']
    ],
    ability: '전방에 적이 모이면 "잡상인들 다 나가!"라고 외치며 앞쪽 범위 안의 적들을 한꺼번에 크게 밀어낸다. 밀치기 간격은 길어졌지만 HP가 늘어 더 오래 버틴다.',
    appearance: '차분하고 선해 보이는 남자 선생님이다. 아버지 같은 분위기와 품위 있는 표정, 단정한 학교 선생님 느낌을 가진다.',
    trait: 'HP 1200의 매우 단단한 전방 탱커다. 피해량은 낮고 공격 쿨타임이 길어졌지만, 밀치기로 적의 돌파를 방해한다.'
  }
];

const TOWER_THEME = {
  0: { fill: 0x2f75d6, stroke: 0xcbe1ff },
  1: { fill: 0xd94f45, stroke: 0xffd5d1 }
};

const ASCENSION_REACTIONS = {
  zzangga: '폭소',
  bbatman: '당황',
  baduk: '무표정',
  kkongho: '평온',
  yushin: '돌진',
  jimin: '드립 중단',
  mythos: '각성?',
  peach: '놀람',
  seongjoo: '키보드 정지',
  johyunwoo: '덤덤',
  kimgeunyoung: '침착',
  kimrui: '불안',
  heoseon: '폭발 직전',
  taegeonBumperCar: '부릉',
  osj: '퇴장 지시'
};

let phaserGame = null;
let socket = null;
let activeScene = null;
let serverCards = {};
let latestState = null;
let currentUser = null;
let currentRoom = null;
let currentSlot = null;
let isSpectating = false;
let ascensionAudioUntil = 0;
let latestRankings = [];
let latestTiers = [];
let latestSpectatorRooms = [];
let deckCards = {};
let selectedDeck = [];
let showingSpectatorRooms = false;
let battleChatMessages = [];

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
    this.boundKeyDown = null;
  }

  create() {
    this.g = this.add.graphics();
    this.socket = getSocket();
    this.slot = currentSlot;
    this.cards = serverCards;
    activeScene = this;
    if (latestState) {
      this.receiveState(latestState);
    }
    this.events.once('shutdown', () => {
      if (this.input.keyboard && this.boundKeyDown) {
        this.input.keyboard.off('keydown', this.boundKeyDown);
      }
      if (activeScene === this) activeScene = null;
    });
    this.input.on('pointerdown', (pointer) => this.handlePointer(pointer));
    if (this.input.keyboard) {
      this.boundKeyDown = (event) => this.handleKeyDown(event);
      this.input.keyboard.on('keydown', this.boundKeyDown);
    }
  }

  receiveWelcome(payload) {
    this.cards = payload.cards || {};
  }

  receiveState(state) {
    this.state = state;
    this.slot = currentSlot;
    if (!this.cards || Object.keys(this.cards).length === 0) {
      this.cards = buildFallbackCards(state);
    }
  }

  receiveEffect(effect) {
    if (effect.type === 'ascension-start') {
      playAscensionTone();
    }
    this.effects.push({ ...effect, bornAt: this.time ? this.time.now : 0 });
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
      this.drawCenteredText('서버 연결 중...', FIELD_CENTER_X, VIEW.height / 2, 24, '#f7f2e8');
    }

    this.hideUnusedText();
  }

  handlePointer(pointer) {
    if (!this.socket || !this.state || this.slot === null || this.slot === undefined) return;

    const cardIndex = this.cardBounds.findIndex((bounds) => {
      return pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.w && pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.h;
    });

    if (cardIndex >= 0) {
      this.selectHandIndex(cardIndex);
      return;
    }

    if (pointer.y > ARENA_H || this.selectedHandIndex === null || this.state.status !== 'playing') return;
    if (!this.canPlaySelectedAt(pointer.x, pointer.y)) return;

    this.socket.emit('play-card', {
      handIndex: this.selectedHandIndex,
      x: pointer.x,
      y: pointer.y
    });
    this.selectedHandIndex = null;
  }

  handleKeyDown(event) {
    const target = event && event.target;
    const tagName = target && target.tagName ? target.tagName.toLowerCase() : '';
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || (target && target.isContentEditable)) return;

    const keyNumber = Number(event && event.key);
    if (!Number.isInteger(keyNumber) || keyNumber < 1 || keyNumber > 4) return;

    if (this.selectHandIndex(keyNumber - 1) && event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
  }

  selectHandIndex(cardIndex) {
    if (!this.socket || !this.state || this.slot === null || this.slot === undefined) return false;
    if (cardIndex < 0 || cardIndex >= 4 || this.state.status !== 'playing') return false;

    const player = this.state.players[this.slot];
    const cardId = player && player.hand && player.hand[cardIndex];
    const card = this.cards[cardId];
    if (!player || !card) return false;
    if (player.elixir + 0.001 < getEffectiveCardCost(card, player)) return false;
    if (card.oneUse && (player.usedOneTimeCards || []).includes(card.id)) return false;

    this.selectedHandIndex = this.selectedHandIndex === cardIndex ? null : cardIndex;
    return true;
  }

  drawBoard() {
    this.g.fillStyle(0x273828, 1);
    this.g.fillRect(0, 0, ARENA_W, ARENA_H);

    this.g.fillStyle(0x334734, 1);
    this.g.fillRect(0, 0, ARENA_W, 282);
    this.g.fillStyle(0x2c593e, 1);
    this.g.fillRect(0, 338, ARENA_W, 282);

    this.g.fillStyle(0x487aa0, 1);
    this.g.fillRect(0, 286, ARENA_W, 48);
    this.g.lineStyle(3, 0xd8c073, 1);
    this.g.lineBetween(0, 286, ARENA_W, 286);
    this.g.lineBetween(0, 334, ARENA_W, 334);

    this.g.lineStyle(5, 0xcaa862, 1);
    this.g.lineBetween(315, 286, 315, 334);
    this.g.lineBetween(585, 286, 585, 334);

    this.g.lineStyle(1, 0xffffff, 0.12);
    this.g.lineBetween(FIELD_CENTER_X, 0, FIELD_CENTER_X, ARENA_H);

    this.g.fillStyle(0x191b1f, 1);
    this.g.fillRect(0, ARENA_H, ARENA_W, VIEW.height - ARENA_H);

    this.g.fillStyle(0x101318, 1);
    this.g.fillRect(ARENA_W, 0, SIDEBAR_W, VIEW.height);
    this.g.lineStyle(2, 0xffffff, 0.12);
    this.g.lineBetween(ARENA_W, 0, ARENA_W, VIEW.height);
  }

  drawSpawnPreview() {
    if (this.slot === null || this.slot === undefined || this.selectedHandIndex === null || this.state.status !== 'playing') return;
    const player = this.state.players[this.slot];
    const team = player ? player.team : this.slot;
    const card = this.getSelectedCard();
    if (card && card.spell) {
      this.g.fillStyle(0xb7d94b, 0.08);
      this.g.fillRect(28, 28, ARENA_W - 56, ARENA_H - 56);
      this.g.lineStyle(2, 0xf4ff91, 0.55);
      this.g.strokeRect(28, 28, ARENA_W - 56, ARENA_H - 56);
      return;
    }

    const fillColor = card && card.building ? 0xffd7a8 : team === 0 ? 0x4f8de8 : 0xe4536d;
    const strokeColor = card && card.building ? 0xffd7a8 : team === 0 ? 0xcbe1ff : 0xffd5d1;
    for (const zone of this.getDeployZones(team)) {
      this.g.fillStyle(fillColor, zone.expanded ? 0.1 : 0.13);
      this.g.fillRect(zone.x, zone.y, zone.w, zone.h);
      this.g.lineStyle(2, strokeColor, zone.expanded ? 0.6 : 0.7);
      this.g.strokeRect(zone.x, zone.y, zone.w, zone.h);
    }
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
      if (unit.berserked) {
        this.g.fillStyle(0xff2f45, 0.12);
        this.g.fillCircle(unit.x, unit.y, radius + 17);
        this.g.lineStyle(3, 0xff5b66, 0.9);
        this.g.strokeCircle(unit.x, unit.y, radius + 12);
      }
      if (unit.furious) {
        this.g.fillStyle(0xff3f54, 0.13);
        this.g.fillCircle(unit.x, unit.y, radius + 13);
        this.g.lineStyle(3, 0xff5166, 0.92);
        this.g.strokeCircle(unit.x, unit.y, radius + 9);
      }
      if (unit.windup) {
        this.g.lineStyle(3, 0xffffff, 0.75);
        this.g.strokeCircle(unit.x, unit.y, radius + 13);
      }
      if (unit.attached || unit.suppressed) {
        this.g.lineStyle(3, 0xe4d6ff, 0.9);
        this.g.strokeCircle(unit.x, unit.y, radius + 11);
      }
      if (unit.cardId === 'bbatman') {
        const healing = unit.action === '범위 힐' || unit.action === '힐';
        this.g.fillStyle(0x46b9a5, healing ? 0.11 : 0.05);
        this.g.fillCircle(unit.x, unit.y, BBATMAN_HEAL_RANGE);
        this.g.lineStyle(healing ? 3 : 2, 0xc7fff4, healing ? 0.82 : 0.38);
        this.g.strokeCircle(unit.x, unit.y, BBATMAN_HEAL_RANGE);
      }

      if (card.building) {
        this.drawBuilding(unit, theme, radius);
      } else {
        this.drawCharacter(unit, theme, radius);
      }

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

  drawBuilding(unit, theme, radius) {
    const x = unit.x;
    const y = unit.y;
    const outline = unit.owner === 0 ? 0xcbe1ff : 0xffd5d1;

    if (unit.cardId === 'dagwasil') {
      this.g.fillStyle(0x6e4c35, 1);
      this.g.lineStyle(4, outline, 0.92);
      this.g.fillRoundedRect(x - radius, y - radius, radius * 2, radius * 2, 8);
      this.g.strokeRoundedRect(x - radius, y - radius, radius * 2, radius * 2, 8);
      this.g.fillStyle(0xb9885a, 1);
      this.g.fillRoundedRect(x - 26, y - 18, 52, 16, 5);
      this.g.lineStyle(2, 0xffd7a8, 0.95);
      this.g.strokeRoundedRect(x - 26, y - 18, 52, 16, 5);
      this.drawCenteredText('다과실', x, y - 17, 12, '#fff4df');
      this.g.fillStyle(0x2d2119, 1);
      this.g.fillRect(x - 20, y + 8, 14, 26);
      this.g.fillStyle(0xffd7a8, 0.95);
      this.g.fillCircle(x + 18, y + 12, 7);
      this.g.fillCircle(x + 5, y + 20, 5);
      this.g.lineStyle(2, 0xffd7a8, unit.action ? 0.95 : 0.45);
      this.g.strokeCircle(x, y, radius + 7);
    } else if (unit.cardId === 'cherryTree') {
      this.g.fillStyle(0x7d4a2f, 1);
      this.g.lineStyle(4, outline, 0.9);
      this.g.fillRoundedRect(x - 9, y - 6, 18, 40, 6);
      this.g.strokeRoundedRect(x - 9, y - 6, 18, 40, 6);
      this.g.fillStyle(0xffb7d7, 1);
      this.g.fillCircle(x, y - 26, 30);
      this.g.fillCircle(x - 20, y - 15, 21);
      this.g.fillCircle(x + 22, y - 16, 22);
      this.g.fillCircle(x + 4, y - 4, 25);
      this.g.lineStyle(3, 0xffedf5, 0.92);
      this.g.strokeCircle(x, y - 20, 31);
      this.g.fillStyle(0xffedf5, 0.92);
      this.g.fillCircle(x - 10, y - 28, 3);
      this.g.fillCircle(x + 13, y - 12, 3);
      this.g.fillCircle(x + 1, y - 3, 3);
      if (unit.action) {
        this.g.lineStyle(2, 0xffedf5, 0.75);
        this.g.strokeCircle(x, y, radius + 10);
      }
    } else {
      this.g.fillStyle(theme.fill, 1);
      this.g.lineStyle(4, outline, 0.9);
      this.g.fillRoundedRect(x - radius, y - radius, radius * 2, radius * 2, 8);
      this.g.strokeRoundedRect(x - radius, y - radius, radius * 2, radius * 2, 8);
    }

    this.drawCenteredText(theme.short, x, y - 5, 12, '#111318');
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
      const furious = Boolean(unit.furious);
      this.g.fillStyle(furious ? 0xd24d5d : theme.fill, 1);
      this.g.fillRoundedRect(x - 9, y - 12, 18, 31, 5);
      this.g.strokeRoundedRect(x - 9, y - 12, 18, 31, 5);
      this.g.fillStyle(furious ? 0xffb3a8 : skin, 1);
      this.g.fillEllipse(x, y - 24, 20, 16);
      this.g.strokeEllipse(x, y - 24, 20, 16);
      this.g.lineStyle(furious ? 5 : 4, furious ? 0xfff2ad : white, furious ? 1 : 0.85);
      this.g.lineBetween(x + dir * 8, y - 4, x + dir * 24, y - 14);
      if (furious) {
        this.g.lineStyle(2, 0x66131d, 1);
        this.g.lineBetween(x - 6, y - 27, x - 1, y - 25);
        this.g.lineBetween(x + 1, y - 25, x + 6, y - 27);
        this.g.lineStyle(3, 0xff5166, 0.85);
        this.g.lineBetween(x - dir * 6, y - 3, x - dir * 18, y + 6);
      }
    } else if (unit.cardId === 'osj') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 12, y - 16, 24, 39, 5);
      this.g.strokeRoundedRect(x - 12, y - 16, 24, 39, 5);
      this.g.fillStyle(0xd9eef8, 1);
      this.g.fillRoundedRect(x - 9, y - 14, 18, 35, 4);
      this.g.fillStyle(0x233f52, 1);
      this.g.fillRect(x - 2, y - 13, 4, 34);
      this.g.fillStyle(skin, 1);
      this.g.fillEllipse(x, y - 31, 22, 18);
      this.g.strokeEllipse(x, y - 31, 22, 18);
      this.g.fillStyle(0x26201b, 1);
      this.g.fillEllipse(x, y - 37, 22, 8);
      this.g.lineStyle(1, dark, 1);
      this.g.strokeCircle(x - 5, y - 31, 3);
      this.g.strokeCircle(x + 5, y - 31, 3);
      this.g.lineBetween(x - 2, y - 31, x + 2, y - 31);
      this.g.lineStyle(unit.action ? 5 : 3, 0xd9eef8, unit.action ? 1 : 0.8);
      this.g.lineBetween(x + dir * 9, y - 7, x + dir * 30, y - 8);
      this.g.lineBetween(x - dir * 8, y - 5, x - dir * 18, y + 4);
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
    } else if (unit.cardId === 'giantHyeonjik') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 17, y - 25, 34, 59, 8);
      this.g.strokeRoundedRect(x - 17, y - 25, 34, 59, 8);
      this.g.fillStyle(0xd7ad8e, 1);
      this.g.fillEllipse(x, y - 43, 34, 28);
      this.g.strokeEllipse(x, y - 43, 34, 28);
      this.g.fillStyle(0x2b2420, 1);
      this.g.fillEllipse(x, y - 53, 36, 12);
      this.g.lineStyle(2, dark, 1);
      this.g.strokeCircle(x - 8, y - 43, 5);
      this.g.strokeCircle(x + 8, y - 43, 5);
      this.g.lineBetween(x - 3, y - 43, x + 3, y - 43);
      this.g.lineStyle(5, 0xe3d7ff, unit.action ? 1 : 0.85);
      this.g.lineBetween(x + dir * 15, y - 8, x + dir * 37, y - 17);
      this.g.lineBetween(x - dir * 14, y - 4, x - dir * 31, y + 9);
      this.g.lineStyle(3, 0x31263f, 0.7);
      this.g.lineBetween(x - 10, y + 32, x - 22, y + 47);
      this.g.lineBetween(x + 10, y + 32, x + 22, y + 47);
    } else if (unit.cardId === 'heoseon') {
      const enraged = Boolean(unit.berserked);
      const coat = enraged ? 0x4c151c : theme.fill;
      const face = enraged ? 0xffb4a2 : 0xd0aaa0;
      this.g.fillStyle(coat, 1);
      this.g.fillRoundedRect(x - 7, y - 22, 14, 45, 6);
      this.g.strokeRoundedRect(x - 7, y - 22, 14, 45, 6);
      this.g.lineStyle(3, enraged ? 0xff5b66 : 0x151319, 1);
      this.g.lineBetween(x - 5, y + 22, x - 13, y + 38);
      this.g.lineBetween(x + 5, y + 22, x + 13, y + 38);
      this.g.fillStyle(face, 1);
      this.g.fillEllipse(x, y - 36, 18, 24);
      this.g.strokeEllipse(x, y - 36, 18, 24);
      this.g.fillStyle(0x141116, 1);
      this.g.fillEllipse(x, y - 42, 22, 17);
      this.g.fillRect(x - 11, y - 40, 22, 18);
      this.g.lineStyle(1, enraged ? 0xfff0f0 : dark, 1);
      this.g.lineBetween(x - 5, y - 35, x - 2, y - 34);
      this.g.lineBetween(x + 2, y - 34, x + 5, y - 35);
      this.g.lineStyle(enraged ? 4 : 2, enraged ? 0xff5b66 : 0x8c8588, enraged ? 0.95 : 0.5);
      this.g.lineBetween(x - dir * 5, y - 13, x + dir * 17, y - 25);
      this.g.lineBetween(x + dir * 5, y - 4, x + dir * 20, y + 8);
      if (enraged) {
        this.g.lineStyle(2, 0xff2f45, 0.85);
        this.g.lineBetween(x - 22, y - 45, x - 8, y - 24);
        this.g.lineBetween(x + 20, y - 21, x + 8, y - 4);
        this.g.lineBetween(x - 18, y + 4, x - 6, y + 23);
      }
    } else if (unit.cardId === 'taegeonBumperCar') {
      this.g.fillStyle(0xff9b45, 1);
      this.g.fillRoundedRect(x - 19, y - 8, 38, 22, 8);
      this.g.strokeRoundedRect(x - 19, y - 8, 38, 22, 8);
      this.g.fillStyle(0x2b3038, 1);
      this.g.fillRoundedRect(x - 10, y - 18, 20, 13, 5);
      this.g.strokeRoundedRect(x - 10, y - 18, 20, 13, 5);
      this.g.fillStyle(skin, 1);
      this.g.fillCircle(x, y - 27, 8);
      this.g.strokeCircle(x, y - 27, 8);
      this.g.lineStyle(2, 0x17191d, 1);
      this.g.lineBetween(x - 4, y - 29, x - 1, y - 27);
      this.g.lineBetween(x + 1, y - 27, x + 4, y - 29);
      this.g.lineStyle(3, 0xffdf9f, 0.95);
      this.g.lineBetween(x + dir * 4, y - 3, x + dir * 20, y - 7);
      this.g.fillStyle(0x17191d, 1);
      this.g.fillCircle(x - 13, y + 14, 5);
      this.g.fillCircle(x + 13, y + 14, 5);
      this.g.lineStyle(2, 0xffdf9f, 0.85);
      this.g.lineBetween(x - dir * 22, y - 2, x - dir * 34, y - 2);
    } else if (unit.cardId === 'nerdMale') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 8, y - 8, 16, 24, 5);
      this.g.strokeRoundedRect(x - 8, y - 8, 16, 24, 5);
      this.g.fillStyle(0xc49f81, 1);
      this.g.fillEllipse(x, y - 20, 18, 15);
      this.g.strokeEllipse(x, y - 20, 18, 15);
      this.g.fillStyle(0x3b342a, 1);
      this.g.fillEllipse(x, y - 27, 21, 8);
      this.g.lineStyle(1, dark, 1);
      this.g.strokeCircle(x - 4, y - 20, 3);
      this.g.strokeCircle(x + 4, y - 20, 3);
      this.g.lineStyle(3, 0xd3dac1, 0.85);
      this.g.lineBetween(x + dir * 7, y - 2, x + dir * 22, y - 6);
      this.g.lineBetween(x - dir * 7, y, x - dir * 18, y + 8);
    } else if (unit.cardId === 'nerdFemale') {
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 8, y - 9, 16, 25, 5);
      this.g.strokeRoundedRect(x - 8, y - 9, 16, 25, 5);
      this.g.fillStyle(0xf0c0a2, 1);
      this.g.fillEllipse(x, y - 22, 18, 15);
      this.g.strokeEllipse(x, y - 22, 18, 15);
      this.g.fillStyle(0x302322, 1);
      this.g.fillEllipse(x, y - 27, 22, 10);
      this.g.fillCircle(x - 10, y - 20, 5);
      this.g.fillCircle(x + 10, y - 20, 5);
      this.g.lineStyle(2, 0xf0d7ef, 0.95);
      this.g.fillStyle(0xffd7a8, 1);
      this.g.fillCircle(x + dir * 18, y - 7, 5);
      this.g.lineBetween(x + dir * 7, y - 3, x + dir * 18, y - 7);
    } else if (unit.cardId === 'geunyoungTank') {
      const barrelEnd = x + dir * 25;
      this.g.fillStyle(0x303a3f, 1);
      this.g.fillRoundedRect(x - 18, y - 9, 36, 18, 5);
      this.g.lineStyle(3, 0xcbd3d8, 1);
      this.g.strokeRoundedRect(x - 18, y - 9, 36, 18, 5);
      this.g.fillStyle(theme.fill, 1);
      this.g.fillRoundedRect(x - 10, y - 15, 20, 18, 5);
      this.g.strokeRoundedRect(x - 10, y - 15, 20, 18, 5);
      this.g.fillStyle(0xaeb7bd, 1);
      this.g.fillRoundedRect(x - 7, y - 12, 14, 12, 4);
      this.g.strokeRoundedRect(x - 7, y - 12, 14, 12, 4);
      this.g.lineStyle(5, 0xcbd3d8, 1);
      this.g.lineBetween(x + dir * 5, y - 7, barrelEnd, y - 7);
      this.g.fillStyle(0xcbd3d8, 1);
      this.g.fillCircle(barrelEnd, y - 7, 3);
      this.g.fillStyle(0x171d20, 1);
      this.g.fillCircle(x - 11, y + 8, 4);
      this.g.fillCircle(x, y + 9, 4);
      this.g.fillCircle(x + 11, y + 8, 4);
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
      const duration = this.effectDuration(effect.type);
      const t = Phaser.Math.Clamp(age / duration, 0, 1);
      const alpha = 1 - t;

      if (effect.type === 'ascension-start') {
        this.g.fillStyle(0xfff6b0, 0.18 + 0.14 * Math.sin(age / 90));
        this.g.fillRect(0, 0, ARENA_W, ARENA_H);
        this.g.lineStyle(8, 0xfff2a8, alpha);
        this.g.lineBetween(effect.x, 0, effect.x, ARENA_H);
        this.g.fillStyle(0xfff7cb, 0.95);
        this.g.fillCircle(effect.x, ARENA_H / 2 + 22, 16);
        this.g.fillRoundedRect(effect.x - 12, ARENA_H / 2 + 38, 24, 28, 7);
        this.g.lineStyle(3, 0xfff7cb, 0.95);
        this.g.lineBetween(effect.x - 10, ARENA_H / 2 + 44, effect.x - 30, ARENA_H / 2 + 56);
        this.g.lineBetween(effect.x + 10, ARENA_H / 2 + 44, effect.x + 30, ARENA_H / 2 + 56);
        this.drawCenteredText('기도', effect.x, ARENA_H / 2 + 72, 15, '#fff7cb');
        this.drawCenteredText('대승천', FIELD_CENTER_X, ARENA_H / 2, 42, '#fff7cb');
        this.drawAscensionReactions(alpha);
      } else if (effect.type === 'ascension-end') {
        this.g.fillStyle(0xfff8d3, alpha * 0.75);
        this.g.fillRect(0, 0, ARENA_W, ARENA_H);
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
      } else if (effect.type === 'berserk') {
        this.g.fillStyle(0xff2f45, alpha * 0.18);
        this.g.fillCircle(effect.x, effect.y, 36 + t * 96);
        this.g.lineStyle(6, 0xff5b66, alpha);
        this.g.strokeCircle(effect.x, effect.y, 24 + t * 92);
        this.g.lineStyle(3, 0xffffff, alpha * 0.85);
        this.g.lineBetween(effect.x - 42, effect.y + 38, effect.x + 24, effect.y - 52);
        this.g.lineBetween(effect.x + 44, effect.y + 28, effect.x - 16, effect.y - 56);
        this.drawCenteredText('폭발 상태', effect.x, Math.max(16, effect.y - 84 - t * 12), 22, '#ffccd0');
      } else if (effect.type === 'johyunwoo-rage') {
        const labelY = Math.max(18, effect.y - 74 - t * 16);
        this.g.fillStyle(0xff3f54, alpha * 0.18);
        this.g.fillCircle(effect.x, effect.y, 32 + t * 88);
        this.g.lineStyle(6, 0xff5166, alpha);
        this.g.strokeCircle(effect.x, effect.y, 22 + t * 78);
        this.g.lineStyle(3, 0xfff2ad, alpha * 0.95);
        this.g.lineBetween(effect.x - 34, effect.y + 28, effect.x + 30, effect.y - 36);
        this.g.lineBetween(effect.x + 34, effect.y + 28, effect.x - 30, effect.y - 36);
        this.g.fillStyle(0x111318, alpha * 0.88);
        this.g.fillRoundedRect(effect.x - 49, labelY - 5, 98, 30, 8);
        this.g.lineStyle(3, 0xff5166, alpha);
        this.g.strokeRoundedRect(effect.x - 49, labelY - 5, 98, 30, 8);
        this.drawCenteredText('명존쎄!', effect.x, labelY, 18, '#ffffff');
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
      } else if (effect.type === 'jimin-yushin-counter') {
        const labelY = Math.max(28, effect.y - 66 - t * 8);
        this.g.fillStyle(0x111318, alpha * 0.88);
        this.g.fillRoundedRect(effect.x - 54, labelY - 5, 108, 26, 8);
        this.g.lineStyle(3, 0xd5e9ff, alpha);
        this.g.strokeRoundedRect(effect.x - 54, labelY - 5, 108, 26, 8);
        this.drawCenteredText('인포 가위질!', effect.x, labelY, 15, '#ffffff');
        this.g.lineStyle(4, 0xd5e9ff, alpha);
        this.g.lineBetween(effect.x - 30 - t * 14, effect.y - 18, effect.x + 30 + t * 14, effect.y + 18);
        this.g.lineBetween(effect.x - 30 - t * 14, effect.y + 18, effect.x + 30 + t * 14, effect.y - 18);
        this.g.strokeCircle(effect.x, effect.y, 22 + t * 42);
      } else if (effect.type === 'best-friend-combo') {
        this.g.fillStyle(0xfff2ad, alpha * 0.14);
        this.g.fillCircle(effect.x, effect.y, 48 + t * 92);
        this.g.lineStyle(6, 0xfff2ad, alpha);
        this.g.strokeCircle(effect.x, effect.y, 28 + t * 86);
        this.g.lineStyle(3, 0xffffff, alpha * 0.85);
        this.g.strokeCircle(effect.x, effect.y, 62 + t * 78);
        this.g.lineBetween(effect.x - 72, effect.y, effect.x + 72, effect.y);
        this.g.lineBetween(effect.x, effect.y - 42, effect.x, effect.y + 42);
        this.drawCenteredText('절친 특성!', effect.x, Math.max(28, effect.y - 70 - t * 8), 24, '#fff2ad');
      } else if (effect.type === 'tower-shot') {
        this.drawAttackTrail(effect, 0xfff2a8, alpha, t, 4);
        this.g.fillStyle(0xffffff, alpha);
        this.g.fillCircle(effect.x, effect.y, 8 + t * 16);
      } else if (effect.type === 'push') {
        const pushDir = effect.owner === 0 ? -1 : 1;
        const range = effect.range || 96;
        const width = effect.width || 132;
        const frontY = effect.fromY + pushDir * (range + t * 28);
        this.g.fillStyle(0xd9eef8, alpha * 0.12);
        this.g.fillTriangle(effect.fromX, effect.fromY, effect.fromX - width / 2, frontY, effect.fromX + width / 2, frontY);
        this.g.lineStyle(4, 0xd9eef8, alpha);
        this.g.lineBetween(effect.fromX, effect.fromY, effect.fromX - width / 2, frontY);
        this.g.lineBetween(effect.fromX, effect.fromY, effect.fromX + width / 2, frontY);
        this.g.lineBetween(effect.fromX - width / 2, frontY, effect.fromX + width / 2, frontY);
        this.g.lineStyle(3, 0xffffff, alpha * 0.82);
        this.g.lineBetween(effect.fromX - 30, frontY - pushDir * 18, effect.fromX + 30, frontY - pushDir * 18);
        this.g.lineBetween(effect.fromX - 44, frontY - pushDir * 36, effect.fromX + 44, frontY - pushDir * 36);
        this.drawCenteredText('잡상인들 다 나가!', effect.fromX, Math.max(16, effect.fromY - 58), 15, '#d9eef8');
      } else if (effect.type === 'berserk-hit') {
        this.drawAttackTrail(effect, 0xff5b66, alpha, t, 5);
        this.g.lineStyle(5, 0xff5b66, alpha);
        this.g.strokeCircle(effect.x, effect.y, 12 + t * (effect.radius || 58));
        this.g.lineStyle(3, 0xffffff, alpha * 0.8);
        this.g.lineBetween(effect.x - 30, effect.y + 20, effect.x + 32, effect.y - 18);
        this.g.lineBetween(effect.x - 24, effect.y - 22, effect.x + 28, effect.y + 18);
        this.drawCenteredText('폭주', effect.x, effect.y - 36, 15, '#ffccd0');
      } else if (effect.type === 'gas-zone') {
        const radius = effect.radius || 118;
        this.g.fillStyle(0xb7d94b, 0.18 + 0.05 * Math.sin(age / 120));
        this.g.fillCircle(effect.x, effect.y, radius);
        this.g.fillStyle(0xf4ff91, 0.09);
        this.g.fillCircle(effect.x - 18, effect.y + 9, radius * 0.72);
        this.g.fillCircle(effect.x + 22, effect.y - 14, radius * 0.55);
        this.g.lineStyle(4, 0xf4ff91, alpha * 0.7 + 0.18);
        this.g.strokeCircle(effect.x, effect.y, radius);
        this.drawCenteredText('바둑이 방구', effect.x, Math.max(18, effect.y - radius - 26), 14, '#f4ff91');
      } else if (effect.type === 'meteor') {
        const radius = effect.radius || 40;
        const impactDelayMs = effect.impactDelayMs || 620;
        const impactT = Phaser.Math.Clamp(age / impactDelayMs, 0, 1);
        const ballX = effect.x - 120 + 120 * impactT;
        const ballY = effect.y - 240 + 240 * impactT;
        this.g.lineStyle(7, 0xffd29a, alpha * 0.8);
        this.g.lineBetween(effect.x - 130, effect.y - 250, ballX, ballY);
        this.g.fillStyle(0xd87a2c, 1);
        this.g.fillCircle(ballX, ballY, 15);
        this.g.lineStyle(2, 0xfff0d0, 0.95);
        this.g.strokeCircle(ballX, ballY, 15);
        this.g.lineBetween(ballX - 12, ballY, ballX + 12, ballY);
        this.g.lineBetween(ballX, ballY - 12, ballX, ballY + 12);
        if (age >= impactDelayMs) {
          const boomT = Phaser.Math.Clamp((age - impactDelayMs) / Math.max(180, duration - impactDelayMs), 0, 1);
          const boomAlpha = 1 - boomT;
          this.g.fillStyle(0xff9b45, boomAlpha * 0.25);
          this.g.fillCircle(effect.x, effect.y, 18 + boomT * radius * 1.35);
          this.g.lineStyle(6, 0xffd29a, boomAlpha);
          this.g.strokeCircle(effect.x, effect.y, 10 + boomT * radius * 1.45);
          this.drawCenteredText('꽁!', effect.x, Math.max(18, effect.y - radius - 24), 20, '#ffd29a');
        }
      } else if (effect.type === 'bumper-explosion') {
        const radius = effect.radius || 76;
        this.g.fillStyle(0xff9b45, alpha * 0.26);
        this.g.fillCircle(effect.x, effect.y, 18 + t * radius);
        this.g.lineStyle(6, 0xffdf9f, alpha);
        this.g.strokeCircle(effect.x, effect.y, 12 + t * radius);
        this.g.lineStyle(3, 0xffffff, alpha * 0.85);
        this.g.lineBetween(effect.x - 34, effect.y, effect.x + 34, effect.y);
        this.g.lineBetween(effect.x, effect.y - 34, effect.x, effect.y + 34);
        this.drawCenteredText('펑!', effect.x, effect.y - 45, 18, '#ffdf9f');
      } else if (effect.type === 'hit') {
        this.drawCardHitEffect(effect, t, alpha);
      } else if (effect.type === 'deploy') {
        this.drawDeployEffect(effect, t, alpha);
      } else if (effect.type === 'spawn') {
        this.g.lineStyle(3, 0xffffff, alpha);
        this.g.strokeCircle(effect.x, effect.y, 16 + t * 36);
      } else if (effect.type === 'summon-minion') {
        this.g.lineStyle(3, 0xcbd3d8, alpha);
        this.g.strokeCircle(effect.x, effect.y, 12 + t * 30);
        this.drawCenteredText('호위', effect.x, effect.y - 26, 13, '#cbd3d8');
      } else if (effect.type === 'snack-spawn') {
        this.g.lineStyle(3, 0xffd7a8, alpha);
        this.g.strokeCircle(effect.x, effect.y, 12 + t * 34);
        this.g.fillStyle(0xffd7a8, alpha);
        this.g.fillCircle(effect.x - 10, effect.y + 2, 5);
        this.g.fillCircle(effect.x + 12, effect.y - 6, 4);
        this.drawCenteredText('다과실', effect.x, effect.y - 28, 13, '#ffd7a8');
      } else if (effect.type === 'cherry-shot') {
        this.drawAttackTrail(effect, 0xffb7d7, alpha, t, 4);
        const px = Number.isFinite(effect.fromX) ? Phaser.Math.Linear(effect.fromX, effect.x, t) : effect.x;
        const py = Number.isFinite(effect.fromY) ? Phaser.Math.Linear(effect.fromY, effect.y, t) : effect.y;
        this.g.fillStyle(0xffedf5, alpha);
        this.g.fillEllipse(px - 8, py - 3, 10, 5, 12);
        this.g.fillEllipse(px + 6, py + 4, 10, 5, 12);
        this.g.lineStyle(3, 0xffb7d7, alpha);
        this.g.strokeCircle(effect.x, effect.y, 10 + t * 20);
      } else if (effect.type === 'king-return') {
        this.drawKingReturnEffect(effect, t, alpha);
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
        this.drawCenteredText('서든 데스', FIELD_CENTER_X, 308, 36, '#fff4a7');
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
    } else if (effect.cardId === 'nerdFemale') {
      this.g.fillStyle(0xffd7a8, alpha);
      this.g.fillCircle(effect.x - 7, effect.y - 2, 5 + t * 5);
      this.g.fillStyle(0xf0d7ef, alpha);
      this.g.fillRoundedRect(effect.x + 2, effect.y - 8, 12, 15, 4);
    } else if (effect.cardId === 'nerdMale') {
      this.g.lineStyle(4, 0xd3dac1, alpha);
      this.g.lineBetween(effect.x - 18, effect.y + 10, effect.x + 18, effect.y - 10);
      this.g.fillStyle(0xffffff, alpha);
      this.g.fillCircle(effect.x, effect.y, 7 + t * 12);
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

  drawKingReturnEffect(effect, t, alpha) {
    const x = FIELD_CENTER_X;
    const y = ARENA_H / 2;
    const ring = 90 + t * 190;
    this.g.fillStyle(0xe8c547, alpha * 0.12);
    this.g.fillCircle(x, y, ring);
    this.g.lineStyle(8, 0xfff2ad, alpha);
    this.g.strokeCircle(x, y, 58 + t * 78);
    this.g.lineStyle(3, 0xffffff, alpha * 0.85);
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const inner = 72 + t * 26;
      const outer = 168 + t * 82;
      this.g.lineBetween(
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner,
        x + Math.cos(angle) * outer,
        y + Math.sin(angle) * outer
      );
    }
    this.g.fillStyle(0xe8c547, alpha * 0.92);
    this.g.beginPath();
    this.g.moveTo(x - 52, y - 20);
    this.g.lineTo(x - 28, y - 58);
    this.g.lineTo(x - 6, y - 24);
    this.g.lineTo(x + 18, y - 62);
    this.g.lineTo(x + 48, y - 20);
    this.g.lineTo(x + 42, y + 22);
    this.g.lineTo(x - 46, y + 22);
    this.g.closePath();
    this.g.fillPath();
    this.g.lineStyle(4, 0xfff2ad, alpha);
    this.g.strokePath();
    this.drawCenteredText('왕의 귀환', x, y + 56, 30, '#fff2ad');
    this.drawCenteredText('+30초', x, y + 90, 22, '#ffffff');
    if (effect.multiplier > 1) {
      this.drawCenteredText(`X${effect.multiplier} 유지`, x, y + 118, 17, '#f4ff91');
    }
  }

  drawDeployEffect(effect, t, alpha) {
    const theme = CARD_THEME[effect.cardId] || { fill: 0xe8c15c, stroke: 0xffffff, short: '?' };
    const pulse = 1 + Math.sin(t * Math.PI * 5) * 0.08;
    const radius = 24 + t * 18;
    this.g.fillStyle(theme.fill, alpha * 0.12);
    this.g.fillCircle(effect.x, effect.y, radius * pulse);
    this.g.lineStyle(4, theme.stroke, alpha * 0.85);
    this.g.strokeCircle(effect.x, effect.y, radius);
    this.g.lineStyle(2, 0xffffff, alpha * 0.72);
    this.g.strokeCircle(effect.x, effect.y, 11 + t * 34);
    this.g.lineBetween(effect.x - 28, effect.y, effect.x + 28, effect.y);
    this.g.lineBetween(effect.x, effect.y - 28, effect.x, effect.y + 28);
    this.drawDeploySigil(effect, t, alpha, theme);
    this.g.fillStyle(0x111318, alpha * 0.82);
    this.g.fillRoundedRect(effect.x - 52, Math.max(10, effect.y - 62), 104, 24, 8);
    this.g.lineStyle(2, theme.stroke, alpha * 0.8);
    this.g.strokeRoundedRect(effect.x - 52, Math.max(10, effect.y - 62), 104, 24, 8);
    this.drawCenteredText(effect.label || '소환 준비', effect.x, Math.max(14, effect.y - 58), 12, '#ffffff');
  }

  drawDeploySigil(effect, t, alpha, theme) {
    const x = effect.x;
    const y = effect.y;
    this.g.lineStyle(3, theme.stroke, alpha * 0.9);
    this.g.fillStyle(theme.fill, alpha * 0.28);

    if (effect.cardId === 'yushin') {
      this.g.fillCircle(x - 14, y + 6, 8 + t * 4);
      this.g.fillCircle(x, y - 8, 8 + t * 4);
      this.g.fillCircle(x + 14, y + 6, 8 + t * 4);
    } else if (effect.cardId === 'bbatman') {
      this.g.strokeCircle(x, y, 34 + t * 8);
      this.g.lineBetween(x - 18, y, x + 18, y);
      this.g.lineBetween(x, y - 18, x, y + 18);
    } else if (effect.cardId === 'kimgeunyoung') {
      this.g.fillRoundedRect(x - 22, y - 9, 44, 18, 5);
      this.g.fillRoundedRect(x - 12, y - 19, 24, 12, 4);
      this.g.lineBetween(x + 8, y - 13, x + 31, y - 19);
    } else if (effect.cardId === 'osj') {
      const pushDir = effect.owner === 0 ? -1 : 1;
      const tipY = y - pushDir * 25;
      const baseY = y + pushDir * 15;
      this.g.lineBetween(x, tipY, x - 26, baseY);
      this.g.lineBetween(x, tipY, x + 26, baseY);
      this.g.lineBetween(x - 26, baseY, x + 26, baseY);
      this.g.lineBetween(x - 20, y + pushDir * 26, x + 20, y + pushDir * 26);
    } else if (effect.cardId === 'heoseon') {
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        this.g.lineBetween(x, y, x + Math.cos(angle) * (20 + t * 16), y + Math.sin(angle) * (20 + t * 16));
      }
    } else if (effect.cardId === 'giantHyeonjik') {
      this.g.fillRoundedRect(x - 18, y - 25, 36, 50, 8);
      this.g.strokeCircle(x - 8, y - 31, 5);
      this.g.strokeCircle(x + 8, y - 31, 5);
      this.g.lineBetween(x - 35, y + 2, x - 16, y + 2);
      this.g.lineBetween(x + 16, y + 2, x + 35, y + 2);
    } else if (effect.cardId === 'taegeonBumperCar') {
      this.g.fillRoundedRect(x - 24, y - 9, 48, 18, 7);
      this.g.fillCircle(x - 15, y + 11, 5 + t * 3);
      this.g.fillCircle(x + 15, y + 11, 5 + t * 3);
      this.g.lineBetween(x - 30 - t * 18, y, x - 12, y);
    } else if (effect.cardId === 'dagwasil') {
      this.g.fillRoundedRect(x - 28, y - 20, 56, 40, 7);
      this.g.lineBetween(x - 24, y - 6, x + 24, y - 6);
      this.drawCenteredText('다과실', x, y - 18, 11, '#ffffff');
    } else if (effect.cardId === 'cherryTree') {
      this.g.fillRoundedRect(x - 7, y - 2, 14, 26, 5);
      this.g.fillCircle(x, y - 22, 28);
      this.g.fillCircle(x - 18, y - 12, 17);
      this.g.fillCircle(x + 18, y - 12, 17);
      this.g.fillStyle(0xffedf5, alpha * 0.85);
      this.g.fillCircle(x - 9, y - 24, 3);
      this.g.fillCircle(x + 12, y - 13, 3);
    } else if (effect.cardId === 'peach') {
      this.g.strokeCircle(x - 8, y - 6, 13 + t * 4);
      this.g.lineBetween(x + 3, y + 4, x + 22, y + 23);
    } else if (effect.cardId === 'baduk') {
      this.g.strokeCircle(x - 9, y, 13 + t * 5);
      this.g.strokeCircle(x + 12, y, 13 + t * 5);
      this.g.fillCircle(x - 5, y - 4, 3);
      this.g.fillCircle(x + 8, y + 5, 3);
    } else if (effect.cardId === 'johyunwoo') {
      this.g.lineBetween(x - 24, y + 22, x + 24, y - 22);
      this.g.lineBetween(x - 12, y + 23, x + 28, y - 14);
    } else {
      this.g.fillCircle(x, y, 14 + t * 4);
      this.drawCenteredText(theme.short || '?', x, y - 6, 13, '#ffffff');
    }
  }

  drawAscensionReactions(alpha) {
    if (!this.state || !this.state.units) return;
    for (const unit of this.state.units) {
      const label = ASCENSION_REACTIONS[unit.cardId] || '승천';
      this.g.lineStyle(2, 0xfff7cb, alpha * 0.7);
      this.g.lineBetween(unit.x, unit.y - 18, unit.x, Math.max(12, unit.y - 60));
      this.drawCenteredText(label, unit.x, Math.max(8, unit.y - 76), 11, '#fff7cb');
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
    const me = this.slot === null || this.slot === undefined ? null : this.state.players[this.slot];
    const time = formatTime(this.state.remainingMs);
    const elixirMultiplier = this.state.elixirMultiplier || 1;
    const boostedElixir = elixirMultiplier > 1;

    const x = ARENA_W + 12;
    const w = SIDEBAR_W - 24;
    this.g.fillStyle(0x151922, 0.96);
    this.g.fillRoundedRect(x, 12, w, ARENA_H - 24, 10);
    this.g.lineStyle(2, 0xffffff, 0.13);
    this.g.strokeRoundedRect(x, 12, w, ARENA_H - 24, 10);

    this.drawText('경기 시간', x + 14, 28, 11, '#8f98a6');
    this.drawText(this.state.suddenDeath ? '서든 데스' : time, x + 14, 44, 26, '#f7f2e8');
    if (boostedElixir) {
      this.g.fillStyle(0xb86dff, 1);
      this.g.fillRoundedRect(x + 122, 50, 42, 20, 6);
      this.drawCenteredText(`X${elixirMultiplier}`, x + 143, 50, 14, '#ffffff');
    }

    this.drawHudTeam(1, '위 진영', x + 12, 88, w - 24, '#ffd5d1');
    this.drawHudTeam(0, '아래 진영', x + 12, 212, w - 24, '#cbe1ff');

    this.drawText(`관전자 수: ${this.state.spectatorCount || 0}`, x + 14, 328, 13, '#f4ff91');
    this.drawText('상태', x + 14, 354, 11, '#8f98a6');
    const elixirStatus = elixirMultiplier >= 3 ? '트리플 엘릭서' : '더블 엘릭서';
    this.drawText(truncateText(boostedElixir ? elixirStatus : this.state.message || '전투 중', 18), x + 14, 372, 13, '#d6d0c6');

    if (me) {
      this.drawElixir(me.elixir, me.maxElixir || 10);
      this.drawText('내 진영', x + 14, 416, 11, '#8f98a6');
      this.drawText(teamName(me.team), x + 14, 434, 16, '#f7f2e8');
    } else {
      this.drawText(this.state.spectator ? '관전 모드' : truncateText(this.notice || '방 대기 중', 18), x + 14, 500, 14, '#f7f2e8');
    }
  }

  drawHudTeam(team, label, x, y, w, accent) {
    const players = (this.state.players || []).filter((player) => player.team === team);
    const connectedPlayers = players.filter((player) => player.connected || player.username);
    const towerHp = players[0] ? players[0].totalTowerHp : 0;

    this.g.fillStyle(0x222834, 0.88);
    this.g.fillRoundedRect(x, y, w, 108, 8);
    this.g.lineStyle(2, 0xffffff, 0.1);
    this.g.strokeRoundedRect(x, y, w, 108, 8);

    this.drawText(label, x + 10, y + 8, 11, accent);
    this.drawText(`타워 ${towerHp}`, x + 94, y + 8, 11, '#d6d0c6');
    if (connectedPlayers.length === 0) {
      this.drawText('대기 중', x + 10, y + 34, 14, '#f7f2e8');
      return;
    }

    connectedPlayers.slice(0, 2).forEach((player, index) => {
      const rowY = y + 31 + index * 34;
      const tier = player.tier ? `${player.tierIcon || ''} ${player.tier}` : '대기';
      this.drawText(truncateText(player.username || `플레이어 ${player.slot + 1}`, 16), x + 10, rowY, 14, '#f7f2e8');
      this.drawText(truncateText(`${tier} · ${player.trophies || 0}`, 18), x + 10, rowY + 17, 11, '#d6d0c6');
    });
  }

  drawElixir(elixir, maxElixir = 10) {
    const x = ARENA_W + 26;
    const y = 548;
    const w = SIDEBAR_W - 52;
    const h = 18;
    this.drawText('엘릭서', x, y - 22, 11, '#8f98a6');
    this.g.fillStyle(0x262b33, 1);
    this.g.fillRoundedRect(x, y, w, h, 8);
    this.g.fillStyle(0xb86dff, 1);
    this.g.fillRoundedRect(x, y, w * Phaser.Math.Clamp(elixir / maxElixir, 0, 1), h, 8);
    this.drawCenteredText(`${elixir.toFixed(1)} / ${maxElixir}`, x + w / 2, y + 1, 13, '#ffffff');
  }

  drawCards() {
    this.cardBounds = [];
    if (this.state.spectator) {
      this.drawSpectatorHands();
      return;
    }
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
      const effectiveCost = getEffectiveCardCost(card, player);
      const bestFriendCombo = card && hasBestFriendCombo(player) && isBestFriendCard(card.id);
      const disabled = !player || !card || this.state.status !== 'playing' || player.elixir < effectiveCost || usedOneTime;
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
      this.drawCenteredText(String(effectiveCost), x + 23, y + 14, 17, '#ffffff');
      this.g.fillStyle(0x111318, 0.58);
      this.g.fillRoundedRect(x + w - 36, y + 8, 24, 24, 6);
      this.drawCenteredText(String(i + 1), x + w - 24, y + 13, 12, disabled ? '#b9b9b9' : '#f7f2e8');
      const typeIcon = card.spell ? '✦' : card.building ? '▣' : '';
      if (typeIcon) {
        this.g.fillStyle(0x111318, 0.58);
        this.g.fillCircle(x + w - 54, y + 20, 12);
        this.drawCenteredText(typeIcon, x + w - 54, y + 12, 12, disabled ? '#b9b9b9' : '#ffffff');
      }
      this.drawCenteredText(theme.short, x + w / 2, y + 33, 30, disabled ? '#b9b9b9' : '#111318');
      this.drawCenteredText(card.name, x + w / 2, y + 69, 15, '#ffffff');
      this.drawCenteredText(bestFriendCombo ? '절친 출격' : card.role, x + w / 2, y + 91, 10, '#f5ead8');
    }
  }

  drawSpectatorHands() {
    const players = (this.state.players || []).filter((player) => player.username || player.connected);
    const panelY = ARENA_H + 12;
    this.g.fillStyle(0x141820, 1);
    this.g.fillRoundedRect(20, panelY, ARENA_W - 40, 116, 8);
    this.g.lineStyle(2, 0xffffff, 0.12);
    this.g.strokeRoundedRect(20, panelY, ARENA_W - 40, 116, 8);

    const columnW = Math.floor((ARENA_W - 64) / Math.max(1, Math.min(players.length, 4)));
    players.slice(0, 4).forEach((player, index) => {
      const x = 32 + index * columnW;
      const y = panelY + 10;
      const accent = player.team === 0 ? '#cbe1ff' : '#ffd5d1';
      this.drawText(truncateText(player.username || `플레이어 ${player.slot + 1}`, 14), x, y, 13, accent);
      this.drawMiniElixir(player.elixir || 0, player.maxElixir || 10, x, y + 20, Math.min(168, columnW - 12));
      for (let i = 0; i < 4; i += 1) {
        this.drawMiniCard(player.hand && player.hand[i], x + i * 42, y + 48, 36, 46);
      }
    });
  }

  drawMiniElixir(elixir, maxElixir, x, y, w) {
    const h = 8;
    this.g.fillStyle(0x262b33, 1);
    this.g.fillRoundedRect(x, y, w, h, 4);
    this.g.fillStyle(0xb86dff, 1);
    this.g.fillRoundedRect(x, y, w * Phaser.Math.Clamp(elixir / maxElixir, 0, 1), h, 4);
    this.drawText(`${elixir.toFixed(1)}/${maxElixir}`, x, y + 10, 10, '#d6d0c6');
  }

  drawMiniCard(cardId, x, y, w, h) {
    const card = this.cards[cardId];
    const theme = CARD_THEME[cardId] || { fill: 0x3a3d45, stroke: 0x6f7480, short: '?' };
    this.g.fillStyle(card ? theme.fill : 0x282b31, card ? 1 : 0.68);
    this.g.lineStyle(2, card ? theme.stroke : 0x6f7480, 0.75);
    this.g.fillRoundedRect(x, y, w, h, 6);
    this.g.strokeRoundedRect(x, y, w, h, 6);
    this.drawCenteredText(card ? theme.short : '-', x + w / 2, y + 8, 11, card ? '#111318' : '#d6d0c6');
    if (card) {
      this.drawCenteredText(String(card.cost), x + w / 2, y + 27, 10, '#ffffff');
      const typeIcon = card.spell ? '✦' : card.building ? '▣' : '';
      if (typeIcon) this.drawCenteredText(typeIcon, x + w - 9, y + 28, 9, '#ffffff');
    }
  }

  drawOverlay() {
    if (this.state.freezeMs > 0) {
      this.g.fillStyle(0xfff3b5, 0.11);
      this.g.fillRect(0, 0, ARENA_W, ARENA_H);
    }

    if (this.state.status === 'waiting') {
      this.g.fillStyle(0x0c0e11, 0.62);
      this.g.fillRect(0, 0, ARENA_W, ARENA_H);
      this.drawCenteredText('플레이어 대기 중', FIELD_CENTER_X, 286, 30, '#f7f2e8');
      this.drawCenteredText(this.state.message || '필요 인원이 모두 들어오면 자동으로 시작됩니다.', FIELD_CENTER_X, 326, 16, '#d6d0c6');
    }

    if (this.state.status === 'ended') {
      this.g.fillStyle(0x0c0e11, 0.68);
      this.g.fillRect(0, 0, ARENA_W, ARENA_H);
      const result = this.state.winner === null ? '무승부' : `${teamName(this.state.winner)} 승리`;
      const rematchCount = this.state.players.filter((player) => player.rematchAccepted).length;
      const requiredRematches = this.state.maxPlayers || this.state.players.length || 2;
      this.drawCenteredText(result, FIELD_CENTER_X, 276, 34, '#f7f2e8');
      this.drawCenteredText(this.state.reason || '', FIELD_CENTER_X, 318, 17, '#d6d0c6');
      if (this.state.trophyChange) {
        const change = this.state.trophyChange;
        const sign = change.delta > 0 ? '+' : '';
        this.drawCenteredText(`트로피 ${sign}${change.delta} | 현재 ${change.trophies}개 | ${change.tierIcon} ${change.tier}`, FIELD_CENTER_X, 356, 15, '#fff4a7');
      }
      this.drawCenteredText(`재경기 동의 ${rematchCount}/${requiredRematches}`, FIELD_CENTER_X, 386, 15, '#fff4a7');
      this.drawCenteredText('모든 플레이어가 재경기를 누르면 같은 방에서 다시 시작합니다.', FIELD_CENTER_X, 414, 14, '#d6d0c6');
    }
  }

  isInDeployZone(x, y) {
    if (x < DEPLOY_X_MIN || x > DEPLOY_X_MAX) return false;
    const player = this.state && this.slot !== null && this.slot !== undefined ? this.state.players[this.slot] : null;
    const team = player ? player.team : this.slot;
    return this.getDeployZones(team).some((zone) => {
      return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
    });
  }

  canPlaySelectedAt(x, y) {
    const card = this.getSelectedCard();
    if (card && card.spell) return x >= 28 && x <= ARENA_W - 28 && y >= 28 && y <= ARENA_H - 28;
    return this.isInDeployZone(x, y);
  }

  getSelectedCard() {
    const player = this.state && this.slot !== null && this.slot !== undefined ? this.state.players[this.slot] : null;
    const cardId = player && player.hand && player.hand[this.selectedHandIndex];
    return this.cards[cardId];
  }

  getDeployZones(team) {
    const base = team === 0
      ? { x: DEPLOY_X_MIN, y: BOTTOM_DEPLOY_Y_MIN, w: DEPLOY_X_MAX - DEPLOY_X_MIN, h: BOTTOM_DEPLOY_Y_MAX - BOTTOM_DEPLOY_Y_MIN }
      : { x: DEPLOY_X_MIN, y: TOP_DEPLOY_Y_MIN, w: DEPLOY_X_MAX - DEPLOY_X_MIN, h: TOP_DEPLOY_Y_MAX - TOP_DEPLOY_Y_MIN };
    const zones = [base];
    const enemyTeam = 1 - team;
    const enemySide = team === 0
      ? { y: TOP_DEPLOY_Y_MIN, h: TOP_DEPLOY_Y_MAX - TOP_DEPLOY_Y_MIN }
      : { y: BOTTOM_DEPLOY_Y_MIN, h: BOTTOM_DEPLOY_Y_MAX - BOTTOM_DEPLOY_Y_MIN };

    if (this.isPrincessTowerDestroyed(enemyTeam, 'princess-left')) {
      zones.push({ x: DEPLOY_X_MIN, y: enemySide.y, w: FIELD_CENTER_X - DEPLOY_X_MIN, h: enemySide.h, expanded: true });
    }
    if (this.isPrincessTowerDestroyed(enemyTeam, 'princess-right')) {
      zones.push({ x: FIELD_CENTER_X, y: enemySide.y, w: DEPLOY_X_MAX - FIELD_CENTER_X, h: enemySide.h, expanded: true });
    }

    return zones;
  }

  isPrincessTowerDestroyed(owner, type) {
    return Boolean(this.state && Array.isArray(this.state.towers) && this.state.towers.some((tower) => {
      return tower.owner === owner && tower.type === type && tower.hp <= 0;
    }));
  }

  getVisualRadius(cardId) {
    if (cardId === 'dagwasil' || cardId === 'cherryTree') return 34;
    if (cardId === 'yushin') return 10;
    if (cardId === 'kimgeunyoung') return 24;
    if (cardId === 'giantHyeonjik') return 31;
    if (cardId === 'baduk') return 23;
    if (cardId === 'bbatman') return 15;
    if (cardId === 'seongjoo') return 15;
    if (cardId === 'kimrui') return 16;
    if (cardId === 'heoseon') return 14;
    if (cardId === 'taegeonBumperCar') return 16;
    if (cardId === 'osj') return 22;
    if (cardId === 'geunyoungTank') return 16;
    if (cardId === 'nerdMale' || cardId === 'nerdFemale') return 15;
    return 18;
  }

  effectDuration(type) {
    if (type === 'ascension-start') return 2500;
    if (type === 'ascension-end') return 850;
    if (type === 'sudden-death') return 1600;
    if (type === 'sonic') return 950;
    if (type === 'chaos') return 950;
    if (type === 'awaken') return 1200;
    if (type === 'berserk') return 1200;
    if (type === 'johyunwoo-rage') return 1300;
    if (type === 'windup') return 820;
    if (type === 'punchline') return 1050;
    if (type === 'jimin-yushin-counter') return 1250;
    if (type === 'best-friend-combo') return 1300;
    if (type === 'deploy') return 1100;
    if (type === 'summon-minion') return 700;
    if (type === 'snack-spawn') return 720;
    if (type === 'cherry-shot') return 580;
    if (type === 'king-return') return 1800;
    if (type === 'leech') return 760;
    if (type === 'leech-detach') return 620;
    if (type === 'tower-shot') return 450;
    if (type === 'push') return 760;
    if (type === 'berserk-hit') return 520;
    if (type === 'gas-zone') return 4000;
    if (type === 'meteor') return 900;
    if (type === 'bumper-explosion') return 850;
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

function teamName(team) {
  return team === 0 ? '아래 진영' : '위 진영';
}

function truncateText(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
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

function getEffectiveCardCost(card, player) {
  if (!card) return Infinity;
  if (isBestFriendCard(card.id) && hasBestFriendCombo(player)) return BEST_FRIEND_COMBO_COST;
  return card.cost;
}

function isBestFriendCard(cardId) {
  return BEST_FRIEND_PAIR.includes(cardId);
}

function hasBestFriendCombo(player) {
  if (!player || !Array.isArray(player.hand)) return false;
  return BEST_FRIEND_PAIR.every((cardId) => player.hand.includes(cardId));
}

function setupShell() {
  const themeButton = document.getElementById('theme-toggle');
  const authScreen = document.getElementById('auth-screen');
  const homeScreen = document.getElementById('home-screen');
  const brandHomeButton = document.getElementById('brand-home');
  const updateHistoryScreen = document.getElementById('update-history-screen');
  const roomScreen = document.getElementById('room-screen');
  const encyclopediaScreen = document.getElementById('encyclopedia-screen');
  const rankingScreen = document.getElementById('ranking-screen');
  const tierScreen = document.getElementById('tier-screen');
  const deckScreen = document.getElementById('deck-screen');
  const gameScreen = document.getElementById('game-screen');
  const startButton = document.getElementById('start-game');
  const deckButton = document.getElementById('open-deck-builder');
  const encyclopediaButton = document.getElementById('open-encyclopedia');
  const rankingButton = document.getElementById('open-ranking');
  const updateHistoryButton = document.getElementById('open-update-history');
  const tierButton = document.getElementById('open-tier-chart');
  const backUpdateHistoryButton = document.getElementById('back-update-history');
  const backRankingButton = document.getElementById('back-ranking');
  const backTierButton = document.getElementById('back-tier');
  const backDeckButton = document.getElementById('back-deck');
  const backButton = document.getElementById('back-home');
  const backMainButton = document.getElementById('back-main');
  const saveDeckButton = document.getElementById('save-deck');
  const logoutButton = document.getElementById('logout');
  const leaveRoomButton = document.getElementById('leave-room');
  const rematchRoomButton = document.getElementById('rematch-room');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showSignupButton = document.getElementById('show-signup');
  const showLoginButton = document.getElementById('show-login');
  const authPanels = [...document.querySelectorAll('[data-auth-panel]')];
  const createRoomForm = document.getElementById('create-room-form');
  const refreshRoomsButton = document.getElementById('refresh-rooms');
  const watchRoomsButton = document.getElementById('watch-rooms');
  const roomModeSelect = document.getElementById('room-mode');
  const createTeamField = document.getElementById('create-team-field');

  initializeTheme(themeButton);
  renderCharacterGrid();
  renderPatchNotices();
  updateCreateTeamField();

  setAuthMode('login');
  showScreen(authScreen);
  loadSession();

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitAuth('login', 'login-message');
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitAuth('signup', 'signup-message');
  });

  showSignupButton.addEventListener('click', () => {
    setAuthMode('signup');
  });

  showLoginButton.addEventListener('click', () => {
    setAuthMode('login');
  });

  brandHomeButton.addEventListener('click', () => {
    showScreen(currentUser ? homeScreen : authScreen);
  });

  startButton.addEventListener('click', () => {
    showScreen(roomScreen);
    connectSocket();
    showingSpectatorRooms = false;
    updateRoomListMode();
    requestRooms();
  });

  deckButton.addEventListener('click', async () => {
    showScreen(deckScreen);
    await loadDeckBuilder();
  });

  encyclopediaButton.addEventListener('click', () => {
    showScreen(encyclopediaScreen);
  });

  rankingButton.addEventListener('click', async () => {
    showScreen(rankingScreen);
    await loadRankings();
  });

  updateHistoryButton.addEventListener('click', () => {
    renderUpdateHistory();
    showScreen(updateHistoryScreen);
  });

  tierButton.addEventListener('click', async () => {
    showScreen(tierScreen);
    await loadTiers();
  });

  backUpdateHistoryButton.addEventListener('click', () => {
    showScreen(homeScreen);
  });

  backRankingButton.addEventListener('click', () => {
    showScreen(homeScreen);
  });

  backTierButton.addEventListener('click', () => {
    showScreen(homeScreen);
  });

  backDeckButton.addEventListener('click', () => {
    showScreen(homeScreen);
  });

  backButton.addEventListener('click', () => {
    showScreen(homeScreen);
  });

  backMainButton.addEventListener('click', () => {
    showScreen(homeScreen);
  });

  logoutButton.addEventListener('click', async () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    await apiRequest('/api/logout', { method: 'POST' });
    currentUser = null;
    currentRoom = null;
    currentSlot = null;
    latestState = null;
    resetAuthForms();
    setAuthMode('login');
    showScreen(authScreen);
  });

  createRoomForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('room-name').value;
    const password = document.getElementById('room-password').value;
    const mode = document.getElementById('room-mode').value;
    const team = document.getElementById('room-team').value;
    connectSocket();
    getSocket().emit('create-room', { name, password, mode, team: mode === '2v2' ? team : null });
  });

  if (roomModeSelect) {
    roomModeSelect.addEventListener('change', updateCreateTeamField);
  }

  refreshRoomsButton.addEventListener('click', () => {
    if (showingSpectatorRooms) requestSpectatorRooms();
    else requestRooms();
  });

  watchRoomsButton.addEventListener('click', () => {
    showingSpectatorRooms = !showingSpectatorRooms;
    updateRoomListMode();
    if (showingSpectatorRooms) requestSpectatorRooms();
    else requestRooms();
  });

  leaveRoomButton.addEventListener('click', () => {
    if (socket) socket.emit('leave-room');
    currentRoom = null;
    currentSlot = null;
    isSpectating = false;
    latestState = null;
    updateRematchControls();
    showingSpectatorRooms = false;
    updateRoomListMode();
    showScreen(roomScreen);
    requestRooms();
  });

  rematchRoomButton.addEventListener('click', () => {
    if (socket) socket.emit('request-rematch');
    updateRematchControls(true);
  });

  const battleChatForm = document.getElementById('battle-chat-form');
  if (battleChatForm) {
    battleChatForm.addEventListener('submit', sendBattleChat);
  }

  saveDeckButton.addEventListener('click', saveDeck);

  function showScreen(target) {
    for (const screen of [authScreen, homeScreen, updateHistoryScreen, roomScreen, encyclopediaScreen, rankingScreen, tierScreen, deckScreen, gameScreen]) {
      screen.classList.toggle('hidden', screen !== target);
    }
  }

  function setAuthMode(mode) {
    clearAuthMessages();
    for (const panel of authPanels) {
      const isActive = panel.dataset.authPanel === mode;
      panel.classList.toggle('hidden', !isActive);
      panel.setAttribute('aria-hidden', String(!isActive));
    }
  }

  function updateCreateTeamField() {
    if (!roomModeSelect || !createTeamField) return;
    createTeamField.classList.toggle('hidden', roomModeSelect.value !== '2v2');
  }

  function updateRoomListMode() {
    const heading = document.getElementById('room-list-heading');
    const roomList = document.getElementById('room-list');
    const spectatorList = document.getElementById('spectator-room-list');
    if (heading) heading.textContent = showingSpectatorRooms ? '관전 가능한 경기' : '대기 중인 방';
    if (watchRoomsButton) watchRoomsButton.textContent = showingSpectatorRooms ? '대기방 보기' : '관전하기';
    if (roomList) roomList.classList.toggle('hidden', showingSpectatorRooms);
    if (spectatorList) spectatorList.classList.toggle('hidden', !showingSpectatorRooms);
  }

  window.showGameScreen = () => {
    showScreen(gameScreen);
    startGame();
  };

  window.showHomeScreen = () => showScreen(homeScreen);
  window.showRoomScreen = () => showScreen(roomScreen);
}

function initializeTheme(button) {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
  applyTheme(theme, button);

  if (!button) return;
  button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme, button);
  });
}

function applyTheme(theme, button) {
  document.documentElement.dataset.theme = theme;
  if (!button) return;

  const isLight = theme === 'light';
  button.textContent = isLight ? '다크 모드' : '라이트 모드';
  button.setAttribute('aria-label', isLight ? '다크 모드 켜기' : '라이트 모드 켜기');
  button.setAttribute('aria-pressed', String(isLight));
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

async function loadSession() {
  try {
    const data = await apiRequest('/api/me');
    currentUser = data.user;
    renderProfile();
    await loadRankings();
    connectSocket();
    window.showHomeScreen();
  } catch {
    // Unauthenticated visitors stay on the auth screen. Do not clear a login that just completed.
  }
}

async function submitAuth(type, messageId) {
  const username = document.getElementById(`${type}-username`).value.trim();
  const password = document.getElementById(`${type}-password`).value;
  const form = document.getElementById(`${type}-form`);
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;
  try {
    clearAuthMessages();
    if (submitButton) submitButton.disabled = true;
    const data = await apiRequest(`/api/${type}`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    finishAuth(data.user);
  } catch (error) {
    setMessage(messageId, error.message || '처리하지 못했습니다.');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function finishAuth(user) {
  currentUser = user;
  currentRoom = null;
  currentSlot = null;
  latestState = null;
  renderProfile();
  loadRankings();
  window.showHomeScreen();
  resetAuthForms();
  connectSocket();
}

function clearAuthMessages() {
  setMessage('login-message', '');
  setMessage('signup-message', '');
}

function resetAuthForms() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm) loginForm.reset();
  if (signupForm) signupForm.reset();
  clearAuthMessages();
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '요청에 실패했습니다.');
  }
  return data;
}

function connectSocket() {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();

  socket = io({ transports: ['websocket'] });
  socket.on('welcome', (payload) => {
    serverCards = payload.cards || {};
    if (payload.user) {
      currentUser = payload.user;
      renderProfile();
    }
    if (activeScene) activeScene.receiveWelcome(payload);
  });
  socket.on('profile', (profile) => {
    currentUser = profile;
    renderProfile();
    loadRankings();
  });
  socket.on('rooms', renderRoomList);
  socket.on('spectator-rooms', (rooms) => {
    latestSpectatorRooms = rooms || [];
    renderSpectatorRoomList(latestSpectatorRooms);
  });
  socket.on('room-joined', (payload) => {
    currentRoom = payload.room;
    currentSlot = payload.slot;
    isSpectating = false;
    resetBattleChat();
    setMessage('room-message', '');
    updateGameRoomTitle();
    window.showGameScreen();
  });
  socket.on('spectator-joined', (payload) => {
    currentRoom = payload.room;
    currentSlot = null;
    isSpectating = true;
    resetBattleChat();
    setMessage('room-message', '');
    updateGameRoomTitle();
    window.showGameScreen();
  });
  socket.on('room-left', () => {
    currentRoom = null;
    currentSlot = null;
    isSpectating = false;
    latestState = null;
    resetBattleChat();
    updateRematchControls();
    window.showRoomScreen();
  });
  socket.on('room-error', (message) => {
    setMessage('room-message', message);
  });
  socket.on('state', (state) => {
    latestState = state;
    if (state.room) currentRoom = state.room;
    isSpectating = Boolean(state.spectator);
    syncBattleChatMessages(state.chatMessages || []);
    updateGameRoomTitle();
    updateRematchControls();
    if (activeScene) activeScene.receiveState(state);
  });
  socket.on('battle-chat', (message) => {
    appendBattleChatMessage(message);
  });
  socket.on('chat-error', (message) => {
    setMessage('room-message', message || '');
  });
  socket.on('effect', (effect) => {
    if (activeScene) activeScene.receiveEffect(effect);
  });
  socket.on('spectator-count', (payload) => {
    if (latestState && currentRoom && payload && payload.roomId === currentRoom.id) {
      latestState.spectatorCount = payload.count;
      latestState.maxSpectators = payload.max;
      if (activeScene) activeScene.receiveState(latestState);
      updateGameRoomTitle();
    }
  });
  socket.on('connect_error', (error) => {
    setMessage('room-message', error.message || '서버에 연결하지 못했습니다.');
  });
  return socket;
}

function getSocket() {
  return socket;
}

async function requestRooms() {
  try {
    const data = await apiRequest('/api/rooms');
    renderRoomList(data.rooms || []);
  } catch (error) {
    setMessage('room-message', error.message || '방 목록을 가져오지 못했습니다.');
  }
}

function requestSpectatorRooms() {
  connectSocket();
  getSocket().emit('request-spectator-rooms');
}

async function loadRankings() {
  if (!currentUser) return;
  try {
    const data = await apiRequest('/api/rankings');
    latestRankings = data.rankings || [];
    renderTopRankings();
    renderRankingList();
  } catch (error) {
    renderTopRankings(error.message || '랭킹을 가져오지 못했습니다.');
    renderRankingList(error.message || '랭킹을 가져오지 못했습니다.');
  }
}

async function loadTiers() {
  if (!currentUser) return;
  try {
    const data = await apiRequest('/api/tiers');
    latestTiers = data.tiers || [];
    if (data.user) {
      currentUser = data.user;
      renderProfile();
    }
    renderTierList();
  } catch (error) {
    renderTierList(error.message || '티어표를 가져오지 못했습니다.');
  }
}

async function loadDeckBuilder() {
  if (!currentUser) return;
  setMessage('deck-message', '덱을 불러오는 중...');
  try {
    const data = await apiRequest('/api/deck');
    deckCards = data.cards || {};
    selectedDeck = Array.isArray(data.deck) ? [...data.deck] : [];
    setMessage('deck-message', selectedDeck.length === DECK_SIZE ? '저장된 덱입니다.' : '카드 8장을 선택하세요.');
    renderDeckBuilder();
  } catch (error) {
    setMessage('deck-message', error.message || '덱을 불러오지 못했습니다.');
    renderDeckBuilder();
  }
}

async function saveDeck() {
  if (selectedDeck.length !== DECK_SIZE) {
    setMessage('deck-message', `카드 ${DECK_SIZE}장을 선택해야 저장할 수 있습니다.`);
    return;
  }

  const button = document.getElementById('save-deck');
  try {
    if (button) button.disabled = true;
    const data = await apiRequest('/api/deck', {
      method: 'PUT',
      body: JSON.stringify({ deck: selectedDeck })
    });
    deckCards = data.cards || deckCards;
    selectedDeck = Array.isArray(data.deck) ? [...data.deck] : selectedDeck;
    setMessage('deck-message', '덱을 저장했습니다. 다음 경기부터 이 덱으로 시작합니다.');
    renderDeckBuilder();
  } catch (error) {
    setMessage('deck-message', error.message || '덱을 저장하지 못했습니다.');
    renderDeckBuilder();
  }
}

function renderDeckBuilder() {
  renderSelectedDeck();
  renderDeckCardGrid();
}

function renderSelectedDeck() {
  const count = document.getElementById('deck-count');
  const list = document.getElementById('selected-deck-list');
  const saveButton = document.getElementById('save-deck');
  if (count) count.textContent = `${selectedDeck.length} / ${DECK_SIZE}`;
  if (saveButton) saveButton.disabled = selectedDeck.length !== DECK_SIZE;
  if (!list) return;

  list.replaceChildren();
  for (let i = 0; i < DECK_SIZE; i += 1) {
    const cardId = selectedDeck[i];
    const card = deckCards[cardId];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'selected-deck-slot';
    if (!card) {
      slot.classList.add('selected-deck-slot-empty');
      const number = document.createElement('b');
      number.textContent = String(i + 1);
      const label = document.createElement('span');
      label.textContent = '빈 카드';
      const meta = document.createElement('small');
      meta.textContent = '아래에서 선택';
      slot.append(number, label, meta);
      slot.disabled = true;
    } else {
      const theme = CARD_THEME[cardId] || { short: '?' };
      const badge = document.createElement('b');
      badge.textContent = theme.short;
      const name = document.createElement('span');
      name.textContent = card.name;
      const meta = document.createElement('small');
      meta.textContent = `${card.cost} 엘릭서`;
      slot.append(badge, name, meta);
      slot.addEventListener('click', () => {
        selectedDeck.splice(i, 1);
        setMessage('deck-message', '선택한 카드를 뺐습니다.');
        renderDeckBuilder();
      });
    }
    list.appendChild(slot);
  }
}

function renderDeckCardGrid() {
  const grid = document.getElementById('deck-card-grid');
  if (!grid) return;
  grid.replaceChildren();

  const cards = Object.values(deckCards).filter((card) => card && card.id);
  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '카드 목록을 불러오지 못했습니다.';
    grid.appendChild(empty);
    return;
  }

  for (const card of cards) {
    grid.appendChild(deckPoolCard(card));
  }
}

function deckPoolCard(card) {
  const selected = selectedDeck.includes(card.id);
  const full = selectedDeck.length >= DECK_SIZE;
  const theme = CARD_THEME[card.id] || { fill: 0xcaa862, short: '?' };
  const detail = CHARACTER_DETAILS.find((character) => character.id === card.id);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'deck-pool-card';
  if (card.spell) button.classList.add('deck-pool-card-spell');
  if (card.building) button.classList.add('deck-pool-card-building');
  if (selected) button.classList.add('deck-pool-card-selected');
  button.disabled = full && !selected;
  button.style.setProperty('--card-accent', `#${theme.fill.toString(16).padStart(6, '0')}`);

  const badge = document.createElement('b');
  badge.textContent = theme.short;
  const name = document.createElement('span');
  name.textContent = card.name;
  const meta = document.createElement('small');
  meta.textContent = `${card.cost} 엘릭서 · ${card.spell ? '마법' : card.building ? '건물' : card.role}`;
  const type = document.createElement('em');
  type.textContent = detail ? detail.type : card.role;

  button.append(badge, name, meta, type);
  button.addEventListener('click', () => {
    const index = selectedDeck.indexOf(card.id);
    if (index >= 0) {
      selectedDeck.splice(index, 1);
      setMessage('deck-message', '선택한 카드를 뺐습니다.');
    } else if (selectedDeck.length < DECK_SIZE) {
      selectedDeck.push(card.id);
      setMessage('deck-message', selectedDeck.length === DECK_SIZE ? '저장할 수 있습니다.' : '카드를 더 선택하세요.');
    }
    renderDeckBuilder();
  });

  return button;
}

function renderProfile() {
  const summary = document.getElementById('profile-summary');
  if (!summary || !currentUser) return;
  summary.replaceChildren(
    profileStat('이름', currentUser.username),
    profileStat('트로피', `${currentUser.trophies}개`),
    profileTierStat()
  );
}

function renderTopRankings(errorMessage = '') {
  const list = document.getElementById('top-ranking-list');
  if (!list) return;
  list.replaceChildren();

  if (errorMessage) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = errorMessage;
    list.appendChild(empty);
    return;
  }

  const topThree = latestRankings.slice(0, 3);
  if (topThree.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '아직 랭킹이 없습니다.';
    list.appendChild(empty);
    return;
  }

  for (const entry of topThree) {
    list.appendChild(rankingPodiumItem(entry));
  }
}

function renderPatchNotices() {
  const list = document.getElementById('patch-notice-list');
  if (!list) return;
  list.replaceChildren();

  for (const notice of PATCH_NOTICES.slice(0, 3)) {
    list.appendChild(patchNoticeArticle(notice, { compact: true, showDetails: false }));
  }
}

function renderUpdateHistory() {
  const list = document.getElementById('update-history-list');
  if (!list) return;
  list.replaceChildren();

  for (const notice of PATCH_NOTICES) {
    list.appendChild(patchNoticeArticle(notice, { showDetails: true }));
  }
}

function patchNoticeArticle(notice, options = {}) {
  const compact = Boolean(options.compact);
  const showDetails = options.showDetails !== false;
  const article = document.createElement('article');
  article.className = 'patch-notice';
  if (compact) article.classList.add('patch-notice-compact');

  const header = document.createElement('div');
  header.className = 'patch-notice-header';

  const title = document.createElement('strong');
  title.textContent = notice.title;
  const date = document.createElement('time');
  date.textContent = notice.date;

  header.append(title, date);

  const items = document.createElement('ul');
  for (const itemText of notice.items) {
    const item = document.createElement('li');
    item.textContent = itemText;
    items.appendChild(item);
  }

  article.append(header, items);

  if (showDetails && Array.isArray(notice.details) && notice.details.length > 0) {
    const detailButton = document.createElement('button');
    detailButton.type = 'button';
    detailButton.className = 'patch-detail-toggle secondary';
    detailButton.textContent = '자세히 보기';

    const detail = document.createElement('div');
    detail.className = 'patch-notice-detail hidden';
    const detailList = document.createElement('ul');
    for (const detailText of notice.details) {
      const item = document.createElement('li');
      item.textContent = detailText;
      detailList.appendChild(item);
    }
    detail.appendChild(detailList);

    detailButton.addEventListener('click', () => {
      const isHidden = detail.classList.toggle('hidden');
      detailButton.textContent = isHidden ? '자세히 보기' : '간단히 보기';
    });

    article.append(detailButton, detail);
  }

  return article;
}

function renderTierList(errorMessage = '') {
  const summary = document.getElementById('tier-current-summary');
  const list = document.getElementById('tier-list');
  if (!summary || !list) return;

  summary.replaceChildren();
  list.replaceChildren();

  if (errorMessage) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = errorMessage;
    list.appendChild(empty);
    return;
  }

  if (latestTiers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '아직 티어표가 없습니다.';
    list.appendChild(empty);
    return;
  }

  const currentTier = latestTiers.find((tier) => tier.key === currentUser.tierKey);
  const nextTier = latestTiers.find((tier) => tier.min > currentUser.trophies);
  summary.appendChild(tierSummaryCard(currentTier, nextTier));

  for (const tier of [...latestTiers].reverse()) {
    list.appendChild(tierRow(tier, tier.key === currentUser.tierKey));
  }
}

function tierSummaryCard(currentTier, nextTier) {
  const card = document.createElement('article');
  card.className = 'tier-current-card';

  const icon = document.createElement('strong');
  icon.textContent = currentTier ? currentTier.icon : '?';

  const info = document.createElement('div');
  const title = document.createElement('span');
  title.textContent = currentTier ? `현재 위치: ${currentTier.name}` : '현재 위치 확인 불가';
  const detail = document.createElement('small');
  if (nextTier) {
    detail.textContent = `내 트로피 ${currentUser.trophies}개 · 다음 티어까지 ${Math.max(0, nextTier.min - currentUser.trophies)}개`;
  } else {
    detail.textContent = `내 트로피 ${currentUser.trophies}개 · 최고 티어`;
  }
  info.append(title, detail);
  card.append(icon, info);
  return card;
}

function tierRow(tier, isCurrent) {
  const row = document.createElement('article');
  row.className = 'tier-row';
  if (isCurrent) row.classList.add('tier-row-current');

  const icon = document.createElement('strong');
  icon.textContent = tier.icon;

  const info = document.createElement('div');
  const name = document.createElement('span');
  name.textContent = tier.name;
  const range = document.createElement('small');
  range.textContent = tierRangeText(tier);
  info.append(name, range);

  const status = document.createElement('b');
  status.textContent = isCurrent ? `내 위치 · ${currentUser.trophies}개` : ' ';
  status.setAttribute('aria-label', isCurrent ? '현재 내 위치' : tier.name);

  row.append(icon, info, status);
  return row;
}

function tierRangeText(tier) {
  if (tier.max === null || tier.max === undefined) return `${tier.min}개 이상`;
  return `${tier.min}~${tier.max}개`;
}

function rankingPodiumItem(entry) {
  const item = document.createElement('article');
  item.className = `ranking-podium ranking-podium-${entry.rank}`;

  const rank = document.createElement('strong');
  rank.textContent = `${entry.rank}등`;
  const name = document.createElement('span');
  name.textContent = entry.username;
  const tier = document.createElement('small');
  tier.textContent = `${entry.tierIcon} ${entry.tier}`;

  item.append(rank, name, tier);
  return item;
}

function renderRankingList(errorMessage = '') {
  const list = document.getElementById('ranking-list');
  if (!list) return;
  list.replaceChildren();

  if (errorMessage) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = errorMessage;
    list.appendChild(empty);
    return;
  }

  if (latestRankings.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '아직 랭킹이 없습니다.';
    list.appendChild(empty);
    return;
  }

  for (const entry of latestRankings) {
    const row = document.createElement('article');
    row.className = 'ranking-row';
    const rank = document.createElement('strong');
    rank.textContent = `${entry.rank}`;
    const info = document.createElement('div');
    const name = document.createElement('span');
    name.textContent = entry.username;
    const tier = document.createElement('small');
    tier.textContent = `${entry.tierIcon} ${entry.tier}`;
    const trophies = document.createElement('b');
    trophies.textContent = `${entry.trophies}개`;
    info.append(name, tier);
    row.append(rank, info, trophies);
    list.appendChild(row);
  }
}

function profileStat(label, value) {
  const item = document.createElement('div');
  item.className = 'profile-stat';
  const caption = document.createElement('span');
  caption.textContent = label;
  const content = document.createElement('strong');
  content.textContent = value;
  item.append(caption, content);
  return item;
}

function profileTierStat() {
  const item = document.createElement('div');
  item.className = 'profile-stat profile-tier-stat';

  const caption = document.createElement('span');
  caption.textContent = '티어';
  const content = document.createElement('strong');
  content.textContent = `${currentUser.tierIcon} ${currentUser.tier}`;

  const progress = tierProgressForUser(currentUser);
  const progressLabel = document.createElement('small');
  progressLabel.textContent = progress.label;

  const bar = document.createElement('div');
  bar.className = 'tier-progress-bar';
  const fill = document.createElement('i');
  fill.style.width = `${Math.round(progress.ratio * 100)}%`;
  bar.appendChild(fill);

  item.append(caption, content, progressLabel, bar);
  return item;
}

function tierProgressForUser(user) {
  const trophies = Math.max(0, Number(user.trophies) || 0);
  if (!user.nextTier) {
    return { ratio: 1, label: '최고 티어 달성' };
  }

  const tierStartValue = Number(user.tierMin);
  const tierStart = Number.isFinite(tierStartValue) ? tierStartValue : 0;
  const nextMin = Math.max(tierStart + 1, Number(user.nextTier.min) || tierStart + 1);
  const current = clampNumber(trophies - tierStart, 0, nextMin - tierStart);
  const ratio = clampNumber((nextMin - tierStart) > 0 ? current / (nextMin - tierStart) : 1, 0, 1);
  const remaining = Math.max(0, nextMin - trophies);
  return {
    ratio,
    label: `${user.nextTier.icon || ''} ${user.nextTier.name}까지 ${remaining}개`
  };
}

function renderRoomList(rooms) {
  const list = document.getElementById('room-list');
  if (!list) return;
  list.replaceChildren();

  if (!rooms || rooms.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '대기 중인 방이 없습니다.';
    list.appendChild(empty);
    return;
  }

  for (const room of rooms) {
    const card = document.createElement('article');
    card.className = 'room-card';

    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = `${room.locked ? '잠금 ' : ''}${room.name}`;
    const meta = document.createElement('p');
    meta.className = 'room-meta';
    const teamSummary = room.mode === '2v2' ? ` · ${roomTeamSummary(room)}` : '';
    meta.textContent = `${room.modeLabel || '1대1'} · ${room.playerCount}/${room.maxPlayers}명 대기${teamSummary}`;
    info.append(title, meta);

    const password = document.createElement('input');
    password.type = 'password';
    password.maxLength = 32;
    password.placeholder = room.locked ? '비밀번호' : '공개 방';
    password.disabled = !room.locked;

    const joinArea = document.createElement('div');
    joinArea.className = room.mode === '2v2' ? 'room-team-actions' : 'room-join-actions';

    if (room.mode === '2v2') {
      for (const team of roomTeamEntries(room)) {
        const joinButton = document.createElement('button');
        joinButton.type = 'button';
        joinButton.textContent = `${team.label} ${team.count}/${team.capacity}`;
        joinButton.disabled = team.full;
        joinButton.title = team.full ? '이미 가득 찬 팀입니다.' : `${team.label}으로 참가`;
        joinButton.addEventListener('click', () => {
          joinRoom(room, password.value, team.team);
        });
        joinArea.appendChild(joinButton);
      }
    } else {
      const joinButton = document.createElement('button');
      joinButton.type = 'button';
      joinButton.textContent = '참가';
      joinButton.addEventListener('click', () => {
        joinRoom(room, password.value);
      });
      joinArea.appendChild(joinButton);
    }

    card.append(info, password, joinArea);
    list.appendChild(card);
  }
}

function renderSpectatorRoomList(rooms) {
  const list = document.getElementById('spectator-room-list');
  if (!list) return;
  list.replaceChildren();

  if (!rooms || rooms.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '관전 가능한 진행 중 경기가 없습니다.';
    list.appendChild(empty);
    return;
  }

  for (const room of rooms) {
    const card = document.createElement('article');
    card.className = 'room-card spectator-room-card';

    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = room.battleLabel || room.name || '진행 중인 경기';
    const meta = document.createElement('p');
    meta.className = 'room-meta';
    meta.textContent = `${room.modeLabel || '1대1'} · 관전자 수: ${room.spectatorCount || 0}/${room.maxSpectators || 2}`;
    info.append(title, meta);

    const watchButton = document.createElement('button');
    watchButton.type = 'button';
    watchButton.textContent = room.full ? '가득 참' : '관전';
    watchButton.disabled = Boolean(room.full);
    watchButton.addEventListener('click', () => watchRoom(room));

    card.append(info, watchButton);
    list.appendChild(card);
  }
}

function joinRoom(room, password, team = null) {
  connectSocket();
  const payload = {
    roomId: room.id,
    password
  };
  if (team !== null && team !== undefined) payload.team = String(team);
  getSocket().emit('join-room', payload);
}

function watchRoom(room) {
  connectSocket();
  getSocket().emit('watch-room', { roomId: room.id });
}

function sendBattleChat(event) {
  event.preventDefault();
  if (!socket || !latestState || isSpectating) return;

  const input = document.getElementById('battle-chat-input');
  const channelSelect = document.getElementById('battle-chat-channel');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  socket.emit('battle-chat', {
    channel: channelSelect ? channelSelect.value : 'all',
    text
  });
  if (input) input.value = '';
}

function syncBattleChatMessages(messages) {
  battleChatMessages = Array.isArray(messages) ? messages.slice(-60) : [];
  renderBattleChat();
}

function appendBattleChatMessage(message) {
  if (!message || !message.id) return;
  if (battleChatMessages.some((existing) => existing.id === message.id)) return;
  battleChatMessages.push(message);
  battleChatMessages = battleChatMessages.slice(-60);
  renderBattleChat();
}

function resetBattleChat() {
  battleChatMessages = [];
  renderBattleChat();
}

function renderBattleChat() {
  const log = document.getElementById('battle-chat-log');
  if (!log) return;

  log.innerHTML = '';
  if (battleChatMessages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'battle-chat-empty';
    empty.textContent = '아직 채팅이 없습니다.';
    log.append(empty);
  } else {
    for (const message of battleChatMessages) {
      const row = document.createElement('div');
      row.className = `battle-chat-message ${message.channel === 'team' ? 'team' : 'all'}`;

      const meta = document.createElement('div');
      meta.className = 'battle-chat-meta';
      meta.textContent = `${message.channel === 'team' ? '팀' : '전체'} · ${message.username || '플레이어'}`;

      const text = document.createElement('div');
      text.className = 'battle-chat-text';
      text.textContent = message.text || '';

      row.append(meta, text);
      log.append(row);
    }
  }
  log.scrollTop = log.scrollHeight;
  updateBattleChatControls();
}

function updateBattleChatControls() {
  const status = document.getElementById('battle-chat-status');
  const channelSelect = document.getElementById('battle-chat-channel');
  const input = document.getElementById('battle-chat-input');
  const sendButton = document.getElementById('battle-chat-send');
  const player = latestState && currentSlot !== null && currentSlot !== undefined ? latestState.players[currentSlot] : null;
  const canSend = Boolean(latestState && latestState.status === 'playing' && player && player.connected && !isSpectating);
  const isTeamMode = Boolean(latestState && latestState.mode === '2v2');

  if (channelSelect) {
    channelSelect.disabled = !canSend || !isTeamMode;
    if (!isTeamMode) channelSelect.value = 'all';
  }
  if (input) {
    input.disabled = !canSend;
    input.placeholder = isSpectating ? '관전 중에는 채팅할 수 없습니다.' : '메시지 입력';
  }
  if (sendButton) sendButton.disabled = !canSend;
  if (status) {
    if (isSpectating) status.textContent = '관전';
    else if (isTeamMode) status.textContent = '전체 / 팀';
    else status.textContent = '전체';
  }
}

function roomTeamEntries(room) {
  if (Array.isArray(room.teams) && room.teams.length > 0) return room.teams;
  const capacity = 2;
  return [0, 1].map((team) => {
    const count = (room.players || []).filter((player) => player.team === team && player.connected).length;
    return {
      team,
      label: teamName(team),
      count,
      capacity,
      full: count >= capacity
    };
  });
}

function roomTeamSummary(room) {
  return roomTeamEntries(room)
    .map((team) => `${team.label} ${team.count}/${team.capacity}`)
    .join(' · ');
}

function updateGameRoomTitle() {
  const title = document.getElementById('game-room-title');
  if (!title) return;
  const roomName = currentRoom ? currentRoom.name : '전투 대기';
  const statePlayer = latestState && currentSlot !== null && currentSlot !== undefined ? latestState.players[currentSlot] : null;
  const side = isSpectating ? `관전 · 관전자 수: ${latestState ? latestState.spectatorCount || 0 : currentRoom && currentRoom.spectatorCount || 0}` : statePlayer ? teamName(statePlayer.team) : '대기';
  const mode = currentRoom && currentRoom.modeLabel ? currentRoom.modeLabel : '';
  title.textContent = `${roomName}${mode ? ` · ${mode}` : ''} · ${side}`;
  updateBattleChatControls();
}

function updateRematchControls(optimistic = false) {
  const button = document.getElementById('rematch-room');
  if (!button) return;

  const state = latestState;
  const player = state && currentSlot !== null && currentSlot !== undefined ? state.players[currentSlot] : null;
  const requiredPlayers = state ? state.maxPlayers || state.players.length : 2;
  const connectedPlayers = state ? state.players.filter((candidate) => candidate.connected).length : 0;
  const canRequest = Boolean(state && state.status === 'ended' && player && player.connected && connectedPlayers === requiredPlayers);
  const accepted = optimistic || Boolean(player && player.rematchAccepted);

  button.classList.toggle('hidden', !canRequest);
  button.disabled = !canRequest || accepted;
  button.textContent = accepted ? '동의 대기' : '재경기';
}

function setMessage(id, message) {
  const target = document.getElementById(id);
  if (target) target.textContent = message || '';
}

function playerTitle(player, fallbackNumber) {
  if (!player) return `${fallbackNumber}번`;
  const name = player.username || `${fallbackNumber}번`;
  const tier = player.tier ? `${player.tierIcon || ''} ${player.tier}` : '';
  return `${name} ${tier}`.trim();
}

function playAscensionTone() {
  const now = Date.now();
  if (now < ascensionAudioUntil) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.08);
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 2.3);
  master.connect(context.destination);

  const notes = [392, 523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.12 + index * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.5 + index * 0.12);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(context.currentTime + index * 0.04);
    oscillator.stop(context.currentTime + 2.4);
  });

  setTimeout(() => context.close(), 2600);
  ascensionAudioUntil = now + 2600;
}

function renderCharacterGrid() {
  const grid = document.getElementById('character-grid');
  if (!grid) return;

  grid.replaceChildren();

  for (const character of CHARACTER_DETAILS) {
    const theme = CARD_THEME[character.id] || { fill: 0xcaa862 };
    const article = document.createElement('article');
    article.className = `character-card character-card-${character.id}`;
    if (character.cardType === 'spell') article.classList.add('character-card-spell');
    if (character.cardType === 'building') article.classList.add('character-card-building');
    article.dataset.theme = theme.short;

    const heading = document.createElement('h2');
    heading.textContent = character.name;
    article.appendChild(heading);

    if (character.cardType === 'spell' || character.cardType === 'building') {
      const badge = document.createElement('p');
      badge.className = 'card-type-badge';
      badge.textContent = character.cardType === 'building' ? '건물 카드' : '마법 카드';
      article.appendChild(badge);
    }

    const details = document.createElement('dl');
    addDetail(details, '엘릭서 비용', character.cost);
    addDetail(details, '타입', character.type);
    addStats(details, character.stats || []);
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

function addStats(parent, stats) {
  const term = document.createElement('dt');
  term.textContent = '스탯';
  const description = document.createElement('dd');
  const list = document.createElement('div');
  list.className = 'character-stats';

  for (const [label, value] of stats) {
    const item = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = label;
    const statValue = document.createElement('em');
    statValue.textContent = value;
    item.append(name, statValue);
    list.appendChild(item);
  }

  description.appendChild(list);
  parent.append(term, description);
}

setupShell();
