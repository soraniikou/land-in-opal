let deepGlows = [];
let particles = [];
let autoSpawnTimer = 0;
let mic;
let micLevel = 0;
let micReady = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  noStroke();

  // マイク初期化
  mic = new p5.AudioIn();
  mic.start(() => {
    micReady = true;
  });

  // 最初から画面に命を宿す
  for (let i = 0; i < 14; i++) {
    deepGlows.push(new SoftOpal());
  }

  // 8秒後に音楽を自然に流す
  setTimeout(() => {
    const audio = new Audio('wasurete.m4a');
    audio.play().catch(() => {});
  }, 8000);
}

function draw() {
  background(220, 30, 5, 0.05);

  // 声のレベルを滑らかに取得
  if (micReady) {
    let raw = mic.getLevel();
    micLevel = lerp(micLevel, raw * 6, 0.15);
  }

  // 自動でオパールを生み続ける
  autoSpawnTimer++;
  if (autoSpawnTimer > 100) {
    deepGlows.push(new SoftOpal());
    if (deepGlows.length > 22) deepGlows.shift();
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
}

function mousePressed() {
  spawnAt(mouseX, mouseY);
}

function touchStarted() {
  let x = touches[0] ? touches[0].x : mouseX;
  let y = touches[0] ? touches[0].y : mouseY;
  spawnAt(x, y);
  return false;
}

function spawnAt(x, y) {
  for (let i = 0; i < 20; i++) particles.push(new SoftParticle(x, y));
  deepGlows.push(new SoftOpal(x, y));
  if (deepGlows.length > 22) deepGlows.shift();
}

// ノイズで揺れる有機的なオパール
class SoftOpal {
  constructor(x, y) {
    this.x = x !== undefined ? x + random(-120, 120) : random(width);
    this.y = y !== undefined ? y + random(-120, 120) : random(height);
    this.baseHue = random([170, 185, 200, 215, 230, 250, 265]);
    this.baseSize = random(50, 130);
    this.alpha = 0;
    this.targetAlpha = random(0.25, 0.55);
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

    // 声の強さでサイズが柔らかく膨らむ
    let voiceSwell = 1 + micLevel * 0.8;
    let currentSize = this.baseSize * voiceSwell;

    for (let layer = 3; layer >= 0; layer--) {
      let hue = (this.baseHue + frameCount * 0.25 + layer * 20 + sin(frameCount * 0.04) * 35) % 360;
      let layerSize = currentSize * (1 + layer * 0.35);
      let layerAlpha = this.alpha * (0.18 - layer * 0.04);

      fill(hue, 38 - layer * 5, 82, max(0, layerAlpha));
      this.drawBlob(layerSize, layer);
    }

    // 中心の柔らかい核
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

// 柔らかいパーティクル
class SoftParticle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.2, 1.8));
    this.acc = createVector(0, 0.01);
    this.lifespan = 1.0;
    this.baseHue = random([170, 190, 205, 220, 240, 255]);
    this.size = random(5, 12);
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
      fill(hue, 25 + r * 5, 85, this.lifespan * (0.1 + r * 0.08));
      ellipse(this.pos.x, this.pos.y, (this.size + r * 4) * 2);
    }
  }

  isFinished() { return this.lifespan < 0; }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
