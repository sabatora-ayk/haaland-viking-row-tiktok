// engine/renderer.js
// canvas描画の抽象化。レイヤー登録・DPR対応・レスポンシブリサイズを担当する。
// 「何を描くか」はレイヤーのdrawFnとして外部（src/側）から注入され、
// renderer自身はその中身を一切解釈しない。

export class Renderer {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bus = bus;
    this._layers = []; // { name, zIndex, drawFn }
    this.width = 0;
    this.height = 0;
    this._onResize = this._onResize.bind(this);
  }

  start() {
    this._onResize();
    window.addEventListener('resize', this._onResize);
  }

  stop() {
    window.removeEventListener('resize', this._onResize);
  }

  _onResize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    this.bus.emit('render:resize', { width: this.width, height: this.height });
  }

  // レイヤー登録。zIndexが小さいほど先に描画される（背面）
  registerLayer(name, drawFn, zIndex = 0) {
    this._layers.push({ name, drawFn, zIndex });
    this._layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  unregisterLayer(name) {
    this._layers = this._layers.filter((l) => l.name !== name);
  }

  render(deltaMs) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const layer of this._layers) {
      this.ctx.save();
      layer.drawFn(this.ctx, deltaMs, this.width, this.height);
      this.ctx.restore();
    }
  }
}
