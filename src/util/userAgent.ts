import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// Read the version straight from package.json so the UA can't drift from it.
// Resolves to the project root from both src/util (dev) and build/util (prod).
const {version} = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')) as {version: string};

/** Identifies the bot to ScoreSaber on both REST (scoresaber.js) and WebSocket requests. */
const userAgent = `regional-bs-discord-bot/${version} (+https://github.com/rocker1904/regional-bs-discord-bot)`;

export default userAgent;
