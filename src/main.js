import './style.css';
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

// 撮影セットを作る
const scene = new THREE.Scene();

// カメラを置く
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // カメラの位置を少し後ろに下げる
camera.position.y = 1.6; // カメラの高さを人間の目の高さに合わせる

// 映す係（レンダラー）を用意する
const renderer = new THREE.WebGLRenderer();
renderer.xr.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio); // レンダラーのピクセル比をデバイスのピクセル比に合わせる
renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーのサイズをウィンドウサイズに合わせる
document.body.appendChild(renderer.domElement); // レンダラーのcanvasをbodyに追加する

// XR開始ボタンを作る
const button = document.createElement('button');
button.textContent = '確認中';
button.disabled = true;
document.getElementById('app').appendChild(button);

// 調べる
if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (supported) {
      button.textContent = 'START AR';
      button.disabled = false;
    } else {
      button.textContent = 'AR NOT SUPPORTED';
    }
  });
} else {
  button.textContent = 'WebXR NOT AVAILABLE';
}

// ARセッションを申し込む
button.addEventListener('click', async () => {
  const session = await navigator.xr.requestSession('immersive-ar', {optionalFeatures: ['local-floor', 'hand-tracking']});
  session.addEventListener('end', () => {
    button.textContent = 'START AR';
    hasAnchor = false;
    for (const f of funnels) {
    f.userData.state = 'formation';
    f.userData.unfold = 0;
    }
  });
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(session);
  renderer.xr.getReferenceSpace().addEventListener('reset', () => {
    hasAnchor = false;  // 次のフレームで、今の頭の位置にアンカーを記録し直す
  })
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // 環境光を作る
scene.add(ambientLight); // シーンに環境光を追加する

const directionalLight = new THREE.DirectionalLight(0xffffff, 3); // 平行光源を作る
directionalLight.position.set(5, 10, 7.5); // 平行光源の位置を設定する
scene.add(directionalLight); // シーンに平行光源を追加する

// オフセットを作る
const funnelOffset = new THREE.Vector3(0.3, 0.10, -0.40); // 頭から見たずらし量
const targetPosition = new THREE.Vector3(); // 計算結果の入れ物

const timer = new THREE.Timer();
const lambda = 5;

// 隊列の設定
const FUNNEL_COUNT = 5;
const funnelStep = new THREE.Vector3(0.07, 0.07, 0.07); // 1機ごとのずらし量
const funnels = [];

// 刃の材料（輪郭・形・材質）
const CORE_DEPTH = 0.015;
// コアの輪郭
const coreShape = new THREE.Shape();
coreShape.moveTo(0, 0.07);     // 上の先端から描き始める
coreShape.lineTo(0.02, 0.05);  // 右上の角へ線を引く
coreShape.lineTo(0.02, -0.05); // 右下の角へ
coreShape.lineTo(0, -0.07);    // 下の先端へ
coreShape.lineTo(-0.02, -0.05);
coreShape.lineTo(-0.02, 0.05);
coreShape.closePath();         // 始点に戻って閉じる（細長い六角形になる）

const coreGeometry = new THREE.ExtrudeGeometry(coreShape, { depth: CORE_DEPTH, bevelEnabled: false });
coreGeometry.translate(0, 0, -CORE_DEPTH / 2);
const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });

const FIN_DEPTH = 0.006;
// フィンの輪郭
const finShape = new THREE.Shape();
finShape.moveTo(0, 0.28);
finShape.lineTo(0.02, 0.26);
finShape.lineTo(0.02, 0.10);
finShape.lineTo(0.03, 0.05);
finShape.lineTo(0.03, -0.05);
finShape.lineTo(0.01, -0.07);
finShape.lineTo(0.01, -0.11);
finShape.lineTo(0, -0.12);
finShape.lineTo(-0.015, -0.10);
finShape.lineTo(-0.015, -0.07);
finShape.lineTo(-0.025, -0.05);
finShape.lineTo(-0.025, 0.055);
finShape.lineTo(-0.01, 0.07);
finShape.lineTo(-0.01, 0.27);
finShape.closePath();

const finGeometry = new THREE.ExtrudeGeometry(finShape, { depth: FIN_DEPTH, bevelEnabled: false });
finGeometry.translate(0, 0, -FIN_DEPTH / 2);
const finMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // フィンは不透明の白色

