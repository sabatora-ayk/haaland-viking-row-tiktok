// engine/audio.js
// BGM/SEの読み込み・再生・停止・音量管理。ファイルパスやvolumeは
// 全てconfig.audioから注入される。どのキーがBGMでどれがSEかは
// config.audio.bgm / config.audio.se の分類をそのまま使うのみ。

export class AudioManager {
  constructor(bus) {
    this.bus = bus;
    this._sounds = new Map(); // key -> { el, isBgm }
    this._bgmVolume = 1;
    this._seVolume = 1;

    this.bus.on('audio:play', ({ key, loop = false } = {}) => this.play(key, loop));
    this.bus.on('audio:stop', ({ key } = {}) => this.stop(key));
    this.bus.on('audio:volume', ({ bgm, se } = {}) => this.setVolume(bgm, se));
  }

  // config.audioを受け取り、全音源をプリロード登録する
  loadFromConfig(audioConfig) {
    if (!audioConfig) return;
    this._bgmVolume = audioConfig.volume?.bgm ?? 1;
    this._seVolume = audioConfig.volume?.se ?? 1;

    const register = (key, src, isBgm) => {
      const el = new Audio();
      el.src = src;
      el.preload = 'auto';
      el.volume = isBgm ? this._bgmVolume : this._seVolume;
      // アセット未配置(著作権フリー音源を後から追加する運用)でもゲームが
      // 止まらないよう、読み込み失敗は握りつぶして警告のみ出す
      el.addEventListener('error', () => {
        console.warn(`[AudioManager] failed to load "${key}" (${src}). Add your own royalty-free file here.`);
      });
      this._sounds.set(key, { el, isBgm });
    };

    Object.entries(audioConfig.bgm || {}).forEach(([key, src]) => register(key, src, true));
    Object.entries(audioConfig.se || {}).forEach(([key, src]) => register(key, src, false));
  }

  play(key, loop = false) {
    const entry = this._sounds.get(key);
    if (!entry) return;
    try {
      entry.el.loop = loop;
      entry.el.currentTime = 0;
      const p = entry.el.play();
      if (p && p.catch) p.catch(() => {}); // autoplay制限等は無視してゲーム進行を優先
    } catch (err) {
      // 再生失敗はゲーム進行を止めない
    }
  }

  stop(key) {
    const entry = this._sounds.get(key);
    if (!entry) return;
    entry.el.pause();
    entry.el.currentTime = 0;
  }

  // 再生中の全音源を停止する。TapEngine.stop()から呼ばれ、
  // ループ再生中のAudio要素がGCされず残り続ける(=多重再生)のを防ぐ。
  stopAll() {
    for (const { el } of this._sounds.values()) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch (err) {
        // 停止処理の失敗でゲーム終了処理自体を止めない
      }
    }
  }

  setVolume(bgm, se) {
    if (bgm !== undefined) this._bgmVolume = bgm;
    if (se !== undefined) this._seVolume = se;
    for (const { el, isBgm } of this._sounds.values()) {
      el.volume = isBgm ? this._bgmVolume : this._seVolume;
    }
  }
}
