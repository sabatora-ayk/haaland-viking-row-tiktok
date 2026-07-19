// src/ui.js (TikTok版 v2 - テンプレート化)
// ビジュアルUI。タイトルロゴ・スコアボード・TAP TO ROWバナー・
// タップフィードバック・勝利バナーは、全てconfig.character(playerName/title/
// subtitle/themeColor/victoryTitle)から動的に組み立てるため、将来別選手の
// config.characterに差し替えてもこのファイルのコード自体は変更不要になる。
// 巨大字幕オーバーレイ('tiktok:caption')と、録画開始前の「TAP TO BEGIN」ゲートは
// TikTok版固有の追加要素。Replay/Share/エンド画面(GitHub版のengine/ui-manager.js
// 経由の機能)は本プロジェクトでは使用しない。
// engine/への依存はengine.bus(EventBus)経由の汎用イベント購読のみ。

export function buildGameUI(engine, config, uiRoot) {
  const { bus } = engine;
  const text = config.ui.text;
  const visualUi = config.visual.ui;
  const character = config.character;

  // [テンプレート化] テーマカラーはconfig.character.themeColorが唯一の情報源。
  if (character.themeColor) {
    uiRoot.style.setProperty('--tap-ui-primary', character.themeColor);
    uiRoot.style.setProperty('--tap-ui-bg', config.ui.color.background);
    uiRoot.style.setProperty('--tap-ui-text', config.ui.color.text);
  }

  const root = document.createElement('div');
  root.className = 'hvr-ui';
  uiRoot.appendChild(root);

  buildTitleLogo(root, character);
  const scoreboard = buildScoreboard(root, text);
  buildTapPrompt(root, visualUi.tapPromptText);
  const flashEl = buildTapFlash(root);
  const ballonDorEl = buildBallonDorBanner(root, character.victoryTitle);
  const captionEl = buildCaptionOverlay(root);

  bus.on('ui:update-stat', ({ key, value }) => {
    if (key === 'distance') scoreboard.distanceEl.textContent = formatDistance(value);
    if (key === 'combo') scoreboard.comboEl.textContent = `\u00d7${Math.floor(value)}`;
  });

  const maxThreshold = Math.max(...config.unlock.stages.map((s) => s.threshold));
  let currentPower = 0;
  bus.on('input:tap', ({ velocity }) => {
    currentPower = Math.min(velocity / maxThreshold, 1);
  });
  bus.on('render:frame', ({ deltaMs }) => {
    currentPower = Math.max(0, currentPower - deltaMs / 4000);
    scoreboard.powerFillEl.style.width = `${Math.round(currentPower * 100)}%`;
  });

  bus.on('input:tap', () => {
    retrigger(flashEl, 'hvr-tap-flash-active');
    retrigger(scoreboard.root, 'hvr-scoreboard-pulse');
  });

  const finalStageId = Math.max(...config.unlock.stages.map((s) => s.stageId));
  bus.on('unlock:stage', ({ stageId }) => {
    if (stageId === finalStageId) {
      ballonDorEl.classList.add('hvr-ballon-dor-active');
    }
  });

  // [TikTok版] director-system.jsが発火する巨大字幕('tiktok:caption')を表示する。
  // 「Can {playerName} reach {victoryTitle}?」/ROW!!/FASTER!!/🔥FIRE/⚡THUNDER/
  // 🌌AURORA/👑LEGEND/🏆{victoryTitle}等をtoneごとに色分けし、
  // パンチイン+フェードアウトのアニメーションで見せる。big:trueの場合は
  // 冒頭の煽り文句やクライマックスなど、特に強調したい字幕に一回り大きいサイズを適用する。
  let captionTimer = null;
  bus.on('tiktok:caption', ({ text: captionText, tone, durationMs, big }) => {
    clearTimeout(captionTimer);
    captionEl.textContent = captionText;
    captionEl.className = `hvr-caption hvr-caption-${tone}${big ? ' hvr-caption-big' : ''}`;
    // reflowを挟んで同じtone/テキストの連続発火でもアニメーションを再スタートさせる
    void captionEl.offsetWidth;
    captionEl.classList.add('hvr-caption-active');
    captionTimer = setTimeout(() => {
      captionEl.classList.remove('hvr-caption-active');
    }, durationMs || 1200);
  });

  // Ballon d'Orステージ解放時、ステージ6の演出を再解放してもBallon d'Orバナーが
  // 消えないよう(ループ後の再表示のため)、次のunlock:stageで自動的にリセットされる
  // 設計にはしていない。ループ時はsrc/game.jsがUI自体を作り直すため問題ない。
}

