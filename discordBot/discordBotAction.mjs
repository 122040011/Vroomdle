import * as helper from "../public/helper.mjs";

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
  const data = await getLeaderboard(dateString, channelID);
  const leaderboard = data.data;
  let message = `Today's Results (${dateString.split("T")[0]})\n`;
  for (let i in leaderboard) {
    //render?

    const num = `${parseInt(i) + 1}.`.padStart(3, " ");
    const name = String(leaderboard[i].username).slice(0, 10).padEnd(15, " ");
    const time = helper
      .formatTimeDisplay(String(leaderboard[i].recordTime))
      .padStart(10, " ");

    message += `${num} ${name} ${time}\n`;
  }

  console.log(message);

  //render leaderboard OR plain text with emojis?

  //curl request
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    },
  );
  console.log(response);
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Error for Channel ID "${channelID}":`, errorData);
  }

  return;
}

const dateString = new Date().toISOString();
const channels = await getChannelsReq(dateString);

console.log(channels);

for (let channel of channels.data) {
  console.log(channel.channelID);
  writeToChannel(channel.channelID);
}
