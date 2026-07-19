// engine/ui-manager.js
// スコア表示・エンド画面などのDOM生成/更新を抽象化する。
// ラベル文言・色は初期化時にconfig.uiから注入され、以降は汎用イベント
// （ui:update-stat / ui:show-end-screen / ui:hide-end-screen）のみで更新される。
// 「distance」「combo」が何を意味するかはこのファイルには存在しない。

export class UIManager {
  constructor(rootElement, bus) {
    this.root = rootElement;
    this.bus = bus;
    this._statEls = new Map(); // key -> DOM element
    this._endScreenEl = null;

    this.bus.on('ui:update-stat', ({ key, value }) => this._updateStat(key, value));
    this.bus.on('ui:show-end-screen', (payload) => this._showEndScreen(payload));
    this.bus.on('ui:hide-end-screen', () => this._hideEndScreen());
  }

  // stats: [{ key, label }] を受け取りHUDを構築する
  buildHud({ stats, color, showFps }) {
    this.hud = document.createElement('div');
    this.hud.className = 'tap-engine-hud';

    if (color) {
      this.root.style.setProperty('--tap-ui-primary', color.primary || '#ffffff');
      this.root.style.setProperty('--tap-ui-bg', color.background || '#000000');
      this.root.style.setProperty('--tap-ui-text', color.text || '#ffffff');
    }

    stats.forEach(({ key, label }) => {
      const row = document.createElement('div');
      row.className = 'tap-engine-stat';
      row.innerHTML = `<span class="tap-engine-stat-label">${label}</span><span class="tap-engine-stat-value" data-key="${key}">0</span>`;
      this.hud.appendChild(row);
      this._statEls.set(key, row.querySelector('.tap-engine-stat-value'));
    });

    if (showFps) {
      const fpsRow = document.createElement('div');
      fpsRow.className = 'tap-engine-stat tap-engine-fps';
      fpsRow.innerHTML = `<span class="tap-engine-stat-label">FPS</span><span class="tap-engine-stat-value" data-key="fps">0</span>`;
      this.hud.appendChild(fpsRow);
      this._statEls.set('fps', fpsRow.querySelector('.tap-engine-stat-value'));
    }

    this.root.appendChild(this.hud);
  }

  _updateStat(key, value) {
    const el = this._statEls.get(key);
    if (el) el.textContent = typeof value === 'number' ? Math.floor(value) : value;
  }

  // title/stats/buttonsは全てゲーム側(src/systems/ending-system.js)が組み立てて渡す。
  // ここでは受け取った内容をそのままDOM化するだけ。
  _showEndScreen({ title, stats = [], buttons = [] }) {
    this._hideEndScreen();
    const overlay = document.createElement('div');
    overlay.className = 'tap-engine-end-screen';

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    overlay.appendChild(titleEl);

    stats.forEach(({ label, value }) => {
      const row = document.createElement('div');
      row.className = 'tap-engine-end-stat';
      row.textContent = `${label}: ${value}`;
      overlay.appendChild(row);
    });

    buttons.forEach(({ label, onClick }) => {
      const btn = document.createElement('button');
      btn.className = 'tap-engine-button';
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      overlay.appendChild(btn);
    });

    this.root.appendChild(overlay);
    this._endScreenEl = overlay;
  }

  _hideEndScreen() {
    if (this._endScreenEl) {
      this._endScreenEl.remove();
      this._endScreenEl = null;
    }
  }
}
