// engine/event-bus.js
// 依存ゼロの最小EventEmitter。
// TapEngine内の全モジュール（入力・UI・エフェクト・オーディオ・ゲームロジック）は
// これを介してのみ通信し、互いを直接importしない。
//
// 命名規則（詳細は設計書 v2 §2.4）:
//   input:*  render:*  effect:*  audio:*  ui:*  save:* → engine側が定義する汎用イベント
//   unlock:* score:*  game:*                            → ゲーム側(src/)が定義するイベント

export class EventBus {
  constructor() {
    this._listeners = new Map(); // eventName -> Set<handler>
  }

  on(eventName, handler) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler); // 購読解除用の関数を返す
  }

  once(eventName, handler) {
    const wrapped = (...args) => {
      this.off(eventName, wrapped);
      handler(...args);
    };
    return this.on(eventName, wrapped);
  }

  off(eventName, handler) {
    const set = this._listeners.get(eventName);
    if (set) set.delete(handler);
  }

  emit(eventName, payload) {
    const set = this._listeners.get(eventName);
    if (!set || set.size === 0) return;
    // handler内でon/offが呼ばれても安全なようにコピーしてイテレートする
    [...set].forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        // 1つのリスナーの例外でゲームループ全体を止めない
        console.error(`[EventBus] handler error for "${eventName}":`, err);
      }
    });
  }

  clear() {
    this._listeners.clear();
  }
}