const stripGeometry = new THREE.BoxGeometry(0.004, 0.02, 0.002); // 幅、高さ、厚み
const stripMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
// 位置の定数
const STRIP_Y = 0.035;
const STRIP_Z = CORE_DEPTH / 2 + 0.001 + 0.001; // コアの表面 + 浮かせる分 + ラインの厚みの半分

// パネル
const panelGeometry = new THREE.PlaneGeometry(0.30, 0.20);

// ファンネルの見た目を作る
function createFunnel() {
  const funnel = new THREE.Group();
  const blade = new THREE.Group();
  funnel.add(blade);
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  blade.add(core);
  const stripTop = new THREE.Mesh(stripGeometry, stripMaterial);
  stripTop.position.set(0, STRIP_Y, STRIP_Z); // 上のライン
  blade.add(stripTop);
  const stripBottom = new THREE.Mesh(stripGeometry, stripMaterial);
  stripBottom.position.set(0, -STRIP_Y, STRIP_Z); // 下のライン
  blade.add(stripBottom);
  const fin = new THREE.Mesh(finGeometry, finMaterial);
  blade.add(fin);
  funnel.userData.state = 'formation';
  funnel.userData.summonPosition = new THREE.Vector3();
  funnel.userData.summonQuaternion = new THREE.Quaternion();

  // パネルの絵（canvas → テクスチャ）
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111111';           // 塗る色を選ぶ
  ctx.fillRect(0, 0, canvas.width, canvas.height);  // 背景を塗りつぶす
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const panelMaterial = new THREE.MeshBasicMaterial({ map: texture, color: 0xdddddd, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  funnel.add(panel);
  funnel.userData.blade = blade;
  funnel.userData.panel = panel;
  funnel.userData.unfold = 0;
  funnel.userData.homePosition = new THREE.Vector3();
  funnel.userData.canvas = canvas;
  funnel.userData.ctx = ctx;
  funnel.userData.texture = texture;
  funnel.userData.grabStart = new THREE.Vector3();
  funnel.userData.departed = false;
  return funnel;
}

// テーマを描く
function drawPanel(funnel, theme) {
  const data = funnel.userData;
  const ctx = data.ctx;
  // 背景（毎回ここから描き直す）
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, data.canvas.width, data.canvas.height);

  let y = 70;
  const maxWidth = data.canvas.width - 32 * 2;
  // タイトル
  ctx.fillStyle = '#ffaa00';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(theme.title, 32, y);
  y += 60;

  // 問い
  ctx.font = 'bold 32px sans-serif';
  const questionLines = wrapText(ctx, theme.question, maxWidth);
  for (const line of questionLines) {
    ctx.fillText(line, 32, y);
    y += 40;
  }

  y += 20;

  // メモ（箇条書き）
  for (const note of theme.notes) { // メモ１つ取り出す
    const noteLines = wrapText(ctx, '・' + note, maxWidth);  
    for (const line of noteLines) {  // そのメモの１行取り出す
      ctx.fillText(line, 32, y);
      y += 40;
    }
  }

  // canvas を描き直したことを three に知らせる
  data.texture.needsUpdate = true;
}

// text を、幅 maxWidth に収まる行の配列に分ける
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const char of text) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line);  // はみ出すので、ここまでを1行として確定
      line = char;       // 次の行は、この文字から始める
    } else {
      line = testLine;   // まだ収まるので、足して続ける
    }
  }
  lines.push(line);      // 最後に残った分も1行にする
  return lines;
}

const SUMMON_OFFSET = new THREE.Vector3(0, -0.1, -0.45);

for (let i = 0; i < FUNNEL_COUNT; i++) {
  const f = createFunnel(); // 機体を1つ作る
  f.userData.offset = funnelOffset.clone().addScaledVector(funnelStep, i); // この機体のずらし量
  f.userData.phase = i * 0.8;
  scene.add(f);
  funnels.push(f);
}

// 読み込んだテーマを、機体に1つずつ描く
function drawThemes(themes) {
  for (let i = 0; i < themes.length && i < funnels.length; i++) {
    drawPanel(funnels[i], themes[i]);
  }
}

let lastText = ''; // 前回、描画に使ったテキスト

