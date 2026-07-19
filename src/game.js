// src/game.js (TikTok版)
// ゲームの統括層。TapEngineの初期化と、src/systems/配下・src/scene.js・
// src/ui.jsの登録のみを行う「薄い」ファイル。
// GitHub版との違い:
//   - ending-system(Replay/保存/ベストスコア)は使用せず、代わりに
//     director-system(タイムライン自動進行・字幕・ループ)を登録する。
//   - unlock-system(タップ速度の閾値判定のみ)の代わりに、責務を一般化した
//     stage-system(入力駆動+Director駆動の両対応)を使用する。
//     director-systemはunlock:stageを直接発火せず、'stage:request'で
//     stage-system.jsへ要求するだけなので、実タップとの二重発火は
//     stage-system.js側のモノトニックガードで自動的に防がれる。
// このファイルにゲームルールや描画のロジックを直接書き足さないこと(肥大化防止)。

import { TapEngine } from '../engine/tap-engine.js';
import gameConfig from '../config/game-config.js';
import { createStageSystem } from './systems/stage-system.js';
import { createScoreSystem } from './systems/score-system.js';
import { createCameraSystem } from './systems/camera-system.js';
import { createTapFeedbackSystem } from './systems/tap-feedback-system.js';
import { createWeatherSystem } from './systems/weather-system.js';
import { createDirectorSystem } from './systems/director-system.js';
import { registerRenderLayers } from './scene.js';
import { buildGameUI } from './ui.js';

export function startShow(canvas, uiRoot) {
  const engine = new TapEngine({ canvas, uiRoot, config: gameConfig });

  // Haaland Viking Row専用UI(GitHub版デザインを踏襲 + TikTok版の巨大字幕)を構築。
  buildGameUI(engine, gameConfig, uiRoot);

  // 描画内容の登録(背景・船・プレイヤー・パーティクル・画面フラッシュ・パンチイン)
  registerRenderLayers(engine, gameConfig);

  // ゲームルール(systems)の登録。各systemは互いを直接importせず、
  // engine.bus経由でのみ連携する(GitHub版と同一のsystemsを無改修で再利用)。
  // stage-systemは'unlock:stage'を発火する唯一の責務を持つ(入力駆動+Director駆動)。
  createStageSystem(engine.bus, gameConfig);
  createScoreSystem(engine.bus, gameConfig);
  createCameraSystem(engine.bus, gameConfig);
  createTapFeedbackSystem(engine.bus, gameConfig);
  createWeatherSystem(engine.bus, gameConfig);

  // [TikTok版の核] config.timelineに従って合成タップ・字幕・カメラpunchを
  // 自動発火し、35秒でループ復帰するdirector-systemを登録する。
  const director = createDirectorSystem(engine.bus, gameConfig, {
    onLoop: () => loop()
  });

  engine.start();

  // BGM再生とタイムライン開始は、録画者が実際にタップする瞬間まで待つ
  // (ブラウザの自動再生制限を回避するため)。src/main.jsのbuildStartGateの
  // pointerdownハンドラから同期的に呼ばれるbeginShow()がこれを担う。
  function beginShow() {
    engine.bus.emit('audio:play', { key: 'main', loop: true });
    director.begin();
  }

  // ループ: 35秒経過後、フェードしてengineを作り直し、最初から自動再生する。
  // ending-system(Replay/保存)は使わないため、ユーザー操作を待たず即座に
  // 次のshowを開始する(director.begin()を直接呼ぶ。開始ゲートは表示しない)。
  function loop() {
    const gameRoot = uiRoot.parentElement;
    gameRoot.classList.add('hvr-loop-fade');
    setTimeout(() => {
      engine.stop();
      uiRoot.querySelectorAll('.hvr-ui').forEach((el) => el.remove());
      const nextEngine = startShow(canvas, uiRoot);
      gameRoot.classList.remove('hvr-loop-fade');
      nextEngine.beginShow();
    }, gameConfig.timeline.loopFadeMs);
  }

  engine.beginShow = beginShow;
  return engine;
}
