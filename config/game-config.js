// config/game-config.js (TikTok版 v2 - テンプレート化)
// 「TikTokバズ動画生成テンプレート」のデータ本体。
// TapEngine本体(engine/配下)はこのファイルの内容を一切知らない。
//
// [テンプレート化の要点]
// config.character に選手アイデンティティ(名前・配色・勝利テキスト)を集約したため、
// 将来Messi/Ronaldo等へ差し替える場合は、この character ブロックと
// timeline.events内のキャプション文言(プレースホルダで自動反映)を
// 差し替えるだけで別動画テンプレートが完成する。
//
// [Director Systemの駆動方式]
// timeline.events は {atMs, type, ...} のフラットな配列。
// src/systems/director-system.js はtype名でディスパッチテーブルを引くだけで、
// if(stage===...)のような分岐を増やさずに新しい演出を追加できる設計になっている。

export default {
  meta: {
    title: 'HAALAND VIKING ROW',
    subtitle: 'TikTok Edition - Can you row faster?',
    version: '2.0.0-tiktok-template'
  },

  recordMode: true,

  // [テンプレート化の核] 選手アイデンティティを1ブロックに集約。
  // 将来別の選手版を作る場合はこのオブジェクトを差し替えるだけでよい。
  character: {
    playerName: 'Haaland',
    title: 'HAALAND',
    subtitle: 'VIKING ROW',
    themeColor: '#ffd54a',       // UIのアクセントカラー(旧config.ui.color.primary相当)
    victoryTitle: "BALLON D'OR",
    // voiceStyle / effectsThemeは将来のSE差し替え・演出プリセット切り替えのための
    // 予約フィールド(現バージョンでは未使用だが、テンプレートのスキーマとして保持する)
    voiceStyle: 'viking-monster',
    effectsTheme: 'norse',

    palette: {
      hairColor: '#f5d36a',
      hairShadow: '#d9ad3f',
      skinColor: '#f3c98b',
      browColor: '#e8c468',
      eyeWhiteColor: '#ffffff',
      eyeColor: '#5aa9e6',
      eyePupilColor: '#1a2a3a',
      mouthColor: '#5a1010',
      cheekColor: '#ff8fa3',
      outlineColor: '#241206'
    },

    uniform: {
      primary: '#c8102e',
      shadow: '#8a0b1f',
      accent: '#f4f8ff',
      number: '9',
      numberColor: '#ffffff'
    },

    baseScale: 1.3,
    // ステージ解放が進むほど怪物的に大きくなる(0=待機状態, 7=Ballon d'Or climax)
    stageScale: { 0: 1, 1: 1.02, 2: 1.08, 3: 1.18, 4: 1.26, 5: 1.36, 6: 1.55, 7: 1.8 },
    auraColors: {
      3: 'rgba(255,110,40,0.6)',
      4: 'rgba(255,255,255,0.55)',
      5: 'rgba(160,120,255,0.5)',
      6: 'rgba(255,213,74,0.65)',
      7: 'rgba(255,213,74,0.85)'
    }
  },

  visual: {
    backgroundStages: {
      0: { skyTop: '#123a5e', skyBottom: '#1c5c86', sea: '#0d3b57' },
      1: { skyTop: '#123a5e', skyBottom: '#1c5c86', sea: '#0d3b57' },
      2: { skyTop: '#0f2f4d', skyBottom: '#1a4f75', sea: '#0b3450' },
      3: { skyTop: '#3a0f0f', skyBottom: '#7a2a12', sea: '#2a1210' },
      4: { skyTop: '#0a0a1a', skyBottom: '#1a1a30', sea: '#0a1420' },
      5: { skyTop: '#050a1e', skyBottom: '#0a1730', sea: '#04101c' },
      6: { skyTop: '#241200', skyBottom: '#5a3200', sea: '#0a1420' },
      7: { skyTop: '#2a1300', skyBottom: '#6a3a00', sea: '#0a1420' }
    },
    mountains: '#08182a',
    mountainSnow: '#eaf3ff',
    auroraColors: ['#7effc0', '#7ecbff', '#c07eff', '#ff8fd6'],
    starColor: '#f4f8ff',

    ship: {
      hullColor: '#5a3b1e',
      hullDarkColor: '#3d2712',
      deckColor: '#7a5230',
      dragonColor: '#4f7a3d',
      dragonEyeColor: '#ffd54a',
      shieldColors: ['#c8102e', '#f4f8ff', '#ffd54a'],
      oarColor: '#4a2f16',
      wakeColor: 'rgba(244, 248, 255, 0.6)',
      width: 210,
      height: 54
    },

    fire: { colors: ['#ffce54', '#ff9a3c', '#ff6a2b', '#c8321a'], flickerSpeed: 13 },
    lightning: {
      minIntervalMs: 900,
      maxIntervalMs: 2200,
      boltColor: 'rgba(255,255,255,0.95)',
      flashColor: 'rgba(255,255,255,0.55)',
      cloudColor: 'rgba(20,20,35,0.4)'
    },

    ui: {
      tapPromptText: 'TAP TO ROW',
      startPromptText: 'TAP TO BEGIN'
    }
  },

  camera: {
    shake: {
      default: { intensity: 3, duration: 150 },
      strong: { intensity: 10, duration: 320 },
      extreme: { intensity: 26, duration: 950 }
    }
  },

  particles: {
    tapSplash: { color: '#8ecbff', count: 10, life: 380, size: 2.5 },
    splash: { color: '#8ecbff', count: 40, life: 550 },
    fire: { color: '#ff6a2b', count: 70, life: 750 },
    thunder: { color: '#f5f56a', count: 40, life: 380 },
    aurora: { color: '#7effc0', count: 60, life: 1150 },
    legend: { color: '#ffd54a', count: 50, life: 900 },
    ballonDor: { color: '#ffd54a', count: 260, life: 2300 }
  },

  // stageIdごとの演出定義。7=Ballon d'Or climax。director-systemの'effect'イベントが
  // stageIdを指定してunlock:stageを発火すると、camera-system.js(無改修)がここを
  // 参照してカメラ揺れ・パーティクル・画面フラッシュへ変換する。
  effects: {
    1: { cameraShake: 'default', particleKey: 'splash' },
    2: { cameraShake: 'strong', particleKey: 'splash' },
    3: { cameraShake: 'strong', particleKey: 'fire', flash: { color: 'rgba(255,90,40,0.4)', durationMs: 240 } },
    4: { cameraShake: 'strong', particleKey: 'thunder', flash: { color: 'rgba(255,255,255,0.6)', durationMs: 140 } },
    5: { cameraShake: 'default', particleKey: 'aurora' },
    6: { cameraShake: 'strong', particleKey: 'legend', flash: { color: 'rgba(255,213,74,0.4)', durationMs: 260 } },
    7: { cameraShake: 'extreme', particleKey: 'ballonDor', flash: { color: 'rgba(255,213,74,0.65)', durationMs: 480 } }
  },

  // [注記] 旧unlock-system.js(実測タップ速度で閾値越えを判定する仕組み)は
  // director-systemの決定論的スケジュールと二重発火するため本プロジェクトでは
  // 使用しない。この配列はもはや「閾値によるstage解放判定」には使われておらず、
  // stageId/labelのレジストリ、およびROW POWERバー正規化用の基準速度(threshold)
  // としてのみ参照される(src/scene.js, src/ui.js)。
  unlock: {
    stages: [
      { stageId: 1, threshold: 2.0, label: 'Row' },
      { stageId: 2, threshold: 3.5, label: 'Faster' },
      { stageId: 3, threshold: 5.0, label: 'Fire' },
      { stageId: 4, threshold: 6.5, label: 'Thunder' },
      { stageId: 5, threshold: 8.0, label: 'Aurora' },
      { stageId: 6, threshold: 9.3, label: 'Legend' },
      { stageId: 7, threshold: 10.2, label: "Ballon d'Or" }
    ]
  },

  score: {
    distancePerTap: 1.6,
    comboResetMs: 800,
    comboMultiplierStep: 0.12
  },

  audio: {
    bgm: { main: 'assets/audio/bgm-main.mp3' },
    se: {
      unlock: 'assets/audio/se-unlock.mp3',
      ballonDor: 'assets/audio/se-ballon-dor.mp3',
      row: 'assets/audio/se-row.mp3',
      thunder: 'assets/audio/se-thunder.mp3'
    },
    volume: { bgm: 0.6, se: 0.9 }
  },

  ui: {
    color: { background: '#0b1a2b', text: '#ffffff' },
    text: { distance: 'DISTANCE', combo: 'COMBO', rowPower: 'ROW POWER' },
    showFpsInDev: false
  },

  save: { storageKeyPrefix: 'haaland-viking-row-tiktok' },

  // [Director System本体の台本] atMs順である必要はない(director側でスケジュールする)。
  // typeで処理が決まる完全ディスパッチ駆動: caption / cameraPunch / speed / effect / music / loop。
  // 新しい演出を追加したい場合はここに1エントリ追加するだけでよい。
  // キャプション文中の {playerName} / {victoryTitle} は character ブロックの値へ自動置換される。
  timeline: {
    totalMs: 35000,
    loopFadeMs: 400,
    tickIntervalMs: 100,
    velocitySmoothing: 0.18, // speedイベントの目標値へ毎tick近づける度合い(0-1)

    events: [
      // --- 0.0秒: 「何が起きるのか」を先に見せて離脱を防ぐフック ---
      { atMs: 0, type: 'caption', text: 'Can {playerName} reach {victoryTitle}?', tone: 'question', durationMs: 1500 },

      // --- 0.5秒: TAP! + 軽いパンチ ---
      { atMs: 500, type: 'caption', text: 'TAP!', tone: 'hype', durationMs: 700 },
      { atMs: 500, type: 'cameraPunch', scale: 1.08, durationMs: 250 },

      // --- 1.0秒: 最初の漕ぎ開始 ---
      { atMs: 1000, type: 'speed', velocity: 0.9 },

      // --- 3秒: ROW!! (フック1) ---
      { atMs: 3000, type: 'caption', text: 'ROW!!', tone: 'hype', durationMs: 1000 },
      { atMs: 3000, type: 'cameraPunch', scale: 1.12, durationMs: 350 },
      { atMs: 3000, type: 'speed', velocity: 2.2 },
      { atMs: 3000, type: 'effect', stageId: 1, label: 'Row' },

      // --- 6秒: FASTER!! ---
      { atMs: 6000, type: 'caption', text: 'FASTER!!', tone: 'hype', durationMs: 1000 },
      { atMs: 6000, type: 'speed', velocity: 3.7 },
      { atMs: 6000, type: 'effect', stageId: 2, label: 'Faster' },

      // --- 10秒: FIRE (フック2) ---
      { atMs: 10000, type: 'caption', text: '\u{1F525} FIRE', tone: 'fire', durationMs: 1200 },
      { atMs: 10000, type: 'cameraPunch', scale: 1.2, durationMs: 420 },
      { atMs: 10000, type: 'speed', velocity: 5.2 },
      { atMs: 10000, type: 'effect', stageId: 3, label: 'Fire' },

      // --- 15秒: THUNDER ---
      { atMs: 15000, type: 'caption', text: '\u26A1 THUNDER', tone: 'thunder', durationMs: 1200 },
      { atMs: 15000, type: 'cameraPunch', scale: 1.15, durationMs: 400 },
      { atMs: 15000, type: 'speed', velocity: 6.7 },
      { atMs: 15000, type: 'effect', stageId: 4, label: 'Thunder' },

      // --- 20秒: AURORA (フック3) ---
      { atMs: 20000, type: 'caption', text: '\u{1F30C} AURORA', tone: 'aurora', durationMs: 1300 },
      { atMs: 20000, type: 'cameraPunch', scale: 1.15, durationMs: 500 },
      { atMs: 20000, type: 'speed', velocity: 8.2 },
      { atMs: 20000, type: 'effect', stageId: 5, label: 'Aurora' },

      // --- 27秒: LEGEND(黄金オーラ + 主人公巨大化) ---
      { atMs: 27000, type: 'caption', text: '\u{1F451} LEGEND', tone: 'legend', durationMs: 1400 },
      { atMs: 27000, type: 'cameraPunch', scale: 1.25, durationMs: 600 },
      { atMs: 27000, type: 'speed', velocity: 9.4 },
      { atMs: 27000, type: 'effect', stageId: 6, label: 'Legend' },

      // --- 30秒: BALLON D'OR (フック4・最高潮) ---
      { atMs: 30000, type: 'caption', text: '\u{1F3C6} {victoryTitle}', tone: 'gold', durationMs: 1900, big: true },
      { atMs: 30000, type: 'cameraPunch', scale: 1.38, durationMs: 800 },
      { atMs: 30000, type: 'speed', velocity: 10.3 },
      { atMs: 30000, type: 'effect', stageId: 7, label: "Ballon d'Or" },

      // --- 32.5秒: エンゲージメント誘導 ---
      { atMs: 32500, type: 'caption', text: 'Can you row faster?', tone: 'cta', durationMs: 2300 },

      // --- 35秒: フェードアウト→自動ループ ---
      { atMs: 35000, type: 'loop' }
    ]
  }
};