async function refreshThemes() {
  try {
    const response = await fetch(THEMES_URL, { cache: 'no-store' });
    const text = await response.text();
    if (text === lastText) return;     // 変わっていなければ、何もしない
    const themes = JSON.parse(text);   // 壊れていたら、ここで catch へ
    lastText = text;                   // 解釈に成功してから、覚える
    drawThemes(themes);
  } catch (error) {
    console.warn('themes.json を読めませんでした', error);
  }
}

const POLL_INTERVAL = 2000;  // 確認の間隔（ミリ秒）開発中のみ
// 開発中は自分用のメモ、公開版はサンプルを読む
const THEMES_URL = import.meta.env.DEV ? './themes.private.json' : './themes.json';
refreshThemes();
if (import.meta.env.DEV) {
  setInterval(refreshThemes, POLL_INTERVAL);
}

// fpsなどの表示
const meterCanvas = document.createElement('canvas');
meterCanvas.width = 256;
meterCanvas.height = 128;
const meterCtx = meterCanvas.getContext('2d');

meterCtx.fillStyle = '#111111';           // 塗る色を選ぶ
meterCtx.fillRect(0, 0, meterCanvas.width, meterCanvas.height);  // 背景を塗りつぶす
const meterTexture = new THREE.CanvasTexture(meterCanvas);
meterTexture.colorSpace = THREE.SRGBColorSpace;
const meterGeometry = new THREE.PlaneGeometry(0.08, 0.04);

const meterMaterial = new THREE.MeshBasicMaterial({ map: meterTexture });
const meter = new THREE.Mesh(meterGeometry, meterMaterial);

const DEBUG = import.meta.env.DEV;

const meterOffset = new THREE.Vector3(-0.12, -0.08, -0.3);

if (DEBUG) {
  scene.add(camera);  // カメラをシーンに入れる（子を描画するため）
  camera.add(meter);  // 計器をカメラの子にする（視界に付いてくる）
  meter.position.copy(meterOffset);  // カメラから見て、左下に置く
}

function drawMeter(fps) {
  // 背景を塗る
  meterCtx.fillStyle = '#111111';
  meterCtx.fillRect(0, 0, meterCanvas.width, meterCanvas.height);

  // 文字を描く
  meterCtx.fillStyle = '#ffaa00';
  meterCtx.font = 'bold 24px sans-serif';
  meterCtx.fillText('FPS: ' + fps.toFixed(0), 16, 32);
  meterCtx.fillText('Calls: ' + renderer.info.render.calls, 16, 68);
  meterCtx.fillText('Triangles: ' + renderer.info.render.triangles, 16, 104);

  // 描き直したことを three に知らせる
  meterTexture.needsUpdate = true;
}

// コントローラーの描画
const controllerModelFactory = new XRControllerModelFactory();

const handModelFactory = new XRHandModelFactory();

const hand1 = renderer.xr.getHand(0);
const hand2 = renderer.xr.getHand(1);

hand1.add(handModelFactory.createHandModel(hand1, 'mesh'));
hand2.add(handModelFactory.createHandModel(hand2, 'mesh'));

scene.add(hand1);
scene.add(hand2);

// ターゲットレイのグループを取り出す
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);

const controllerGrip1 = renderer.xr.getControllerGrip(0);
const controllerGrip2 = renderer.xr.getControllerGrip(1);

// グリップに模型を付ける
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));

// レーザー線を作って、ターゲットレイの子にする
const laserGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0), //根本(コントローラーの先端)
  new THREE.Vector3(0, 0, -1), //先端（前に１ｍ）
]);

controller1.addEventListener('selectstart', onSelectStart);
controller2.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
controller2.addEventListener('selectend', onSelectEnd);

function findFunnel(object) {
  while (object && !funnels.includes(object)) {
    object = object.parent;
  }
  return object;
}

function getHeadYaw(out) {
  headEuler.setFromQuaternion(camera.quaternion);
  return out.setFromAxisAngle(UP, headEuler.y);
}

