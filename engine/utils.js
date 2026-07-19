// engine/utils.js
// 汎用ユーティリティ関数群。DOM/ゲーム状態を持たない純粋関数のみを置く。
// ここにゲーム固有のロジックを追加しないこと。

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

// 一定間隔以上でしか実行されないようにする（連打対策等の汎用ヘルパー）
export function throttle(fn, intervalMs) {
  let last = 0;
  return (...args) => {
    const t = now();
    if (t - last >= intervalMs) {
      last = t;
      fn(...args);
    }
  };
}
