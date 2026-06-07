# Regional BS Discord Bot

Provides configurable automatic rank role updates for a regional Discord server, along with a variety of useful commands. Player data comes from the [ScoreSaber v2 API](https://scoresaber.com/api/docs) via [scoresaber.js](https://github.com/rocker1904/scoresaber.js).

## Steps To Run

1. Install and configure a PostgreSQL server, and create a database + user for the bot.
2. Copy `.env.example` to `.env` and fill in the values:

```sh
NODE_ENV=production

# Postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=

# Discord
BOT_TOKEN=
CLIENT_ID=
```

3. Update `src/config.json` with relevant values for your server(s).
4. Run `npm i` to install dependencies.
5. Run `npm run start` to build and launch the bot.

The schema is managed with TypeORM (`synchronize` is off — create/migrate tables yourself; the entities live in `src/entity`).

## Development

- `npm run dev` — run the bot from source with hot reload (`tsx watch`).
- `npm run deploy-commands` — (re)register the slash commands with Discord.

## Checks

- `npm run typecheck` — type-check `src` + `test` without emitting.
- `npm run lint` / `npm run format` — ESLint / Prettier.
- `npm test` — unit tests (`node --test` via `tsx`); `npm run test:coverage` for coverage.
- `npm run build` — compile to `build/`.
