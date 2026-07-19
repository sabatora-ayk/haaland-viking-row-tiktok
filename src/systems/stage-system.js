// src/systems/stage-system.js
// 'unlock:stage' を発火する唯一の責務を持つ汎用system。
// GitHub版のunlock-system.js(タップ速度の閾値判定のみ)を一般化したもので、
// 「入力駆動」と「Director駆動」のどちらからでも同じ経路でステージを
// 進められるように拡張している。GitHub版・TikTok版・将来の全テンプレートで
// 共通利用できるよう、このファイル自体にはTikTok固有・GitHub固有の
// ロジックを一切含めていない(config/busのみに依存する)。
//
// 2つの入力経路:
//
//   1. 入力駆動('input:tap'購読): 実タップ/合成タップのvelocityが
//      config.unlock.stagesのthresholdを超えたら自動的に次のstageへ進める。
//      GitHub版はこの経路のみで動作する(unlock-system.jsと完全に同じ挙動)。
//
//   2. Director駆動('stage:request'購読): {stageId, label}を明示的に
//      指定してステージを進める。TikTok版のdirector-system.jsは
//      timeline.eventsの'effect'エントリからこれを呼び出し、
//      台本通りの厳密なタイミングでステージを進行させる。
//
// どちらの経路から呼ばれても、実際にstageIdが現在の最大値を上回った
// 場合のみ 'unlock:stage' を1回だけ発火する(モノトニック増加・
// 二重発火防止)。両経路を同時に有効化しても、後から追いついた側の
// 要求は自動的に無視されるため、演出が二重発火することはない。

export function createStageSystem(bus, config) {
  const stages = [...config.unlock.stages].sort((a, b) => a.threshold - b.threshold);
  let currentStageId = 0;

  function advanceTo(stageId, label) {
    if (!stageId || stageId <= currentStageId) return;
    currentStageId = stageId;
    bus.emit('unlock:stage', { stageId, label });
  }

  // --- 経路1: 入力駆動 ---------------------------------------------------
  bus.on('input:tap', ({ velocity }) => {
    let reachable = currentStageId;
    let reachableLabel = null;
    for (const stage of stages) {
      if (velocity >= stage.threshold) {
        reachable = stage.stageId;
        reachableLabel = stage.label;
      }
    }
    if (reachable > currentStageId) {
      advanceTo(reachable, reachableLabel);
    }
  });

  // --- 経路2: Director駆動 -----------------------------------------------
  // labelが省略された場合はconfig.unlock.stagesから補完する。
  bus.on('stage:request', ({ stageId, label }) => {
    const resolvedLabel = label || stages.find((s) => s.stageId === stageId)?.label;
    advanceTo(stageId, resolvedLabel);
  });

  return {
    getCurrentStageId: () => currentStageId
  };
}
