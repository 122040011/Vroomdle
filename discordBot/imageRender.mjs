import { createCanvas } from "@napi-rs/canvas";
import * as trackGenerator from "./gameCopy.mjs";

export function renderLeaderboard(leaderboardData = []) {
  const canvas = createCanvas(400, 650);
  const ctx = canvas.getContext("2d");
  const canvasWidth = 400;
  const canvasHeight = 650;

  ctx.fillStyle = "#111111";
  ctx.font = "900 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("LEADERBOARD", canvasWidth / 2, 20);

  const startY = 70;
  const cardWidth = 340;
  const cardHeight = 48;
  const cardGap = 10;
  const borderRadius = 8;
  const startX = (canvasWidth - cardWidth) / 2;

  const rankStyles = {
    1: { bg: "#ffd900b7", text: "#111111", time: "#2E7D32" },
    2: { bg: "#c0c0c0b2", text: "#111111", time: "#2E7D32" },
    3: { bg: "#cd8032b3", text: "#111111", time: "#2E7D32" },
    default: { bg: "#f2f2f2b4", text: "#111111", time: "#388E3C" },
  };

  for (let i = 1; i <= 10; i++) {
    const entry = i <= leaderboardData.length ? leaderboardData[i - 1] : {};
    const y = startY + (i - 1) * (cardHeight + cardGap);
    const style = rankStyles[i] || rankStyles.default;

    ctx.fillStyle = style.bg;
    ctx.beginPath();
    ctx.roundRect(startX, y, cardWidth, cardHeight, borderRadius);
    ctx.fill();

    ctx.fillStyle = style.text;
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i), startX + 35, y + cardHeight / 2);

    if (entry.username) {
      ctx.fillStyle = style.text;
      ctx.font = "700 17px sans-serif";
      ctx.textAlign = "left";

      // Truncate name if it overflows before reaching the time column
      let nameText = entry.username;
      const maxNameWidth = 140;
      if (ctx.measureText(nameText).width > maxNameWidth) {
        while (
          ctx.measureText(nameText + "...").width > maxNameWidth &&
          nameText.length > 0
        ) {
          nameText = nameText.slice(0, -1);
        }
        nameText += "...";
      }
      ctx.fillText(nameText, startX + 80, y + cardHeight / 2);
    }

    if (entry.recordTime) {
      ctx.fillStyle = style.time;
      ctx.font = "900 17px monospace, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        entry.recordTime,
        startX + cardWidth - 20,
        y + cardHeight / 2,
      );
    }
  }
  return canvas;
}

export function renderTrack() {
  const seed = trackGenerator.getSeed();
  const { segments, trackMetadata } =
    trackGenerator.generateTrackSegments(seed);
  const canvas = trackGenerator.drawTrack(segments, trackMetadata);
  return canvas;
}
