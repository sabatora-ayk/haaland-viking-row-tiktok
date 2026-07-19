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

## 設計レビュー: TAP TO BEGINが消えない問題(3回目・原因特定と再設計)

推測によるCSS修正を重ねてもなお実機で再現するとの報告を受け、今回は
修正を急がず、要求された5項目の調査を全文検索によって行った。

### 1. "TAP TO BEGIN"という文字列の生成箇所(全文検索結果)
`grep -rn "TAP TO BEGIN"`の結果、`config/game-config.js`の
`startPromptText: 'TAP TO BEGIN'`のみが定義元。参照(読み取り)は
`src/main.js`の`buildStartGate(uiRoot, gameConfig.visual.ui.startPromptText, ...)`
の1箇所のみだった。

### 2. ".hvr-start-gate"の生成箇所(全文検索結果)
`grep -rn "hvr-start-gate"`の結果、実際に要素へこのクラスを付与している
コードは`src/ui.js`の`gate.className = 'hvr-start-gate hvr-start-gate-waiting'`
1箇所のみ。他はCSS定義とコメント・console.log文字列だった。

### 3. innerHTML/insertAdjacentHTML/appendChild/cloneNode/createElementの全検索
`createElement`はプロジェクト全体で`src/ui.js`(8箇所、gate以外はロゴ/
スコアボード/バナー等)と`engine/ui-manager.js`(HUD/エンド画面用)に存在した。
後者は`TapEngine`のコンストラクタで無条件にインスタンス化されるが、
`buildHud()`・`'ui:show-end-screen'`のいずれもTikTok版のどこからも
呼び出し/発火されていないことを別途確認し(該当検索0件)、
"TAP TO BEGIN"生成には無関係と判断した。`insertAdjacentHTML`・`cloneNode`は
プロジェクト全体で0件。

### 4. "TAP TO BEGIN" DOMが生成されうる経路の図
```
main.js(モジュール読み込み時に1回だけ実行)
  ├─ startShow(canvas, uiRoot)
  │    ├─ new TapEngine → new UIManager(uiRoot,bus) ※buildHud()未呼び出しのためDOM生成なし
  │    ├─ buildGameUI(...) → '.hvr-ui'配下に各種要素を生成("TAP TO BEGIN"は含まない)
  │    └─ engine.start()
  └─ buildStartGate(uiRoot, 'TAP TO BEGIN', {onBegin}) ★唯一の生成経路

loop()(35秒ごとにdirector→game.jsのonLoop経由で実行)
  └─ startShow(canvas, uiRoot)を再実行
       ├─ buildGameUI(...)は再実行される('.hvr-ui'を作り直す)
       └─ buildStartGate(...)は再実行されない ★ループのたびに増えない
```
静的解析上、"TAP TO BEGIN"のDOMノードはアプリのライフタイム全体で
理論上1個しか生成されない。

### 5. hide()操作対象と表示DOMの同一性の証明
`gate`は`buildStartGate`のローカル変数であり、生成・DOM挿入・`hide()`内での
操作・`pointerdown`ハンドラでの呼び出しは全て同一クロージャ内の同一参照。
JS変数束縛の観点からは100%同一であることが証明できる。また「Directorが
最後まで正常動作する」という報告自体が、`onBegin()`(directorを開始する
唯一の経路)が実行された証拠であり、これはgateの`pointerdown`が確実に
発火し`hide()`が確実に呼ばれたことの論理的な裏付けになる。

一方で、**「JS上どの変数を操作しているか」は証明できても、「Safari実機が
その操作を正しく描画へ反映しているか」は静的解析だけでは証明できない**、
という限界を認めた。ご指示に従い、この不確実性自体を構造的に排除する方向で
UI生成設計を作り直した。

### 再設計の内容

1. **idempotent化**: `buildStartGate`は生成前に同一id
   (`#hvr-start-gate-singleton`)の要素が存在すれば必ず全て削除してから
   新規作成する。呼び出し回数を信用せず、DOM上は常に高々1個しか
   存在しない状態を構造的に保証する。
