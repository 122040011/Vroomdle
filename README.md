# Vroomdle

## Description

Daily racing game on Node.js. New tracks everyday. Built with discord integration (automated discord authentication).\
\
The tracks are generated randomly on RNG with seed. Daily tracks are generated using a seed from the current date. Freeplay tracks are generated using a precise timestamp seed.

## How to Play

Reach the finish line as quick as possible. The timer can be clicked to restart. Clicking daily button loads the daily tracks and refreshes leaderboard. Clicking freeplay loads a random track.

### Controls

W - Move forward\
S - Move backwards\
A/J - Turn left\
D/L - Turn right

## Services

The webapp is deployed on the following services:

1. Vercel (Static web hosting)
2. Neon (Database)
3. Github Actions (Bot scheduling and automation)

## Replicating Deployment

1. Clone this repository.
2. Go to vercel, create a new project. Configure env secrets and variables.
3. In Github, test that Github actions is working and executing as intended. Manual trigger is enabled.
4. Go to Discord Developer Portal.
   1. Create a new application.
   2. Under Acivities/URL_Mapping, have these set up:
      | Type | Prefix | Target |
      | ------------- |:-------------:| :-------------:|
      |Root| / | YourHostedUrl|
      | Proxy|/jsdelivr|cdn.jsdelivr.net|
   3. In OAuth2 tab, ensure that bot permission is enabled with the following permissions:
      - View Channels
      - Send Messages
      - Embed Links
      - Attach Files
5. Go to Discord.
   1. Ensure that the bot is invited to the server (using the OAuth2 link before).
   2. If there is still no prompt to play the embedded activities yet, you can paste the activity link to the channel.

## Env Secrets and Variables

- Vercel
  - **DISCORD_CLIENT_ID** (vars/secrets | from Discord Developer Portal)
  - **DISCORD_CLIENT_SECRET** (secrets | from Discord Developer Portal)
  - **DATABASE_URL** (secrets| from Neon DB)
  - **BACKEND_PASSWORD** (secrets | up to you)

- Github Actions
  - **BACKEND_PASSWORD** (secrets | up to you, ensure matches)
  - **DISCORD_BOT_TOKEN** (secrets | Discord Developer Portal)
  - **DISCORD_ACTIVITY_LINK** (vars | Discord Developer Portal)
  - **WEB_URL** (vars | Website url hosted)