// [TikTok版] 録画者が画面収録を開始した後にタップする、開始専用ゲート。
// ブラウザの自動再生制限を回避するため、実際のpointerdownイベント内で
// BGM再生とdirector-systemのタイムライン開始を同期的に行う。
//
// [設計レビューの結論]
// 全文検索の結果、"TAP TO BEGIN"を生成するコードパスはbuildStartGate()の
// 1箇所のみで、hide()が操作するDOM参照とappendChildしたDOM参照はJS上
// 同一クロージャ変数(gate)であることをコードから証明できた。一方、
// 「JS上どの変数を操作しているか」は証明できても、「実機がその操作を
// 正しく描画へ反映しているか」は静的解析だけでは証明できないと判断し、
// その不確実性自体を構造的に無くす設計へ作り直した。
//
//   (1) idempotent化: 生成前に同一idの要素が残っていれば必ず削除してから
//       作る。呼び出しが複数回発生しても、DOM上は常に高々1個しか
//       存在しない状態を保証する(呼び出し回数を信用しない設計)。
//   (2) 非表示は display:none ではなく実際に DOM ツリーから remove()
//       する。「不可視だが存在する」という中間状態を作らないことで、
//       "見えているのに操作対象と一致しない"という疑いの余地そのものを
//       無くす。フェードは見た目の演出として残しつつ、状態確定は
//       常に実DOM削除で行う。
//   (3) window.__hvrStartGateとしてライブ参照を公開し、実機のSafari
//       Web Inspectorから `window.__hvrStartGate` /
//       `document.querySelectorAll('.hvr-start-gate')` を直接
//       いつでも確認できるようにした。
const START_GATE_ID = 'hvr-start-gate-singleton';
const START_GATE_FADE_MS = 350;

export function buildStartGate(uiRoot, promptText, { onBegin }) {
  // idempotent化: 同一idの要素が(理由を問わず)既に存在するなら、
  // 新しく作る前に必ず全て削除する。呼び出し回数に依存しない設計にする。
  document.querySelectorAll(`#${START_GATE_ID}`).forEach((el) => el.remove());

  const gate = document.createElement('div');
  gate.id = START_GATE_ID;
  gate.className = 'hvr-start-gate hvr-start-gate-waiting';
  gate.innerHTML = `<span class="hvr-start-gate-text">${promptText}</span>`;
  uiRoot.appendChild(gate);

  // 実機のリモートデバッガから直接確認できるようライブ参照を公開する。
  // Safari Web Inspectorのコンソールで以下を実行すれば実態を確認できる:
  //   window.__hvrStartGate            → 現在のgate要素そのもの(nullなら削除済み)
  //   document.querySelectorAll('.hvr-start-gate').length → 実際の個数
  window.__hvrStartGate = gate;

  let state = 'waiting'; // 'waiting'(表示・タップ受付中) | 'removed'(DOMから完全撤去済み)
  let removeTimer = null;

  function logState(label) {
    console.log(`[start-gate] ${label}`, {
      state,
      inDocument: document.body.contains(gate),
      totalMatchingId: document.querySelectorAll(`#${START_GATE_ID}`).length,
      totalMatchingClass: document.querySelectorAll('.hvr-start-gate').length
    });
  }

  function hide() {
    if (state !== 'waiting') return;
    state = 'removing';
    gate.classList.remove('hvr-start-gate-waiting');
    gate.classList.add('hvr-start-gate-hidden'); // 見た目上のフェードのみ担当
    logState('hide()呼び出し(フェード開始)');

    // フェード完了を待ってから実際にDOMツリーから撤去する。
    // display:noneのような「不可視だが存在する」中間状態を残さないため、
    // 最終的な状態確定は必ずremove()で行う(transitionendを主経路、
    // setTimeoutを未発火環境向けフォールバックとした二重トリガー)。
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      gate.removeEventListener('transitionend', onTransitionEnd);
      clearTimeout(removeTimer);
      gate.remove();
      state = 'removed';
      if (window.__hvrStartGate === gate) window.__hvrStartGate = null;
      logState('remove()実行後(DOMから完全撤去)');
    };
    const onTransitionEnd = (e) => {
      if (e.target === gate && e.propertyName === 'opacity') finalize();
    };
    gate.addEventListener('transitionend', onTransitionEnd);
    removeTimer = setTimeout(finalize, START_GATE_FADE_MS + 100);
  }

  const onTapAttempt = () => {
    if (state !== 'waiting') return;
    hide();
    onBegin();
  };
  // pointerdownを主経路としつつ、pointerdownの挙動が不安定な環境向けに
  // clickもフォールバックとして受け付ける。stateガードにより二重発火はしない。
  gate.addEventListener('pointerdown', onTapAttempt);
  gate.addEventListener('click', onTapAttempt);

  logState('生成直後');

  return {
    getState: () => state,
    // 将来「リプレイ待機状態」等で再表示が必要になった場合は、
    // buildStartGateを再度呼び出して新しいゲートを作ればよい
    // (idempotent化により古い要素が残る心配はない)。
  };
}

