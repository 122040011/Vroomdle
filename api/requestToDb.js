import { neon } from "@neondatabase/serverless";
import { defineEventHandler, readBody } from "h3";

// Initialize Neon SQL client
// Connection string from Vercel environment variable
const sql = neon(process.env.DATABASE_URL);

//Forward incrementing trials
async function sendIncrementTrial(uid, username, date, channelID) {
  try {
    const result = await sql`
      INSERT INTO "VroomdleScores" (uid, username, date, tries, "channelID")
      VALUES (COALESCE(${uid}, 'Guest_' || nextval('guest_username_seq')::text), COALESCE(${username}, 'Guest'), ${date}, 1, ${channelID})
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
async function updateTime(uid, date, recordTime, channelID, username = null) {
  console.log(`updating time: ${recordTime}`);
  try {
    const result = await sql`
      INSERT INTO "VroomdleScores" (uid, date, "recordTime", "channelID", username)
      VALUES (${uid}, ${date}, ${recordTime}, ${channelID}, ${username})
      ON CONFLICT (uid, date)
      DO UPDATE SET
        "recordTime" = LEAST("VroomdleScores"."recordTime", ${recordTime}),
        "channelID" = ${channelID},
        "username" = ${username}
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

// Helper function to consume a raw Node.js IncomingMessage stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export default async function handler(req, res) {
  try {
    // 1. If req is Node stream, consume body; otherwise handle as pre-parsed object
    let body = {};
    if (req.body) {
      body = req.body;
    } else if (typeof req.on === "function") {
      body = await getRawBody(req);
    } else if (typeof req.json === "function") {
      body = await req.json();
    }

    const { action, uid, username, date, recordTime, channelID } = body;

    let result;
    switch (action) {
      case "incrementTrial":
        result = await sendIncrementTrial(uid, username, date, channelID);
        break;
      case "updateTime":
        result = await updateTime(uid, date, recordTime, channelID, username);
        break;
      case "getLeaderboard":
        result = await getLeaderboard(date, channelID);
        break;
      default:
        result = { success: false, error: "Invalid action" };
    }

    // 2. Respond via Express/Vercel res object if present
    if (res && typeof res.status === "function") {
      return res.status(200).json(result);
    }

    // 3. Otherwise return standard Response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Handler error:", error);
    if (res && typeof res.status === "function") {
      return res.status(500).json({ success: false, error: error.message });
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
