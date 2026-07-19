// src/systems/director-system.js (v2 - ディスパッチテーブル駆動)
// TikTok版の中枢システム。config.timeline.events という「台本データ」だけを読み、
// 動画演出を丸ごと自動進行させる。
//
// [設計原則] type名 → ハンドラのディスパッチテーブルで処理を分岐する。
// if(stage === ...) のような分岐をコードに追加することは禁止し、
// 新しい演出を追加したい場合は (1) ディスパッチテーブルに1エントリ追加、
// (2) config.timeline.eventsにデータを1行追加、の2点だけで完結する設計にした。
//
// 各typeの役割:
//   caption     → 'tiktok:caption' を emit (src/ui.jsが購読して巨大字幕を表示)
//   cameraPunch → 'effect:trigger' にpunchフィールドを追加してemit (src/scene.jsが購読)
//   speed       → 合成input:tapイベントの目標速度を更新する(即座に切り替えず、
//                 毎tickなめらかに追従させることで自然な加減速を表現する)
//   effect      → 'stage:request' をemitする。src/systems/stage-system.jsが
//                 'unlock:stage'を発火する唯一の責務を持つため、directorは
//                 直接unlock:stageを発火せず「要求」するだけにとどめる。
//                 これにより入力駆動(実タップ)との二重発火をstage-system.js側の
//                 モノトニックガードで自動的に防げる。
//   music       → 'audio:play' / 'audio:stop' をemitする(BGM切り替え用の予約)
//   loop        → タイムラインを停止し、onLoopコールバックを呼ぶ
//
// TapEngine本体には依存せず、bus/configのみに依存する。

export function createDirectorSystem(bus, config, { onLoop }) {
  const timeline = config.timeline;
  const character = config.character;
  const smoothing = timeline.velocitySmoothing ?? 0.18;

  let targetVelocity = 0;
  let emittedVelocity = 0;
  let tickTimer = null;
  let eventTimers = [];

  // --- ディスパッチテーブル本体 ---------------------------------------
  const handlers = {
    caption: (evt) => {
      bus.emit('tiktok:caption', {
        text: interpolate(evt.text, character),
        tone: evt.tone,
        durationMs: evt.durationMs,
        big: !!evt.big
      });
    },
    cameraPunch: (evt) => {
      bus.emit('effect:trigger', { punch: { scale: evt.scale, durationMs: evt.durationMs } });
    },
    speed: (evt) => {
      targetVelocity = evt.velocity;
    },
    effect: (evt) => {
      bus.emit('stage:request', { stageId: evt.stageId, label: evt.label });
    },
    music: (evt) => {
      if (evt.action === 'stop') {
        bus.emit('audio:stop', { key: evt.key });
      } else {
        bus.emit('audio:play', { key: evt.key, loop: !!evt.loop });
      }
    },
    loop: () => {
      stop();
      onLoop();
    }
  };

  function begin() {
    targetVelocity = 0;
    emittedVelocity = 0;

    // 合成タップ: 毎tick、目標速度(speedイベントで更新される)へなめらかに追従させ、
    // 既存のunlock向けsystems(score-system / tap-feedback-system / weather-system)を
    // 無改修のまま自然な加減速で動かす。
    tickTimer = setInterval(() => {
      emittedVelocity += (targetVelocity - emittedVelocity) * smoothing;
      bus.emit('input:tap', {
        timestamp: performance.now(),
        velocity: emittedVelocity,
        x: 0,
        y: 0,
        synthetic: true
      });
    }, timeline.tickIntervalMs);

    // 台本イベントをスケジュール。type名でディスパッチテーブルを引くだけ。
    eventTimers = timeline.events.map((evt) =>
      setTimeout(() => {
        const handler = handlers[evt.type];
        if (handler) handler(evt);
      }, evt.atMs)
    );
  }

  function stop() {
    clearInterval(tickTimer);
    eventTimers.forEach(clearTimeout);
  }

  return { begin, stop };
}

// キャプション文中の {playerName} / {victoryTitle} を character の値へ置換する。
// これにより、character.playerNameを差し替えるだけで冒頭の煽り文句が自動追従する。
function interpolate(text, character) {
  return text
    .replace(/{playerName}/g, character.playerName)
    .replace(/{victoryTitle}/g, character.victoryTitle);
}
