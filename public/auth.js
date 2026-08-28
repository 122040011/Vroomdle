import { DiscordSDK, DiscordSDK } from "@discord/embedded-app-sdk";

const appID = "1542778193214439424";

async function authUser() {
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: "appID",
    response_type: "code",
    scope: ["identify"],
  });

  //send to api to mix with secret, doing this ensures that the backend endpoint is secure (has secret)
  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const { access_token } = await response.json();

  await discordSdk.commands.authenticate({ access_token });
}
