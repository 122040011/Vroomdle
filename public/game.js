// Game State
let gameState = "menu"; // menu, playing, won
let uid = null;
let username = null;
const serverUrl = null;
let time = 0;
let bestTime = null;
let timerInterval = null;
let animationFrameId = null;
let seed = getDailySeed();
let scale = 1;
let relativeScale = 1;

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
  currentSegmentIndex: 0, // Track which segment the car is on
  prevX: 100,
  prevY: 300,
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

// Track data - will be generated as segments
let trackSegments = [];
let trackMetadata = {};

// DOM Elements
const menuOverlay = document.getElementById("menuOverlay");
const winOverlay = document.getElementById("winOverlay");
// const timerDisplay = document.getElementById("timerDisplay");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const sideRestartButton = document.getElementById("sideRestartButton");
const currentTimeDisplay = document.getElementById("currentTime");
const finalTimeDisplay = document.getElementById("finalTime");
const bestTimeDisplay = document.getElementById("bestTimeDisplay");
const newBestTimeDisplay = document.getElementById("newBestTime");
const leaderboardPanel = document.getElementById("leaderboardPanel");
const leaderboardToggle = document.getElementById("leaderboardToggle");

// Event Listeners
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
sideRestartButton.addEventListener("click", () => {
  if (gameState === "playing") {
    startGame();
  }
});

// Leaderboard toggle
leaderboardToggle.addEventListener("click", () => {
  leaderboardPanel.classList.toggle("open");
});

// Initialize
loadBestTime();
updateBestTimeDisplay();
generateTrackSegments(seed);

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
  return year * 10000 + month * 100 + day + now.getSeconds();
}

// ============================================
// SEGMENT-BASED TRACK GENERATION
// ============================================
function generateTrackSegments(seed) {
  const rng = seededRandom(seed);

  const trackWidth = 300;
  const canvasWidth = 800;
  const canvasHeight = 600;

  // Roll for total track length
  const minTrackLength = 4000;
  const maxTrackLength = 6000;
  const targetLength =
    minTrackLength + rng() * (maxTrackLength - minTrackLength);

  // Track generation parameters
  const minSegmentLength = 200;
  const maxSegmentLength = 400;
  const minCurvature = -0.04;
  const maxCurvature = 0.04;

  // Starting state
  let x = canvasWidth / 2;
  let y = 100;
  let currentAngle = Math.PI / 2; // Start facing down
  let totalLength = 0;

  const segments = [];
  let segmentIndex = 0;

  // Generate segments until we reach target length
  while (totalLength < targetLength) {
    // Roll for turn type
    const turnRoll = rng();
    let curvature;

    if (turnRoll < 0.3) {
      curvature = minCurvature * (0.5 + rng() * 0.5); // Left
    } else if (turnRoll < 0.6) {
      curvature = maxCurvature * (0.5 + rng() * 0.5); // Right
    } else {
      curvature = (rng() - 0.5) * 0.01; // Straight
    }

    // Roll for segment length
    let segmentLength =
      minSegmentLength + rng() * (maxSegmentLength - minSegmentLength);

    // Limit based on curvature
    const maxAngleChange = 2.2;
    if (Math.abs(curvature) > 0.001) {
      const maxLengthForCurvature = (maxAngleChange * 5) / Math.abs(curvature);
      segmentLength = Math.min(segmentLength, maxLengthForCurvature);
    }

    // Generate centerline for this segment
    const centerline = generateSegmentCenterline(
      x,
      y,
      currentAngle,
      segmentLength,
      curvature,
    );

    // Create boundaries
    const { outer, inner } = createSegmentBoundaries(centerline, trackWidth);

    // Apply self-intersection clipping to THIS segment only
    const cleanedOuter = removeSelfIntersections(outer);
    const cleanedInner = removeSelfIntersections(inner);

    // Store segment with entry and exit points
    const entryPoint = {
      x: centerline[0].x,
      y: centerline[0].y,
      angle: currentAngle,
    };
    const lastIdx = centerline.length - 1;
    const exitAngle = Math.atan2(
      centerline[lastIdx].y - centerline[lastIdx - 1].y,
      centerline[lastIdx].x - centerline[lastIdx - 1].x,
    );
    const exitPoint = {
      x: centerline[lastIdx].x,
      y: centerline[lastIdx].y,
      angle: exitAngle,
    };

    segments.push({
      index: segmentIndex,
      centerline,
      outer: cleanedOuter,
      inner: cleanedInner,
      entryPoint,
      exitPoint,
      length: segmentLength,
    });

    // Update for next segment
    x = exitPoint.x;
    y = exitPoint.y;
    currentAngle = exitPoint.angle;
    totalLength += segmentLength;
    segmentIndex++;
  }

  // Transform and scale all segments to fit canvas
  transformSegmentsToFit(segments, canvasWidth, canvasHeight);

  trackSegments = segments;
  trackMetadata = {
    totalSegments: segments.length,
    trackWidth,
  };
}

