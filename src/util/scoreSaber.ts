import {ScoreSaberClient} from 'scoresaber.js';

/**
 * Single shared ScoreSaber client for the whole bot.
 *
 * The client owns the rate-limiter state, so every caller (slash commands, the
 * role updater and the score feed) must share one instance — otherwise each
 * would track the limit independently and they could collectively overshoot the
 * API's buckets.
 */
const scoreSaber = new ScoreSaberClient();

export default scoreSaber;
