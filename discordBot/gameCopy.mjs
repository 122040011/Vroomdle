import { createCanvas } from "@napi-rs/canvas";
let gameMode = "daily";
let scale = 1;

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

export function getSeed() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  return gameMode == "daily" ? year * 10000 + month * 100 + day : Date.now();
}

// ============================================
// SEGMENT-BASED TRACK GENERATION
// ============================================
export function generateTrackSegments(seed) {
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
    if (segmentIndex == 0) {
      outer.unshift(inner[0]);
      inner.unshift(outer[0]);
    }

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
  const trackMetadata = {
    totalSegments: segments.length,
    trackWidth,
  };
  return { segments, trackMetadata };
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
// SEGMENT-BASED RENDERING (Bottom-Up)
// ============================================
export function drawTrack(trackSegments, trackMetadata) {
  // Background
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each segment bottom-up (earlier segments first)
  for (let i = 0; i < trackSegments.length; i++) {
    const segment = trackSegments[i];

    // Draw track surface for this segment
    ctx.fillStyle = "#e8e8e8";
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
    ctx.strokeStyle = "#121213";
    ctx.lineWidth = 3;

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
  }

  // Draw finish line on last segment
  if (trackSegments.length > 0) {
    const lastSegment = trackSegments[trackSegments.length - 1];
    const finishPoint = lastSegment.exitPoint;

    ctx.save();
    ctx.translate(finishPoint.x, finishPoint.y);
    ctx.rotate(finishPoint.angle + Math.PI / 2);

    const checkSize = (trackMetadata.trackWidth / 6) * scale;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#538d4e" : "#ffffff";
      ctx.fillRect(
        (-trackMetadata.trackWidth / 2) * scale + i * checkSize,
        -4,
        checkSize,
        8,
      );
    }

    ctx.restore();
  }
  return canvas;
}