function generateSegmentCenterline(
  startX,
  startY,
  startAngle,
  length,
  curvature,
) {
  const points = [];
  const numSteps = Math.ceil(length / 5);
  const stepLength = length / numSteps;

  let x = startX;
  let y = startY;
  let angle = startAngle;

  points.push({ x, y });

  for (let i = 0; i < numSteps; i++) {
    angle += curvature;
    x += Math.cos(angle) * stepLength;
    y += Math.sin(angle) * stepLength;
    points.push({ x, y });
  }

  return points;
}

function createSegmentBoundaries(centerline, trackWidth) {
  const outer = [];
  const inner = [];

  for (let i = 0; i < centerline.length; i++) {
    const p1 = centerline[i];
    const p2 = centerline[Math.min(i + 1, centerline.length - 1)];

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

  return { outer, inner };
}

function transformSegmentsToFit(segments, canvasWidth, canvasHeight) {
  // Find bounds of all centerline points
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const seg of segments) {
    for (const point of seg.centerline) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }

  const trackNaturalWidth = maxX - minX;
  const trackNaturalHeight = maxY - minY;

  const margin = 80;
  const availableWidth = canvasWidth - 2 * margin;
  const availableHeight = canvasHeight - 2 * margin;

  const scaleX = availableWidth / trackNaturalWidth;
  const scaleY = availableHeight / trackNaturalHeight;
  scale = Math.min(scaleX, scaleY);
  relativeScale = scale * 3;

  const scaledWidth = trackNaturalWidth * scale;
  const scaledHeight = trackNaturalHeight * scale;
  const offsetX = margin + (availableWidth - scaledWidth) / 2 - minX * scale;
  const offsetY = margin + (availableHeight - scaledHeight) / 2 - minY * scale;

  // Transform all segments
  for (const seg of segments) {
    seg.centerline = seg.centerline.map((p) => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    }));
    seg.outer = seg.outer.map((p) => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    }));
    seg.inner = seg.inner.map((p) => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY,
    }));
    seg.entryPoint = {
      x: seg.entryPoint.x * scale + offsetX,
      y: seg.entryPoint.y * scale + offsetY,
      angle: seg.entryPoint.angle,
    };
    seg.exitPoint = {
      x: seg.exitPoint.x * scale + offsetX,
      y: seg.exitPoint.y * scale + offsetY,
      angle: seg.exitPoint.angle,
    };
  }
}

