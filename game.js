// Game State
let gameState = "menu"; // menu, playing, won
let time = 0;
let bestTime = null;
let timerInterval = null;
let animationFrameId = null;
let seed = Date.now();

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

// Track data - will be generated
let track = null;

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
track = generateTrack(seed);

// ============================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================
function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function getDailySeed() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return year * 10000 + month * 100 + day;
}

// ============================================
// PROCEDURAL TRACK GENERATION
// ============================================
function generateTrack(seed) {
  const rng = seededRandom(seed);

  const trackWidth = 100;
  const canvasWidth = 800;
  const canvasHeight = 600;

  // Roll for total track length
  const minTrackLength = 4000;
  const maxTrackLength = 8000;
  const targetLength =
    minTrackLength + rng() * (maxTrackLength - minTrackLength);

  // Track generation parameters
  const minSegmentLength = 300;
  const maxSegmentLength = 850;
  const minCurvature = -0.05; // Max left curve
  const maxCurvature = 0.05; // Max right curve

  // Starting state
  let x = canvasWidth / 2;
  let y = 80;
  let currentAngle = Math.PI / 2; // Start facing down
  let totalLength = 0;

  const centerline = [];
  centerline.push({ x, y });
  let previousSegmentDirection = null;

  // Generate segments until we reach target length
  while (totalLength < targetLength) {
    // Roll for turn type first
    const turnRoll = rng();
    const directions = ["left", "right", "straight", "straight"];
    const availableDirections = directions.filter(
      (dir) => dir != previousSegmentDirection,
    );
    const segmentDirection =
      availableDirections[Math.floor(rng() * availableDirections.length)];
    previousSegmentDirection = segmentDirection;

    let curvature;

    if (segmentDirection == "left") {
      // Left turn
      curvature = minCurvature * (0.5 + rng() * 0.5);
    } else if (segmentDirection == "right") {
      // Right turn
      curvature = maxCurvature * (0.5 + rng() * 0.5);
    } else {
      // Straight or very gentle curve
      curvature = (rng() - 0.5) * 0.008;
      console.log("straight\n");
    }
    console.log("segment");
    // Calculate max angle change allowed (140 degrees = ~2.44 radians)
    const maxAngleChange = 2.44;

    // Roll for segment length
    let segmentLength =
      minSegmentLength + rng() * (maxSegmentLength - minSegmentLength);

    // Limit segment length based on curvature to prevent excessive turning
    if (Math.abs(curvature) > 0.001) {
      // Calculate how long the segment can be given the curvature
      // Total angle change = curvature * numSteps
      // numSteps = length / 5 (5 pixels per step)
      // So: angle change = curvature * (length / 5)
      // Rearranged: max length = (maxAngleChange * 5) / |curvature|
      const maxLengthForCurvature = (maxAngleChange * 5) / Math.abs(curvature);
      segmentLength = Math.min(segmentLength, maxLengthForCurvature);
    }

    // Generate this segment
    const segment = generateSegment(
      x,
      y,
      currentAngle,
      segmentLength,
      curvature,
    );

    // Add segment points to centerline (skip first point to avoid duplicates)
    for (let i = 1; i < segment.points.length; i++) {
      centerline.push(segment.points[i]);
    }

    // Update state for next segment - use ACTUAL end position
    x = segment.endX;
    y = segment.endY;
    currentAngle = segment.endAngle; // Continue from where we left off

    totalLength += segmentLength;
  }

  // Find bounds of the raw centerline
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const point of centerline) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const trackNaturalWidth = maxX - minX;
  const trackNaturalHeight = maxY - minY;

  // Calculate scale factor to fit track in canvas with margin
  const margin = 80;
  const availableWidth = canvasWidth - 2 * margin;
  const availableHeight = canvasHeight - 2 * margin;

  const scaleX = availableWidth / trackNaturalWidth;
  const scaleY = availableHeight / trackNaturalHeight;
  const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit both dimensions

  // Calculate translation to center the track
  const scaledWidth = trackNaturalWidth * scale;
  const scaledHeight = trackNaturalHeight * scale;
  const offsetX = margin + (availableWidth - scaledWidth) / 2 - minX * scale;
  const offsetY = margin + (availableHeight - scaledHeight) / 2 - minY * scale;

  // Transform all centerline points to fit canvas
  const transformedCenterline = centerline.map((point) => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  }));

  // Smooth the centerline
  const smoothedCenterline = smoothPath(transformedCenterline, 2);

  // Create boundaries by offsetting perpendicular to the curve
  const outer = [];
  const inner = [];

  for (let i = 0; i < smoothedCenterline.length; i++) {
    const p1 = smoothedCenterline[i];
    const p2 =
      smoothedCenterline[Math.min(i + 1, smoothedCenterline.length - 1)];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0) {
      const perpX = -dy / length;
      const perpY = dx / length;

      outer.push({
        x: p1.x + perpX * (trackWidth / 2),
        y: p1.y + perpY * (trackWidth / 2),
      });

      inner.push({
        x: p1.x - perpX * (trackWidth / 2),
        y: p1.y - perpY * (trackWidth / 2),
      });
    }
  }

  // Remove self-intersections from boundaries
  const cleanedOuter = removeSelfIntersections(outer);
  const cleanedInner = removeSelfIntersections(inner);

  // Start position
  const startPoint = smoothedCenterline[0];
  const startNext = smoothedCenterline[1];
  const startAngle = Math.atan2(
    startNext.y - startPoint.y,
    startNext.x - startPoint.x,
  );

  // Finish line at the end
  const finishIndex = smoothedCenterline.length - 1;
  const finishPoint = smoothedCenterline[finishIndex];
  const finishPrev = smoothedCenterline[finishIndex - 1];
  const finishAngle = Math.atan2(
    finishPoint.y - finishPrev.y,
    finishPoint.x - finishPrev.x,
  );

  return {
    outer: cleanedOuter,
    inner: cleanedInner,
    centerline: smoothedCenterline,
    start: {
      x: startPoint.x,
      y: startPoint.y,
      angle: startAngle,
    },
    finish: {
      x: finishPoint.x,
      y: finishPoint.y,
      width: trackWidth,
      angle: finishAngle,
    },
  };
}

