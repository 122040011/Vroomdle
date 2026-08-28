async function discordBackendAuth(code) {
  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
      }),
    });

    const data = await response.json();
    return { access_token: data.access_token };
  } catch (error) {
    res.status(500).json({ error: "Failed to exchange token" });
  }
}

// Export functions for use in API routes
export { discordBackendAuth };

// Example API route handler for Vercel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { code } = req.body;

    let result;

    result = await discordBackendAuth(code);

    return res.status(200).json(result);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
