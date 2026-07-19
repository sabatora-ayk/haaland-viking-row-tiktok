# HAALAND VIKING ROW — TikTok Recording Edition v2

「1つのゲーム」ではなく「TikTokバズ動画生成テンプレート」。
`config.character` と `config.timeline` を書き換えるだけで、Haaland版・
Mbappe版・Messi版…といった別選手のバズ動画テンプレートを量産できる構造にした。

GitHub版(`haaland-viking-row`)とは完全に独立したプロジェクト。今回の改修でも
GitHub版には一切触れていない(`engine/`のdiff完全一致、GitHub版フォルダの
mtime変化なしを確認済み)。

---

## 使い方(録画方法)

1. `index.html` をスマートフォンのブラウザで開く
2. 画面収録を開始
3. **TAP TO BEGIN** をタップ → BGMと自動演出タイムラインが同時に始まる
4. 何もしなくても35秒のショーが自動再生され、フェードして最初からループする
5. 好きなタイミングで画面収録を停止し、そのままTikTokへ投稿

### 推奨録画設定
60fps・9:16(`#game-root`をCSSで9:16固定済み)

---

## 今回の改修①: Director Systemを「期待を見せる構成」へ

### 新しいタイムライン(3秒・10秒・20秒・30秒にフックを配置)

| 時間 | 演出 | 字幕 |
|---|---|---|
| 0.0秒 | 背景が少し動き、船がゆっくり揺れ、キャラクターは待機モーション | "Can {playerName} reach {victoryTitle}?" |
| 0.5秒 | 軽い画面パンチ | "TAP!" |
| 1.0秒 | 最初の漕ぎ開始(合成速度が0から上昇し始める) | - |
| **3秒** | stage1、画面パンチ、軽い水しぶき | **"ROW!!"** |
| 6秒 | オール回転速度上昇 | "FASTER!!" |
| **10秒** | stage3、船から炎、速度線追加、強シェイク | **"🔥 FIRE"** |
| 15秒 | stage4、雷、画面揺れ強化 | "⚡ THUNDER" |
| **20秒** | stage5、オーロラ、幻想的な空 | **"🌌 AURORA"** |
| 27秒 | stage6、金色オーラ、主人公が巨大化し始める | "👑 LEGEND" |
| **30秒** | stage7、最高潮、黄金演出、紙吹雪、画面全体が輝く | **"🏆 {victoryTitle}"** |
| 32.5秒 | エンゲージメント誘導 | "Can you row faster?" |
| 35秒 | フェードアウト→自動ループ | - |

冒頭0〜1秒は「ゲーム説明」ではなく「これから何が起きるか」を大きな煽り文句
("Can Haaland reach Ballon d'Or?")で先に見せることで、TikTok特有の
最初の1〜2秒の離脱を防ぐ構成に変更した。

---

## 今回の改修②: TikTokテンプレート化

### config.character(新設・選手アイデンティティを1ブロックに集約)

```js
character: {
  playerName: 'Haaland',
  title: 'HAALAND',
  subtitle: 'VIKING ROW',
  themeColor: '#ffd54a',
  victoryTitle: "BALLON D'OR",
  voiceStyle: 'viking-monster',   // 将来のSE差し替え用の予約フィールド
  effectsTheme: 'norse',          // 将来の演出プリセット切り替え用の予約フィールド
  palette: { hairColor, hairShadow, skinColor, browColor, eyeColor, ... },
  uniform: { primary, shadow, accent, number, numberColor },
  baseScale, stageScale, auraColors
}
```

将来Mbappe版・Messi版を作る場合は、**このブロックと`config.timeline.events`内の
キャプション文言(`{playerName}`/`{victoryTitle}`プレースホルダで自動反映される)を
差し替えるだけ**で新しいテンプレートが完成する。`src/scene.js` / `src/ui.js`の
コードは一切変更不要。

### characterRenderer()の抽象化

`src/scene.js`の`drawHaalandCharacter()`を`renderCharacter(ctx, x, y, scale, character, opts)`
という汎用関数に改名し、`config.character`を丸ごと受け取る形に変更した。
このファイル自体には特定選手のドメイン語が一切登場しない。

### Director Systemのtimeline完全駆動化

`config.timeline.events`は`{atMs, type, ...}`のフラットな配列。
`director-system.js`は**ディスパッチテーブル**(`{caption, cameraPunch, speed,
effect, music, loop}`というオブジェクトのkey引き)でtype名に応じた処理を
実行するだけで、`if(stage === ...)`のような分岐はコード中に一切存在しない。

```js
const handlers = {
  caption: (evt) => bus.emit('tiktok:caption', {...}),
  cameraPunch: (evt) => bus.emit('effect:trigger', { punch: {...} }),
  speed: (evt) => { targetVelocity = evt.velocity; },
  effect: (evt) => bus.emit('unlock:stage', { stageId: evt.stageId, label: evt.label }),
  music: (evt) => bus.emit('audio:play'/'audio:stop', {...}),
  loop: () => { stop(); onLoop(); }
};
```

新しい演出を追加したい場合は、(1)必要ならディスパッチテーブルに1エントリ追加、
(2)`config.timeline.events`にデータを1行追加、の2点だけで完結する。

---

