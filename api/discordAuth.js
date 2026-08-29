// Function that exchanges code AND fetches user profile
async function getDiscordUserData(code, redirectUri) {
  // 1. Exchange authorization code for an access token
  const tokenResponse = await fetch(
    "https://discord.com/api/v10/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    },
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw new Error(tokenData.error_description || "Failed to exchange token");
  }

  // 2. Fetch User Profile using the access_token
  const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const userData = await userResponse.json();

  if (!userResponse.ok) {
    throw new Error("Failed to fetch user profile");
  }

  // Returns exact profile data needed for your database
  return {
    id: userData.id, // Unique Discord ID -> use as 'uid' in PostgreSQL
    username: userData.username, // Discord username -> use as 'username' in PostgreSQL
    avatar: userData.avatar, // Avatar hash (optional)
  };
}

// Example handler for your serverless/API endpoint
export async function handler(req, res) {
  const { code } = req.body;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  try {
    const user = await getDiscordUserData(code, redirectUri);

    // Success! Return user info to your front-end
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("OAuth Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