// Generate a single segment with consistent curvature
function generateSegment(startX, startY, startAngle, length, curvature) {
  const points = [];
  const numSteps = Math.ceil(length / 5); // 5 pixels per step
  const stepLength = length / numSteps;

  let x = startX;
  let y = startY;
  let angle = startAngle;

  points.push({ x, y });

  for (let i = 0; i < numSteps; i++) {
    // Apply curvature
    angle += curvature;

    // Move forward
    x += Math.cos(angle) * stepLength;
    y += Math.sin(angle) * stepLength;

    points.push({ x, y });
  }

  return {
    points,
    endX: x,
    endY: y,
    endAngle: angle, // Pass angle to next segment
  };
}

// Smooth the path using weighted averaging
function smoothPath(path, iterations) {
  let smoothed = [...path];

  for (let iter = 0; iter < iterations; iter++) {
    const newPath = [smoothed[0]]; // Keep first point

    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const curr = smoothed[i];
      const next = smoothed[i + 1];

      // Weighted average: current point has more weight
      newPath.push({
        x: (prev.x + curr.x * 2 + next.x) / 4,
        y: (prev.y + curr.y * 2 + next.y) / 4,
      });
    }

    newPath.push(smoothed[smoothed.length - 1]); // Keep last point
    smoothed = newPath;
  }

  return smoothed;
}

// Remove self-intersections from a boundary path
function removeSelfIntersections(path) {
  if (path.length < 4) return path;

  const cleaned = [...path];
  let modified = true;

  // Iterate until no more intersections found
  while (modified) {
    modified = false;

    for (let i = 0; i < cleaned.length - 1; i++) {
      const seg1Start = cleaned[i];
      const seg1End = cleaned[i + 1];

      // Check against non-adjacent segments (skip neighbors)
      for (let j = i + 2; j < cleaned.length - 1; j++) {
        // Don't check last segment against first (they're supposed to be close)
        if (i === 0 && j === cleaned.length - 2) continue;

        const seg2Start = cleaned[j];
        const seg2End = cleaned[j + 1];

        const intersection = getLineIntersection(
          seg1Start.x,
          seg1Start.y,
          seg1End.x,
          seg1End.y,
          seg2Start.x,
          seg2Start.y,
          seg2End.x,
          seg2End.y,
        );

        if (intersection) {
          // Found intersection - remove the loop between them
          // Keep points up to i+1, add intersection point, skip to j+1
          const newPath = [
            ...cleaned.slice(0, i + 1),
            intersection,
            ...cleaned.slice(j + 1),
          ];

          cleaned.length = 0;
          cleaned.push(...newPath);
          modified = true;
          break;
        }
      }

      if (modified) break;
    }
  }

  return cleaned;
}

