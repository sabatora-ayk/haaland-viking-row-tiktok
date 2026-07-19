// engine/effect.js
// 画面演出（カメラ揺れ等）のトリガー管理。'effect:trigger' を購読するが、
// パラメータ(intensity/duration)は必ず呼び出し側(src/systems/camera-system.js)が
// config解決済みの値として渡したものだけを使う。
// 「fire」「aurora」などの名前の意味はこのファイルには一切存在しない。

import { AnimationController } from './animation.js';

export class EffectManager {
  constructor(bus) {
    this.bus = bus;
    this.anim = new AnimationController();
    this._offX = 0;
    this._offY = 0;

    this.bus.on('effect:trigger', (payload) => this._onTrigger(payload));
  }

  _onTrigger(payload) {
    const shake = payload && payload.cameraShakeParams; // { intensity, duration }
    if (!shake) return;

    this.anim.oscillate('camera-shake-x', {
      amplitude: shake.intensity,
      frequency: 12,
      durationMs: shake.duration
    });
    this.anim.oscillate('camera-shake-y', {
      amplitude: shake.intensity * 0.6,
      frequency: 9,
      durationMs: shake.duration
    });
  }

  update(deltaMs) {
    this.anim.update(deltaMs);
    this._offX = this.anim.get('camera-shake-x');
    this._offY = this.anim.get('camera-shake-y');
  }

  // src側の描画レイヤーがこれを使ってctx.translateし、揺れを画面に反映する
  getCameraOffset() {
    return { x: this._offX, y: this._offY };
  }
}
