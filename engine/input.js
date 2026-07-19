// engine/input.js
// タップ/クリック/タッチ入力を正規化し、タップ速度(tap/sec)を計算してbusへ流すだけのモジュール。
// 「タップで何が起きるか」は一切知らない（それはsrc/systems/側の責務）。

export class InputManager {
  constructor(targetElement, bus, options = {}) {
    this.target = targetElement;
    this.bus = bus;
    this.windowMs = options.windowMs || 1000; // タップ速度計算のスライディングウィンドウ
    this._tapTimestamps = [];
    this._onDown = this._onDown.bind(this);
  }

  start() {
    this.target.addEventListener('pointerdown', this._onDown, { passive: true });
  }

  stop() {
    this.target.removeEventListener('pointerdown', this._onDown);
  }

  _onDown(e) {
    const t = performance.now();
    this._tapTimestamps.push(t);

    // ウィンドウ外の古いタイムスタンプを破棄してからタップ速度を算出
    const cutoff = t - this.windowMs;
    this._tapTimestamps = this._tapTimestamps.filter((ts) => ts >= cutoff);
    const velocity = this._tapTimestamps.length / (this.windowMs / 1000); // tap/sec

    this.bus.emit('input:tap', {
      timestamp: t,
      velocity,
      x: e.clientX,
      y: e.clientY
    });
  }
}
