// Game State
let gameState = "menu"; // menu, playing, won
let time = 0;
let bestTime = null;
let timerInterval = null;
let animationFrameId = null;
let seed = 123;

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Car state
const car = {
  x: 100,
  y: 300,
  angle: 0,
  speed: 0,
  maxSpeed: 3,
  acceleration: 0.003,
  friction: 0.001,
  turnSpeed: 0.02,
};

// Keys pressed
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  j: false,
  l: false,
};

// Track definition
const track = {
  outer: [
    { x: 50, y: 50 },
    { x: 750, y: 50 },
    { x: 750, y: 550 },
    { x: 50, y: 550 },
  ],
  inner: [
    { x: 150, y: 150 },
    { x: 650, y: 150 },
    { x: 650, y: 450 },
    { x: 150, y: 450 },
  ],
  start: { x: 100, y: 250, width: 100, height: 100 },
  finish: { x: 100, y: 250, width: 100, height: 100 },
};

// DOM Elements
const menuOverlay = document.getElementById("menuOverlay");
const winOverlay = document.getElementById("winOverlay");
const timerDisplay = document.getElementById("timerDisplay");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const currentTimeDisplay = document.getElementById("currentTime");
const finalTimeDisplay = document.getElementById("finalTime");
const bestTimeDisplay = document.getElementById("bestTimeDisplay");
const newBestTimeDisplay = document.getElementById("newBestTime");

// Event Listeners
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

// Initialize
loadBestTime();
updateBestTimeDisplay();

// Keyboard Controls
function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  if (key in keys) {
    e.preventDefault();
    keys[key] = true;
  }
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  if (key in keys) {
    keys[key] = false;
  }
}

// Game Functions
function startGame() {
  // Reset car
  car.x = 100;
  car.y = 300;
  car.angle = 0;
  car.speed = 0;

  // Reset time
  time = 0;
  updateTimeDisplay();

  // Update UI
  gameState = "playing";
  menuOverlay.classList.add("hidden");
  winOverlay.classList.add("hidden");
  timerDisplay.classList.remove("hidden");

  // Start timer
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    time += 0.01;
    updateTimeDisplay();
  }, 10);

  // Start game loop if not running
  if (!animationFrameId) {
    gameLoop();
  }
}

function endGame() {
  return;
  gameState = "won";

  // Stop timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Hide timer display
  timerDisplay.classList.add("hidden");

  // Update best time
  const isNewBest = !bestTime || time < bestTime;
  if (isNewBest) {
    bestTime = time;
    saveBestTime();
    newBestTimeDisplay.classList.remove("hidden");
  } else {
    newBestTimeDisplay.classList.add("hidden");
  }

  // Show win overlay
  finalTimeDisplay.textContent = time.toFixed(2) + "s";
  winOverlay.classList.remove("hidden");
  updateBestTimeDisplay();
}

function updateTimeDisplay() {
  currentTimeDisplay.textContent = time.toFixed(2) + "s";
}

function updateBestTimeDisplay() {
  if (bestTime) {
    bestTimeDisplay.textContent = `Best Time: ${bestTime.toFixed(2)}s`;
    bestTimeDisplay.style.display = "block";
  } else {
    bestTimeDisplay.style.display = "none";
  }
}

function saveBestTime() {
  localStorage.setItem("vroomdle_best_time", bestTime.toString());
}

function loadBestTime() {
  const saved = localStorage.getItem("vroomdle_best_time");
  if (saved) {
    bestTime = parseFloat(saved);
  }
}

// Drawing Functions
function drawTrack() {
  // Background
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer boundary
  ctx.strokeStyle = "#121213";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(track.outer[0].x, track.outer[0].y);
  track.outer.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.stroke();

  // Track surface (fill between outer and inner)
  ctx.fillStyle = "#e8e8e8";
  ctx.beginPath();
  ctx.moveTo(track.outer[0].x, track.outer[0].y);
  track.outer.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fill();

  // Inner boundary
  ctx.strokeStyle = "#121213";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(track.inner[0].x, track.inner[0].y);
  track.inner.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.stroke();

  // Cut out inner area
  ctx.fillStyle = "#f5f5f5";
  ctx.beginPath();
  ctx.moveTo(track.inner[0].x, track.inner[0].y);
  track.inner.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fill();

  // Finish line
  ctx.fillStyle = "#538d4e";
  ctx.fillRect(track.finish.x, track.finish.y, track.finish.width, 8);

  // Checkered pattern on finish
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#121213";
    ctx.fillRect(track.finish.x + i * 20, track.finish.y, 20, 8);
  }
}

function drawCar() {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // Car body
  ctx.fillStyle = "#538d4e";
  ctx.fillRect(-15, -10, 30, 20);

  // Car front indicator
  ctx.fillStyle = "#121213";
  ctx.fillRect(12, -6, 6, 12);

  ctx.restore();
}

// Physics and Collision
function updateGame() {
  if (gameState !== "playing") return;

  // Handle acceleration
  if (keys.w) {
    car.speed = Math.min(car.speed + car.acceleration, car.maxSpeed);
  } else if (keys.s) {
    car.speed = Math.max(car.speed - car.acceleration * 5, -car.maxSpeed * 0.5);
  } else {
    car.speed -= car.friction;
  }

  // Handle turning (only when moving)
  if (Math.abs(car.speed) > 0.1) {
    if (keys.a || keys.j) {
      car.angle -= car.turnSpeed;
    }
    if (keys.d || keys.l) {
      car.angle += car.turnSpeed;
    }
  }

  // Calculate new position
  const newX = car.x + Math.cos(car.angle) * car.speed;
  const newY = car.y + Math.sin(car.angle) * car.speed;

  // Check collision
  if (!checkCollision(newX, newY)) {
    car.x = newX;
    car.y = newY;
  } else {
    // Hit wall - bounce back
    car.speed *= -0.3;
  }

  // Check if finished
  if (checkFinish() && time > 1) {
    endGame();
  }
}

function checkCollision(x, y) {
  // Check if point is within track boundaries
  const isInsideOuter = isPointInPolygon(x, y, track.outer);
  const isInsideInner = isPointInPolygon(x, y, track.inner);

  // Collision if outside outer boundary or inside inner boundary
  return !isInsideOuter || isInsideInner;
}

function isPointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function checkFinish() {
  const f = track.finish;

  // Simple bounding box check
  return (
    car.x >= f.x &&
    car.x <= f.x + f.width &&
    car.y >= f.y &&
    car.y <= f.y + f.height &&
    car.speed > 0
  );
}

// Game Loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawTrack();
  updateGame();
  drawCar();

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
