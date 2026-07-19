// engine/animation.js
// 汎用の数値アニメーター（tween / 振動）。
// スプライトのフレーム進行にも、カメラ揺れのような単純な数値変化にも
// 同じ仕組みを流用できる、ドメイン非依存の実装。

export class AnimationController {
  constructor() {
    this._tweens = new Map(); // id -> tween state
  }

  // idの値をfrom→toへdurationMsかけて変化させる
  tween(id, { from, to, durationMs, easing = (t) => t, onComplete }) {
    this._tweens.set(id, {
      type: 'tween',
      from, to, durationMs, easing, onComplete,
      elapsed: 0,
      value: from,
      done: false
    });
  }

  // 単振動（画面揺れ等）。durationMs経過で減衰しながら自動終了する
  oscillate(id, { amplitude, frequency, durationMs }) {
    this._tweens.set(id, {
      type: 'oscillate',
      amplitude, frequency, durationMs,
      elapsed: 0,
      value: 0,
      done: false
    });
  }

  update(deltaMs) {
    for (const t of this._tweens.values()) {
      if (t.done) continue;
      t.elapsed += deltaMs;
      const p = Math.min(t.elapsed / t.durationMs, 1);

      if (t.type === 'oscillate') {
        const decay = 1 - p; // 時間経過で徐々に揺れを収める
        t.value = Math.sin((t.elapsed / 1000) * t.frequency * Math.PI * 2) * t.amplitude * decay;
      } else {
        t.value = t.from + (t.to - t.from) * t.easing(p);
      }

      if (p >= 1) {
        t.done = true;
        if (t.onComplete) t.onComplete();
      }
    }
  }

  get(id) {
    const t = this._tweens.get(id);
    return t ? t.value : 0;
  }

  isDone(id) {
    const t = this._tweens.get(id);
    return t ? t.done : true;
  }

  clear(id) {
    this._tweens.delete(id);
  }
}