## 追加改修: stage-systemへの一般化

`unlock-system.js`を削除して`director-system.js`が直接`unlock:stage`を発火する
実装にしていたが、これを見直し、責務を一般化した`src/systems/stage-system.js`
へ置き換えた。

### 設計

`stage-system.js`が**'unlock:stage'を発火する唯一の責務**を持ち、以下の
2つの経路のどちらからでもステージを進められる。

```js
export function createStageSystem(bus, config) {
  // 経路1: 入力駆動 - 'input:tap'のvelocityがconfig.unlock.stagesの
  //         thresholdを超えたら自動的に次のstageへ進める(GitHub版の
  //         unlock-system.jsと完全に同じ挙動)
  bus.on('input:tap', ({ velocity }) => { /* ... */ });

  // 経路2: Director駆動 - 'stage:request'({stageId, label})を受けると
  //         即座にそのstageへ進める(TikTok版のdirector-system.jsが使用)
  bus.on('stage:request', ({ stageId, label }) => { /* ... */ });

  // どちらの経路でも、stageIdが現在の最大値を上回った場合のみ
  // 'unlock:stage'を1回だけ発火する(モノトニック増加・二重発火防止)
}
```

`director-system.js`の`effect`ハンドラは、直接`unlock:stage`を発火するのではなく
`stage:request`をemitするだけに変更した。これにより:

- **入力駆動とDirector駆動を同時に有効化しても安全**(モノトニックガードにより
  二重発火しない。TikTok版では実際に両方が有効: 録画者が実タップしても
  reactし、director側の台本タイミングとも整合する)
- **GitHub版にもそのまま流用可能**な汎用ファイルとして設計した
  (TikTok固有・GitHub固有のロジックを一切含まない)

### GitHub版への適用について

**今回はGitHub版(`haaland-viking-row`)には一切手を加えていない**
(diff完全一致・mtime変化なしを確認済み)。`stage-system.js`はGitHub版の
`unlock-system.js`と入力駆動の挙動が完全に同一なため、GitHub版の
`src/systems/unlock-system.js`をこのファイルに差し替えても(`stage:request`
を使わなければ)無改修時と同じ動作になる設計にしてある。GitHub版への
適用は明示的な指示があるまで実施しない。

### 変更したファイル(今回)

`config/game-config.js`(character新設、timeline.eventsをディスパッチ型に再設計、
7ステージ化)／`src/systems/director-system.js`(ディスパッチテーブル方式へ全面書き換え)／
`src/scene.js`(`renderCharacter()`への抽象化、7段階累積演出、船の待機揺れ追加)／
`src/ui.js`(タイトル/勝利テキストをconfig.characterから取得、question/legendトーン追加)／
`src/game.js`(stage-system登録を追加)／`style.css`(新トーン・question/big修飾子)

## 新規追加ファイル
`src/systems/stage-system.js`('unlock:stage'を発火する唯一の責務を持つ汎用system。
入力駆動+Director駆動の両方に対応し、GitHub版にもそのまま流用可能な設計)

## 削除したファイル
`src/systems/unlock-system.js`(責務をstage-system.jsへ一般化して置き換えたため)

## 変更しなかったファイル
`engine/`全10ファイル、`src/systems/score-system.js`・`camera-system.js`・
`tap-feedback-system.js`・`weather-system.js`(いずれもGitHub版とdiff完全一致を
確認済み。`unlock:stage`イベントの発火元がstage-system.jsに集約されただけで、
これらのファイルは以前と同じ購読ロジックのまま正しく動作する)

## engineを変更したか
**していない**(`engine/`はGitHub版とdiff完全一致)。字幕・カメラパンチ・
stage進行の指示はいずれも既存の`effect:trigger`/`unlock:stage`/新設した
`stage:request`イベントへのフィールド追加・発火元の変更だけで実現しており、
`engine/effect.js`・`engine/particle.js`の実装(`cameraShakeParams`/
`particleParams`しか読まない)には一切影響していない。

## GitHub版への影響
ゼロ(diff完全一致、mtime変化なしを確認済み)。

## 構文チェック結果
`engine/`10ファイル + `config/game-config.js` + `src/`9ファイルの計20ファイル、
全て構文エラーなし。全importパスが実ファイルに解決することを確認済み。

## 将来サッカー選手を差し替える手順(テンプレートとしての使い方)

1. `config/game-config.js`の`character`ブロックを新しい選手用に差し替える
   (playerName / title / subtitle / themeColor / palette / uniform / victoryTitle)
2. `visual.ship`・`visual.backgroundStages`等は好みで調整(そのまま流用も可)
3. `config.timeline.events`のキャプション文言は`{playerName}`/`{victoryTitle}`
   プレースホルダが自動反映されるため、多くの場合そのまま流用できる
4. `src/scene.js`・`src/ui.js`・`src/systems/`は変更不要

## Working Copyへのコピーについて

このZIPを解凍すると`haaland-viking-row-tiktok/`フォルダ直下に
`index.html` / `style.css` / `engine/` / `config/` / `src/` / `assets/` / `README.md`
が並ぶ構成になっている。GitHub版とは完全に独立したフォルダなので、
既存のWorking Copyの隣にそのまま上書き配置できる。
