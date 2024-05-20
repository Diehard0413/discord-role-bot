# Bwoofa Discord role Bot

This is a Discord Bot that dispenses Testnet ETH written in TypeScript.

## Setup

Change the `example.config.json` into `config.json`, and fill in the required fields.

Create a file called `.env` and paste in the following lines. Make sure to fill it out with your details

```env
BOT_TOKEN="<bot-token>"
DB_USERNAME="<username>"
DB_PASSWORD="<password>"
```

## Database

```json
"database": "pg",
```

This sets the BOT to use storage - Postgres DB. **Make sure you setup the necessary database parameters**