// Get intersection point of two line segments (if they intersect)
function getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  // Lines are parallel
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both line segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

// ============================================
// GAME FUNCTIONS
// ============================================
function getDailySeedString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  // Reset car to start position
  car.x = track.start.x;
  car.y = track.start.y;
  car.angle = track.start.angle;
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
  const key = `vroomdle_best_${getDailySeedString()}`;
  localStorage.setItem(key, bestTime.toString());
}

function loadBestTime() {
  const key = `vroomdle_best_${getDailySeedString()}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    bestTime = parseFloat(saved);
  }
}

// ============================================
// DRAWING FUNCTIONS
// ============================================
function drawTrack() {
  // Background
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw track surface between boundaries
  ctx.fillStyle = "#e8e8e8";
  ctx.beginPath();

  // Draw outer boundary
  if (track.outer.length > 0) {
    ctx.moveTo(track.outer[0].x, track.outer[0].y);
    for (let i = 1; i < track.outer.length; i++) {
      ctx.lineTo(track.outer[i].x, track.outer[i].y);
    }
  }

  // Connect to inner boundary (reversed)
  if (track.inner.length > 0) {
    for (let i = track.inner.length - 1; i >= 0; i--) {
      ctx.lineTo(track.inner[i].x, track.inner[i].y);
    }
  }

  ctx.closePath();
  ctx.fill();

  // Draw outer boundary line
  ctx.strokeStyle = "#121213";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (track.outer.length > 0) {
    ctx.moveTo(track.outer[0].x, track.outer[0].y);
    for (let i = 1; i < track.outer.length; i++) {
      ctx.lineTo(track.outer[i].x, track.outer[i].y);
    }
  }
  ctx.stroke();

  // Draw inner boundary line
  ctx.strokeStyle = "#121213";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (track.inner.length > 0) {
    ctx.moveTo(track.inner[0].x, track.inner[0].y);
    for (let i = 1; i < track.inner.length; i++) {
      ctx.lineTo(track.inner[i].x, track.inner[i].y);
    }
  }
  ctx.stroke();

  // Draw finish line
  const finish = track.finish;
  ctx.save();
  ctx.translate(finish.x, finish.y);
  ctx.rotate(finish.angle);

  // Checkered pattern
  const checkSize = finish.width / 6;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#538d4e" : "#ffffff";
    ctx.fillRect(-finish.width / 2 + i * checkSize, -4, checkSize, 8);
  }

  ctx.restore();
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

// ============================================
// PHYSICS AND COLLISION
// ============================================
function updateGame() {
  if (gameState !== "playing") return;

  // Handle acceleration
  if (keys.w) {
    car.speed = Math.min(car.speed + car.acceleration, car.maxSpeed);
  } else if (keys.s) {
    if (car.speed > 0) {
      car.speed = Math.max(
        car.speed - car.acceleration * 5,
        -car.maxSpeed * 0.15,
      );
    } else {
      car.speed = Math.max(car.speed - car.acceleration, -car.maxSpeed * 0.15);
    }
  } else if (car.speed > 0.1) {
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
  const collisionDistance = 15;

  // Check distance to outer boundary
  for (let i = 0; i < track.outer.length - 1; i++) {
    const dist = pointToLineDistance(x, y, track.outer[i], track.outer[i + 1]);
    if (dist < collisionDistance) {
      if (isPointOutsideTrack(x, y, track.outer[i], track.outer[i + 1])) {
        return true;
      }
    }
  }

  // Check distance to inner boundary
  for (let i = 0; i < track.inner.length - 1; i++) {
    const dist = pointToLineDistance(x, y, track.inner[i], track.inner[i + 1]);
    if (dist < collisionDistance) {
      if (isPointOutsideTrack(x, y, track.inner[i], track.inner[i + 1])) {
        return true;
      }
    }
  }

  return false;
}

function pointToLineDistance(px, py, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.sqrt((px - p1.x) ** 2 + (py - p1.y) ** 2);
  }

  let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

function isPointOutsideTrack(px, py, p1, p2) {
  const cross = (p2.x - p1.x) * (py - p1.y) - (p2.y - p1.y) * (px - p1.x);
  return cross < 0;
}

function checkFinish() {
  const finish = track.finish;
  const dx = car.x - finish.x;
  const dy = car.y - finish.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < finish.width / 2 && car.speed > 0;
}

// ============================================
// GAME LOOP
// ============================================
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawTrack();
  updateGame();
  drawCar();

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
