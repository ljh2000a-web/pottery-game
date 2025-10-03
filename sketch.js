let mic;
let vol = 0;
let kilnImg;
let potteryImg;
let particles = [];
let gauge = 0;
let gaugeMax = 2000; // ✅ 게이지 크게 늘림
let success = false;
let started = false;
let scaleFactor;

let potteryX, potteryY;
let dragging = false;
let inKiln = false;

function preload() {
  kilnImg = loadImage("https://i.imgur.com/a7u5gzW.png"); // 가마 배경
  potteryImg = loadImage("https://i.imgur.com/SuVs1H7.png", () => {
    scaleFactor = 300 / potteryImg.width;
  });
}

function setup() {
  createCanvas(1280, 720); // 16:9 화면
  noStroke();
  imageMode(CENTER);
  textAlign(CENTER);

  potteryX = width / 2;
  potteryY = 120; // 처음엔 위쪽
}

function draw() {
  // 🔥 배경: 붉은 그라데이션 + 깜빡임
  let flicker = map(sin(frameCount * 0.05), -1, 1, -20, 20);
  setGradient(0, 0, width, height,
    color(30 + flicker, 0, 0),
    color(80 + flicker, 20, 0),
    "Y"
  );

  // 가마 이미지 (원본 비율 유지)
  let imgRatio = kilnImg.width / kilnImg.height;
  let canvasRatio = width / height;
  let newW, newH;
  if (imgRatio > canvasRatio) {
    newW = width;
    newH = width / imgRatio;
  } else {
    newH = height;
    newW = height * imgRatio;
  }
  image(kilnImg, width / 2, height / 2, newW, newH);

  if (!inKiln) {
    // 드래그 단계
    if (scaleFactor) {
      let newW = potteryImg.width * scaleFactor;
      let newH = potteryImg.height * scaleFactor;
      image(potteryImg, potteryX, potteryY, newW, newH);
    }
    fill(255);
    textSize(20);
    text("토기를 드래그해서 가마 속에 넣으세요", width / 2, 40);
  } else {
    // 게임 단계
    runGame();
  }
}

function mousePressed() {
  if (success) {
    // ✅ 성공 후 클릭 → 리셋
    resetGame();
    return;
  }

  if (!inKiln) {
    let d = dist(mouseX, mouseY, potteryX, potteryY);
    if (d < 150) dragging = true;
  }
}

function mouseDragged() {
  if (dragging && !inKiln) {
    potteryX = mouseX;
    potteryY = mouseY;
  }
}

function mouseReleased() {
  if (dragging && !inKiln) {
    dragging = false;
    if (potteryX > width/2 - 120 && potteryX < width/2 + 120 &&
        potteryY > height/2 - 50 && potteryY < height/2 + 150) {
      inKiln = true;
      startMic();
    }
  }
}

function startMic() {
  mic = new p5.AudioIn();
  mic.start();
  started = true;
}

function runGame() {
  vol = mic.getLevel();

  // ✅ 소리가 없으면 불꽃/게이지 멈춤
  if (vol > 0.01 && !success) {
    gauge += vol * 5;
    gauge = constrain(gauge, 0, gaugeMax);
    if (gauge >= gaugeMax) success = true;
  }

  let progress = gauge / gaugeMax;
  let c1 = color(210, 180, 140);
  let c2 = color(255, 80, 0);
  let c3 = color(255, 255, 255);
  let mixCol = progress < 0.5
    ? lerpColor(c1, c2, progress * 2)
    : lerpColor(c2, c3, (progress - 0.5) * 2);

  if (scaleFactor) {
    let newW = potteryImg.width * scaleFactor;
    let newH = potteryImg.height * scaleFactor;
    let shakeX = sin(frameCount * 0.1) * progress * 5;
    let shakeY = cos(frameCount * 0.1) * progress * 2;
    tint(mixCol);
    image(potteryImg, width / 2 + shakeX, height / 2 + 50 + shakeY, newW, newH);
    noTint();
  }

  // ✅ 소리가 있을 때만 불꽃 생성
  if (vol > 0.01) {
    let flameSize = map(vol, 0, 0.3, 10, 80);
    particles.push(new Particle(width / 2 - 80, height - 150, flameSize));
    particles.push(new Particle(width / 2, height - 140, flameSize));
    particles.push(new Particle(width / 2 + 80, height - 150, flameSize));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].finished()) particles.splice(i, 1);
  }

  drawGauge();

  fill(255);
  textSize(16);
  if (!success) {
    if (progress < 0.3) text("마이크에 소리를 내보세요! 🎤🔥", width / 2, 30);
    else if (progress < 0.6) text("따뜻해지고 있어요 🔥", width / 2, 30);
    else text("달궈지고 있어요! 🔥🔥", width / 2, 30);
  } else {
    textSize(32);
    fill(0, 255, 0);
    text("성공! (클릭하면 다시 시작)", width / 2, height / 2);
  }
}

function drawGauge() {
  let barWidth = 400;
  let barHeight = 20;
  let x = width / 2 - barWidth / 2;
  let y = height - 40;
  stroke(255);
  noFill();
  rect(x, y, barWidth, barHeight);
  noStroke();
  fill(255, 100, 0);
  let filled = map(gauge, 0, gaugeMax, 0, barWidth);
  rect(x, y, filled, barHeight);
}

class Particle {
  constructor(x, y, s) {
    this.x = x + random(-10, 10);
    this.y = y;
    this.vx = random(-0.3, 0.3);
    this.vy = random(-2, -1);
    this.alpha = 255;
    this.size = s + random(-5, 5);
    this.offset = random(1000);
  }

  finished() { return this.alpha < 0; }

  update() {
    this.x += this.vx + sin(frameCount * 0.1 + this.offset) * 0.5;
    this.y += this.vy;
    this.alpha -= 5;
  }

  show() {
    let progress = this.alpha / 255;
    let c;
    if (progress > 0.7) c = color(255, 255, 200, this.alpha);
    else if (progress > 0.4) c = color(255, 150, 50, this.alpha);
    else c = color(200, 50, 0, this.alpha);
    noStroke();
    fill(c);
    ellipse(this.x, this.y, this.size, this.size * 1.5);
  }
}

function setGradient(x, y, w, h, c1, c2, axis) {
  noFill();
  if (axis === "Y") {
    for (let i = y; i <= y + h; i++) {
      let inter = map(i, y, y + h, 0, 1);
      let c = lerpColor(c1, c2, inter);
      stroke(c);
      line(x, i, x + w, i);
    }
  } else if (axis === "X") {
    for (let i = x; i <= x + w; i++) {
      let inter = map(i, x, x + w, 0, 1);
      let c = lerpColor(c1, c2, inter);
      stroke(c);
      line(i, y, i, y + h);
    }
  }
}

function resetGame() {
  gauge = 0;
  success = false;
  started = false;
  inKiln = false;
  particles = [];
  potteryX = width / 2;
  potteryY = 120;
}
