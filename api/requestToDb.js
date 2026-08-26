import { neon } from "@neondatabase/serverless";

// Initialize Neon SQL client
// Connection string from Vercel environment variable
const sql = neon(process.env.DATABASE_URL);
console.log(process.env.DATABASE_URL);

//Forward incrementing trials
async function sendIncrementTrial(uid, username, date, channelID) {
  try {
    const result = await sql`
      INSERT INTO "VroomdleScores" (uid, username, date, tries, "channelID")
      VALUES (${uid}, ${username}, ${date}, 1, ${channelID})
      ON CONFLICT (uid, date)
      DO UPDATE SET 
        tries = "VroomdleScores".tries + 1,
        username = ${username}
      RETURNING *
    `;

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error("Error incrementing trial:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

//Update user's time for a specific date
async function updateTime(uid, username, date, recordTime, channelID) {
  try {
    const result = await sql`
      INSERT INTO "VroomdleScores" (uid, username, date, "recordTime", "channelID")
      VALUES (${uid}, ${username}, ${date}, ${recordTime}, ${channelID})
      ON CONFLICT (uid, date)
      DO UPDATE SET
        "recordTime" = LEAST("VroomdleScores"."recordTime", ${recordTime}),
        username = ${username},
        "channelID" = ${channelID}
      RETURNING *
    `;

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error("Error updating time:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

//Get Leaderboard data for channel if in channel, else everyone's
async function getLeaderboard(date, channelID = null) {
  try {
    let result;

    if (channelID) {
      // Get leaderboard filtered by channel
      result = await sql`
        SELECT
          username,
          "recordTime",
          RANK() OVER (ORDER BY "recordTime" ASC) as rank
        FROM "VroomdleScores"
        WHERE date = ${date}
          AND "channelID" = ${channelID}
          AND "recordTime" IS NOT NULL
        ORDER BY "recordTime" ASC
        LIMIT 10
      `;
    } else {
      // Get global leaderboard
      result = await sql`
        SELECT
          username,
          "recordTime",
          RANK() OVER (ORDER BY "recordTime" ASC) as rank
        FROM "VroomdleScores"
        WHERE date = ${date}
          AND "recordTime" IS NOT NULL
        ORDER BY "recordTime" ASC
        LIMIT 10
      `;
    }

    return {
      success: true,
      data: result,
      count: result.length,
    };
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export functions for use in API routes
export { sendIncrementTrial, updateTime, getLeaderboard };

// Example API route handler for Vercel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, uid, username, date, recordTime, channelID } = req.body;

    let result;

    switch (action) {
      case "incrementTrial":
        result = await sendIncrementTrial(uid, username, date, channelID);
        break;

      case "updateTime":
        result = await updateTime(uid, username, date, recordTime, channelID);
        break;

      case "getLeaderboard":
        result = await getLeaderboard(date, channelID);
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
