import { DiscordSDK } from "@discord/embedded-app-sdk";
const DISCORD_CLIENT_ID = "1542778193214439424";

// Initialize SDK with your Client ID

async function getUserData() {
  // Check if running inside Discord iframe
  const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
  const isEmbedded = window.self !== window.top;

  if (isEmbedded) {
    try {
      // 1. Wait for SDK initialization
      await discordSdk.ready();

      // 2. Request code directly from Discord Client (no URL parameter needed!)
      const { code } = await discordSdk.commands.authorize({
        client_id: DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify"],
      });

      // 3. Send code to your API endpoint
      const response = await fetch("/api/discordAuth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        return data;
      }
    } catch (err) {
      console.error("Discord Embedded Auth Error:", err);
    }
  }
}