2. **display:noneではなく実際にDOM ツリーからremove()する**: 「不可視だが
   存在する」という中間状態を一切作らない。フェードは見た目の演出として
   CSSトランジションで行うが、状態確定は必ず`gate.remove()`によるDOM完全
   撤去で行う(`transitionend`を主経路、`setTimeout`を未発火環境向け
   フォールバックとした二重トリガー)。
3. **`window.__hvrStartGate`としてライブ参照を公開**: 実機のSafari Web
   Inspectorのコンソールから`window.__hvrStartGate`(現在の要素、nullなら
   削除済み)や`document.querySelectorAll('.hvr-start-gate').length`を
   直接確認できるようにした。
4. **キャッシュバスティング**(`index.html`): `src/main.js?v=20260719c` /
   `style.css?v=20260719c`のようにバージョンクエリを付与し、Safariが
   古いJS/CSSをキャッシュから読み込み続けている可能性も併せて排除した。
   実機検証時は設定アプリからSafariの履歴とWebサイトデータを消去する
   ことも推奨する。

### 変更したファイル(今回)
`src/ui.js`(`buildStartGate`をidempotent+remove()方式へ全面再設計)／
`src/main.js`(コメント更新のみ、戻り値の扱いに変更なし)／
`index.html`(キャッシュバスティングクエリ追加)

`engine/`・GitHub版への影響なし(diff完全一致・mtime変化なしを確認済み)。

## 追加調査: TAP TO BEGINが依然として消えない問題(2回目)

実機再検証の結果、1回目の修正(pointer-events未設定)は正しかったものの、
「Directorは最後まで正常動作するのに、TAP TO BEGINのテキストだけが
画面に残り続ける」症状が再発した。今回は推測を避け、DOMツリー生成箇所と
UIライフサイクルをコードから追跡して原因を切り分けた。

### 確認項目への回答

**1. buildStartGate()で生成したDOM要素は何個か**
`grep -rn "buildStartGate("`で全文検索した結果、呼び出し箇所は`src/main.js`の
1行のみ。`src/game.js`の`loop()`は`.hvr-ui`クラスの要素のみを
`querySelectorAll('.hvr-ui').forEach(el => el.remove())`で再生成しており、
`buildStartGate`は呼んでいない。→ **生成されるのは常に1個のみ**

**2. hide()が操作しているelementと画面表示中のelementが同一か**
`show()`/`hide()`はいずれも`buildStartGate()`のクロージャ内で作られた
同一の`gate`変数のみを参照しており、別要素を誤って操作しているコードパスは
存在しなかった。

**3. UI再生成時に新しいStartGateが生成されていないか**
上記1の通り、`loop()`はStartGateに一切触れない設計になっており、
再生成は発生しない。

**4/5. 実機で確認できる診断ログを追加**
コード上は問題が見当たらなかったため、`hide()`実行時に要求された
`console.log(element)` / `console.log(element.className)` /
`console.log(element.style)` に加え、`getComputedStyle()`による
実際の描画値(opacity/pointer-events/display)と
`document.querySelectorAll(".hvr-start-gate").length`を出力するよう
`src/ui.js`に恒久的な診断ログ(`START_GATE_DEBUG`フラグで on/off 可能)を追加した。

### コードレビューで見つけた実際の疑わしい箇所

DOM生成自体には問題がなかったが、CSSを1行ずつ確認したところ、
`.hvr-start-gate-text`(テキストのspan要素)に**独自の無限アニメーション**
(`hvr-tap-prompt-pulse`によるopacity 1↔0.55の点滅)が付いていることが分かった。
親の`.hvr-start-gate`はopacityを**トランジション**で0にする一方、
子要素は**アニメーション**で独自にopacityを操作し続けており、この
「親のopacityトランジション × 子の独立したopacityアニメーション」の
組み合わせは、一部のモバイルブラウザ実装で合成結果が正しく透明化されない
既知の問題領域である。静的なコードレビューだけでは100%の断定はできないため、
これを有力な原因候補として扱い、以下の防御的な修正を行った。

### 修正内容

