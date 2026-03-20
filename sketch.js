let deepGlows = [];
let particles = [];
let autoSpawnTimer = 0;
let mic;
let micLevel = 0;
let micReady = false;
let audioContext;

// 呼吸ガイド
let breathPhase = 0; // 0=inhale, 1=hold, 2=exhale
let breathTimer = 0;
let breathDurations = [180, 60, 240]; // 吸う3秒、止める1秒、吐く4秒
let breathLabels = ["息を吸って", "", "ゆっくり吐いて"];
let breathAlpha = 0;
let showBreath = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  noStroke();
  textFont('Georgia');

  for (let i = 0; i < 10; i++) {
    deepGlows.push(new SoftOpal());
  }

  setTimeout(() => {
    const audio = new Audio('wasurete.m4a');
    audio.play().catch(() => {});
  }, 8000);
}

function draw() {
  background(220, 30, 5, 0.05);

  // マイクレベル取得
  if (micReady && mic) {
    let raw = mic.getLevel();
    micLevel = lerp(micLevel, raw * 8, 0.2);
  }

  // 自動スポーン：以前の3倍遅く（100→300）
  autoSpawnTimer++;
  if (autoSpawnTimer > 300) {
    deepGlows.push(new SoftOpal());
    if (deepGlows.length > 18) deepGlows.shift();
    autoSpawnTimer = 0;
  }

  for (let g of deepGlows) {
    g.update();
    g.display();
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isFinished()) particles.splice(i, 1);
  }

  // 呼吸ガイド表示
  if (showBreath) {
    updateBreath();
    drawBreathGuide();
  }

  // 画面下部のヒント（最初だけ薄く）
  if (frameCount < 300) {
    let hint = 1 - frameCount / 300;
    push();
    fill(200, 15, 85, hint * 0.4);
    textAlign(CENTER);
    textSize(12);
    text("tap anywhere  ·  hold to breathe", width / 2, height - 30);
    pop();
  }
}

// 呼吸ガイドの更新
function updateBreath() {
  breathTimer++;
  if (breathTimer > breathDurations[breathPhase]) {
    breathTimer = 0;
    breathPhase = (breathPhase + 1) % 3;
  }
}

function drawBreathGuide() {
  let progress = breathTimer / breathDurations[breathPhase];
  let label = breathLabels[breathPhase];

  // 呼吸に合わせて拡縮する円
  let baseR = 40;
  let maxR = 80;
  let r;
  if (breathPhase === 0) r = lerp(baseR, maxR, progress);       // 吸う→大きく
  else if (breathPhase === 1) r = maxR;                          // 止める
  else r = lerp(maxR, baseR, progress);                          // 吐く→小さく

  breathAlpha = lerp(breathAlpha, 0.6, 0.05);

  push();
  translate(width / 2, height / 2);
  noFill();
  stroke(200, 25, 80, breathAlpha * 0.5);
  strokeWeight(1);
  ellipse(0, 0, r * 2, r * 2);
  fill(200, 20, 88, breathAlpha * 0.15);
  noStroke();
  ellipse(0, 0, r * 2, r * 2);

  if (label) {
    fill(200, 15, 90, breathAlpha * 0.7);
    textAlign(CENTER);
    textSize(13);
    text(label, 0, r + 22);
  }
  pop();
}

// タップ：パーティクルを散らす
function mousePressed() {
  initMicOnce();
  spawnAt(mouseX, mouseY);
}

// 長押し：呼吸ガイドのオン/オフ
let pressStart = 0;
function mouseReleased() {
  if (millis() - pressStart > 600) {
    showBreath = !showBreath;
    breathAlpha = 0;
    breathTimer = 0;
    breathPhase = 0;
  }
  pressStart = millis();
}

function touchStarted() {
  initMicOnce();
  let x = touches[0] ? touches[0].x : mouseX;
  let y = touches[0] ? touches[0].y : mouseY;
  spawnAt(x, y);
  pressStart = millis();
  return false;
}

function touchEnded() {
  if (millis() - pressStart > 600) {
    showBreath = !showBreath;
    breathAlpha = 0;
    breathTimer = 0;
    breathPhase = 0;
  }
  return false;
}