function onSelectStart(event) {
  const controller = event.target; // コントローラーを取り出す
  const funnelHits = getIntersections(controller, funnels);
  if (funnelHits.length > 0) {
    const funnel = findFunnel(funnelHits[0].object);
    const data = funnel.userData;
    if (data.state === 'summoned' || data.state === 'placed') {
      controller.attach(funnel);
      data.state = 'held';
      controller.userData.heldFunnel = funnel;
      funnel.getWorldPosition(data.grabStart); // 部屋の中での位置を記録
      return;
    }
    for (const f of funnels) {
      if (f.userData.state === 'summoned') {
        f.userData.state = 'formation';
      }
    }
    data.state = 'summoned';
    data.departed = false;
    getHeadYaw(data.summonQuaternion);
    data.summonPosition.copy(SUMMON_OFFSET)
      .applyQuaternion(data.summonQuaternion)
      .add(camera.position);
    return;
  }
}

const releasePosition = new THREE.Vector3();  // 離した位置の入れ物

// 離す。タップなら隊列へ戻し、ドラッグならその場に置く
function onSelectEnd(event) {
  const controller = event.target;
  const funnel = controller.userData.heldFunnel;
  if (!funnel) return;
  funnel.getWorldPosition(releasePosition);
  if (releasePosition.distanceTo(funnel.userData.grabStart) < TAP_DISTANCE) {
    funnel.userData.state = 'formation';
  } else {
    funnel.userData.state = 'placed';
  }
  scene.attach(funnel);
  controller.userData.heldFunnel = null;
}

function getIntersections(controller, objects) {
  // ① raycaster に、controller から光線をセット
  raycaster.setFromXRController(controller);
  // ② objects と判定して、結果を受け取る
  const intersections = raycaster.intersectObjects(objects);
  return intersections;
}

const laser = new THREE.Line(laserGeometry, new THREE.LineBasicMaterial({ color: 0xffffff })); // 線を作る
controller1.add(laser);
controller2.add(laser.clone()); // controller2にもレーザー線を追加する（clone()でコピーする）

// コントローラーをシーンに追加する
scene.add(controller1);
scene.add(controller2);
scene.add(controllerGrip1);
scene.add(controllerGrip2);

// レイキャスターを作る
const raycaster = new THREE.Raycaster();

// アンカー（AR 開始時の頭の位置と左右の向き）を記録するための入れ物
const headEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const UP = new THREE.Vector3(0, 1, 0);
const anchorPosition = new THREE.Vector3();
const anchorQuaternion = new THREE.Quaternion();
let hasAnchor = false;

// ファンネルの傾き
const TILT_FORWARD = THREE.MathUtils.degToRad(-10);
const TILT_SIDE = THREE.MathUtils.degToRad(15);
const tiltQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT_FORWARD, 0, TILT_SIDE));
const targetQuaternion = new THREE.Quaternion();

// 展開アニメの設定
const UNFOLD_DURATION = 0.6;
const M = THREE.MathUtils;
const ARRIVE_DISTANCE = 0.05;
const TAP_DISTANCE = 0.03;

// 指している機体を目立たせる
function highlightFunnel(funnel) {
  if (funnel.userData.panel.visible) {
    funnel.userData.panel.material.color.set(0xffffff);
  } else {
    funnel.scale.setScalar(1.15);
  }
}

// 場所が空いているか
const HOME_DISTANCE = 0.05;

function isSummonSpotClear(self) {
  for (const other of funnels) {
    if (other === self) continue;  // 自分は調べない
    if (other.userData.state !== 'formation') continue;  // 置いた・つかんでいるパネルは、帰ってこないので調べない
    if (other.userData.unfold > 0) return false;  // まだ畳んでいる途中
    if (other.position.distanceTo(other.userData.homePosition) > HOME_DISTANCE) {
      return false;  // 畳み終わったが、まだ家に帰り着いていない
    }
  }
  return true;
}

// ゆらぎの設定
const BOB_SPEED = 3; // 揺れる速さ
const BOB_AMPLITUDE = 0.005; // 揺れ幅

// fps計測用
let meterFrames = 0;
let meterTime = 0;

