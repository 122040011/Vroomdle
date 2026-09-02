import * as helper from "../public/helper.mjs";
import * as imageRender from "./imageRender.mjs";

const url = process.env.WEB_URL;

export async function getChannelsReq(date) {
  const response = await fetch(`${url}/api/requestToDb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getChannels",
      date: date,
    }),
  });
  return await response.json();
}

export async function getLeaderboard(date, channelID = null) {
  const response = await fetch(`${url}/api/requestToDb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getLeaderboard",
      date: date,
      channelID: channelID,
    }),
  });
  return await response.json();
}

async function writeToChannel(channelID) {
  if (!(await canBotPostToChannel(channelID))) return;

  const data = await getLeaderboard(dateString, channelID);
  const leaderboard = data.data;
  console.log(channelID, leaderboard);
  let message = `Today's Results (${dateString.split("T")[0]})\n`;
  const canvas = imageRender.renderLeaderboard(leaderboard);
  const imageBuffer = canvas.toBuffer(`image/png`);
  const formData = new FormData();
  const payloadJson = {
    content: message,
    attachments: [
      {
        id: 0,
        description: "Leaderboard Image",
        filename: "leaderboard.png",
      },
    ],
  };

  formData.append("payload_json", JSON.stringify(payloadJson));
  formData.append("files[0]", new Blob([imageBuffer]), "leaderboard.png");

  //curl request
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
      body: formData,
    },
  );
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Error for Channel ID "${channelID}":`, errorData);
  }

  return;
}

async function canBotPostToChannel(channelID) {
  //get channel metadata
  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelID}`,
      {
        method: "GET",
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      },
    );

    if (!res.ok) {
      console.warn(`Bot cannot access channel ${channelID}: ${res.statusText}`);
      return false;
    }

    const channel = await res.json();

    // Check if DM
    if (!channel.guild_id) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const dateString = new Date().toISOString();
const channels = await getChannelsReq(dateString);

for (let channel of channels.data) {
  writeToChannel(channel.channelID);
}

console.log("done");
