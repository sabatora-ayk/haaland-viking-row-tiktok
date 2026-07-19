// engine/particle.js
// 汎用パーティクルシステム。色・数・寿命は全て呼び出し側(config.particles)から渡される。
// 「splash」「fire」などの名前の意味はこのファイルには一切存在しない。

export class ParticleSystem {
  constructor(bus) {
    this.bus = bus;
    this._particles = [];
    this._width = 0;
    this._height = 0;

    this.bus.on('render:resize', ({ width, height }) => {
      this._width = width;
      this._height = height;
    });

    this.bus.on('effect:trigger', (payload) => {
      if (payload && payload.particleParams) {
        this._emit(payload.particleParams, payload.origin);
      }
    });
  }

  _emit(params, origin) {
    const xRatio = (origin && origin.xRatio) ?? 0.3;
    const yRatio = (origin && origin.yRatio) ?? 0.75;
    const originX = this._width * xRatio;
    const originY = this._height * yRatio;

    const count = params.count || 10;
    for (let i = 0; i < count; i++) {
      this._particles.push({
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.9) * 220,
        life: params.life || 500,
        age: 0,
        color: params.color || '#ffffff',
        size: params.size || 2 + Math.random() * 3
      });
    }
  }

  update(deltaMs) {
    for (const p of this._particles) {
      p.age += deltaMs;
      p.x += (p.vx * deltaMs) / 1000;
      p.y += (p.vy * deltaMs) / 1000;
      p.vy += 300 * (deltaMs / 1000); // 簡易重力
    }
    this._particles = this._particles.filter((p) => p.age < p.life);
  }

  render(ctx) {
    for (const p of this._particles) {
      const t = p.age / p.life;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
