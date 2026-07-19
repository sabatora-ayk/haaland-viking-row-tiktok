// engine/tap-engine.js
// TapEngineの唯一の公開エントリポイント。
// ここではゲーム固有の分岐(if文でのゲーム名判定など)を一切書かない。
// 全ての差異はconfigとEventBus経由でsrc/側から吸収する。

import { EventBus } from './event-bus.js';
import { InputManager } from './input.js';
import { Renderer } from './renderer.js';
import { EffectManager } from './effect.js';
import { ParticleSystem } from './particle.js';
import { AudioManager } from './audio.js';
import { UIManager } from './ui-manager.js';
import { SaveManager } from './save.js';
import { now } from './utils.js';

export class TapEngine {
  constructor({ canvas, uiRoot, config }) {
    this.config = config;
    this.bus = new EventBus();

    this.renderer = new Renderer(canvas, this.bus);
    this.input = new InputManager(canvas, this.bus);
    this.effect = new EffectManager(this.bus);
    this.particle = new ParticleSystem(this.bus);
    this.audio = new AudioManager(this.bus);
    this.ui = new UIManager(uiRoot, this.bus);
    this.save = new SaveManager(config?.save?.storageKeyPrefix, this.bus);

    this.audio.loadFromConfig(config?.audio);

    this._running = false;
    this._lastTime = 0;
    this._fps = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;

    this._loop = this._loop.bind(this);
  }

  // src側がゲーム固有の描画内容を登録するための公開API
  registerLayer(name, drawFn, zIndex) {
    this.renderer.registerLayer(name, drawFn, zIndex);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.renderer.start();
    this.input.start();
    this._lastTime = now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this._running = false;
    this.renderer.stop();
    this.input.stop();
    // BGM/SEを明示的に停止する。ループ再生中のAudio要素はJS側の参照が
    // 切れてもブラウザに保持され続けるため、停止し忘れると再生ごとに
    // BGMが多重再生され、実質的なリソースリークになる。
    this.audio.stopAll();
    // 念のためbus購読も明示的にクリアしておく（GC任せにしない）
    this.bus.clear();
  }

  _loop(t) {
    if (!this._running) return;
    // タブ非アクティブからの復帰時に大きなdeltaで演出が暴れないようクランプ
    const deltaMs = Math.min(t - this._lastTime, 100);
    this._lastTime = t;

    this._updateFps(deltaMs);

    this.effect.update(deltaMs);
    this.particle.update(deltaMs);
    this.renderer.render(deltaMs);

    if (this.config?.ui?.showFpsInDev) {
      this.bus.emit('ui:update-stat', { key: 'fps', value: Math.round(this._fps) });
    }

    // 「1フレーム経過した」という汎用イベントのみ発火。中身の解釈はsrc側で行う。
    this.bus.emit('render:frame', { deltaMs });

    requestAnimationFrame(this._loop);
  }

  _updateFps(deltaMs) {
    this._fpsAccum += deltaMs;
    this._fpsFrames += 1;
    if (this._fpsAccum >= 500) {
      this._fps = (this._fpsFrames * 1000) / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }
  }
}
