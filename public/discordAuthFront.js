const DISCORD_CLIENT_ID = "1542778193214439424";

export async function getUserData() {
  const isEmbedded = window.self !== window.top;

  if (isEmbedded) {
    try {
      const { DiscordSDK } = await import("@discord/embedded-app-sdk");
      const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);

      await discordSdk.ready();

      const channelID = discordSdk.channelId;
      const guildID = discordSdk.guildId;

      const { code } = await discordSdk.commands.authorize({
        client_id: DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify"],
      });

      const response = await fetch("/api/discordAuth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        return { userdata: data, channelID: channelID, guildID: guildID };
      }
    } catch (err) {
      console.error("Discord Embedded Auth Error:", err);
    }
  }
}
