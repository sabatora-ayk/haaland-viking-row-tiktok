// src/systems/tap-feedback-system.js
// 毎タップごとの即時ビジュアル/オーディオフィードバック(水しぶき・漕ぎSE)を担当する。
// stage解放時の派手な演出(camera-system.js)とは責務を分離し、
// 「タップ = 何かが起きている」という常時のレスポンスのみをここで扱う。
// TapEngine本体への依存はbus/configに加え、engine/utils.jsの汎用throttle関数のみ
// (ドメイン非依存のユーティリティであり、engine自体の変更は発生していない)。

import { throttle } from '../../engine/utils.js';

export function createTapFeedbackSystem(bus, config) {
  const particleParams = config.particles.tapSplash;
  // 高速タップ時にSEが多重再生されて音が割れないよう間引く
  const playRowSe = throttle(() => bus.emit('audio:play', { key: 'row' }), 130);

  bus.on('input:tap', () => {
    if (particleParams) {
      bus.emit('effect:trigger', {
        particleParams,
        origin: { xRatio: 0.3, yRatio: 0.75 }
      });
    }
    playRowSe();
  });
}
