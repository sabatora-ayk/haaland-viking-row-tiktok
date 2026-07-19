// src/systems/camera-system.js
// 'unlock:stage' を受けて、config.effects[stageId] の内容を実際の
// カメラ揺れ / パーティクル / 画面フラッシュ / 音声イベントへ変換して発火する。
//
// TapEngine側(engine/effect.js, engine/particle.js)は 'effect:trigger' の
// cameraShakeParams / particleParams しか読まないため、ここで追加している
// flashフィールドはengine側には一切影響しない。src/scene.jsやsrc/ui.jsが
// 同じイベントに複数購読者として反応することでゲーム固有の演出を実現する。

export function createCameraSystem(bus, config) {
  bus.on('unlock:stage', ({ stageId }) => {
    const effect = config.effects[stageId];
    if (!effect) return;

    const cameraShakeParams = config.camera.shake[effect.cameraShake];
    const particleParams = config.particles[effect.particleKey];

    bus.emit('effect:trigger', {
      cameraShakeParams,
      particleParams,
      flash: effect.flash, // 省略可。engine側は読まないゲーム固有の追加データ
      origin: { xRatio: 0.3, yRatio: 0.75 }
    });

    bus.emit('audio:play', { key: 'unlock' });
  });
}