// アニメーションさせる関数
function animate(timestamp) {
  // 経過時間から追従の割合を計算する
  timer.update(timestamp);
  const dt = timer.getDelta();
  const ratio = 1 - Math.exp(-lambda * dt);

  // ファンネルの向きの目標を計算
  targetQuaternion.copy(anchorQuaternion).multiply(tiltQuaternion);

  // ファンネルの揺らぎ
  const elapsed = timer.getElapsed();

  // 1機ずつ
  for (const f of funnels) {
    const data = f.userData;
    const isHeldOrPlaced = ['held', 'placed'].includes(data.state);
    const step = dt / UNFOLD_DURATION;
    const goToSummon = (data.state === 'summoned') && (data.departed || isSummonSpotClear(f));
    if (isHeldOrPlaced) {
      data.unfold += step;  // 開ききるまで進める。位置と向きは触らない
    } else if (goToSummon) {
      data.departed = true;
      f.position.lerp(f.userData.summonPosition, ratio);
      f.quaternion.slerp(f.userData.summonQuaternion, ratio);
      // 呼び出し位置にほぼ着いたら、開き始める
      if (f.position.distanceTo(data.summonPosition) < ARRIVE_DISTANCE) {
        data.unfold += step;
      } 
    } else {
      data.unfold -= step; // 隊列 → 0 に向かって戻す
      if (data.unfold <= 0) {
        targetPosition.copy(f.userData.offset); // ずらし量を入れ物に写す
        targetPosition.y += Math.sin(elapsed * BOB_SPEED + f.userData.phase) * BOB_AMPLITUDE;
        targetPosition.applyQuaternion(anchorQuaternion)  // アンカーの向きに合わせて回す
          .add(anchorPosition);  // アンカーの位置からずらす
        data.homePosition.copy(targetPosition);
        f.position.lerp(targetPosition, ratio); // 位置を追いかける
        f.quaternion.slerp(targetQuaternion, ratio); // 向きを追いかける
      }
    }

    // 0〜1 からはみ出さないように収める
    data.unfold = M.clamp(data.unfold, 0, 1);

    // 刃：先に横が縮み、少し遅れて縦が縮んで消える
    const bladeX = M.smoothstep(data.unfold, 0.0, 0.3);
    const bladeY = M.smoothstep(data.unfold, 0.2, 0.4);
    data.blade.scale.set(1 - 0.9 * bladeX, 1 - bladeY, 1);
    data.blade.visible = bladeY < 1;

    // パネル：先に横へ細く伸び、そのあと縦に開く
    const panelX = M.smoothstep(data.unfold, 0.4, 0.7);
    const panelY = M.smoothstep(data.unfold, 0.6, 1.0);
    data.panel.scale.set(panelX, Math.max(panelY, 0.02), 1);
    data.panel.visible = panelX > 0;
    data.panel.material.opacity = panelX;
  }

  // ターゲットレイの交差エフェクト
  for (const f of funnels) {
    f.scale.setScalar(1);
    f.userData.panel.material.color.set(0xdddddd);
  }
  const funnelHits1 = getIntersections(controller1, funnels);
  if (funnelHits1.length > 0) {
    const funnel = findFunnel(funnelHits1[0].object);
    highlightFunnel(funnel);
  }
  const funnelHits2 = getIntersections(controller2, funnels);
  if (funnelHits2.length > 0) {
    const funnel = findFunnel(funnelHits2[0].object);
    highlightFunnel(funnel);
  }

  renderer.render(scene, camera); // シーンとカメラを使ってレンダリングする

  // fps を数えて、0.5秒ごとに計器に表示する
  if (DEBUG) {
    meterFrames += 1;
    meterTime += dt;
    if (meterTime >= 0.5) {
      const fps = meterFrames / meterTime;
      drawMeter(fps);
      meterFrames = 0;
      meterTime = 0;
    }
  }

  // アンカー方式
  if (renderer.xr.isPresenting && !hasAnchor) {
    // 頭の位置とyawの回転をコピーする
    anchorPosition.copy(camera.position);
    getHeadYaw(anchorQuaternion);
    hasAnchor = true;
  }
}
renderer.setAnimationLoop(animate); // AR中も通常時も、レンダラーが自動的にanimate関数を呼び出すようにする

// ウィンドウサイズが変わったときに呼ばれる関数
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight; // カメラのアスペクト比をウィンドウサイズに合わせる
  camera.updateProjectionMatrix(); // カメラの投影行列を更新する
  renderer.setPixelRatio(window.devicePixelRatio); // レンダラーのピクセル比をデバイスのピクセル比に合わせる
  renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーのサイズをウィンドウサイズに合わせる
}

window.addEventListener('resize', onWindowResize); // ウィンドウサイズが変わったときにonWindowResize関数を呼び出す
