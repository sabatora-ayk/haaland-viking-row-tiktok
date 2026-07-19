// src/scene.js (TikTok版 v2 - テンプレート化)
// ゲーム画面の実際の描画内容(背景・船・プレイヤー・パーティクル・画面フラッシュ)を定義する。
// TapEngineが提供する汎用API(registerLayer / effect.getCameraOffset / particle.render)
// と、汎用イベント(input:tap / render:frame / effect:trigger / unlock:stage)のみを使用し、
// キャラクター/船などゲーム固有の内容は全てこちらに置く。engine/は一切変更しない。
//
// [エスカレーション設計] 演出は累積型。stage>=3で炎、stage>=4で雷、stage>=5で
// オーロラ、stage>=6でLEGEND(黄金オーラ+巨大化開始)、stage>=7でBALLON D'OR
// (黄金の海+勝利ポーズ)――というように、上位ステージに到達しても下位の演出は
// 消さず重ね描きする。stageIdはdirector-system.jsのtimeline.eventsで直接指定される。
//
// [テンプレート化] キャラクター描画は renderCharacter(ctx, x, y, scale, character, opts)
// という汎用関数に抽象化されており、config.character を丸ごと受け取る。
// 将来Messi/Ronaldo版を作る場合は config.character を差し替えるだけで、
// このファイルのコード自体は変更不要になるよう設計している。