1. **hidden状態で子アニメーションを明示的に停止**(`style.css`)
   ```css
   .hvr-start-gate-hidden .hvr-start-gate-text {
     animation: none;
     opacity: 0;
   }
   ```

2. **opacity/pointer-eventsだけに頼らない二重対策**(`src/ui.js`)
   `hide()`実行後、CSSトランジション完了を`transitionend`で検知し(未発火環境
   向けに`setTimeout`もフォールバックとして併走)、`gate.style.display = 'none'`
   を直接設定して描画・ヒットテスト対象から完全に除外するようにした。
   `show()`側では`display`を明示的に復帰させてからクラスを戻す。

3. **pointerdownに加えclickもフォールバックで受け付け**(`src/ui.js`)
   TikTokアプリ内ブラウザ等、pointerdownの挙動が環境依存になりうる
   ケースへの耐性として追加。`state`ガードにより二重発火はしない。

### 変更したファイル(今回)
`src/ui.js`(診断ログ追加、display:noneによる二重対策、clickフォールバック)／
`style.css`(hidden状態での子アニメーション停止ルール追加)

`engine/`・GitHub版への影響なし(diff完全一致・mtime変化なしを確認済み)。

## 不具合修正: TAP TO BEGINが消えない問題

### 症状
実機確認で、ゲーム開始後も「TAP TO BEGIN」が画面に残り続ける不具合が発生していた。

### 原因
`#ui-root { pointer-events: none; }` に対し、`pointer-events: auto` を
再度有効化するCSSルールが `#ui-root button` にしか定義されておらず、
`<div class="hvr-start-gate">` はボタンではないため対象外だった。結果として、
ゲート要素はタップを一切受け取れず、指のタップはゲートを素通りして
背後のcanvasへ直接届いていた。

これにより:
- ゲート自身の`pointerdown`ハンドラが一度も発火しない
- `onBegin()`(BGM再生 + director.begin())が呼ばれない
- `gate.remove()`も同じハンドラ内にあったため、DOMからも消えない

一方でcanvas側は`engine.start()`により既にタップを受け付けていたため、
水しぶき等の一部演出だけは反応し、「動いているように見えるのに
TAP TO BEGINが消えない」という不可解な症状になっていた。

### 修正内容
CSSだけで隠す実装ではなく、`src/ui.js`の`buildStartGate()`に明示的な
状態('waiting' / 'hidden')を持たせ、`show()`/`hide()`という状態遷移APIを
公開する形に変更した。

```js
export function buildStartGate(uiRoot, promptText, { onBegin }) {
  let state = 'waiting';
  function hide() {
    state = 'hidden';
    gate.classList.remove('hvr-start-gate-waiting');
    gate.classList.add('hvr-start-gate-hidden');
  }
  gate.addEventListener('pointerdown', () => {
    if (state !== 'waiting') return; // 状態でも二重にガード
    hide();
    onBegin();
  });
  return { show, hide, getState: () => state };
}
```

CSS側は状態クラスの見た目(フェード)を定義するだけにした。

```css
.hvr-start-gate-waiting { opacity: 1; pointer-events: auto; }
.hvr-start-gate-hidden  { opacity: 0; pointer-events: none; transition: opacity 0.35s ease; }
```

`hide()`が呼ばれるとCSSトランジションでフェードアウトしつつ
`pointer-events: none`になるため、以後のタップは正しくcanvasへ素通りする
(ゲートが誤って再度反応することもない)。ループは`.hvr-ui`のみを
作り直す設計のため(`buildStartGate`はmain.jsで一度だけ生成)、
一度hideされたゲートはループを跨いでも再表示されない。
将来「リプレイ待機状態」を導入する場合は、その時点で`gate.show()`を
呼び出すだけで再表示できる構造にしてある。

### 変更したファイル(今回)
`style.css`(`.hvr-start-gate`のpointer-events修正+状態クラス追加)／
`src/ui.js`(`buildStartGate`を状態管理APIへ書き換え)／
`src/main.js`(新APIの呼び出し形式に合わせて更新)

`engine/`・GitHub版への影響なし(diff完全一致・mtime変化なしを確認済み)。

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
