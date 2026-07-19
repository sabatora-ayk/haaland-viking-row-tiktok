// src/systems/score-system.js
// Distance/Comboの計算ロジック。TapEngine本体には依存せず、bus/configのみに依存する。

export function createScoreSystem(bus, config) {
  const { distancePerTap, comboResetMs, comboMultiplierStep } = config.score;
  let distance = 0;
  let combo = 0;
  let lastTapAt = 0;

  bus.on('input:tap', ({ timestamp }) => {
    if (lastTapAt && timestamp - lastTapAt <= comboResetMs) {
      combo += 1;
    } else {
      combo = 1;
    }
    lastTapAt = timestamp;

    const multiplier = 1 + combo * comboMultiplierStep;
    distance += distancePerTap * multiplier;

    bus.emit('score:update', { distance, combo });
    bus.emit('ui:update-stat', { key: 'distance', value: distance });
    bus.emit('ui:update-stat', { key: 'combo', value: combo });
  });

  // タップが一定時間止まったらコンボをリセットする（毎フレームチェック）
  bus.on('render:frame', () => {
    if (combo > 0 && lastTapAt && performance.now() - lastTapAt > comboResetMs) {
      combo = 0;
      bus.emit('ui:update-stat', { key: 'combo', value: combo });
    }
  });

  return {
    getState: () => ({ distance, combo })
  };
}
