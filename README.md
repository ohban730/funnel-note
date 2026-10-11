# Funnel Note

空中に浮かぶファンネル（刃）に、自分の考えごとを宿す WebXR アプリです。
Meta Quest 3 のパススルー（MR）で、部屋の中にファンネルが控え、つまむと目の前でメモのパネルに展開します。
パネルは空中に置いて並べられるので、考えごとの全体を一望できます。

- デモ（Quest 3 のブラウザで開いてください）: https://ohban730.github.io/funnel-note/

[![Funnel Note デモ動画](https://img.youtube.com/vi/xMWeOoEERps/0.jpg)](https://youtu.be/xMWeOoEERps)

> 公開版は、サンプルのメモを表示する読み取り専用です。
> 自分のメモを書いて空間に反映させるには、ローカルで動かしてください（下記）。

## できること

- **呼び出す**: 隊列のファンネルをつまむと、目の前に飛んできて、メモのパネルに展開する
- **置く**: パネルをつまんだまま動かして離すと、その場に留まる。複数のパネルを空中に並べられる
- **戻す**: パネルを軽くつまむ（動かさずに離す）と、畳まれて隊列に帰る
- **書いたら反映される**（ローカルのみ）: PC で JSON を書き換えて保存すると、数秒でゴーグルの中のパネルが更新される
- 手（ハンドトラッキング）とコントローラーの、どちらでも操作できる

## 使い方

1. Quest 3 のブラウザで、デモの URL を開く
2. 画面の「START AR」を押して、AR に入る
3. 床からファンネルが飛んできて、右斜め上に並ぶ
4. ファンネルを指して、つまむ（コントローラーならトリガー）と、目の前でパネルに展開する
5. パネルを動かして置いたり、軽くつまんで隊列に戻したりする

ゴーグルを外して付け直すと、ファンネルの隊列は、付け直した位置に組み直されます。

## ローカルで動かす

### 必要なもの

- Meta Quest 3（Quest のブラウザで開きます）
- Node.js（22 LTS 以上を推奨）
- PC と Quest 3 が、同じネットワーク（Wi-Fi）につながっていること

### 手順

```bash
git clone https://github.com/ohban730/funnel-note.git
cd funnel-note
npm install
```

自分のメモ用のファイルを作ります。サンプルをコピーして、中身を書き換えてください。

```bash
cp public/themes.json public/themes.private.json
```

`themes.private.json` は `.gitignore` に入っているので、git には含まれません。
開発中はこのファイルが、公開版では `themes.json`（サンプル）が読み込まれます。

開発サーバーを起動します。

```bash
npm run dev -- --host
```

表示された `Network:` のアドレスに `/funnel-note/` を付けて、Quest 3 のブラウザで開きます。

```
https://<PC の IP アドレス>:5173/funnel-note/
```

- 自己署名の証明書を使っているため、最初に警告が表示されます。内容を確認したうえで、詳細から先に進んでください（WebXR は HTTPS でしか動かないため、証明書が必要です）
- つながらない場合は、PC と Quest 3 が同じネットワークにいるか、Windows のファイアウォールで接続が遮断されていないかを確認してください

### メモの書き方

`public/themes.private.json` に、1機につき1つのテーマを書きます（最大5つ）。

```json
[
  {
    "title": "テーマの名前",
    "question": "今考えている問い",
    "notes": [
      "メモ1",
      "メモ2"
    ]
  }
]
```

AR の中でパネルを開いたまま、PC でこのファイルを書き換えて保存すると、数秒でパネルが更新されます。
書きかけで JSON が壊れていても、パネルは前の表示のまま残り、直して保存すると反映されます。

## 使った技術

- [three.js](https://threejs.org/)（WebXR、CanvasTexture）
- [Vite](https://vite.dev/)
- WebXR Device API（immersive-ar、hand-tracking、local-floor）
- GitHub Pages / GitHub Actions

## ライセンス

MIT License（詳しくは [LICENSE](LICENSE) を参照）