function buildTitleLogo(root, character) {
  const logo = document.createElement('div');
  logo.className = 'hvr-logo';
  logo.innerHTML =
    `<span class="hvr-logo-line1">${character.title}</span>` +
    `<span class="hvr-logo-line2">${character.subtitle}</span>`;
  root.appendChild(logo);
}

function buildScoreboard(root, text) {
  const board = document.createElement('div');
  board.className = 'hvr-scoreboard';
  board.innerHTML = `
    <div class="hvr-stat-block">
      <span class="hvr-stat-label">${text.distance}</span>
      <span class="hvr-stat-value" data-role="distance">0 m</span>
    </div>
    <div class="hvr-stat-block hvr-stat-block-combo">
      <span class="hvr-stat-label">${text.combo}</span>
      <span class="hvr-stat-value" data-role="combo">\u00d70</span>
    </div>
    <div class="hvr-power">
      <span class="hvr-power-label">${text.rowPower}</span>
      <div class="hvr-power-bar"><div class="hvr-power-fill" data-role="power-fill"></div></div>
    </div>
  `;
  root.appendChild(board);
  return {
    root: board,
    distanceEl: board.querySelector('[data-role="distance"]'),
    comboEl: board.querySelector('[data-role="combo"]'),
    powerFillEl: board.querySelector('[data-role="power-fill"]')
  };
}

function buildTapPrompt(root, promptText) {
  const prompt = document.createElement('div');
  prompt.className = 'hvr-tap-prompt';
  prompt.textContent = promptText;
  root.appendChild(prompt);
  return prompt;
}

function buildTapFlash(root) {
  const flash = document.createElement('div');
  flash.className = 'hvr-tap-flash';
  root.appendChild(flash);
  return flash;
}

function buildBallonDorBanner(root, bannerText) {
  const banner = document.createElement('div');
  banner.className = 'hvr-ballon-dor';
  banner.textContent = bannerText;
  root.appendChild(banner);
  return banner;
}

function buildCaptionOverlay(root) {
  const caption = document.createElement('div');
  caption.className = 'hvr-caption';
  root.appendChild(caption);
  return caption;
}

function formatDistance(value) {
  return `${Math.floor(value).toLocaleString('en-US')} m`;
}

// CSSアニメーションクラスを一度外して再付与し、再トリガーできるようにする
function retrigger(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // reflowを強制してアニメーションを再スタートさせる
  el.classList.add(className);
}
