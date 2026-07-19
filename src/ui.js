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
// [不具合修正メモ] 以前はCSS側で`pointer-events`の有効化が漏れており
// (#ui-rootのpointer-events:noneが.hvr-start-gate(div)にまで継承され、
// タップがゲートを素通りしてcanvasへ直接届いていた)、ゲート自身の
// pointerdownが一度も発火せずonBegin()が呼ばれない → BGM/Directorが
// 開始されないまま「TAP TO BEGIN」表示だけが残り続ける不具合があった。
//
// 今回、CSSだけで隠す実装ではなく、明示的な状態('waiting' | 'hidden')を
// JSで管理し、show()/hide()という状態遷移APIを公開する形に変更した。
// 状態に応じてCSSクラスを付け替えることで、フェードアウト(見た目)と
// pointer-events(実際にタップを受け取るか)を確実に同期させている。
// 将来「リプレイ待機状態」を導入する場合も、この controller.show() を
// 呼び出すだけで再表示できる。
export function buildStartGate(uiRoot, promptText, { onBegin }) {
  const gate = document.createElement('div');
  gate.className = 'hvr-start-gate hvr-start-gate-waiting';
  gate.innerHTML = `<span class="hvr-start-gate-text">${promptText}</span>`;
  uiRoot.appendChild(gate);

  let state = 'waiting'; // 'waiting'(表示・タップ受付中) | 'hidden'(非表示・タップ無視)

  function show() {
    if (state === 'waiting') return;
    state = 'waiting';
    gate.classList.remove('hvr-start-gate-hidden');
    gate.classList.add('hvr-start-gate-waiting');
  }

  function hide() {
    if (state === 'hidden') return;
    state = 'hidden';
    gate.classList.remove('hvr-start-gate-waiting');
    gate.classList.add('hvr-start-gate-hidden');
  }

  gate.addEventListener('pointerdown', () => {
    // 'waiting'状態のときだけ反応する(非表示中はpointer-events:noneでも
    // 保護されるが、状態自体でも二重にガードしておく)
    if (state !== 'waiting') return;
    hide();
    onBegin();
  });

  return { show, hide, getState: () => state };
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
