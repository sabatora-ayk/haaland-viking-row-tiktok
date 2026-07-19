// src/systems/weather-system.js
// ステージ4(雷)以降、ランダムな間隔で雷の閃光と雷鳴SEを発生させる。
// 「いつ雷が来るか」というタイミングの決定はここに集約し、実際の描画
// (src/scene.js)・SE再生(engine/audio.js)からは分離する。
// TapEngine本体には依存せず、bus/configのみに依存する。
//
// 雷が対応するstageIdは、config.effects内でparticleKeyが'thunder'の
// エントリから動的に導出する(ハードコードしないことで、将来ステージ構成が
// 変わっても自動的に追従できるようにしている)。

export function createWeatherSystem(bus, config) {
  const thunderStageEntry = Object.entries(config.effects).find(
    ([, effect]) => effect.particleKey === 'thunder'
  );
  const thunderStageId = thunderStageEntry ? Number(thunderStageEntry[0]) : Infinity;
  const { minIntervalMs, maxIntervalMs, flashColor } = config.visual.lightning;

  let unlockedStage = 0;
  let nextLightningAt = 0;

  bus.on('unlock:stage', ({ stageId }) => {
    unlockedStage = stageId;
    // 雷ステージに到達した瞬間、最初の一撃までの待ち時間を設定する
    if (stageId === thunderStageId) {
      nextLightningAt = performance.now() + minIntervalMs * 0.5;
    }
  });

  bus.on('render:frame', () => {
    if (unlockedStage < thunderStageId) return;
    const now = performance.now();
    if (now < nextLightningAt) return;

    nextLightningAt = now + minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs);

    // 既存の'effect:trigger'イベントを再利用する。engine/effect.jsは
    // cameraShakeParamsしか読まないため、boltフィールドの追加はengine側に
    // 一切影響しない(src/scene.jsが追加の購読者として稲妻の形を描画する)。
    bus.emit('effect:trigger', {
      flash: { color: flashColor, durationMs: 150 },
      bolt: true
    });
    bus.emit('audio:play', { key: 'thunder' });
  });
}
