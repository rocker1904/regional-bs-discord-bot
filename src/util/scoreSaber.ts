import {ScoreSaberClient} from 'scoresaber.js';
import userAgent from './userAgent';

/**
 * Single shared ScoreSaber client for the whole bot.
 *
 * The client owns the rate-limiter state, so every caller (slash commands, the
 * role updater and the score feed) must share one instance — otherwise each
 * would track the limit independently and they could collectively overshoot the
 * API's buckets.
 */
const scoreSaber = new ScoreSaberClient({userAgent});

export default scoreSaber;