// Remove self-intersections from a boundary path
function removeSelfIntersections(path) {
  if (path.length < 4) return path;

  const cleaned = [...path];
  let modified = true;

  while (modified) {
    modified = false;

    for (let i = 0; i < cleaned.length - 1; i++) {
      const seg1Start = cleaned[i];
      const seg1End = cleaned[i + 1];

      for (let j = i + 2; j < cleaned.length - 1; j++) {
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

function getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

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

function startGame() {
  if (trackSegments.length === 0) return;

  // Reset car to start of first segment
  const firstSegment = trackSegments[0];
  car.x = firstSegment.entryPoint.x;
  car.y = firstSegment.entryPoint.y;
  car.angle = firstSegment.entryPoint.angle;
  car.speed = 0;
  car.currentSegmentIndex = 0;

  // Reset time
  time = 0;
  updateTimeDisplay();

  // Update UI
  gameState = "playing";
  menuOverlay.classList.add("hidden");
  winOverlay.classList.add("hidden");
  // timerDisplay.classList.remove("hidden");

  // Start timer
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    time += 0.01;
    updateTimeDisplay();
  }, 10);

  // Start game loop
  if (!animationFrameId) {
    gameLoop();
  }
}

function endGame() {
  gameState = "won";

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // timerDisplay.classList.add("hidden");

  const isNewBest = !bestTime || time < bestTime;
  if (isNewBest) {
    bestTime = time;
    saveBestTime();
    newBestTimeDisplay.classList.remove("hidden");
  } else {
    newBestTimeDisplay.classList.add("hidden");
  }

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
// SEGMENT-BASED RENDERING (Bottom-Up)
// ============================================
function drawTrack() {
  // Background
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each segment bottom-up (earlier segments first)
  for (let i = 0; i < trackSegments.length; i++) {
    const segment = trackSegments[i];
    const isCurrent = i === car.currentSegmentIndex;

    // Draw track surface for this segment
    ctx.fillStyle = isCurrent ? "#dcdcdc" : "#e8e8e8";
    ctx.beginPath();

    // Draw outer boundary
    if (segment.outer.length > 0) {
      ctx.moveTo(segment.outer[0].x, segment.outer[0].y);
      for (let j = 1; j < segment.outer.length; j++) {
        ctx.lineTo(segment.outer[j].x, segment.outer[j].y);
      }
    }

    // Connect to inner boundary (reversed)
    if (segment.inner.length > 0) {
      for (let j = segment.inner.length - 1; j >= 0; j--) {
        ctx.lineTo(segment.inner[j].x, segment.inner[j].y);
      }
    }

    ctx.closePath();
    ctx.fill();

    // Draw boundaries
    ctx.strokeStyle = isCurrent ? "#0d0d0d" : "#121213";
    ctx.lineWidth = isCurrent ? 7 : 3;

    // Outer boundary line
    ctx.beginPath();
    if (segment.outer.length > 0) {
      ctx.moveTo(segment.outer[0].x, segment.outer[0].y);
      for (let j = 1; j < segment.outer.length; j++) {
        ctx.lineTo(segment.outer[j].x, segment.outer[j].y);
      }
    }
    ctx.stroke();

    // Inner boundary line
    ctx.beginPath();
    if (segment.inner.length > 0) {
      ctx.moveTo(segment.inner[0].x, segment.inner[0].y);
      for (let j = 1; j < segment.inner.length; j++) {
        ctx.lineTo(segment.inner[j].x, segment.inner[j].y);
      }
    }
    ctx.stroke();
    if (
      i === car.currentSegmentIndex + 1 ||
      car.currentSegmentIndex === trackSegments.length - 1
    )
      drawCar();
  }

  // Draw finish line on last segment
  if (trackSegments.length > 0) {
    const lastSegment = trackSegments[trackSegments.length - 1];
    const finishPoint = lastSegment.exitPoint;

    ctx.save();
    ctx.translate(finishPoint.x, finishPoint.y);
    ctx.rotate(finishPoint.angle);

    const checkSize = trackMetadata.trackWidth / 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#538d4e" : "#ffffff";
      ctx.fillRect(
        -trackMetadata.trackWidth / 2 + i * checkSize,
        -4,
        checkSize,
        8,
      );
    }

    ctx.restore();
  }
}

function drawCar() {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // Car body
  ctx.fillStyle = "#538d4e";
  ctx.fillRect(
    -15 * relativeScale,
    -10 * relativeScale,
    30 * relativeScale,
    20 * relativeScale,
  );

  // Car front indicator
  ctx.fillStyle = "#121213";
  ctx.fillRect(
    12 * relativeScale,
    -6 * relativeScale,
    6 * relativeScale,
    12 * relativeScale,
  );

  ctx.restore();

  // Debug: Show current segment
  ctx.fillStyle = "#121213";
  ctx.font = "14px Arial";
  ctx.fillText(
    `Segment ${car.currentSegmentIndex + 1}/${trackSegments.length}`,
    10,
    20,
  );
}

// ============================================
// PHYSICS AND SEGMENT-BASED COLLISION
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

  // Handle turning
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

  // Check collision with current segment and adjacent segments (±1)
  const segmentsToCheck = [];

  // Add previous segment if exists
  if (car.currentSegmentIndex > 0) {
    segmentsToCheck.push(trackSegments[car.currentSegmentIndex - 1]);
  }

  // Add current segment
  segmentsToCheck.push(trackSegments[car.currentSegmentIndex]);

  // Add next segment if exists
  if (car.currentSegmentIndex < trackSegments.length - 1) {
    segmentsToCheck.push(trackSegments[car.currentSegmentIndex + 1]);
  }

  // Check collision with all relevant segments
  let hasCollision = false;
  for (const segment of segmentsToCheck) {
    if (checkSegmentCollision(newX, newY, segment)) {
      hasCollision = true;
      break;
    }
  }

  if (!hasCollision) {
    // Store previous position before updating
    car.prevX = car.x;
    car.prevY = car.y;

    car.x = newX;
    car.y = newY;

    // Check for segment transition
    updateCurrentSegment();
  } else {
    // Hit wall
    car.speed *= -0.3;
  }

  // Check if finished (reached last segment exit)
  if (checkFinish() && time > 1) {
    endGame();
  }
}

function checkSegmentCollision(x, y, segment) {
  const collisionDistance = 15 * relativeScale;

  // Check outer boundary
  for (let i = 0; i < segment.outer.length - 1; i++) {
    const dist = pointToLineDistance(
      x,
      y,
      segment.outer[i],
      segment.outer[i + 1],
    );
    if (dist < collisionDistance) {
      if (isPointOutsideTrack(x, y, segment.outer[i], segment.outer[i + 1])) {
        return true;
      }
    }
  }

  // Check inner boundary
  for (let i = 0; i < segment.inner.length - 1; i++) {
    const dist = pointToLineDistance(
      x,
      y,
      segment.inner[i],
      segment.inner[i + 1],
    );
    if (dist < collisionDistance) {
      if (isPointOutsideTrack(x, y, segment.inner[i], segment.inner[i + 1])) {
        return true;
      }
    }
  }

  return false;
}

function updateCurrentSegment() {
  const currentSegment = trackSegments[car.currentSegmentIndex];

  // Check forward boundary (exit point) - transition to next segment
  if (car.currentSegmentIndex < trackSegments.length - 1) {
    const nextSegment = trackSegments[car.currentSegmentIndex + 1];

    // Create a line representing the boundary between current and next segment
    // This boundary is perpendicular to the exit direction at the exit point
    const exitPoint = currentSegment.exitPoint;
    const boundaryAngle = exitPoint.angle + Math.PI / 2; // Perpendicular to exit direction

    // Create two points on the boundary line (far left and far right)
    const boundaryHalfWidth = trackMetadata.trackWidth;
    const boundary1 = {
      x: exitPoint.x + Math.cos(boundaryAngle) * boundaryHalfWidth,
      y: exitPoint.y + Math.sin(boundaryAngle) * boundaryHalfWidth,
    };
    const boundary2 = {
      x: exitPoint.x - Math.cos(boundaryAngle) * boundaryHalfWidth,
      y: exitPoint.y - Math.sin(boundaryAngle) * boundaryHalfWidth,
    };

    // Check if car crossed the forward boundary
    const prevSide = getSideOfLine(car.prevX, car.prevY, boundary1, boundary2);
    const currentSide = getSideOfLine(car.x, car.y, boundary1, boundary2);

    // Calculate which side is "forward" based on exit angle
    const forwardPoint = {
      x: exitPoint.x + Math.cos(exitPoint.angle) * 10,
      y: exitPoint.y + Math.sin(exitPoint.angle) * 10,
    };
    const forwardSide = getSideOfLine(
      forwardPoint.x,
      forwardPoint.y,
      boundary1,
      boundary2,
    );

    // If car crossed from behind to in front of the boundary
    if (prevSide !== forwardSide && currentSide === forwardSide) {
      car.currentSegmentIndex++;
      return;
    }
  }

  // Check backward boundary (entry point) - transition to previous segment
  if (car.currentSegmentIndex > 0) {
    const prevSegment = trackSegments[car.currentSegmentIndex - 1];

    // The entry boundary is the same as the previous segment's exit boundary
    const entryPoint = currentSegment.entryPoint;
    const boundaryAngle = entryPoint.angle + Math.PI / 2;

    const boundaryHalfWidth = trackMetadata.trackWidth;
    const boundary1 = {
      x: entryPoint.x + Math.cos(boundaryAngle) * boundaryHalfWidth,
      y: entryPoint.y + Math.sin(boundaryAngle) * boundaryHalfWidth,
    };
    const boundary2 = {
      x: entryPoint.x - Math.cos(boundaryAngle) * boundaryHalfWidth,
      y: entryPoint.y - Math.sin(boundaryAngle) * boundaryHalfWidth,
    };

    // Check if car crossed the backward boundary
    const prevSide = getSideOfLine(car.prevX, car.prevY, boundary1, boundary2);
    const currentSide = getSideOfLine(car.x, car.y, boundary1, boundary2);

    // Calculate which side is "backward" (opposite of entry direction)
    const backwardPoint = {
      x: entryPoint.x - Math.cos(entryPoint.angle) * 10,
      y: entryPoint.y - Math.sin(entryPoint.angle) * 10,
    };
    const backwardSide = getSideOfLine(
      backwardPoint.x,
      backwardPoint.y,
      boundary1,
      boundary2,
    );

    // If car crossed from in front to behind the boundary
    if (prevSide !== backwardSide && currentSide === backwardSide) {
      car.currentSegmentIndex--;
    }
  }
}

// Helper function: determine which side of a line a point is on
// Returns positive, negative, or zero based on cross product
function getSideOfLine(px, py, lineP1, lineP2) {
  const cross =
    (lineP2.x - lineP1.x) * (py - lineP1.y) -
    (lineP2.y - lineP1.y) * (px - lineP1.x);
  return Math.sign(cross);
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
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
  if (car.currentSegmentIndex !== trackSegments.length - 1) return false;
  let dist = pointToLineDistance(
    car.x,
    car.y,
    trackSegments.at(-1).outer.at(-1),
    trackSegments.at(-1).inner.at(-1),
  );
  if (dist < 15 * relativeScale) {
    console.log("Finished");
    return true;
  }
  return false;
}

// ============================================
// GAME LOOP
// ============================================
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawTrack();
  updateGame();

  animationFrameId = requestAnimationFrame(gameLoop);
}

// ============================================
// Connection Request
// ============================================

// Start the game loop
gameLoop();
