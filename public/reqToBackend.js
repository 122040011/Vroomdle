export async function incrementTrialReq(uid, username, date, channelID) {
  const response = await fetch(`/api/requestToDb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "incrementTrial",
      uid: uid,
      username: username,
      date: date,
      channelID: channelID,
    }),
  });

  return await response.json();
}

export async function updateTimeReq(uid, date, recordTime, channelID) {
  const response = await fetch(`/api/requestToDb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "updateTime",
      uid: uid,
      date: date,
      recordTime: recordTime,
      channelID: channelID,
    }),
  });
  return await response.json();
}

export async function getLeaderboard(date, channelID = null) {
  const response = await fetch(`/api/requestToDb`, {
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
