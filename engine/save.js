// engine/save.js
// localStorageの薄いラッパー。キー名の名前空間(prefix)は必ず外部
// （config.save.storageKeyPrefix）から注入する。ゲーム名をハードコードしない。

export class SaveManager {
  constructor(prefix, bus) {
    this.prefix = prefix || 'tap-engine';
    this.bus = bus;
  }

  _key(key) {
    return `${this.prefix}:${key}`;
  }

  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[SaveManager] read failed', err);
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      if (this.bus) this.bus.emit('save:written', { key, value });
      return true;
    } catch (err) {
      console.warn('[SaveManager] write failed', err);
      return false;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this._key(key));
    } catch (err) {
      console.warn('[SaveManager] remove failed', err);
    }
  }
}
