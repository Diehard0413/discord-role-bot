# Grandbase Discord Faucet Bot

This is a Discord Bot that dispenses Testnet ETH written in TypeScript.

## Setup

Change the `example.config.json` into `config.json`, and fill in the required fields.

Create a file called `.env` and paste in the following lines. Make sure to fill it out with your details

```env
WALLET_PRIVATE_KEY="<wallet-private-key>"
BOT_TOKEN="<bot-token>"
DB_USERNAME="<username>"
DB_PASSWORD="<password>"
```

## Installation

1. If you do not have pnpm, run `npm i -g pnpm`.

2. Install Dependancies using `pnpm install`. 

_Optionally you can update the dependancies using `pnpm update`._

3. Fill in the config and run the bot : `pnpm start:dev`

## Networks

These are the supported Networks. Feel free to do PRs to add any other testnet networks!

### Network List

-   Goerli


## Adding Networks

Adding Networks are fairly straighforward.

1. Open up the `config.json`.
2. Add a network Object in the `networks` field
   ex :
    ```json
    {
     "name": "networkName",
     "nativeCurrency": "kool",
     "ALCHEMY_URL": "https://rpc-url/xxx",
     "scan": "https://myscan.kool.io/tx/"
    }
    ```
3. That's literally it!
4. Make sure to do a PR into the Main Repo! (Edit the `example.config.json`)

## Database

This BOT currently has two modes it can run, **KeyV - Memory** and **Postgres - Storage**. You can change the mode by changing the `database` value in the `stats` field of `config.json` like so :

### Storage Mode

```json
"database": "pg",
```

This sets the BOT to use storage - Postgres DB. **Make sure you setup the necessary database parameters**

### Memory Mode

```json
"database": "keyv",
```

This sets the BOT to use memory - KeyV. Use this if you want to just use the BOT without having to configure Databases. In addition, this is the default if no parameter was set into `database`.