// マイクは最初のタップ後に初期化（ブラウザ制限対策）
function initMicOnce() {
  if (micReady || mic) return;
  userStartAudio().then(() => {
    mic = new p5.AudioIn();
    mic.start(() => {
      micReady = true;
    });
  });
}

function spawnAt(x, y) {
  for (let i = 0; i < 16; i++) particles.push(new SoftParticle(x, y));
  deepGlows.push(new SoftOpal(x, y));
  if (deepGlows.length > 18) deepGlows.shift();
}

class SoftOpal {
  constructor(x, y) {
    this.x = x !== undefined ? x + random(-100, 100) : random(width);
    this.y = y !== undefined ? y + random(-100, 100) : random(height);
    this.baseHue = random([170, 185, 200, 215, 230, 250, 265]);
    // サイズを小さく（50-130 → 25-65）
    this.baseSize = random(25, 65);
    this.alpha = 0;
    this.targetAlpha = random(0.25, 0.5);
    this.phase = random(TWO_PI);
    this.noiseOffset = random(1000);
    this.fadeOut = false;
    this.life = 0;
    this.maxLife = random(400, 700);
    this.points = floor(random(7, 13));
  }

  update() {
    this.life++;
    if (!this.fadeOut) {
      this.alpha = lerp(this.alpha, this.targetAlpha, 0.012);
      if (this.life > this.maxLife) this.fadeOut = true;
    } else {
      this.alpha -= 0.003;
    }
    this.x += sin(frameCount * 0.006 + this.phase) * 0.25;
    this.y += cos(frameCount * 0.005 + this.phase) * 0.18;
  }

  display() {
    if (this.alpha <= 0) return;
    push();
    translate(this.x, this.y);

    let voiceSwell = 1 + micLevel * 0.9;
    let currentSize = this.baseSize * voiceSwell;

    for (let layer = 3; layer >= 0; layer--) {
      let hue = (this.baseHue + frameCount * 0.25 + layer * 20 + sin(frameCount * 0.04) * 35) % 360;
      let layerSize = currentSize * (1 + layer * 0.35);
      let layerAlpha = this.alpha * (0.18 - layer * 0.04);
      fill(hue, 38 - layer * 5, 82, max(0, layerAlpha));
      this.drawBlob(layerSize, layer);
    }

    let coreHue = (this.baseHue + frameCount * 0.4) % 360;
    fill(coreHue, 18, 88, this.alpha * 0.75);
    this.drawBlob(currentSize * 0.28, 0);
    pop();
  }

  drawBlob(size, layerIndex) {
    let r = size * 0.5;
    beginShape();
    for (let i = 0; i < this.points; i++) {
      let angle = map(i, 0, this.points, 0, TWO_PI);
      let n = noise(
        this.noiseOffset + cos(angle) * 0.8 + layerIndex * 0.3,
        this.noiseOffset + sin(angle) * 0.8 + frameCount * 0.004
      );
      let r2 = r * (0.72 + n * 0.56);
      curveVertex(cos(angle) * r2, sin(angle) * r2);
    }
    for (let i = 0; i < 3; i++) {
      let angle = map(i, 0, this.points, 0, TWO_PI);
      let n = noise(
        this.noiseOffset + cos(angle) * 0.8 + layerIndex * 0.3,
        this.noiseOffset + sin(angle) * 0.8 + frameCount * 0.004
      );
      let r2 = r * (0.72 + n * 0.56);
      curveVertex(cos(angle) * r2, sin(angle) * r2);
    }
    endShape(CLOSE);
  }

  isDone() { return this.alpha <= 0 && this.fadeOut; }
}

class SoftParticle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.2, 1.6));
    this.acc = createVector(0, 0.01);
    this.lifespan = 1.0;
    this.baseHue = random([170, 190, 205, 220, 240, 255]);
    this.size = random(3, 8);
    this.phase = random(TWO_PI);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 0.005;
  }

  display() {
    let hue = (this.baseHue + sin(frameCount * 0.04 + this.phase) * 35) % 360;
    for (let r = 3; r >= 0; r--) {
      fill(hue, 25 + r * 5, 85, this.lifespan * (0.08 + r * 0.06));
      ellipse(this.pos.x, this.pos.y, (this.size + r * 3) * 2);
    }
  }

  isFinished() { return this.lifespan < 0; }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

