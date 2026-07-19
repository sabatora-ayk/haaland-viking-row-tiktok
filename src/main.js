// src/main.js (TikTok版)
// アプリケーションのエントリポイント。DOM取得、ショーの構築、
// 「TAP TO BEGIN」開始ゲートの表示を行う。
// 録画者は画面収録を開始した後にこの画面をタップすることで、
// BGM再生とdirector-systemによる自動進行(タイムライン)を開始できる。

import { startShow } from './game.js';
import { buildStartGate } from './ui.js';
import gameConfig from '../config/game-config.js';

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');

const engine = startShow(canvas, uiRoot);

buildStartGate(uiRoot, gameConfig.visual.ui.startPromptText, () => {
  engine.beginShow();
});
