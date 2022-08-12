# Regional BS Discord Bot

Provides configurable automatic rank role updates for a regional Discord server, along with a variety of useful commands.

## Steps To Run
1. Install and configure a mariadb server.
2. Create a `.env` file in the project root with the following variables: 
```sh
NODE_ENV=development

# Discord
BOT_TOKEN=
CLIENT_ID=

# Database
TYPEORM_CONNECTION=mariadb
TYPEORM_HOST=localhost
TYPEORM_PORT=3306
TYPEORM_USERNAME=
TYPEORM_PASSWORD=
TYPEORM_DATABASE=
TYPEORM_SYNCHRONIZE=true # Dangerous option, disable for production
TYPEORM_ENTITIES=build/entity/**/*.js
```
3. Update `src/config.json` with relevant values for your server(s).
4. Run `npm i` in the project root to install all required packages.
5. Use `npm run start` to build and launch the bot.