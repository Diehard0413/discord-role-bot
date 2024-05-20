# Bwoofa Discord role Bot

This is a Discord Bot written in TypeScript.

## Setup

Change the `example.config.json` into `config.json`, and fill in the required fields.

Create a file called `.env` and paste in the following lines. Make sure to fill it out with your details

```env
BOT_TOKEN="<bot-token>"
DATABASE_URL=postgres://username:password@hostname:port/database
CLIENT_ID="<client-id>"
GUILD_ID="<guild-id>"
GENERAL_CHANNEL_ID="<general-id>"
APPEAL_CHANNEL_ID="<appeal-id>"
```

## Database

```json
"database": "pg",
```

This sets the BOT to use storage - Postgres DB. **Make sure you setup the necessary database parameters**