// --- 2Dカートゥーンキャラクター描画(汎用化) ---------------------------------
// [キャラクター改修メモ] 実在人物の写実的再現ではなく、長い金髪・大きく角張った顔・
// ブロンドの太眉・青い目・大きな口・怪物的に大きい肩という「特徴の組み合わせ」だけで
// ファンメイド感を出す2Dカートゥーン表現。魔人ブウ的なミーム性は「丸みのある巨大
// シルエット」「頬のピンクハイライト」「ステージ別オーラの色」という抽象化した要素
// のみで取り入れており、衣装・アンテナ・顔そのもののコピーは一切行っていない。
// intensity(0〜1、ステージ進行に比例)で眉の角度・目の開き方を連続的に変化させ、
// 「タップするほど必死になっていく」表情のエスカレーションを表現する。
//
// 髪色・肌色・ユニフォーム配色・背番号は全てcharacter引数(config.character)から
// 取得するため、このファイル自体には特定選手のドメイン語は一切登場しない。
//
// 全ての形状はローカル座標系(原点=肩の中心、上方向がマイナスY)で記述し、
// 呼び出し側でtranslate/scaleして画面上の位置・大きさを決める。
function renderCharacter(ctx, x, y, scale, character, opts) {
  const p = character.palette;
  const u = character.uniform;
  const { armAngle, hairSway, bobOffset, intensity, eyeFlash, auraColor, victoryPose, mouthIntense } = opts;

  ctx.save();
  ctx.translate(x, y + bobOffset);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // オーラ(炎・雷・オーロラ・LEGEND・BALLON D'ORステージのみ表示。通常時は無し)
  if (auraColor) {
    const aura = ctx.createRadialGradient(0, -14, 4, 0, -14, 50);
    aura.addColorStop(0, auraColor);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -14, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  // 後ろ髪(肩にかかる長い金髪。左右非対称に揺らす)
  ctx.fillStyle = p.hairShadow;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 20, -28);
    ctx.quadraticCurveTo(side * (34 + hairSway), 2, side * (26 + hairSway), 28);
    ctx.quadraticCurveTo(side * 16, 20, side * 18, -10);
    ctx.closePath();
    ctx.fill();
  });

  // BALLON D'ORステージ: 反対側の腕を高々と掲げる勝利ポーズ
  if (victoryPose) {
    ctx.strokeStyle = p.skinColor;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-24, -4);
    ctx.lineTo(-38, -40);
    ctx.stroke();
    ctx.fillStyle = p.skinColor;
    ctx.beginPath();
    ctx.arc(-38, -42, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 肩・上半身(ユニフォーム。怪物的に大きいシルエット)
  ctx.fillStyle = u.primary;
  ctx.beginPath();
  ctx.moveTo(-38, 46);
  ctx.quadraticCurveTo(-48, 4, -26, -10);
  ctx.quadraticCurveTo(0, -19, 26, -10);
  ctx.quadraticCurveTo(48, 4, 38, 46);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.outlineColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // ユニフォームのシャドウ(下部の陰影)
  ctx.fillStyle = u.shadow;
  ctx.beginPath();
  ctx.moveTo(-38, 46);
  ctx.quadraticCurveTo(0, 36, 38, 46);
  ctx.lineTo(34, 32);
  ctx.quadraticCurveTo(0, 22, -34, 32);
  ctx.closePath();
  ctx.fill();

  // 差し色ストライプ + 背番号(特定クラブの公式デザインではない汎用配色)
  ctx.strokeStyle = u.accent;
  ctx.lineWidth = 3;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 27, -6);
    ctx.lineTo(side * 31, 42);
    ctx.stroke();
  });
  ctx.fillStyle = u.numberColor;
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(u.number, 0, 18);

  // オールを持つ腕(既存のオール描画と同じarmAngleで同期させ、漕ぐ動作をつなげる)
  ctx.strokeStyle = p.skinColor;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(26, -4);
  ctx.lineTo(26 + Math.cos(armAngle) * 26, -4 - Math.sin(armAngle) * 26);
  ctx.stroke();

  // 首
  ctx.fillStyle = p.skinColor;
  ctx.fillRect(-9, -18, 18, 16);

  // 頭部(大きく、やや角張った輪郭にすることで怪物的な存在感を出す)
  ctx.fillStyle = p.skinColor;
  ctx.beginPath();
  ctx.moveTo(-26, -22);
  ctx.quadraticCurveTo(-32, -50, 0, -55);
  ctx.quadraticCurveTo(32, -50, 26, -22);
  ctx.quadraticCurveTo(28, 2, 13, 9);
  ctx.quadraticCurveTo(0, 13, -13, 9);
  ctx.quadraticCurveTo(-28, 2, -26, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.outlineColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 頬のピンクハイライト(コミカルな怪物感を出す抽象化された演出)
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = p.cheekColor;
  [-18, 18].forEach((cx) => {
    ctx.beginPath();
    ctx.ellipse(cx, -6, 5.5, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // 前髪(横に大きく流れる金髪。ステージ・タップに応じて揺れる)
  ctx.fillStyle = p.hairColor;
  ctx.beginPath();
  ctx.moveTo(-30, -24);
  ctx.quadraticCurveTo(-36, -54, -4, -58);
  ctx.quadraticCurveTo(30, -58, 32, -28);
  ctx.quadraticCurveTo(22 + hairSway, -44, 6, -32);
  ctx.quadraticCurveTo(-4, -48, -15 + hairSway, -32);
  ctx.quadraticCurveTo(-22, -19, -30, -24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.outlineColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 横に長く流れる毛束(サイドに払われた金髪。大きく目立たせる)
  ctx.fillStyle = p.hairColor;
  ctx.beginPath();
  ctx.moveTo(30, -28);
  ctx.quadraticCurveTo(46 + hairSway * 1.4, -14, 37 + hairSway * 1.4, 8);
  ctx.quadraticCurveTo(28, -6, 26, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 太い眉(intensityが上がるほど吊り上がり、必死さを表現)
  const browTilt = intensity * 4;
  ctx.fillStyle = p.browColor;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(side * 21, -26 - browTilt);
    ctx.lineTo(side * 4, -28);
    ctx.lineTo(side * 4, -22);
    ctx.lineTo(side * 20, -20 - browTilt * 0.6);
    ctx.closePath();
    ctx.fill();
  });

  // 目(白目+虹彩。眠そうな半開きが基本だが、intensityが上がるほど見開く)
  const eyeH = eyeFlash ? 5.5 : 2.4 + intensity * 2.2;
  [-13, 13].forEach((ex) => {
    ctx.fillStyle = p.eyeWhiteColor;
    ctx.beginPath();
    ctx.ellipse(ex, -14, 5.4, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = eyeFlash ? '#ffffff' : p.eyeColor;
    ctx.beginPath();
    ctx.arc(ex, -14, Math.min(eyeH, 3.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.eyePupilColor;
    ctx.beginPath();
    ctx.arc(ex, -14, Math.min(eyeH, 1.6), 0, Math.PI * 2);
    ctx.fill();
  });
  if (eyeFlash) {
    ctx.fillStyle = auraColor || '#ffd54a';
    [-13, 13].forEach((ex) => {
      ctx.beginPath();
      ctx.arc(ex, -14, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 口(通常は無表情な一文字、炎/雷/LEGEND/BALLON D'ORステージでは力強く開いた口)
  ctx.strokeStyle = p.mouthColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (mouthIntense) {
    ctx.moveTo(-10, 2);
    ctx.quadraticCurveTo(0, 11, 10, 2);
    ctx.quadraticCurveTo(0, 4, -10, 2);
    ctx.fillStyle = p.mouthColor;
    ctx.fill();
  } else {
    ctx.moveTo(-9, 2);
    ctx.quadraticCurveTo(0, 3 + intensity * 3, 9, 2);
    ctx.stroke();
  }

  ctx.restore();
}

// 一定間隔で生成する固定スター配列(毎フレーム乱数生成すると点滅してしまうため
// シーン開始時に一度だけ生成し、以降は同じ座標を使い回す)
function createStarField(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      xRatio: Math.random(),
      yRatio: Math.random() * 0.5,
      size: 1 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2
    });
  }
  return stars;
}

// 稲妻のジグザグ形状を1本生成する(発生のたびに形を変えて単調にならないようにする)
function buildLightningBolt(w, h) {
  const startX = w * (0.15 + Math.random() * 0.7);
  const points = [{ x: startX, y: 0 }];
  let x = startX;
  let y = 0;
  const segments = 6 + Math.floor(Math.random() * 3);
  for (let i = 0; i < segments; i++) {
    y += h * 0.5 * (1 / segments);
    x += (Math.random() - 0.5) * 40;
    points.push({ x, y });
  }
  return points;
}

export function registerRenderLayers(engine, config) {
  const { visual, character } = config;
  const stars = createStarField(70);

  let unlockedStage = 0;
  let lastVelocity = 0; // input:tapイベントから取得する現在のタップ速度(減衰させて使う)
  let flashAlpha = 0;
  let flashColor = 'rgba(255,255,255,0)';
  let flashDurationMs = 200;
  let flashElapsed = 0;
  let boltPoints = null;
  let boltAlpha = 0;
  let punchScale = 1;
  let punchPeak = 1;
  let punchElapsed = 0;
  let punchDurationMs = 300;
  const oarAngleHistory = [0, 0, 0]; // モーションブラー用の直近オール角度
  const maxStageId = Math.max(...config.unlock.stages.map((s) => s.stageId));

  engine.bus.on('unlock:stage', ({ stageId }) => {
    unlockedStage = stageId;
  });

  engine.bus.on('input:tap', ({ velocity }) => {
    lastVelocity = velocity;
  });

  // camera-system.js / weather-system.js / director-system.jsが'effect:trigger'に
  // 追加したflash / bolt / punchフィールドを読み、対応する演出の状態を更新する。
  // engine/effect.js・engine/particle.jsはcameraShakeParams/particleParamsしか
  // 読まないため、これらの追加フィールドはengine側に一切影響しない。
  engine.bus.on('effect:trigger', (payload) => {
    if (payload && payload.flash) {
      flashAlpha = 1;
      flashColor = payload.flash.color;
      flashDurationMs = payload.flash.durationMs || 200;
      flashElapsed = 0;
    }
    if (payload && payload.bolt) {
      boltAlpha = 1;
      boltPoints = null; // 実座標は背景レイヤー描画時にw/hを使って生成する
    }
    if (payload && payload.punch) {
      punchPeak = payload.punch.scale || 1.15;
      punchDurationMs = payload.punch.durationMs || 300;
      punchElapsed = 0;
    }
  });

  // 毎フレームのパンチイン(カメラズーム)倍率を計算する。
  // ピークから1.0へイーズアウトで戻る単純な減衰。
  function updatePunch(dt) {
    punchElapsed += dt;
    const p = Math.min(punchElapsed / punchDurationMs, 1);
    punchScale = 1 + (punchPeak - 1) * (1 - p);
  }

  const maxThreshold = Math.max(...config.unlock.stages.map((s) => s.threshold));

  // レイヤー0: 背景(空・山・海・累積型ステージ演出)
  engine.registerLayer('background', (ctx, dt, w, h) => {
    updatePunch(dt);
    ctx.translate(w / 2, h / 2);
    ctx.scale(punchScale, punchScale);
    ctx.translate(-w / 2, -h / 2);

    // タップが無い間は速度を減衰させ、「今の勢い」を疑似的に表現する
    lastVelocity = Math.max(0, lastVelocity - (dt / 1000) * 3);
    const speedRatio = Math.min(lastVelocity / maxThreshold, 1);

    const theme = visual.backgroundStages[unlockedStage] || visual.backgroundStages[0];

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.skyTop);
    grad.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 星(ステージ5以降。累積型なので雷ステージを経ても消えない)
    if (unlockedStage >= 5) {
      stars.forEach((star) => {
        const twinkle = 0.5 + 0.5 * Math.sin(performance.now() / 500 + star.phase);
        ctx.globalAlpha = twinkle * 0.8;
        ctx.fillStyle = visual.starColor;
        ctx.beginPath();
        ctx.arc(star.xRatio * w, star.yRatio * h, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // 雷雲(ステージ4以降、常時薄く漂う)
    if (unlockedStage >= 4) {
      ctx.fillStyle = visual.lightning.cloudColor;
      for (let i = 0; i < 4; i++) {
        const cx = ((performance.now() / 4000 + i * 0.27) % 1.3) * w - w * 0.15;
        const cy = h * (0.08 + i * 0.06);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 70, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 稲妻本体(effect:triggerのboltフィールドで発火。短時間だけ表示して消える)
    if (boltAlpha > 0) {
      if (!boltPoints) boltPoints = buildLightningBolt(w, h);
      boltAlpha = Math.max(0, boltAlpha - dt / 220);
      ctx.strokeStyle = visual.lightning.boltColor;
      ctx.globalAlpha = boltAlpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      boltPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (boltAlpha <= 0) boltPoints = null;
    }

    // 山のシルエット(雪化粧付き)
    ctx.fillStyle = visual.mountains;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.2, h * 0.4);
    ctx.lineTo(w * 0.4, h * 0.55);
    ctx.lineTo(w * 0.65, h * 0.35);
    ctx.lineTo(w * 0.85, h * 0.55);
    ctx.lineTo(w, h * 0.5);
    ctx.lineTo(w, h * 0.6);
    ctx.lineTo(0, h * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = visual.mountainSnow;
    [[w * 0.2, h * 0.4], [w * 0.65, h * 0.35]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 14, py + 16);
      ctx.lineTo(px + 14, py + 16);
      ctx.closePath();
      ctx.fill();
    });

    // 炎ステージ(ステージ3以降、常時。上位ステージに進んでも消えない)
    if (unlockedStage >= 3) {
      const glow = ctx.createRadialGradient(w * 0.3, h * 0.75, 10, w * 0.3, h * 0.75, 170);
      glow.addColorStop(0, 'rgba(255,110,40,0.32)');
      glow.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }

    // オーロラ(ステージ5以降、常時。ゆっくり波打つように動く)
    if (unlockedStage >= 5) {
      ctx.lineWidth = 8;
      visual.auroraColors.forEach((color, i) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        const yOffset = h * 0.15 + i * 18;
        ctx.moveTo(0, yOffset);
        for (let x = 0; x <= w; x += 20) {
          ctx.lineTo(x, yOffset + Math.sin(x / 60 + i + performance.now() / 800) * 10);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // LEGENDステージ(ステージ6以降、常時。金色の後光が空全体に薄く差す)
    if (unlockedStage >= 6) {
      const legendGlow = ctx.createRadialGradient(w / 2, h * 0.3, 20, w / 2, h * 0.3, w);
      legendGlow.addColorStop(0, 'rgba(255,213,74,0.18)');
      legendGlow.addColorStop(1, 'rgba(255,213,74,0)');
      ctx.fillStyle = legendGlow;
      ctx.fillRect(0, 0, w, h);
    }

    // 速度ライン(ステージ2以降、タップ速度に応じて濃くなる)
    if (unlockedStage >= 2 && speedRatio > 0.05) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      const lineCount = Math.floor(6 * speedRatio) + 2;
      for (let i = 0; i < lineCount; i++) {
        const ly = h * 0.15 + ((performance.now() / 6 + i * 47) % (h * 0.5));
        ctx.globalAlpha = 0.3 * speedRatio;
        ctx.beginPath();
        ctx.moveTo(w, ly);
        ctx.lineTo(w - 60 - speedRatio * 60, ly + 10);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // 海
    ctx.fillStyle = theme.sea;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // BALLON D'ORステージ(最終stage、海面に金色のハイライト+紙吹雪)
    if (unlockedStage >= maxStageId) {
      ctx.fillStyle = 'rgba(255,213,74,0.2)';
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
    }
  }, 0);

  // レイヤー1: 船とプレイヤー(カメラ揺れを適用)
  engine.registerLayer('ship-and-player', (ctx, dt, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.scale(punchScale, punchScale);
    ctx.translate(-w / 2, -h / 2);

    const offset = engine.effect.getCameraOffset();
    ctx.translate(offset.x, offset.y);

    const speedRatio = Math.min(lastVelocity / maxThreshold, 1);
    const shipX = w * 0.3;
    // 船の待機揺れ: タップが無い状態でも常時ゆっくり上下する(冒頭の「待機モーション」用)。
    // 速度が上がるほど揺れ幅もわずかに増す。
    const shipBob = Math.sin(performance.now() / 900) * (2 + speedRatio * 2);
    const shipY = h * 0.75 + shipBob;
    const shipW = visual.ship.width;
    const shipH = visual.ship.height;

    // 航跡(水しぶきの帯)。速度が高いほど長く濃くなる
    ctx.strokeStyle = visual.ship.wakeColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = (0.4 - i * 0.1) * (0.3 + speedRatio * 0.7);
      ctx.beginPath();
      ctx.moveTo(shipX - shipW / 2, shipY + shipH - 4 + i * 5);
      ctx.quadraticCurveTo(
        shipX - shipW / 2 - 40 - speedRatio * 60,
        shipY + shipH + 6 + i * 5,
        shipX - shipW / 2 - 90 - speedRatio * 120,
        shipY + shipH - 2 + i * 5
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 船体(木製ロングシップ。底面を少し湾曲させる)
    ctx.fillStyle = visual.ship.hullDarkColor;
    ctx.beginPath();
    ctx.moveTo(shipX - shipW / 2, shipY + shipH * 0.4);
    ctx.quadraticCurveTo(shipX, shipY + shipH * 1.3, shipX + shipW / 2, shipY + shipH * 0.4);
    ctx.lineTo(shipX + shipW / 2, shipY);
    ctx.lineTo(shipX - shipW / 2, shipY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = visual.ship.hullColor;
    ctx.fillRect(shipX - shipW / 2, shipY - shipH * 0.35, shipW, shipH * 0.5);

    // 甲板の板目(横線)
    ctx.strokeStyle = visual.ship.hullDarkColor;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(shipX - shipW / 2, shipY - shipH * 0.35 + i * (shipH * 0.5) / 4);
      ctx.lineTo(shipX + shipW / 2, shipY - shipH * 0.35 + i * (shipH * 0.5) / 4);
      ctx.stroke();
    }

    // 盾(バイキング船側面の飾り。赤・白・金を交互に)
    const shieldCount = 6;
    for (let i = 0; i < shieldCount; i++) {
      const sx = shipX - shipW / 2 + shipW * ((i + 0.5) / shieldCount);
      ctx.fillStyle = visual.ship.shieldColors[i % visual.ship.shieldColors.length];
      ctx.beginPath();
      ctx.arc(sx, shipY - shipH * 0.42, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 船首のドラゴンヘッド
    const bowX = shipX + shipW / 2;
    const bowY = shipY - shipH * 0.1;
    ctx.fillStyle = visual.ship.dragonColor;
    ctx.beginPath();
    ctx.moveTo(bowX, bowY);
    ctx.quadraticCurveTo(bowX + 34, bowY - 30, bowX + 14, bowY - 46);
    ctx.quadraticCurveTo(bowX + 4, bowY - 30, bowX, bowY - shipH * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = visual.ship.dragonEyeColor;
    ctx.beginPath();
    ctx.arc(bowX + 18, bowY - 30, 3, 0, Math.PI * 2);
    ctx.fill();

    // 船尾の炎(ステージ3以降、常時。ゆらめくアニメーション。「なぜ燃えているか」は説明しない)
    if (unlockedStage >= 3) {
      const sternX = shipX - shipW / 2;
      const sternY = shipY + shipH * 0.15;
      const flicker = visual.fire.flickerSpeed;
      const flameCount = 5;
      for (let i = 0; i < flameCount; i++) {
        const t = performance.now() / 1000;
        const wobble = Math.sin(t * flicker + i * 1.7) * 6;
        const heightJitter = 18 + Math.sin(t * flicker * 1.3 + i) * 8 + speedRatio * 10;
        const fx = sternX - i * 7 + wobble * 0.3;
        const fy = sternY;
        ctx.fillStyle = visual.fire.colors[i % visual.fire.colors.length];
        ctx.globalAlpha = 0.85 - i * 0.12;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(fx + wobble, fy - heightJitter, fx, fy - heightJitter * 1.6);
        ctx.quadraticCurveTo(fx - wobble, fy - heightJitter, fx, fy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // オール(木製シャフト): タップ速度に応じて回転速度と振れ幅が増す(漕いでいる感を表現)
    const oarSpeed = 4 + speedRatio * 18;
    const oarAngle = Math.sin(performance.now() / (1000 / oarSpeed)) * (0.5 + speedRatio * 0.5);
    const oarPivotX = shipX;
    const oarPivotY = shipY - shipH * 0.1;

    // オールの残像(ステージ2以降。直近の角度を薄く重ね描きしてモーションブラー風にする)
    if (unlockedStage >= 2) {
      oarAngleHistory.forEach((prevAngle, i) => {
        ctx.strokeStyle = visual.ship.oarColor;
        ctx.globalAlpha = 0.12 * (i + 1);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(oarPivotX, oarPivotY);
        ctx.lineTo(oarPivotX + Math.cos(prevAngle) * 56, oarPivotY - Math.sin(prevAngle) * 56 - 10);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    oarAngleHistory.shift();
    oarAngleHistory.push(oarAngle);

    ctx.strokeStyle = visual.ship.oarColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(oarPivotX, oarPivotY);
    ctx.lineTo(oarPivotX + Math.cos(oarAngle) * 56, oarPivotY - Math.sin(oarAngle) * 56 - 10);
    ctx.stroke();

    // キャラクター(顔と上半身を大きく強調)。ステージ解放が進むほどオーラ・表情・
    // スケールが連続的に変化し、「普通の人間ではなくなっていく」エスカレーションを表現する。
    // config.characterを丸ごとrenderCharacter()へ渡すだけなので、将来別選手の
    // config.characterに差し替えてもこのファイルの記述は一切変更不要。
    const stageScale = character.stageScale[unlockedStage] ?? 1;
    const playerScale = character.baseScale * stageScale * (1 + speedRatio * 0.06);
    const hairSway = Math.sin(performance.now() / 300) * (2 + speedRatio * 6);
    const bobOffset = Math.sin(performance.now() / 450) * (2 + speedRatio * 3);
    const auraColor = character.auraColors[unlockedStage] || null;
    const intensity = unlockedStage / maxStageId; // 0(待機)〜1(climax)で連続的に表情が変化
    const mouthIntense = unlockedStage >= 3; // Fire以降は力強い表情を維持
    const eyeFlash = unlockedStage === 4; // Thunderステージ到達時に目が強くフラッシュ
    // キャラクターのローカル座標(26, -4)がオールの持ち手(oarPivot)と一致するよう原点を逆算する
    const charOriginX = oarPivotX - 26 * playerScale;
    const charOriginY = oarPivotY + 4 * playerScale;

    renderCharacter(ctx, charOriginX, charOriginY, playerScale, character, {
      armAngle: oarAngle,
      hairSway,
      bobOffset,
      intensity,
      mouthIntense,
      eyeFlash,
      auraColor,
      victoryPose: unlockedStage >= maxStageId,
    });
  }, 1);

  // レイヤー2: パーティクル
  engine.registerLayer('particles', (ctx) => {
    engine.particle.render(ctx);
  }, 2);

  // レイヤー3: 画面フラッシュ(炎/雷/BALLON D'OR演出や雷のランダム発生で発火)
  engine.registerLayer('flash', (ctx, dt, w, h) => {
    if (flashAlpha <= 0) return;
    flashElapsed += dt;
    const p = Math.min(flashElapsed / flashDurationMs, 1);
    flashAlpha = 1 - p;
    if (p >= 1) flashAlpha = 0;

    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }, 3);
}
